// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title PeptLpGauge
/// @notice Stake Uniswap V2 SEMA/USDG LP to earn weekly PEPT points (airdrop ledger).
///         1 epoch = 7 days. Fixed `weeklyEmission` points distributed pro-rata to stakers
///         continuously within each epoch (MasterChef-style accrual).
///         Points are not transferrable tokens — claim updates score for PEPT airdrop.
contract PeptLpGauge is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant EPOCH_DURATION = 7 days;
    uint256 public constant PRECISION = 1e12;

    IERC20 public immutable lpToken;

    /// @notice Points emitted per full epoch across all stakers
    uint256 public weeklyEmission;

    /// @notice Genesis timestamp (start of epoch 0)
    uint256 public immutable startTime;

    uint256 public totalStaked;
    uint256 public accPointsPerShare;
    uint256 public lastRewardTime;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 points; // lifetime accrued (airdrop score)
    }

    mapping(address => UserInfo) public users;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event PointsAccrued(address indexed user, uint256 amount);
    event WeeklyEmissionUpdated(uint256 emission);

    constructor(address lpToken_, address owner_, uint256 weeklyEmission_) Ownable(owner_) {
        require(lpToken_ != address(0), "lp=0");
        lpToken = IERC20(lpToken_);
        weeklyEmission = weeklyEmission_;
        startTime = block.timestamp;
        lastRewardTime = block.timestamp;
    }

    function currentEpoch() public view returns (uint256) {
        if (block.timestamp < startTime) return 0;
        return (block.timestamp - startTime) / EPOCH_DURATION;
    }

    function epochEndsAt() public view returns (uint256) {
        return startTime + (currentEpoch() + 1) * EPOCH_DURATION;
    }

    function pendingPoints(address account) public view returns (uint256) {
        UserInfo memory u = users[account];
        uint256 _acc = accPointsPerShare;
        if (totalStaked > 0) {
            uint256 dt = block.timestamp - lastRewardTime;
            if (dt > 0) {
                // Stream weekly emission linearly over EPOCH_DURATION
                uint256 reward = (weeklyEmission * dt) / EPOCH_DURATION;
                _acc += (reward * PRECISION) / totalStaked;
            }
        }
        return u.points + (u.amount * _acc) / PRECISION - u.rewardDebt;
    }

    function updatePool() public {
        if (block.timestamp <= lastRewardTime) return;
        if (totalStaked == 0) {
            lastRewardTime = block.timestamp;
            return;
        }
        uint256 dt = block.timestamp - lastRewardTime;
        uint256 reward = (weeklyEmission * dt) / EPOCH_DURATION;
        accPointsPerShare += (reward * PRECISION) / totalStaked;
        lastRewardTime = block.timestamp;
    }

    function deposit(uint256 amount) external nonReentrant {
        updatePool();
        UserInfo storage u = users[msg.sender];
        _harvest(u, msg.sender);
        if (amount > 0) {
            lpToken.safeTransferFrom(msg.sender, address(this), amount);
            u.amount += amount;
            totalStaked += amount;
        }
        u.rewardDebt = (u.amount * accPointsPerShare) / PRECISION;
        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        UserInfo storage u = users[msg.sender];
        require(u.amount >= amount, "bal");
        updatePool();
        _harvest(u, msg.sender);
        if (amount > 0) {
            u.amount -= amount;
            totalStaked -= amount;
            lpToken.safeTransfer(msg.sender, amount);
        }
        u.rewardDebt = (u.amount * accPointsPerShare) / PRECISION;
        emit Withdraw(msg.sender, amount);
    }

    /// @notice Harvest points into lifetime score (no token transfer)
    function claimPoints() external nonReentrant {
        updatePool();
        UserInfo storage u = users[msg.sender];
        _harvest(u, msg.sender);
        u.rewardDebt = (u.amount * accPointsPerShare) / PRECISION;
    }

    function setWeeklyEmission(uint256 emission) external onlyOwner {
        updatePool();
        weeklyEmission = emission;
        emit WeeklyEmissionUpdated(emission);
    }

    function _harvest(UserInfo storage u, address account) internal {
        uint256 accumulated = (u.amount * accPointsPerShare) / PRECISION;
        if (accumulated > u.rewardDebt) {
            uint256 pending = accumulated - u.rewardDebt;
            u.points += pending;
            emit PointsAccrued(account, pending);
        }
    }
}
