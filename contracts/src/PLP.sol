// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PLP — Peptide Liquidity Provider shares
/// @notice ERC-20 receipt token for deposits into PerpsLiquidityPool.
///         Value accrues as trading fees and trader losses flow into the pool;
///         trader profits are paid out of the pool (GMX-style counterparty).
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
/// @notice Collateral vault that backstops peptide perps open interest.
///         LPs deposit the perps collateral asset (e.g. tPUSD / USDC), receive
///         PLP shares, earn fees + trader losses, and take the other side of
///         trader PnL. Open interest is capped at `maxUtilizationBps` of AUM.
///
///         This is a testnet/v1 design — no time-weighted AUM, no tranche
///         risk, no oracle depeg handling. Do not treat as audit-ready.
contract PerpsLiquidityPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;
    PLP public immutable plp;

    address public perpsEngine;

    /// @notice Max total open interest as a fraction of pool AUM (e.g. 5000 = 50%).
    uint256 public maxUtilizationBps = 5_000;

    /// @notice Fraction of open interest reserved against LP withdrawals
    ///         (conservative haircut so LPs can't fully drain while risk is open).
    uint256 public reserveBps = 2_000; // 20% of OI reserved

    /// @notice Latest open interest reported by PerpsEngine (USD notional, 18 dec).
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

    /// @notice AUM in collateral token units (18 decimals for tPUSD).
    function totalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    /// @notice Maximum allowed aggregate open interest given current AUM.
    function maxOpenInterest() public view returns (uint256) {
        return (totalAssets() * maxUtilizationBps) / 10_000;
    }

    /// @notice Assets LPs may withdraw without breaching OI reserve.
    function availableAssets() public view returns (uint256) {
        uint256 bal = totalAssets();
        uint256 reserved = (openInterestUsd * reserveBps) / 10_000;
        // Also never withdraw below the utilization floor for current OI
        uint256 utilFloor = openInterestUsd == 0
            ? 0
            : (openInterestUsd * 10_000 + maxUtilizationBps - 1) / maxUtilizationBps;
        if (utilFloor > reserved) reserved = utilFloor;
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

    // ─── Engine hooks ────────────────────────────────────────────────────

    function setOpenInterest(uint256 oi) external onlyEngine {
        openInterestUsd = oi;
        emit OpenInterestUpdated(oi);
    }

    /// @notice Engine already holds `amount` of asset and transfers it in first,
    ///         or we pull — here we assume tokens were transferred to this pool
    ///         by the engine immediately before/with this call. Accounting only.
    function notifyFees(uint256 amount) external onlyEngine {
        totalFeesReceived += amount;
        emit FeesReceived(amount);
    }

    /// @notice Trader loss residual already transferred to this pool by engine.
    function notifyLoss(uint256 amount) external onlyEngine {
        totalLossesReceived += amount;
        emit LossReceived(amount);
    }

    /// @notice Pay trader profit from LP capital to `to` (usually PerpsEngine).
    ///         Engine should reduce open interest before calling when closing.
    function coverProfit(address to, uint256 amount) external onlyEngine nonReentrant {
        require(amount > 0, "PLP pool: zero profit");
        require(amount <= totalAssets(), "PLP pool: insolvent");
        totalProfitsPaid += amount;
        asset.safeTransfer(to, amount);
        emit ProfitCovered(to, amount);
    }
}
