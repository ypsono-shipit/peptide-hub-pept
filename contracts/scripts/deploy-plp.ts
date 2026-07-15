import { ethers } from "hardhat";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import deployment from "../deployments/testnet.json";

/**
 * Deploys PLP + PerpsLiquidityPool, redeploys PerpsEngine wired to the pool,
 * re-configures core markets, seeds initial LP liquidity from deployer tPUSD
 * (mints if needed), and updates deployments/testnet.json.
 *
 * Keeps existing tPUSD + Oracle + Treasury addresses.
 */
const MARKETS = [
  { symbol: "SEMA-PERP", maxLeverageX: 10, takerFeeBps: 10, liquidationFeeBps: 100, maintenanceMarginBps: 500 },
  { symbol: "GLP1-IDX-PERP", maxLeverageX: 10, takerFeeBps: 10, liquidationFeeBps: 100, maintenanceMarginBps: 500 },
  { symbol: "TIRZ-PERP", maxLeverageX: 10, takerFeeBps: 10, liquidationFeeBps: 100, maintenanceMarginBps: 500 },
  { symbol: "RETA-PERP", maxLeverageX: 10, takerFeeBps: 10, liquidationFeeBps: 100, maintenanceMarginBps: 500 },
  { symbol: "PEPT-USD", maxLeverageX: 5, takerFeeBps: 10, liquidationFeeBps: 150, maintenanceMarginBps: 750 },
  { symbol: "LLY-PERP", maxLeverageX: 10, takerFeeBps: 10, liquidationFeeBps: 100, maintenanceMarginBps: 500 },
  { symbol: "TSHA-PERP", maxLeverageX: 5, takerFeeBps: 10, liquidationFeeBps: 150, maintenanceMarginBps: 750 },
];

const SEED_LP = ethers.parseEther("100000"); // 100k tPUSD seed

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const collateralAddr = deployment.contracts.TestCollateral_tPUSD;
  if (!collateralAddr) throw new Error("missing tPUSD in deployments");
  const collateral = await ethers.getContractAt("MockERC20", collateralAddr);

  const PLP = await ethers.getContractFactory("PLP");
  const plpToken = await PLP.deploy();
  await plpToken.waitForDeployment();
  const plpTokenAddr = await plpToken.getAddress();
  console.log("PLP token:", plpTokenAddr);

  const Pool = await ethers.getContractFactory("PerpsLiquidityPool");
  const pool = await Pool.deploy(collateralAddr, plpTokenAddr);
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log("PerpsLiquidityPool:", poolAddr);

  await (await plpToken.setMinter(poolAddr)).wait();
  console.log("PLP minter → pool");

  const Engine = await ethers.getContractFactory("PerpsEngine");
  const engine = await Engine.deploy(
    collateralAddr,
    deployment.contracts.PeptideOracle!,
    deployment.contracts.Treasury!,
  );
  await engine.waitForDeployment();
  const engineAddr = await engine.getAddress();
  console.log("PerpsEngine (new):", engineAddr);

  await (await pool.setEngine(engineAddr)).wait();
  await (await engine.setLiquidityPool(poolAddr)).wait();
  console.log("Engine ↔ Pool linked");

  // Treasury depositor rights for fee sweeps (legacy path)
  const treasury = await ethers.getContractAt("Treasury", deployment.contracts.Treasury!);
  try {
    await (await treasury.setDepositor(engineAddr, true)).wait();
    await (await treasury.setReserveToken(collateralAddr, true)).wait();
  } catch (e) {
    console.warn("Treasury setDepositor/reserve (may already be set):", e);
  }

  for (const m of MARKETS) {
    const key = ethers.keccak256(ethers.toUtf8Bytes(m.symbol));
    await (
      await engine.setMarket(
        key,
        true,
        m.maxLeverageX * 10_000,
        1,
        5,
        m.takerFeeBps,
        m.liquidationFeeBps,
        m.maintenanceMarginBps,
      )
    ).wait();
    console.log(`Market ${m.symbol} active @ ${m.maxLeverageX}x`);
  }

  // Seed LP liquidity
  const bal = await collateral.balanceOf(deployer.address);
  if (bal < SEED_LP) {
    await (await collateral.mint(deployer.address, SEED_LP - bal)).wait();
    console.log("Minted tPUSD for seed");
  }
  await (await collateral.approve(poolAddr, SEED_LP)).wait();
  await (await pool.deposit(SEED_LP)).wait();
  console.log("Seeded PLP with", ethers.formatEther(SEED_LP), "tPUSD");
  console.log("maxOpenInterest:", ethers.formatEther(await pool.maxOpenInterest()));

  const deploymentPath = join(__dirname, "..", "deployments", "testnet.json");
  const current = JSON.parse(readFileSync(deploymentPath, "utf8"));
  current.contracts.PerpsEngine = engineAddr;
  current.contracts.PLP = plpTokenAddr;
  current.contracts.PerpsLiquidityPool = poolAddr;
  current.plp = {
    seededAt: new Date().toISOString(),
    seedAmount: ethers.formatEther(SEED_LP),
    maxUtilizationBps: 5000,
    reserveBps: 2000,
    note: "GMX-style LP vault. OI capped at 50% of AUM. Fees + losses to LPs; profits paid from pool.",
  };
  writeFileSync(deploymentPath, JSON.stringify(current, null, 2) + "\n");
  console.log("Updated deployments/testnet.json");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
