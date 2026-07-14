import { ethers } from "hardhat";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import deployment from "../deployments/testnet.json";

// PeptideOracle's staleness window changed (pushPrice path: 15min -> 30d),
// and PerpsEngine holds an immutable reference to the oracle address, so
// both need redeploying together. Reuses the existing PEPT/Treasury/
// Staking/BondDepository/tPUSD collateral — only Oracle + PerpsEngine are
// new addresses.
const MARKETS = [
  { symbol: "PEPT-USD", price: "1.00", maxLeverageX: 10 }, // PEPT-IDX display symbol, oracle key seed is PEPT-USD
  { symbol: "LLY-PERP", price: "812.44", maxLeverageX: 10 },
  { symbol: "TSHA-PERP", price: "6.72", maxLeverageX: 5 },
  { symbol: "GLP1-BASKET", price: "118.05", maxLeverageX: 5 },
];

async function main() {
  const PeptideOracle = await ethers.getContractFactory("PeptideOracle");
  const oracle = await PeptideOracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("New PeptideOracle:", oracleAddress);

  const PerpsEngine = await ethers.getContractFactory("PerpsEngine");
  const perpsEngine = await PerpsEngine.deploy(
    deployment.contracts.TestCollateral_tPUSD!,
    oracleAddress,
    deployment.contracts.Treasury
  );
  await perpsEngine.waitForDeployment();
  const perpsEngineAddress = await perpsEngine.getAddress();
  console.log("New PerpsEngine:", perpsEngineAddress);

  const treasury = await ethers.getContractAt("Treasury", deployment.contracts.Treasury);
  await (await treasury.setDepositor(perpsEngineAddress, true)).wait();
  console.log("Treasury: granted new PerpsEngine depositor rights");

  for (const m of MARKETS) {
    const marketKey = ethers.keccak256(ethers.toUtf8Bytes(m.symbol));
    await (await oracle.pushPrice(marketKey, ethers.parseEther(m.price))).wait();
    const tx = await perpsEngine.setMarket(marketKey, true, m.maxLeverageX * 10_000, 1, 5, 10, 100, 500);
    await tx.wait();
    console.log(`${m.symbol}: price=$${m.price}, ${m.maxLeverageX}x max leverage, marketKey=${marketKey}`);
  }

  const deploymentPath = join(__dirname, "..", "deployments", "testnet.json");
  const current = JSON.parse(readFileSync(deploymentPath, "utf8"));
  current.contracts.PeptideOracle = oracleAddress;
  current.contracts.PerpsEngine = perpsEngineAddress;
  current.oraclePrices.pushedAt = new Date().toISOString();
  current.oraclePrices.stalenessWindow = "30 days (pushed), 15 minutes (Chainlink) — see PeptideOracle.sol";
  writeFileSync(deploymentPath, JSON.stringify(current, null, 2) + "\n");
  console.log("Updated deployments/testnet.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
