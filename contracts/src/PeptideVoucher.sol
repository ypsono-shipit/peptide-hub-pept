// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title PeptideVoucher — minimal ERC-721 receipt for a research kit purchase
/// @notice Minted when a buyer pays USDC on MarketplaceShop. Holds a claim that can
///         eventually be redeemed for the physical Research Only peptide kit.
/// @dev Lightweight ERC-721 (no OZ ERC721) so we stay on paris/cancun-free opcodes
///      compatible with Robinhood Chain Testnet.
contract PeptideVoucher is Ownable {
    string public constant name = "PEPT Peptide Voucher";
    string public constant symbol = "PEPT-KIT";

    address public minter;
    uint256 private _nextId = 1;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    struct VoucherData {
        bytes32 productId;
        uint64 purchasedAt;
        bool redeemed;
    }

    mapping(uint256 => VoucherData) public vouchers;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event MinterSet(address indexed minter);
    event VoucherMinted(address indexed to, uint256 indexed tokenId, bytes32 indexed productId);
    event VoucherRedeemed(uint256 indexed tokenId, address indexed by);

    constructor() Ownable(msg.sender) {}

    function setMinter(address minter_) external onlyOwner {
        minter = minter_;
        emit MinterSet(minter_);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC165
            interfaceId == 0x80ac58cd || // ERC721
            interfaceId == 0x5b5e139f; // ERC721Metadata
    }

    function balanceOf(address owner) public view returns (uint256) {
        require(owner != address(0), "Voucher: zero");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _owners[tokenId];
        require(o != address(0), "Voucher: missing");
        return o;
    }

    function approve(address to, uint256 tokenId) external {
        address o = ownerOf(tokenId);
        require(to != o, "Voucher: self");
        require(msg.sender == o || isApprovedForAll(o, msg.sender), "Voucher: auth");
        _tokenApprovals[tokenId] = to;
        emit Approval(o, to, tokenId);
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "Voucher: missing");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        require(operator != msg.sender, "Voucher: self");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Voucher: auth");
        require(ownerOf(tokenId) == from, "Voucher: from");
        require(to != address(0), "Voucher: zero");
        require(!vouchers[tokenId].redeemed, "Voucher: redeemed");
        delete _tokenApprovals[tokenId];
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata) external {
        transferFrom(from, to, tokenId);
    }

    function mint(address to, bytes32 productId) external returns (uint256 tokenId) {
        require(msg.sender == minter, "Voucher: not minter");
        require(to != address(0), "Voucher: zero");
        require(productId != bytes32(0), "Voucher: product");

        tokenId = _nextId++;
        _owners[tokenId] = to;
        _balances[to] += 1;
        vouchers[tokenId] = VoucherData({
            productId: productId,
            purchasedAt: uint64(block.timestamp),
            redeemed: false
        });
        emit Transfer(address(0), to, tokenId);
        emit VoucherMinted(to, tokenId, productId);
    }

    /// @notice Mark voucher redeemed (physical kit fulfilled). Token owner or contract owner.
    function redeem(uint256 tokenId) external {
        require(_owners[tokenId] != address(0), "Voucher: missing");
        VoucherData storage v = vouchers[tokenId];
        require(!v.redeemed, "Voucher: already redeemed");
        require(msg.sender == ownerOf(tokenId) || msg.sender == owner(), "Voucher: auth");
        v.redeemed = true;
        emit VoucherRedeemed(tokenId, msg.sender);
    }

    function productOf(uint256 tokenId) external view returns (bytes32) {
        require(_owners[tokenId] != address(0), "Voucher: missing");
        return vouchers[tokenId].productId;
    }

    function isRedeemed(uint256 tokenId) external view returns (bool) {
        require(_owners[tokenId] != address(0), "Voucher: missing");
        return vouchers[tokenId].redeemed;
    }

    function totalMinted() external view returns (uint256) {
        return _nextId - 1;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Voucher: missing");
        VoucherData memory v = vouchers[tokenId];
        string memory status = v.redeemed ? "redeemed" : "unredeemed";
        return string(
            abi.encodePacked(
                "data:application/json,{",
                '"name":"PEPT Kit Voucher #',
                _toString(tokenId),
                '","description":"Redeemable claim for a Pept Trade x Research Only research peptide kit.",',
                '"attributes":[',
                '{"trait_type":"productId","value":"',
                _toHex(v.productId),
                '"},',
                '{"trait_type":"status","value":"',
                status,
                '"}',
                "]}",
                ""
            )
        );
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address o = ownerOf(tokenId);
        return (spender == o || getApproved(tokenId) == spender || isApprovedForAll(o, spender));
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _toHex(bytes32 data) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(66);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
}
