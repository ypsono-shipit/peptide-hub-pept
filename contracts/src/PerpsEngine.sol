// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PeptideOracle} from "./oracle/PeptideOracle.sol";
import {Treasury} from "./Treasury.sol";

/// @title PerpsEngine
/// @notice Isolated-margin perps on peptide/biotech-themed markets, single
///         whitelisted collateral asset per deployment (e.g. USDC, or a
///         Robinhood Chain Stock Token). This is a minimal skeleton — GMX's
///         pool/oracle-based design (gmx-contracts / gmx-synthetics) is the
///         intended reference for a production version: this contract is
///         missing a real funding-rate curve, partial liquidations, and
///         keeper-driven price updates, all of which GMX solves. Treat this
///         as the Phase 3 testnet starting point, not audit-ready code.
contract PerpsEngine is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Market {
        bool active;
        bytes32 oracleKey;
        uint256 maxLeverageBps; // e.g. 200_00 = 20x
        uint256 fundingRatePerHour; // bps of position notional, signed via longFunding flag externally
        uint256 makerFeeBps;
        uint256 takerFeeBps;
        uint256 liquidationFeeBps;
        uint256 maintenanceMarginBps; // e.g. 500 = 5%
    }

    struct Position {
        address trader;
        bytes32 marketKey;
        bool isLong;
        uint256 sizeUsd; // notional, 18 decimals
        uint256 collateral; // in `collateralToken` units
        uint256 entryPrice; // 18 decimals
        uint256 entryFundingIndex;
        uint256 openedAt;
    }

    IERC20 public immutable collateralToken;
    PeptideOracle public immutable oracle;
    Treasury public immutable treasury;

    mapping(bytes32 => Market) public markets;
    mapping(bytes32 => uint256) public cumulativeFundingIndex; // per market, 18-decimal accumulator
    mapping(bytes32 => uint256) public lastFundingUpdate;

    mapping(uint256 => Position) public positions;
    uint256 public nextPositionId = 1;

    uint256 public protocolFeesAccrued;

    event MarketSet(bytes32 indexed marketKey, bool active, uint256 maxLeverageBps);
    event PositionOpened(uint256 indexed positionId, address indexed trader, bytes32 marketKey, bool isLong, uint256 sizeUsd, uint256 collateral, uint256 entryPrice);
    event PositionClosed(uint256 indexed positionId, uint256 exitPrice, int256 pnl);
    event PositionLiquidated(uint256 indexed positionId, address indexed liquidator, uint256 exitPrice);

    constructor(address collateralToken_, address oracle_, address treasury_) Ownable(msg.sender) {
        collateralToken = IERC20(collateralToken_);
        oracle = PeptideOracle(oracle_);
        treasury = Treasury(treasury_);
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
            active, marketKey, maxLeverageBps, fundingRatePerHour, makerFeeBps, takerFeeBps, liquidationFeeBps, maintenanceMarginBps
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

        uint256 price = oracle.getPrice(marketKey);
        uint256 leverageBps = sizeUsd * 10_000 / collateralAmount;
        require(leverageBps <= m.maxLeverageBps, "PerpsEngine: leverage too high");

        collateralToken.safeTransferFrom(msg.sender, address(this), collateralAmount);

        uint256 fee = sizeUsd * m.takerFeeBps / 10_000;
        protocolFeesAccrued += fee;

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

        uint256 payout = _settle(p, pnl);
        emit PositionClosed(positionId, price, pnl);
        delete positions[positionId];

        if (payout > 0) collateralToken.safeTransfer(msg.sender, payout);
    }

    /// @notice Anyone can liquidate an underwater position and earn the
    ///         liquidation fee. Real deployment needs a keeper network
    ///         (see GMX) rather than relying on opportunistic callers alone.
    function liquidate(uint256 positionId) external nonReentrant {
        Position storage p = positions[positionId];
        require(p.trader != address(0), "PerpsEngine: no position");

        Market memory m = markets[p.marketKey];
        uint256 price = oracle.getPrice(p.marketKey);
        int256 pnl = _pnl(p, price);

        int256 equity = int256(p.collateral) + pnl;
        uint256 maintenanceMargin = p.sizeUsd * m.maintenanceMarginBps / 10_000;
        require(equity < int256(maintenanceMargin), "PerpsEngine: position healthy");

        uint256 liqFee = p.sizeUsd * m.liquidationFeeBps / 10_000;
        protocolFeesAccrued += liqFee;

        emit PositionLiquidated(positionId, msg.sender, price);
        delete positions[positionId];
    }

    function _pnl(Position storage p, uint256 currentPrice) internal view returns (int256) {
        int256 priceDelta = int256(currentPrice) - int256(p.entryPrice);
        int256 direction = p.isLong ? int256(1) : int256(-1);
        return (priceDelta * direction * int256(p.sizeUsd)) / int256(p.entryPrice);
    }

    function _settle(Position storage p, int256 pnl) internal view returns (uint256 payout) {
        int256 net = int256(p.collateral) + pnl;
        payout = net > 0 ? uint256(net) : 0;
    }

    /// @notice Sweeps accrued fees to the Treasury for staking rewards /
    ///         protocol-owned liquidity. Treasury must have `PerpsEngine`
    ///         set as a depositor first.
    function sweepFeesToTreasury() external onlyOwner {
        uint256 amount = protocolFeesAccrued;
        protocolFeesAccrued = 0;
        collateralToken.safeTransfer(address(treasury), amount);
        treasury.notifyDeposit(address(collateralToken), amount);
    }
}
