// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MarketplaceShop — USDC checkout for PEPT Trade x Research Only catalog
/// @notice Buyers pay listed kit prices in testnet USDC. Proceeds go to `treasury`.
/// @dev productId = keccak256(abi.encodePacked(catalog string id)), e.g. "semaglutide"
contract MarketplaceShop is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public treasury;

    /// @notice Price per kit in USDC base units (6 decimals on Robinhood testnet)
    mapping(bytes32 => uint256) public priceOf;
    mapping(bytes32 => bool) public listed;

    event ProductListed(bytes32 indexed productId, uint256 priceUsdc);
    event ProductDelisted(bytes32 indexed productId);
    event TreasuryUpdated(address indexed treasury);
    event Purchased(
        address indexed buyer,
        bytes32 indexed productId,
        uint256 quantity,
        uint256 totalUsdc
    );

    constructor(address usdc_, address treasury_) Ownable(msg.sender) {
        require(usdc_ != address(0) && treasury_ != address(0), "Marketplace: zero");
        usdc = IERC20(usdc_);
        treasury = treasury_;
    }

    function setTreasury(address treasury_) external onlyOwner {
        require(treasury_ != address(0), "Marketplace: zero");
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function setPrice(bytes32 productId, uint256 priceUsdc) external onlyOwner {
        require(productId != bytes32(0), "Marketplace: id");
        require(priceUsdc > 0, "Marketplace: price");
        priceOf[productId] = priceUsdc;
        listed[productId] = true;
        emit ProductListed(productId, priceUsdc);
    }

    function setPrices(bytes32[] calldata ids, uint256[] calldata prices) external onlyOwner {
        require(ids.length == prices.length, "Marketplace: length");
        for (uint256 i = 0; i < ids.length; i++) {
            require(ids[i] != bytes32(0) && prices[i] > 0, "Marketplace: bad");
            priceOf[ids[i]] = prices[i];
            listed[ids[i]] = true;
            emit ProductListed(ids[i], prices[i]);
        }
    }

    function delist(bytes32 productId) external onlyOwner {
        listed[productId] = false;
        emit ProductDelisted(productId);
    }

    /// @notice Purchase `quantity` kits of `productId` for listed USDC price.
    function purchase(bytes32 productId, uint256 quantity) external nonReentrant {
        require(quantity > 0, "Marketplace: qty");
        require(listed[productId], "Marketplace: not listed");
        uint256 unit = priceOf[productId];
        require(unit > 0, "Marketplace: price");
        uint256 total = unit * quantity;
        usdc.safeTransferFrom(msg.sender, treasury, total);
        emit Purchased(msg.sender, productId, quantity, total);
    }
}
