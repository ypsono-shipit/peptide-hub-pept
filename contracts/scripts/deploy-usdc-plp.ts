import { ethers } from "hardhat";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import deployment from "../deployments/testnet.json";

/**
 * Switch collateral from self-minted tPUSD to Robinhood testnet USDC
 * (6 decimals, public mint — community test token on chain 46630).
 *
 * Redeploys PLP + PerpsLiquidityPool + PerpsEngine, seeds 100k USDC LP,
 * reconfigures markets, updates deployments/testnet.json + frontend expects.
 *
 * NOT official Circle USDC — see explorer holders for 0xAc8019… "USD Coin".
 */
export const TESTNET_USDC = "0xAc80194dc1aE8eF52df73e7e1864fB3C62290fe0";

const MARKETS = [
  { symbol: "SEMA-PERP", maxLeverageX: 10, takerFeeBps: 10, liquidationFeeBps: 100, maintenanceMarginBps: 500 },
  { symbol: "GLP1-IDX-PERP", maxLeverageX: 10, takerFeeBps: 10, liquidationFeeBps: 100, maintenanceMarginBps: 500 },
  { symbol: "TIRZ-PERP", maxLeverageX: 10, takerFeeBps: 10, liquidationFeeBps: 100, maintenanceMarginBps: 500 },
  { symbol: "RETA-PERP", maxLeverageX: 10, takerFeeBps: 10, liquidationFeeBps: 100, maintenanceMarginBps: 500 },
  { symbol: "PEPT-USD", maxLeverageX: 5, takerFeeBps: 10, liquidationFeeBps: 150, maintenanceMarginBps: 750 },
  { symbol: "LLY-PERP", maxLeverageX: 10, takerFeeBps: 10, liquidationFeeBps: 100, maintenanceMarginBps: 500 },
  { symbol: "TSHA-PERP", maxLeverageX: 5, takerFeeBps: 10, liquidationFeeBps: 150, maintenanceMarginBps: 750 },
];

// 100_000 USDC with 6 decimals
const SEED_LP = 100_000n * 1_000_000n;

const ERC20_MINT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function mint(address,uint256)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const usdc = new ethers.Contract(TESTNET_USDC, ERC20_MINT_ABI, deployer);
  const dec = await usdc.decimals();
  const sym = await usdc.symbol();
  const name = await usdc.name();
  console.log(`Collateral: ${name} (${sym}) decimals=${dec} @ ${TESTNET_USDC}`);
  if (Number(dec) !== 6) {
    console.warn("Expected 6 decimals for USDC — continuing with", dec);
  }

  // Mint seed if needed
  let bal = await usdc.balanceOf(deployer.address);
  if (bal < SEED_LP) {
    const need = SEED_LP - bal;
    console.log("Minting", need.toString(), "USDC units to deployer…");
    await (await usdc.mint(deployer.address, need)).wait();
    bal = await usdc.balanceOf(deployer.address);
  }
  console.log("Deployer USDC balance:", bal.toString());

  const PLP = await ethers.getContractFactory("PLP");
  const plpToken = await PLP.deploy();
  await plpToken.waitForDeployment();
  const plpTokenAddr = await plpToken.getAddress();
  console.log("PLP token:", plpTokenAddr);

  const Pool = await ethers.getContractFactory("PerpsLiquidityPool");
  const pool = await Pool.deploy(TESTNET_USDC, plpTokenAddr);
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log("PerpsLiquidityPool:", poolAddr);
  await (await plpToken.setMinter(poolAddr)).wait();

  const Engine = await ethers.getContractFactory("PerpsEngine");
  const engine = await Engine.deploy(
    TESTNET_USDC,
    deployment.contracts.PeptideOracle!,
    deployment.contracts.Treasury!,
  );
  await engine.waitForDeployment();
  const engineAddr = await engine.getAddress();
  console.log("PerpsEngine:", engineAddr);
  console.log("  collateralDecimals:", (await engine.collateralDecimals()).toString());
  console.log("  toUsdScale:", (await engine.toUsdScale()).toString());

  await (await pool.setEngine(engineAddr)).wait();
  await (await engine.setLiquidityPool(poolAddr)).wait();

  const treasury = await ethers.getContractAt("Treasury", deployment.contracts.Treasury!);
  try {
    await (await treasury.setDepositor(engineAddr, true)).wait();
    await (await treasury.setReserveToken(TESTNET_USDC, true)).wait();
  } catch (e) {
    console.warn("Treasury wiring note:", e);
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
    console.log(`Market ${m.symbol} @ ${m.maxLeverageX}x`);
  }

  await (await usdc.approve(poolAddr, SEED_LP)).wait();
  await (await pool.deposit(SEED_LP)).wait();
  const maxOi = await pool.maxOpenInterest();
  console.log("Seeded", SEED_LP.toString(), "USDC raw units");
  console.log("maxOpenInterest (18-dec USD):", ethers.formatEther(maxOi));

  const deploymentPath = join(__dirname, "..", "deployments", "testnet.json");
  const current = JSON.parse(readFileSync(deploymentPath, "utf8"));
  current.contracts.PerpsEngine = engineAddr;
  current.contracts.PLP = plpTokenAddr;
  current.contracts.PerpsLiquidityPool = poolAddr;
  current.contracts.USDC = TESTNET_USDC;
  current.contracts.TestCollateral_tPUSD = TESTNET_USDC; // legacy key → USDC for FE compat
  current.collateral = {
    symbol: "USDC",
    name: "USD Coin",
    address: TESTNET_USDC,
    decimals: Number(dec),
    note: "Robinhood testnet community USDC (6 dec, public mint). Not official Circle. Replaces tPUSD.",
  };
  current.plp = {
    seededAt: new Date().toISOString(),
    seedAmountRaw: SEED_LP.toString(),
    seedAmountHuman: "100000",
    maxUtilizationBps: 5000,
    reserveBps: 2000,
    collateral: "USDC",
  };
  writeFileSync(deploymentPath, JSON.stringify(current, null, 2) + "\n");
  console.log("Updated deployments/testnet.json");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
