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
/// @notice Price source for markets without a native Chainlink feed.
/// @dev Hardening vs single-owner manipulation:
///      - No forcePushPrice (cannot bypass deviation circuit breaker)
///      - pushPrice only by authorized *pushers* (not Owner alone after setup)
///      - Owner can add pushers then lockPushers() + renounceOwnership so even
///        the deployer key cannot change prices or the pusher set
contract PeptideOracle is Ownable {
    struct Feed {
        address chainlinkFeed;
        uint256 pushedPrice; // 18 decimals
        uint256 updatedAt;
        uint256 stalenessWindow; // 0 → DEFAULT_PUSHED_STALENESS
        string source;
        bool paused;
    }

    uint256 public constant CHAINLINK_MAX_STALENESS = 15 minutes;
    uint256 public constant DEFAULT_PUSHED_STALENESS = 30 days;
    /// @notice Max move per push vs last price; larger moves pause the feed.
    uint256 public constant MAX_DEVIATION_BPS = 3000; // 30%
    /// @notice Minimum seconds between successful pushes per market.
    uint256 public constant MIN_PUSH_INTERVAL = 5 minutes;

    mapping(bytes32 => Feed) public feeds;
    mapping(address => bool) public pushers;
    bool public pushersLocked;
    uint256 public pusherCount;

    event ChainlinkFeedSet(bytes32 indexed marketKey, address feed);
    event PricePushed(bytes32 indexed marketKey, uint256 price, string source, address indexed pusher);
    event StalenessWindowSet(bytes32 indexed marketKey, uint256 window);
    event CircuitBreakerTripped(bytes32 indexed marketKey, uint256 lastPrice, uint256 rejectedPrice, uint256 deviationBps);
    event FeedUnpaused(bytes32 indexed marketKey);
    event PusherSet(address indexed pusher, bool allowed);
    event PushersLocked();

    constructor() Ownable(msg.sender) {
        // Deployer is an initial pusher so bootstrap works; remove + lock after multi-sig setup.
        pushers[msg.sender] = true;
        pusherCount = 1;
        emit PusherSet(msg.sender, true);
    }

    modifier onlyPusher() {
        require(pushers[msg.sender], "Oracle: not pusher");
        _;
    }

    function setPusher(address account, bool allowed) external onlyOwner {
        require(!pushersLocked, "Oracle: pushers locked");
        require(account != address(0), "Oracle: zero");
        bool was = pushers[account];
        if (was == allowed) return;
        pushers[account] = allowed;
        if (allowed) pusherCount += 1;
        else {
            require(pusherCount > 1, "Oracle: need one pusher");
            pusherCount -= 1;
        }
        emit PusherSet(account, allowed);
    }

    /// @notice Freeze the pusher set forever (pair with renounceOwnership for no admin path).
    function lockPushers() external onlyOwner {
        require(pusherCount >= 1, "Oracle: no pushers");
        pushersLocked = true;
        emit PushersLocked();
    }

    function setChainlinkFeed(bytes32 marketKey, address feed) external onlyOwner {
        require(!pushersLocked, "Oracle: config locked"); // reuse lock as general config freeze after setup
        feeds[marketKey].chainlinkFeed = feed;
        emit ChainlinkFeedSet(marketKey, feed);
    }

    function setStalenessWindow(bytes32 marketKey, uint256 window) external onlyOwner {
        require(!pushersLocked, "Oracle: config locked");
        feeds[marketKey].stalenessWindow = window;
        emit StalenessWindowSet(marketKey, window);
    }

    /// @notice Authorized pusher updates price. Deviation >30% pauses feed (no apply).
    ///         There is no force override — bad pushes cannot hard-set extreme prices.
    function pushPrice(bytes32 marketKey, uint256 price, string calldata source) external onlyPusher {
        require(price > 0, "Oracle: zero price");
        Feed storage f = feeds[marketKey];

        if (f.updatedAt != 0) {
            require(block.timestamp >= f.updatedAt + MIN_PUSH_INTERVAL, "Oracle: too soon");
        }

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

    /// @notice Unpause after circuit breaker. Only a pusher (not a separate force-set path).
    function unpause(bytes32 marketKey) external onlyPusher {
        feeds[marketKey].paused = false;
        emit FeedUnpaused(marketKey);
    }

    function _applyPrice(Feed storage f, bytes32 marketKey, uint256 price, string calldata source) internal {
        f.pushedPrice = price;
        f.updatedAt = block.timestamp;
        f.source = source;
        f.paused = false;
        emit PricePushed(marketKey, price, source, msg.sender);
    }

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

    function latestPrice(bytes32 marketKey) external view returns (uint256) {
        return getPrice(marketKey);
    }

    function latestTimestamp(bytes32 marketKey) external view returns (uint256) {
        return feeds[marketKey].updatedAt;
    }
}
