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
/// @notice Price source for markets without a native Chainlink feed (the
///         synthetic PEPTIDE index, correlated biotech baskets). Chainlink
///         feeds are used directly wherever available (Stock Tokens); this
///         contract only covers the gap. Uses a simple owner-pushed price
///         with a staleness check — a committee/multi-reporter design
///         (median-of-N, TWAP) should replace this before real funds are at
///         risk; see GMX's oracle keeper design for a battle-tested pattern.
contract PeptideOracle is Ownable {
    struct Feed {
        address chainlinkFeed; // address(0) if this market uses the pushed price instead
        uint256 pushedPrice; // 18 decimals
        uint256 updatedAt;
    }

    uint256 public constant MAX_STALENESS = 15 minutes;

    mapping(bytes32 => Feed) public feeds; // market key (e.g. keccak256("PEPTIDE-INDEX")) -> feed

    event ChainlinkFeedSet(bytes32 indexed marketKey, address feed);
    event PricePushed(bytes32 indexed marketKey, uint256 price);

    constructor() Ownable(msg.sender) {}

    function setChainlinkFeed(bytes32 marketKey, address feed) external onlyOwner {
        feeds[marketKey].chainlinkFeed = feed;
        emit ChainlinkFeedSet(marketKey, feed);
    }

    /// @notice Owner/keeper-pushed price for markets with no Chainlink feed.
    function pushPrice(bytes32 marketKey, uint256 price) external onlyOwner {
        feeds[marketKey].pushedPrice = price;
        feeds[marketKey].updatedAt = block.timestamp;
        emit PricePushed(marketKey, price);
    }

    /// @return price 18-decimal price
    function getPrice(bytes32 marketKey) external view returns (uint256 price) {
        Feed storage f = feeds[marketKey];

        if (f.chainlinkFeed != address(0)) {
            AggregatorV3Interface agg = AggregatorV3Interface(f.chainlinkFeed);
            (, int256 answer,, uint256 updatedAt,) = agg.latestRoundData();
            require(block.timestamp - updatedAt <= MAX_STALENESS, "Oracle: stale chainlink price");
            require(answer > 0, "Oracle: bad chainlink price");
            uint8 dec = agg.decimals();
            return dec == 18 ? uint256(answer) : uint256(answer) * (10 ** (18 - dec));
        }

        require(block.timestamp - f.updatedAt <= MAX_STALENESS, "Oracle: stale pushed price");
        return f.pushedPrice;
    }
}
