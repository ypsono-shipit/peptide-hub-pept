// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title PEPT
/// @notice Protocol token. Mint rights are granted only to the Treasury and
///         BondDepository (see OlympusDAO's OlympusERC20Token.sol for the
///         pattern this mirrors), so supply only grows through backed
///         issuance — never an arbitrary owner mint.
contract PEPT is ERC20, ERC20Burnable, Ownable {
    mapping(address => bool) public minters;

    event MinterSet(address indexed minter, bool allowed);

    constructor() ERC20("Peptide Hub", "PEPT") Ownable(msg.sender) {}

    modifier onlyMinter() {
        require(minters[msg.sender], "PEPT: not a minter");
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
