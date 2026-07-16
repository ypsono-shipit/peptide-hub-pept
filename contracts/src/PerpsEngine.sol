// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PeptideOracle} from "./oracle/PeptideOracle.sol";
import {Treasury} from "./Treasury.sol";
import {PerpsLiquidityPool} from "./PLP.sol";

/// @title PerpsEngine
/// @notice Isolated-margin perps marked by PeptideOracle, backstopped by PLP.
///         Collateral may be 6- or 18-decimal (USDC vs legacy tPUSD).
///         `sizeUsd` is always 18-decimal USD notional; margin is in token units.
contract PerpsEngine is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Market {
        bool active;
        bytes32 oracleKey;
        uint256 maxLeverageBps;
        uint256 fundingRatePerHour;
        uint256 makerFeeBps;
        uint256 takerFeeBps;
        uint256 liquidationFeeBps;
        uint256 maintenanceMarginBps;
    }

    struct Position {
        address trader;
        bytes32 marketKey;
        bool isLong;
        uint256 sizeUsd; // 18-dec USD notional
        uint256 collateral; // raw collateral token units
        uint256 entryPrice; // 18-dec oracle price
        uint256 entryFundingIndex;
        uint256 openedAt;
    }

    IERC20 public immutable collateralToken;
    uint8 public immutable collateralDecimals;
    /// @notice raw * toUsdScale = 18-dec USD
    uint256 public immutable toUsdScale;

    PeptideOracle public immutable oracle;
    Treasury public immutable treasury;
    PerpsLiquidityPool public liquidityPool;
    /// @notice Once true, liquidityPool cannot be changed (even by owner).
    bool public liquidityPoolLocked;

    mapping(bytes32 => Market) public markets;
    mapping(bytes32 => uint256) public cumulativeFundingIndex;
    mapping(bytes32 => uint256) public lastFundingUpdate;
    mapping(uint256 => Position) public positions;
    uint256 public nextPositionId = 1;
    uint256 public totalOpenInterest; // 18-dec USD
    uint256 public protocolFeesAccrued;

    event MarketSet(bytes32 indexed marketKey, bool active, uint256 maxLeverageBps);
    event LiquidityPoolSet(address indexed pool);
    event LiquidityPoolLocked(address indexed pool);
    event PositionOpened(
        uint256 indexed positionId,
        address indexed trader,
        bytes32 marketKey,
        bool isLong,
        uint256 sizeUsd,
        uint256 collateral,
        uint256 entryPrice
    );
    event PositionClosed(uint256 indexed positionId, uint256 exitPrice, int256 pnl);
    event PositionLiquidated(uint256 indexed positionId, address indexed liquidator, uint256 exitPrice);

    constructor(address collateralToken_, address oracle_, address treasury_) Ownable(msg.sender) {
        collateralToken = IERC20(collateralToken_);
        oracle = PeptideOracle(oracle_);
        treasury = Treasury(treasury_);
        uint8 dec = IERC20Metadata(collateralToken_).decimals();
        require(dec <= 18, "PerpsEngine: decimals");
        collateralDecimals = dec;
        toUsdScale = 10 ** (18 - uint256(dec));
    }

    /// @notice One-time pool wiring. Irreversible after first set.
    function setLiquidityPool(address pool) external onlyOwner {
        require(!liquidityPoolLocked, "PerpsEngine: pool locked");
        require(pool != address(0), "PerpsEngine: zero pool");
        liquidityPool = PerpsLiquidityPool(pool);
        liquidityPoolLocked = true;
        emit LiquidityPoolSet(pool);
        emit LiquidityPoolLocked(pool);
    }

    function setMarket(
        bytes32 marketKey,
        bool active,
        uint256 maxLeverageBps,
        uint256 fundingRatePerHour,
        uint256 makerFeeBps,
        uint256 takerFeeBps,
        uint256 liquidationFeeBps,
        uint256 maintenanceMarginBps
    ) external onlyOwner {
        markets[marketKey] = Market(
            active,
            marketKey,
            maxLeverageBps,
            fundingRatePerHour,
            makerFeeBps,
            takerFeeBps,
            liquidationFeeBps,
            maintenanceMarginBps
        );
        if (lastFundingUpdate[marketKey] == 0) lastFundingUpdate[marketKey] = block.timestamp;
        emit MarketSet(marketKey, active, maxLeverageBps);
    }

    function toUsd18(uint256 amount) public view returns (uint256) {
        return amount * toUsdScale;
    }

    function fromUsd18(uint256 amount18) public view returns (uint256) {
        return amount18 / toUsdScale;
    }

    function openPosition(bytes32 marketKey, bool isLong, uint256 sizeUsd, uint256 collateralAmount)
        external
        nonReentrant
        returns (uint256 positionId)
    {
        Market memory m = markets[marketKey];
        require(m.active, "PerpsEngine: inactive market");
        require(collateralAmount > 0 && sizeUsd > 0, "PerpsEngine: zero input");
        require(address(liquidityPool) != address(0), "PerpsEngine: no liquidity pool");

        uint256 price = oracle.getPrice(marketKey);
        uint256 collatUsd18 = toUsd18(collateralAmount);
        uint256 leverageBps = (sizeUsd * 10_000) / collatUsd18;
        require(leverageBps <= m.maxLeverageBps, "PerpsEngine: leverage too high");

        uint256 newOi = totalOpenInterest + sizeUsd;
        require(newOi <= liquidityPool.maxOpenInterest(), "PerpsEngine: exceeds PLP capacity");

        collateralToken.safeTransferFrom(msg.sender, address(this), collateralAmount);

        // Fee in 18-dec USD, convert to token units
        uint256 fee18 = (sizeUsd * m.takerFeeBps) / 10_000;
        uint256 fee = fromUsd18(fee18);
        if (fee > collateralAmount) fee = collateralAmount;
        if (fee > 0) {
            collateralToken.safeTransfer(address(liquidityPool), fee);
            liquidityPool.notifyFees(fee);
        }

        totalOpenInterest = newOi;
        liquidityPool.setOpenInterest(totalOpenInterest);

        positionId = nextPositionId++;
        positions[positionId] = Position({
            trader: msg.sender,
            marketKey: marketKey,
            isLong: isLong,
            sizeUsd: sizeUsd,
            collateral: collateralAmount - fee,
            entryPrice: price,
            entryFundingIndex: cumulativeFundingIndex[marketKey],
            openedAt: block.timestamp
        });

        emit PositionOpened(positionId, msg.sender, marketKey, isLong, sizeUsd, collateralAmount - fee, price);
    }

    function closePosition(uint256 positionId) external nonReentrant {
        Position storage p = positions[positionId];
        require(p.trader == msg.sender, "PerpsEngine: not position owner");

        uint256 price = oracle.getPrice(p.marketKey);
        int256 pnl18 = _pnlUsd18(p, price);

        _reduceOpenInterest(p.sizeUsd);
        uint256 payout = _settleWithPool(p, pnl18);

        emit PositionClosed(positionId, price, pnl18);
        delete positions[positionId];

        if (payout > 0) collateralToken.safeTransfer(msg.sender, payout);
    }

    function liquidate(uint256 positionId) external nonReentrant {
        Position storage p = positions[positionId];
        require(p.trader != address(0), "PerpsEngine: no position");

        Market memory m = markets[p.marketKey];
        uint256 price = oracle.getPrice(p.marketKey);
        int256 pnl18 = _pnlUsd18(p, price);

        // Equity in 18-dec USD
        int256 equity18 = int256(toUsd18(p.collateral)) + pnl18;
        uint256 maintenance18 = (p.sizeUsd * m.maintenanceMarginBps) / 10_000;
        require(equity18 < int256(maintenance18), "PerpsEngine: position healthy");

        uint256 liqFee18 = (p.sizeUsd * m.liquidationFeeBps) / 10_000;
        uint256 liqFee = fromUsd18(liqFee18);

        _reduceOpenInterest(p.sizeUsd);

        uint256 toPool = p.collateral;
        if (liqFee > 0 && liqFee < toPool && address(liquidityPool) != address(0)) {
            toPool -= liqFee;
            collateralToken.safeTransfer(msg.sender, liqFee);
        }
        if (toPool > 0 && address(liquidityPool) != address(0)) {
            collateralToken.safeTransfer(address(liquidityPool), toPool);
            liquidityPool.notifyLoss(toPool);
        }

        emit PositionLiquidated(positionId, msg.sender, price);
        delete positions[positionId];
    }

    function _reduceOpenInterest(uint256 sizeUsd) internal {
        if (sizeUsd >= totalOpenInterest) totalOpenInterest = 0;
        else totalOpenInterest -= sizeUsd;
        if (address(liquidityPool) != address(0)) {
            liquidityPool.setOpenInterest(totalOpenInterest);
        }
    }

    /// @param pnl18 trader PnL in 18-decimal USD
    function _settleWithPool(Position storage p, int256 pnl18) internal returns (uint256 payout) {
        if (pnl18 >= 0) {
            uint256 profit = fromUsd18(uint256(pnl18));
            if (profit > 0 && address(liquidityPool) != address(0)) {
                liquidityPool.coverProfit(address(this), profit);
            }
            payout = p.collateral + profit;
        } else {
            uint256 loss = fromUsd18(uint256(-pnl18));
            if (loss > p.collateral) loss = p.collateral;
            if (loss > 0 && address(liquidityPool) != address(0)) {
                collateralToken.safeTransfer(address(liquidityPool), loss);
                liquidityPool.notifyLoss(loss);
            }
            payout = p.collateral - loss;
        }
    }

    /// @return PnL in 18-decimal USD (same units as sizeUsd)
    function _pnlUsd18(Position storage p, uint256 currentPrice) internal view returns (int256) {
        int256 priceDelta = int256(currentPrice) - int256(p.entryPrice);
        int256 direction = p.isLong ? int256(1) : int256(-1);
        return (priceDelta * direction * int256(p.sizeUsd)) / int256(p.entryPrice);
    }

    function sweepFeesToTreasury() external onlyOwner {
        uint256 amount = protocolFeesAccrued;
        protocolFeesAccrued = 0;
        if (amount == 0) return;
        collateralToken.safeTransfer(address(treasury), amount);
        treasury.notifyDeposit(address(collateralToken), amount);
    }
}
