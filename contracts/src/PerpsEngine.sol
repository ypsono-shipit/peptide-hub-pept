// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PeptideOracle} from "./oracle/PeptideOracle.sol";
import {Treasury} from "./Treasury.sol";
import {PerpsLiquidityPool} from "./PLP.sol";

/// @title PerpsEngine
/// @notice Isolated-margin perps on peptide/biotech-themed markets, single
///         collateral asset, mark price from PeptideOracle. Liquidity is
///         backstopped by PerpsLiquidityPool (PLP): open interest is capped
///         by pool AUM × utilization, trading fees accrue to LPs, and trader
///         PnL is paid from / to the pool (GMX-style counterparty).
///
///         Still a testnet skeleton — no real funding curve, partial
///         liquidations, or keeper network. Not audit-ready.
contract PerpsEngine is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Market {
        bool active;
        bytes32 oracleKey;
        uint256 maxLeverageBps; // e.g. 200_00 = 20x
        uint256 fundingRatePerHour;
        uint256 makerFeeBps;
        uint256 takerFeeBps;
        uint256 liquidationFeeBps;
        uint256 maintenanceMarginBps; // e.g. 500 = 5%
    }

    struct Position {
        address trader;
        bytes32 marketKey;
        bool isLong;
        uint256 sizeUsd;
        uint256 collateral;
        uint256 entryPrice;
        uint256 entryFundingIndex;
        uint256 openedAt;
    }

    IERC20 public immutable collateralToken;
    PeptideOracle public immutable oracle;
    Treasury public immutable treasury;

    PerpsLiquidityPool public liquidityPool;

    mapping(bytes32 => Market) public markets;
    mapping(bytes32 => uint256) public cumulativeFundingIndex;
    mapping(bytes32 => uint256) public lastFundingUpdate;

    mapping(uint256 => Position) public positions;
    uint256 public nextPositionId = 1;

    /// @notice Aggregate open interest (sum of position sizeUsd).
    uint256 public totalOpenInterest;

    /// @notice Fees not yet swept when no PLP was configured (legacy path).
    uint256 public protocolFeesAccrued;

    event MarketSet(bytes32 indexed marketKey, bool active, uint256 maxLeverageBps);
    event LiquidityPoolSet(address indexed pool);
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
    }

    function setLiquidityPool(address pool) external onlyOwner {
        liquidityPool = PerpsLiquidityPool(pool);
        emit LiquidityPoolSet(pool);
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
        uint256 leverageBps = (sizeUsd * 10_000) / collateralAmount;
        require(leverageBps <= m.maxLeverageBps, "PerpsEngine: leverage too high");

        // Cap OI by PLP AUM × utilization
        uint256 newOi = totalOpenInterest + sizeUsd;
        require(newOi <= liquidityPool.maxOpenInterest(), "PerpsEngine: exceeds PLP capacity");

        collateralToken.safeTransferFrom(msg.sender, address(this), collateralAmount);

        uint256 fee = (sizeUsd * m.takerFeeBps) / 10_000;
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
        int256 pnl = _pnl(p, price);

        _reduceOpenInterest(p.sizeUsd);
        uint256 payout = _settleWithPool(p, pnl);

        emit PositionClosed(positionId, price, pnl);
        delete positions[positionId];

        if (payout > 0) collateralToken.safeTransfer(msg.sender, payout);
    }

    function liquidate(uint256 positionId) external nonReentrant {
        Position storage p = positions[positionId];
        require(p.trader != address(0), "PerpsEngine: no position");

        Market memory m = markets[p.marketKey];
        uint256 price = oracle.getPrice(p.marketKey);
        int256 pnl = _pnl(p, price);

        int256 equity = int256(p.collateral) + pnl;
        uint256 maintenanceMargin = (p.sizeUsd * m.maintenanceMarginBps) / 10_000;
        require(equity < int256(maintenanceMargin), "PerpsEngine: position healthy");

        uint256 liqFee = (p.sizeUsd * m.liquidationFeeBps) / 10_000;

        _reduceOpenInterest(p.sizeUsd);

        // Liquidated margin + losses flow to PLP; liquidator tip from fee
        uint256 toPool = p.collateral;
        if (liqFee > 0 && liqFee < toPool && address(liquidityPool) != address(0)) {
            // small tip to liquidator from collateral
            uint256 tip = liqFee > toPool ? toPool : liqFee;
            toPool -= tip;
            if (tip > 0) collateralToken.safeTransfer(msg.sender, tip);
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

    /// @dev Pays trader from margin ± pool-covered PnL. Losses go to PLP.
    function _settleWithPool(Position storage p, int256 pnl) internal returns (uint256 payout) {
        if (pnl >= 0) {
            uint256 profit = uint256(pnl);
            if (profit > 0 && address(liquidityPool) != address(0)) {
                liquidityPool.coverProfit(address(this), profit);
            }
            payout = p.collateral + profit;
        } else {
            uint256 loss = uint256(-pnl);
            if (loss > p.collateral) loss = p.collateral;
            if (loss > 0 && address(liquidityPool) != address(0)) {
                collateralToken.safeTransfer(address(liquidityPool), loss);
                liquidityPool.notifyLoss(loss);
            }
            payout = p.collateral - loss;
        }
    }

    function _pnl(Position storage p, uint256 currentPrice) internal view returns (int256) {
        int256 priceDelta = int256(currentPrice) - int256(p.entryPrice);
        int256 direction = p.isLong ? int256(1) : int256(-1);
        return (priceDelta * direction * int256(p.sizeUsd)) / int256(p.entryPrice);
    }

    /// @notice Legacy sweep for any fees accrued before PLP was wired.
    function sweepFeesToTreasury() external onlyOwner {
        uint256 amount = protocolFeesAccrued;
        protocolFeesAccrued = 0;
        if (amount == 0) return;
        collateralToken.safeTransfer(address(treasury), amount);
        treasury.notifyDeposit(address(collateralToken), amount);
    }
}
