import { expect } from "chai";
import { ethers } from "hardhat";

describe("BondDepository", () => {
  it("mints a discounted PEPT payout that vests linearly and is claimable", async () => {
    const [deployer, bonder] = await ethers.getSigners();

    const PEPT = await ethers.getContractFactory("PEPT");
    const pept = await PEPT.deploy();

    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(await pept.getAddress());

    const BondDepository = await ethers.getContractFactory("BondDepository");
    const bondDepository = await BondDepository.deploy(await pept.getAddress(), await treasury.getAddress());

    await pept.setMinter(await bondDepository.getAddress(), true);
    await treasury.setDepositor(await bondDepository.getAddress(), true);

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const reserveToken = await MockERC20.deploy("Mock LLY", "mLLY");
    await reserveToken.mint(bonder.address, ethers.parseEther("1000"));

    await treasury.setReserveToken(await reserveToken.getAddress(), true);

    const vestingTerm = 7 * 24 * 60 * 60; // 7 days
    await bondDepository.setMarket(await reserveToken.getAddress(), true, 500, vestingTerm); // 5% discount

    await reserveToken.connect(bonder).approve(await bondDepository.getAddress(), ethers.parseEther("100"));
    const referencePrice = ethers.parseEther("1"); // 1 mLLY = 1 PEPT before discount

    await bondDepository.connect(bonder).bond(await reserveToken.getAddress(), ethers.parseEther("100"), referencePrice);

    const bond = await bondDepository.bondsOf(bonder.address, 0);
    expect(bond.payout).to.be.gt(ethers.parseEther("100")); // discount means more PEPT than input

    // Nothing vested yet.
    expect(await bondDepository.claimable(bonder.address, 0)).to.equal(0);

    await ethers.provider.send("evm_increaseTime", [vestingTerm]);
    await ethers.provider.send("evm_mine", []);

    expect(await bondDepository.claimable(bonder.address, 0)).to.equal(bond.payout);

    await bondDepository.connect(bonder).claim(0);
    expect(await pept.balanceOf(bonder.address)).to.equal(bond.payout);
  });
});
