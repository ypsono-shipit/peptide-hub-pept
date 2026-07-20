// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title SEMA — Semaglutide research spot token
/// @notice 1 SEMA is intended to represent 1 research vial unit for future
///         controlled redemption. Mint is owner/minter-gated for launch + LP seed.
///         Not for human consumption. Research use only.
contract SemaToken is ERC20, ERC20Burnable, Ownable {
    mapping(address => bool) public minters;

    event MinterSet(address indexed minter, bool allowed);

    constructor(address initialOwner) ERC20("Semaglutide Research", "SEMA") Ownable(initialOwner) {
        if (initialOwner != address(0)) {
            minters[initialOwner] = true;
            emit MinterSet(initialOwner, true);
        }
    }

    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "SEMA: not minter");
        _;
    }

    function setMinter(address minter, bool allowed) external onlyOwner {
        minters[minter] = allowed;
        emit MinterSet(minter, allowed);
    }

    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }
}
