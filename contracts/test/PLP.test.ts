import { expect } from "chai";
import { ethers } from "hardhat";

describe("PLP + PerpsEngine", () => {
  async function fixture() {
    const [owner, lp, trader] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockERC20");
    const collateral = await Mock.deploy("tPUSD", "tPUSD");
    await collateral.waitForDeployment();

    const Oracle = await ethers.getContractFactory("PeptideOracle");
    const oracle = await Oracle.deploy();
    await oracle.waitForDeployment();

    const PEPT = await ethers.getContractFactory("PEPT");
    const pept = await PEPT.deploy();
    await pept.waitForDeployment();

    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(await pept.getAddress());
    await treasury.waitForDeployment();

    const PLPToken = await ethers.getContractFactory("PLP");
    const plpToken = await PLPToken.deploy();
    await plpToken.waitForDeployment();

    const Pool = await ethers.getContractFactory("PerpsLiquidityPool");
    const pool = await Pool.deploy(await collateral.getAddress(), await plpToken.getAddress());
    await pool.waitForDeployment();
    await (await plpToken.setMinter(await pool.getAddress())).wait();

    const Engine = await ethers.getContractFactory("PerpsEngine");
    const engine = await Engine.deploy(
      await collateral.getAddress(),
      await oracle.getAddress(),
      await treasury.getAddress(),
    );
    await engine.waitForDeployment();

    await (await pool.setEngine(await engine.getAddress())).wait();
    await (await engine.setLiquidityPool(await pool.getAddress())).wait();

    const marketKey = ethers.keccak256(ethers.toUtf8Bytes("SEMA-PERP"));
    await (await oracle.pushPrice(marketKey, ethers.parseEther("5"), "test")).wait();
    // 48h window not needed for default 30d
    await (
      await engine.setMarket(
        marketKey,
        true,
        10 * 10_000, // 10x
        1,
        5,
        10, // 0.1% taker
        100,
        500,
      )
    ).wait();

    // Fund LP + trader
    await (await collateral.mint(lp.address, ethers.parseEther("100000"))).wait();
    await (await collateral.mint(trader.address, ethers.parseEther("10000"))).wait();

    return { owner, lp, trader, collateral, oracle, pool, plpToken, engine, marketKey };
  }

  it("mints PLP 1:1 on first deposit and accrues shares fairly", async () => {
    const { lp, collateral, pool, plpToken } = await fixture();
    await (await collateral.connect(lp).approve(await pool.getAddress(), ethers.parseEther("1000"))).wait();
    await (await pool.connect(lp).deposit(ethers.parseEther("1000"))).wait();
    expect(await plpToken.balanceOf(lp.address)).to.equal(ethers.parseEther("1000"));
    expect(await pool.totalAssets()).to.equal(ethers.parseEther("1000"));
    expect(await pool.maxOpenInterest()).to.equal(ethers.parseEther("500")); // 50% util
  });

  it("caps open interest by PLP AUM and routes fees to pool", async () => {
    const { lp, trader, collateral, pool, engine, marketKey } = await fixture();

    await (await collateral.connect(lp).approve(await pool.getAddress(), ethers.parseEther("1000"))).wait();
    await (await pool.connect(lp).deposit(ethers.parseEther("1000"))).wait();

    // max OI = 500 tPUSD notional. Try open 400 OK, then +200 should fail
    const collat = ethers.parseEther("100"); // 4x on 400 size
    await (await collateral.connect(trader).approve(await engine.getAddress(), ethers.parseEther("10000"))).wait();

    await (
      await engine.connect(trader).openPosition(marketKey, true, ethers.parseEther("400"), collat)
    ).wait();

    expect(await engine.totalOpenInterest()).to.equal(ethers.parseEther("400"));
    expect(await pool.openInterestUsd()).to.equal(ethers.parseEther("400"));
    // fee 0.1% of 400 = 0.4 went to pool
    expect(await pool.totalFeesReceived()).to.equal(ethers.parseEther("0.4"));

    await expect(
      engine.connect(trader).openPosition(marketKey, true, ethers.parseEther("200"), ethers.parseEther("50")),
    ).to.be.revertedWith("PerpsEngine: exceeds PLP capacity");
  });

  it("settles profit from PLP and loss back to PLP", async () => {
    const { lp, trader, collateral, oracle, pool, engine, marketKey } = await fixture();

    await (await collateral.connect(lp).approve(await pool.getAddress(), ethers.parseEther("10000"))).wait();
    await (await pool.connect(lp).deposit(ethers.parseEther("10000"))).wait();
    await (await collateral.connect(trader).approve(await engine.getAddress(), ethers.parseEther("10000"))).wait();

    const size = ethers.parseEther("100");
    const collat = ethers.parseEther("50"); // 2x
    const tx = await engine.connect(trader).openPosition(marketKey, true, size, collat);
    const rc = await tx.wait();
    // position id 1
    const aumAfterOpen = await pool.totalAssets();

    // Price +20% → long profit ≈ 20
    await (await oracle.forcePushPrice(marketKey, ethers.parseEther("6"), "up")).wait();
    const balBefore = await collateral.balanceOf(trader.address);
    await (await engine.connect(trader).closePosition(1)).wait();
    const balAfter = await collateral.balanceOf(trader.address);
    expect(balAfter).to.be.gt(balBefore);
    // pool paid profit
    expect(await pool.totalProfitsPaid()).to.be.gt(0);
    expect(await engine.totalOpenInterest()).to.equal(0n);

    // Open short, price up → short loses to pool
    await (await oracle.forcePushPrice(marketKey, ethers.parseEther("5"), "reset")).wait();
    await (await engine.connect(trader).openPosition(marketKey, false, size, collat)).wait();
    const lossesBefore = await pool.totalLossesReceived();
    await (await oracle.forcePushPrice(marketKey, ethers.parseEther("6"), "up2")).wait();
    await (await engine.connect(trader).closePosition(2)).wait();
    expect(await pool.totalLossesReceived()).to.be.gt(lossesBefore);
    void aumAfterOpen;
  });

  it("blocks LP withdraw that breaches OI reserve", async () => {
    const { lp, trader, collateral, pool, plpToken, engine, marketKey } = await fixture();
    await (await collateral.connect(lp).approve(await pool.getAddress(), ethers.parseEther("1000"))).wait();
    await (await pool.connect(lp).deposit(ethers.parseEther("1000"))).wait();
    await (await collateral.connect(trader).approve(await engine.getAddress(), ethers.parseEther("10000"))).wait();
    await (
      await engine.connect(trader).openPosition(marketKey, true, ethers.parseEther("400"), ethers.parseEther("100"))
    ).wait();

    // Try withdraw almost all PLP — should fail (reserved for OI)
    const shares = await plpToken.balanceOf(lp.address);
    await expect(pool.connect(lp).withdraw(shares)).to.be.revertedWith(
      "PLP pool: reserved for open interest",
    );

    // Small withdraw still ok
    await expect(pool.connect(lp).withdraw(ethers.parseEther("10"))).to.not.be.reverted;
  });
});
