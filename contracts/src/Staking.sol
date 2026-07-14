// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PEPT} from "./PEPT.sol";

/// @title Staking
/// @notice Stake PEPT, earn real yield funded by perps trading fees and
///         Treasury returns (swept in by the owner via `notifyRewardAmount`,
///         e.g. from a Treasury withdrawal). Uses a standard
///         accRewardPerShare accumulator rather than OHM's rebasing
///         sPEPT/gOHM wrapper — simpler to reason about for a v1, but
///         revisit if a rebasing balance is desired for UX parity with OHM.
contract Staking is Ownable {
    using SafeERC20 for IERC20;

    PEPT public immutable pept;

    uint256 public totalStaked;
    uint256 public accRewardPerShare; // scaled by 1e18

    mapping(address => uint256) public stakedOf;
    mapping(address => uint256) public rewardDebt;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardAdded(uint256 amount);

    constructor(address peptToken) Ownable(msg.sender) {
        pept = PEPT(peptToken);
    }

    function pendingReward(address user) public view returns (uint256) {
        return (stakedOf[user] * accRewardPerShare / 1e18) - rewardDebt[user];
    }

    function stake(uint256 amount) external {
        _claim(msg.sender);
        pept.transferFrom(msg.sender, address(this), amount);
        stakedOf[msg.sender] += amount;
        totalStaked += amount;
        rewardDebt[msg.sender] = stakedOf[msg.sender] * accRewardPerShare / 1e18;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external {
        require(stakedOf[msg.sender] >= amount, "Staking: insufficient stake");
        _claim(msg.sender);
        stakedOf[msg.sender] -= amount;
        totalStaked -= amount;
        rewardDebt[msg.sender] = stakedOf[msg.sender] * accRewardPerShare / 1e18;
        pept.transfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    function claim() external {
        _claim(msg.sender);
    }

    function _claim(address user) internal {
        uint256 pending = pendingReward(user);
        rewardDebt[user] = stakedOf[user] * accRewardPerShare / 1e18;
        if (pending > 0) {
            pept.transfer(user, pending);
            emit RewardClaimed(user, pending);
        }
    }

    /// @notice Funds the reward pool. Caller must have approved this
    ///         contract for `amount` PEPT beforehand (e.g. Treasury owner
    ///         after a fee-sweep + market-buy/mint step).
    function notifyRewardAmount(uint256 amount) external onlyOwner {
        require(totalStaked > 0, "Staking: nothing staked");
        pept.transferFrom(msg.sender, address(this), amount);
        accRewardPerShare += amount * 1e18 / totalStaked;
        emit RewardAdded(amount);
    }
}
