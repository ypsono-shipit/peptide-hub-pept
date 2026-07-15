import { ethers } from "hardhat";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import deployment from "../deployments/testnet.json";

// Redeploys PeptideOracle (new circuit-breaker/per-market-staleness features
// — contract code changed, address must change) and PerpsEngine (immutable
// oracle reference). Reuses existing PEPT/Treasury/Staking/BondDepository/
// tPUSD collateral. Retires the old stock-ticker-themed "GLP1-BASKET" market
// in favor of a real weighted GLP-1 peptide index. Adds Semaglutide as the
// flagship live market; Tirzepatide/Retatrutide are priced (for the index
// weighting) but NOT configured as tradeable PerpsEngine markets — "Coming
// Soon" in the UI until launched.
//
// All prices are admin-bootstrapped from real reference data (PeptidePricing.com
// / PeptideScouter.com cross-vendor medians, manually researched — see
// deployments/testnet.json for citations), not a live feed. 48h staleness
// means these need re-pushing at least every 2 days to stay tradeable.

const PEPTIDE_STALENESS = 48 * 60 * 60; // 48 hours, per spec

const SOURCE_NOTE = "PeptidePricing.com + PeptideScouter.com cross-vendor median, manual bootstrap (2026-07-15)";

// $/mg reference prices
const SEMAGLUTIDE_PRICE = 5.0;
const TIRZEPATIDE_PRICE = 5.5;
const RETATRUTIDE_PRICE = 6.37;
const GLP1_INDEX_WEIGHTS = { semaglutide: 0.6, tirzepatide: 0.25, retatrutide: 0.15 };
const GLP1_INDEX_PRICE =
  SEMAGLUTIDE_PRICE * GLP1_INDEX_WEIGHTS.semaglutide +
  TIRZEPATIDE_PRICE * GLP1_INDEX_WEIGHTS.tirzepatide +
  RETATRUTIDE_PRICE * GLP1_INDEX_WEIGHTS.retatrutide;

const EXISTING_MARKETS = [
  { symbol: "PEPT-USD", price: "1.00", maxLeverageX: 10 },
  { symbol: "LLY-PERP", price: "812.44", maxLeverageX: 10 },
  { symbol: "TSHA-PERP", price: "6.72", maxLeverageX: 5 },
];

