// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
    function decimals() external view returns (uint8);
}

/// @title PeptideOracle
/// @notice Price source for markets without a native Chainlink feed —
///         research-peptide $/mg indices (Semaglutide, GLP-1 basket, etc.)
///         and other synthetic markets. Chainlink feeds are used directly
///         wherever available; this contract only covers the gap. Uses a
///         simple owner-pushed price with per-market staleness and a
///         deviation circuit breaker — a committee/multi-reporter design
///         (median-of-N, TWAP, signed attestations) should replace this
///         before real funds are at risk; see GMX's oracle keeper design
///         for a battle-tested pattern.
contract PeptideOracle is Ownable {
    struct Feed {
        address chainlinkFeed; // address(0) if this market uses the pushed price instead
        uint256 pushedPrice; // 18 decimals
        uint256 updatedAt;
        uint256 stalenessWindow; // seconds; 0 means "use DEFAULT_PUSHED_STALENESS"
        string source; // e.g. "PeptidePricing.com + PeptideScouter.com median"
        bool paused; // set by the deviation circuit breaker; blocks getPrice until admin review
    }

    // Chainlink feeds update every few seconds/minutes, so a tight window
    // catches a genuinely broken feed.
    uint256 public constant CHAINLINK_MAX_STALENESS = 15 minutes;
    // Fallback for markets with no live source behind them (one-off
    // bootstrap prices) — no cadence to hold them to, so a long default.
    // Markets with a real (if manual/periodic) price feed, like the GLP-1
    // peptide markets, should set a tighter window via setStalenessWindow.
    uint256 public constant DEFAULT_PUSHED_STALENESS = 30 days;
    // A single update moving price more than this from the last one gets
    // rejected (feed paused, not applied) rather than taking effect
    // immediately — catches fat-finger and bad-source pushes.
    uint256 public constant MAX_DEVIATION_BPS = 3000; // 30%

    mapping(bytes32 => Feed) public feeds; // market key -> feed

    event ChainlinkFeedSet(bytes32 indexed marketKey, address feed);
    event PricePushed(bytes32 indexed marketKey, uint256 price, string source);
    event StalenessWindowSet(bytes32 indexed marketKey, uint256 window);
    event CircuitBreakerTripped(bytes32 indexed marketKey, uint256 lastPrice, uint256 rejectedPrice, uint256 deviationBps);
    event FeedUnpaused(bytes32 indexed marketKey);

    constructor() Ownable(msg.sender) {}

    function setChainlinkFeed(bytes32 marketKey, address feed) external onlyOwner {
        feeds[marketKey].chainlinkFeed = feed;
        emit ChainlinkFeedSet(marketKey, feed);
    }

    function setStalenessWindow(bytes32 marketKey, uint256 window) external onlyOwner {
        feeds[marketKey].stalenessWindow = window;
        emit StalenessWindowSet(marketKey, window);
    }

    /// @notice Owner/keeper-pushed price for markets with no Chainlink feed.
    ///         If this update deviates >30% from the last price, it is
    ///         rejected and the feed is paused instead of taking effect —
    ///         call forcePushPrice to override after manual review.
    function pushPrice(bytes32 marketKey, uint256 price, string calldata source) external onlyOwner {
        Feed storage f = feeds[marketKey];

        if (f.updatedAt != 0 && f.pushedPrice > 0) {
            uint256 diff = price > f.pushedPrice ? price - f.pushedPrice : f.pushedPrice - price;
            uint256 deviationBps = (diff * 10_000) / f.pushedPrice;
            if (deviationBps > MAX_DEVIATION_BPS) {
                f.paused = true;
                emit CircuitBreakerTripped(marketKey, f.pushedPrice, price, deviationBps);
                return;
            }
        }

        _applyPrice(f, marketKey, price, source);
    }

    /// @notice Admin override that bypasses the deviation circuit breaker —
    ///         use after manually verifying a legitimate large price move.
    function forcePushPrice(bytes32 marketKey, uint256 price, string calldata source) external onlyOwner {
        _applyPrice(feeds[marketKey], marketKey, price, source);
    }

    function unpause(bytes32 marketKey) external onlyOwner {
        feeds[marketKey].paused = false;
        emit FeedUnpaused(marketKey);
    }

    function _applyPrice(Feed storage f, bytes32 marketKey, uint256 price, string calldata source) internal {
        f.pushedPrice = price;
        f.updatedAt = block.timestamp;
        f.source = source;
        f.paused = false;
        emit PricePushed(marketKey, price, source);
    }

    /// @return price 18-decimal price
    function getPrice(bytes32 marketKey) public view returns (uint256 price) {
        Feed storage f = feeds[marketKey];
        require(!f.paused, "Oracle: circuit breaker paused, needs admin review");

        if (f.chainlinkFeed != address(0)) {
            AggregatorV3Interface agg = AggregatorV3Interface(f.chainlinkFeed);
            (, int256 answer,, uint256 updatedAt,) = agg.latestRoundData();
            require(block.timestamp - updatedAt <= CHAINLINK_MAX_STALENESS, "Oracle: stale chainlink price");
            require(answer > 0, "Oracle: bad chainlink price");
            uint8 dec = agg.decimals();
            return dec == 18 ? uint256(answer) : uint256(answer) * (10 ** (18 - dec));
        }

        uint256 window = f.stalenessWindow == 0 ? DEFAULT_PUSHED_STALENESS : f.stalenessWindow;
        require(block.timestamp - f.updatedAt <= window, "Oracle: stale pushed price");
        return f.pushedPrice;
    }

    /// @notice Alias for getPrice, matching common oracle naming.
    function latestPrice(bytes32 marketKey) external view returns (uint256) {
        return getPrice(marketKey);
    }

    function latestTimestamp(bytes32 marketKey) external view returns (uint256) {
        return feeds[marketKey].updatedAt;
    }
}
