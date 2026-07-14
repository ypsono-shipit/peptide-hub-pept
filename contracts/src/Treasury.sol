// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PEPT} from "./PEPT.sol";

/// @title Treasury
/// @notice Holds bonded reserve assets (stables, LP, whitelisted Robinhood
///         Chain Stock Tokens such as LLY/TSHA) and protocol-owned
///         liquidity. Mirrors OlympusDAO's Treasury.sol at a much simpler
///         scope — no per-asset backing-value accounting yet, just an
///         authorized-depositor ledger. Perps trading fees and any Stock
///         Token dividends are expected to flow in here and out to Staking.
contract Treasury is Ownable {
    using SafeERC20 for IERC20;

    PEPT public immutable pept;

    mapping(address => bool) public reserveTokens; // whitelisted bonding/collateral assets
    mapping(address => bool) public depositors; // e.g. BondDepository, PerpsEngine (fee sweep)

    event ReserveTokenSet(address indexed token, bool allowed);
    event DepositorSet(address indexed depositor, bool allowed);
    event Deposited(address indexed depositor, address indexed token, uint256 amount);
    event Withdrawn(address indexed to, address indexed token, uint256 amount);

    constructor(address peptToken) Ownable(msg.sender) {
        pept = PEPT(peptToken);
    }

    modifier onlyDepositor() {
        require(depositors[msg.sender], "Treasury: not a depositor");
        _;
    }

    function setReserveToken(address token, bool allowed) external onlyOwner {
        reserveTokens[token] = allowed;
        emit ReserveTokenSet(token, allowed);
    }

    function setDepositor(address depositor, bool allowed) external onlyOwner {
        depositors[depositor] = allowed;
        emit DepositorSet(depositor, allowed);
    }

    /// @dev Called by BondDepository after pulling `token` from the bonder.
    function notifyDeposit(address token, uint256 amount) external onlyDepositor {
        require(reserveTokens[token], "Treasury: unlisted reserve token");
        emit Deposited(msg.sender, token, amount);
    }

    /// @notice Owner-governed withdrawal, e.g. to fund Staking rewards or
    ///         seed protocol-owned liquidity. Intended to sit behind a
    ///         multisig/timelock before mainnet.
    function withdraw(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
        emit Withdrawn(to, token, amount);
    }
}