async function main() {
  const PeptideOracle = await ethers.getContractFactory("PeptideOracle");
  const oracle = await PeptideOracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("New PeptideOracle (v2, circuit breaker + per-market staleness):", oracleAddress);

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

  // Re-push existing markets (default 30-day staleness — no real source behind them)
  for (const m of EXISTING_MARKETS) {
    const marketKey = ethers.keccak256(ethers.toUtf8Bytes(m.symbol));
    await (await oracle.pushPrice(marketKey, ethers.parseEther(m.price), "admin bootstrap, no live source")).wait();
    const tx = await perpsEngine.setMarket(marketKey, true, m.maxLeverageX * 10_000, 1, 5, 10, 100, 500);
    await tx.wait();
    console.log(`${m.symbol}: price=$${m.price}, ${m.maxLeverageX}x max leverage`);
  }

  // Semaglutide — flagship, live at launch
  const semaKey = ethers.keccak256(ethers.toUtf8Bytes("SEMA-PERP"));
  await (await oracle.pushPrice(semaKey, ethers.parseEther(SEMAGLUTIDE_PRICE.toFixed(4)), SOURCE_NOTE)).wait();
  await (await oracle.setStalenessWindow(semaKey, PEPTIDE_STALENESS)).wait();
  await (await perpsEngine.setMarket(semaKey, true, 10 * 10_000, 1, 5, 10, 100, 500)).wait();
  console.log(`SEMA-PERP: price=$${SEMAGLUTIDE_PRICE}/mg, 10x max leverage, 48h staleness`);

  // GLP-1 Index — weighted basket, live at launch
  const glp1IdxKey = ethers.keccak256(ethers.toUtf8Bytes("GLP1-IDX-PERP"));
  await (await oracle.pushPrice(glp1IdxKey, ethers.parseEther(GLP1_INDEX_PRICE.toFixed(4)), `Weighted 60% Semaglutide / 25% Tirzepatide / 15% Retatrutide — ${SOURCE_NOTE}`)).wait();
  await (await oracle.setStalenessWindow(glp1IdxKey, PEPTIDE_STALENESS)).wait();
  await (await perpsEngine.setMarket(glp1IdxKey, true, 5 * 10_000, 1, 5, 10, 150, 750)).wait();
  console.log(`GLP1-IDX-PERP: price=$${GLP1_INDEX_PRICE.toFixed(4)}/mg, 5x max leverage, 48h staleness`);

  // Tirzepatide / Retatrutide — priced for index weighting only, NOT
  // configured as PerpsEngine markets — "Coming Soon", not tradeable.
  const tirzKey = ethers.keccak256(ethers.toUtf8Bytes("TIRZ-PERP"));
  await (await oracle.pushPrice(tirzKey, ethers.parseEther(TIRZEPATIDE_PRICE.toFixed(4)), SOURCE_NOTE)).wait();
  await (await oracle.setStalenessWindow(tirzKey, PEPTIDE_STALENESS)).wait();
  console.log(`TIRZ-PERP: price=$${TIRZEPATIDE_PRICE}/mg pushed (reference only) — Coming Soon, no PerpsEngine market`);

  const retaKey = ethers.keccak256(ethers.toUtf8Bytes("RETA-PERP"));
  await (await oracle.pushPrice(retaKey, ethers.parseEther(RETATRUTIDE_PRICE.toFixed(4)), SOURCE_NOTE)).wait();
  await (await oracle.setStalenessWindow(retaKey, PEPTIDE_STALENESS)).wait();
  console.log(`RETA-PERP: price=$${RETATRUTIDE_PRICE}/mg pushed (reference only) — Coming Soon, no PerpsEngine market`);

  const deploymentPath = join(__dirname, "..", "deployments", "testnet.json");
  const current = JSON.parse(readFileSync(deploymentPath, "utf8"));
  current.contracts.PeptideOracle = oracleAddress;
  current.contracts.PerpsEngine = perpsEngineAddress;
  current.oraclePrices = {
    note: "Admin-pushed prices. PEPT-USD/LLY-PERP/TSHA-PERP have no real source (30-day staleness). SEMA-PERP/GLP1-IDX-PERP/TIRZ-PERP/RETA-PERP are bootstrapped from real PeptidePricing.com + PeptideScouter.com cross-vendor medians (48h staleness — must be refreshed at least every 2 days to stay tradeable; run scripts/push-glp1-prices.ts). GLP1-BASKET (old stock-ticker theme) retired in favor of GLP1-IDX-PERP.",
    "PEPT-USD": "1.00",
    "LLY-PERP": "812.44",
    "TSHA-PERP": "6.72",
    "SEMA-PERP": `${SEMAGLUTIDE_PRICE} USD/mg`,
    "GLP1-IDX-PERP": `${GLP1_INDEX_PRICE.toFixed(4)} USD/mg (60% SEMA / 25% TIRZ / 15% RETA)`,
    "TIRZ-PERP": `${TIRZEPATIDE_PRICE} USD/mg (reference only, not tradeable — Coming Soon)`,
    "RETA-PERP": `${RETATRUTIDE_PRICE} USD/mg (reference only, not tradeable — Coming Soon)`,
    pushedAt: new Date().toISOString(),
    stalenessWindow: "30 days default (pushed, no real source), 48h (real peptide markets), 15 minutes (Chainlink)",
  };
  writeFileSync(deploymentPath, JSON.stringify(current, null, 2) + "\n");
  console.log("Updated deployments/testnet.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
