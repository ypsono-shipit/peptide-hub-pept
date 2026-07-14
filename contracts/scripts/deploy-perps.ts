import { ethers } from "hardhat";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import deployment from "../deployments/testnet.json";

// Deploys a testnet-only mock collateral token (no real Stock Token is
// usable — see deployments/testnet.json oraclePrices note) and PerpsEngine
// against it, then configures all 4 markets. Demo/testnet only.
const MARKETS = [
  { symbol: "PEPT-IDX", maxLeverageX: 10, makerFeeBps: 5, takerFeeBps: 10, liquidationFeeBps: 100, maintenanceMarginBps: 500 },
  { symbol: "LLY-PERP", maxLeverageX: 10, makerFeeBps: 5, takerFeeBps: 10, liquidationFeeBps: 100, maintenanceMarginBps: 500 },
  { symbol: "TSHA-PERP", maxLeverageX: 5, makerFeeBps: 5, takerFeeBps: 10, liquidationFeeBps: 150, maintenanceMarginBps: 750 },
  { symbol: "GLP1-BASKET", maxLeverageX: 5, makerFeeBps: 5, takerFeeBps: 10, liquidationFeeBps: 150, maintenanceMarginBps: 750 },
];

async function main() {
  const [deployer] = await ethers.getSigners();

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const collateral = await MockERC20.deploy("Peptide Hub Test USD", "tPUSD");
  await collateral.waitForDeployment();
  const collateralAddress = await collateral.getAddress();
  console.log("Test collateral (tPUSD):", collateralAddress);

  await (await collateral.mint(deployer.address, ethers.parseEther("1000000"))).wait();
  console.log("Minted 1,000,000 tPUSD to deployer");

  const PerpsEngine = await ethers.getContractFactory("PerpsEngine");
  const perpsEngine = await PerpsEngine.deploy(collateralAddress, deployment.contracts.PeptideOracle, deployment.contracts.Treasury);
  await perpsEngine.waitForDeployment();
  const perpsEngineAddress = await perpsEngine.getAddress();
  console.log("PerpsEngine:", perpsEngineAddress);

  const treasury = await ethers.getContractAt("Treasury", deployment.contracts.Treasury);
  await (await treasury.setReserveToken(collateralAddress, true)).wait();
  await (await treasury.setDepositor(perpsEngineAddress, true)).wait();
  console.log("Treasury: whitelisted tPUSD as reserve token, granted PerpsEngine depositor rights");

  for (const m of MARKETS) {
    const marketKey = ethers.keccak256(ethers.toUtf8Bytes(m.symbol));
    const tx = await perpsEngine.setMarket(
      marketKey,
      true,
      m.maxLeverageX * 10_000,
      1, // funding rate: 0.01%/hr placeholder
      m.makerFeeBps,
      m.takerFeeBps,
      m.liquidationFeeBps,
      m.maintenanceMarginBps
    );
    await tx.wait();
    console.log(`Market ${m.symbol} configured: ${m.maxLeverageX}x max leverage, tx=${tx.hash}`);
  }

  const deploymentPath = join(__dirname, "..", "deployments", "testnet.json");
  const current = JSON.parse(readFileSync(deploymentPath, "utf8"));
  current.contracts.PerpsEngine = perpsEngineAddress;
  current.contracts.TestCollateral_tPUSD = collateralAddress;
  writeFileSync(deploymentPath, JSON.stringify(current, null, 2) + "\n");
  console.log("Updated deployments/testnet.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
