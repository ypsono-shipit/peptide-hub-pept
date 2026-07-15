// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PLP — Peptide Liquidity Provider shares
contract PLP is ERC20, Ownable {
    address public minter;

    event MinterSet(address indexed minter);

    constructor() ERC20("Peptide LP", "PLP") Ownable(msg.sender) {}

    function setMinter(address minter_) external onlyOwner {
        minter = minter_;
        emit MinterSet(minter_);
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "PLP: not minter");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == minter, "PLP: not minter");
        _burn(from, amount);
    }
}

/// @title PerpsLiquidityPool
/// @notice Collateral vault backstopping peptide perps OI (GMX-style).
///         Supports 6- or 18-decimal collateral (e.g. USDC vs tPUSD).
///         Open interest is tracked in 18-decimal USD notionals.
contract PerpsLiquidityPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;
    PLP public immutable plp;
    uint8 public immutable assetDecimals;
    /// @notice Multiply raw asset amount by this to get 18-decimal USD units.
    uint256 public immutable toUsdScale;

    address public perpsEngine;

    uint256 public maxUtilizationBps = 5_000;
    uint256 public reserveBps = 2_000;

    /// @notice Aggregate OI in 18-decimal USD (matches PerpsEngine.sizeUsd).
    uint256 public openInterestUsd;

    uint256 public totalFeesReceived;
    uint256 public totalProfitsPaid;
    uint256 public totalLossesReceived;

    event EngineSet(address indexed engine);
    event MaxUtilizationSet(uint256 bps);
    event ReserveBpsSet(uint256 bps);
    event Deposited(address indexed user, uint256 assets, uint256 shares);
    event Withdrawn(address indexed user, uint256 assets, uint256 shares);
    event OpenInterestUpdated(uint256 openInterestUsd);
    event FeesReceived(uint256 amount);
    event ProfitCovered(address indexed to, uint256 amount);
    event LossReceived(uint256 amount);

    modifier onlyEngine() {
        require(msg.sender == perpsEngine, "PLP pool: not engine");
        _;
    }

    constructor(address asset_, address plpToken) Ownable(msg.sender) {
        require(asset_ != address(0) && plpToken != address(0), "PLP pool: zero");
        asset = IERC20(asset_);
        plp = PLP(plpToken);
        uint8 dec = IERC20Metadata(asset_).decimals();
        require(dec <= 18, "PLP pool: decimals");
        assetDecimals = dec;
        toUsdScale = 10 ** (18 - uint256(dec));
    }

    function setEngine(address engine) external onlyOwner {
        perpsEngine = engine;
        emit EngineSet(engine);
    }

    function setMaxUtilizationBps(uint256 bps) external onlyOwner {
        require(bps > 0 && bps <= 10_000, "PLP pool: bad util");
        maxUtilizationBps = bps;
        emit MaxUtilizationSet(bps);
    }

    function setReserveBps(uint256 bps) external onlyOwner {
        require(bps <= 10_000, "PLP pool: bad reserve");
        reserveBps = bps;
        emit ReserveBpsSet(bps);
    }

    function totalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    /// @notice AUM in 18-decimal USD units.
    function aumUsd18() public view returns (uint256) {
        return totalAssets() * toUsdScale;
    }

    /// @notice Max OI in 18-decimal USD (same units as PerpsEngine.sizeUsd).
    function maxOpenInterest() public view returns (uint256) {
        return (aumUsd18() * maxUtilizationBps) / 10_000;
    }

    /// @notice Assets (raw token units) LPs may withdraw.
    function availableAssets() public view returns (uint256) {
        uint256 bal = totalAssets();
        // Reserve haircut on OI, converted back to asset units
        uint256 reservedUsd = (openInterestUsd * reserveBps) / 10_000;
        uint256 utilFloorUsd = openInterestUsd == 0
            ? 0
            : (openInterestUsd * 10_000 + maxUtilizationBps - 1) / maxUtilizationBps;
        if (utilFloorUsd > reservedUsd) reservedUsd = utilFloorUsd;
        uint256 reserved = reservedUsd / toUsdScale;
        return bal > reserved ? bal - reserved : 0;
    }

    function previewDeposit(uint256 assets) public view returns (uint256 shares) {
        uint256 supply = plp.totalSupply();
        uint256 aum = totalAssets();
        if (supply == 0 || aum == 0) return assets;
        return (assets * supply) / aum;
    }

    function previewWithdraw(uint256 shares) public view returns (uint256 assets) {
        uint256 supply = plp.totalSupply();
        if (supply == 0) return 0;
        return (shares * totalAssets()) / supply;
    }

    function deposit(uint256 assets) external nonReentrant returns (uint256 shares) {
        require(assets > 0, "PLP pool: zero");
        shares = previewDeposit(assets);
        require(shares > 0, "PLP pool: zero shares");
        asset.safeTransferFrom(msg.sender, address(this), assets);
        plp.mint(msg.sender, shares);
        emit Deposited(msg.sender, assets, shares);
    }

    function withdraw(uint256 shares) external nonReentrant returns (uint256 assets) {
        require(shares > 0, "PLP pool: zero");
        require(plp.balanceOf(msg.sender) >= shares, "PLP pool: insufficient PLP");
        assets = previewWithdraw(shares);
        require(assets > 0, "PLP pool: zero assets");
        require(assets <= availableAssets(), "PLP pool: reserved for open interest");
        plp.burn(msg.sender, shares);
        asset.safeTransfer(msg.sender, assets);
        emit Withdrawn(msg.sender, assets, shares);
    }

    function setOpenInterest(uint256 oi) external onlyEngine {
        openInterestUsd = oi;
        emit OpenInterestUpdated(oi);
    }

    function notifyFees(uint256 amount) external onlyEngine {
        totalFeesReceived += amount;
        emit FeesReceived(amount);
    }

    function notifyLoss(uint256 amount) external onlyEngine {
        totalLossesReceived += amount;
        emit LossReceived(amount);
    }

    function coverProfit(address to, uint256 amount) external onlyEngine nonReentrant {
        require(amount > 0, "PLP pool: zero profit");
        require(amount <= totalAssets(), "PLP pool: insolvent");
        totalProfitsPaid += amount;
        asset.safeTransfer(to, amount);
        emit ProfitCovered(to, amount);
    }
}
