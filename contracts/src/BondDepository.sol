// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PEPT} from "./PEPT.sol";
import {Treasury} from "./Treasury.sol";

/// @title BondDepository
/// @notice OHM-style bonding: users deposit a whitelisted asset (whitelisted
///         Robinhood Chain Stock Tokens like LLY/TSHA, stables, or LP) and
///         receive PEPT at a discount to market, vesting linearly over
///         `vestingTerm` seconds. Reference: OlympusDAO BondDepository.sol —
///         this version simplifies control-variable/debt-ratio adjustment to
///         a single owner-set `discountBps` per market rather than dynamic
///         BCV decay; revisit before mainnet.
contract BondDepository is Ownable {
    using SafeERC20 for IERC20;

    struct Market {
        bool active;
        uint256 discountBps; // e.g. 500 = 5% discount to oracle price
        uint256 vestingTerm; // seconds
    }

    struct Bond {
        uint256 payout; // total PEPT owed
        uint256 claimed; // PEPT already claimed
        uint256 vestingStart;
        uint256 vestingTerm;
    }

    PEPT public immutable pept;
    Treasury public immutable treasury;

    mapping(address => Market) public markets; // reserve token -> market terms
    mapping(address => Bond[]) public bondsOf; // user -> bonds

    event MarketSet(address indexed token, bool active, uint256 discountBps, uint256 vestingTerm);
    event Bonded(address indexed user, address indexed token, uint256 amountIn, uint256 payout);
    event Claimed(address indexed user, uint256 indexed bondIndex, uint256 amount);

    constructor(address peptToken, address treasury_) Ownable(msg.sender) {
        pept = PEPT(peptToken);
        treasury = Treasury(treasury_);
    }

    function setMarket(address token, bool active, uint256 discountBps, uint256 vestingTerm) external onlyOwner {
        markets[token] = Market(active, discountBps, vestingTerm);
        emit MarketSet(token, active, discountBps, vestingTerm);
    }

    /// @param amountIn amount of `token` deposited
    /// @param referencePrice PEPT price in `token` terms (18 decimals),
    ///        expected to come from PeptideOracle / Chainlink off-chain quote
    ///        for this scaffold — wire up an on-chain oracle call before
    ///        anything beyond testnet.
    function bond(address token, uint256 amountIn, uint256 referencePrice) external returns (uint256 payout) {
        Market memory m = markets[token];
        require(m.active, "BondDepository: inactive market");
        require(amountIn > 0, "BondDepository: zero amount");

        IERC20(token).safeTransferFrom(msg.sender, address(treasury), amountIn);
        treasury.notifyDeposit(token, amountIn);

        uint256 discountedPrice = referencePrice - (referencePrice * m.discountBps / 10_000);
        payout = amountIn * 1e18 / discountedPrice;

        pept.mint(address(this), payout);

        bondsOf[msg.sender].push(Bond({
            payout: payout,
            claimed: 0,
            vestingStart: block.timestamp,
            vestingTerm: m.vestingTerm
        }));

        emit Bonded(msg.sender, token, amountIn, payout);
    }

    function claimable(address user, uint256 bondIndex) public view returns (uint256) {
        Bond storage b = bondsOf[user][bondIndex];
        uint256 elapsed = block.timestamp - b.vestingStart;
        uint256 vested = elapsed >= b.vestingTerm ? b.payout : (b.payout * elapsed / b.vestingTerm);
        return vested - b.claimed;
    }

    function claim(uint256 bondIndex) external {
        uint256 amount = claimable(msg.sender, bondIndex);
        require(amount > 0, "BondDepository: nothing to claim");
        bondsOf[msg.sender][bondIndex].claimed += amount;
        pept.transfer(msg.sender, amount);
        emit Claimed(msg.sender, bondIndex, amount);
    }
}
