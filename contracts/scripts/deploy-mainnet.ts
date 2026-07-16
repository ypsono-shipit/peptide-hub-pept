import { ethers } from "hardhat";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import catalog from "../data/marketplace-catalog.json";

/**
 * Full PEPT Trade stack on Robinhood Chain mainnet (4663).
 * Collateral: Global Dollar (USDG) — no public mint.
 *
 * USDG: 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168
 *
 * Usage:
 *   npx hardhat run scripts/deploy-mainnet.ts --network robinhoodMainnet
 *
 * Env:
 *   DEPLOYER_PRIVATE_KEY  — required
 *   ROBINHOOD_MAINNET_RPC — optional
 *   SEED_PLP_USDG         — optional human USDG to seed vault (default 0; needs balance)
 */

export const MAINNET_USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";

const MARKETS = [
  { symbol: "SEMA-PERP", maxLeverageX: 10, takerFeeBps: 10, liquidationFeeBps: 100, maintenanceMarginBps: 500 },
  { symbol: "GLP1-IDX-PERP", maxLeverageX: 10, takerFeeBps: 10, liquidationFeeBps: 100, maintenanceMarginBps: 500 },
  { symbol: "TIRZ-PERP", maxLeverageX: 10, takerFeeBps: 10, liquidationFeeBps: 100, maintenanceMarginBps: 500 },
  { symbol: "RETA-PERP", maxLeverageX: 10, takerFeeBps: 10, liquidationFeeBps: 100, maintenanceMarginBps: 500 },
  { symbol: "PEPT-USD", maxLeverageX: 5, takerFeeBps: 10, liquidationFeeBps: 150, maintenanceMarginBps: 750 },
];

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  console.log("Network chainId:", network.chainId.toString());
  console.log("Deployer:", deployer.address);

  if (network.chainId !== 4663n) {
    throw new Error(`Expected Robinhood mainnet 4663, got ${network.chainId}`);
  }

  const ethBal = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer ETH:", ethers.formatEther(ethBal));
  if (ethBal === 0n) {
    throw new Error(
      `Deployer ${deployer.address} has 0 ETH on mainnet. Fund gas, then re-run deploy:mainnet.`,
    );
  }

  const usdg = new ethers.Contract(MAINNET_USDG, ERC20_ABI, deployer);
  const [name, symbol, decimals] = await Promise.all([
    usdg.name(),
    usdg.symbol(),
    usdg.decimals(),
  ]);
  console.log(`Collateral: ${name} (${symbol}) decimals=${decimals} @ ${MAINNET_USDG}`);
  if (Number(decimals) !== 6) {
    console.warn("Expected 6 decimals for USDG — continuing with", decimals);
  }

  // ── Core ──────────────────────────────────────────────────────────
  const PEPT = await ethers.getContractFactory("PEPT");
  const pept = await PEPT.deploy();
  await pept.waitForDeployment();
  const peptAddr = await pept.getAddress();
  console.log("PEPT:", peptAddr);

  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(peptAddr);
  await treasury.waitForDeployment();
  const treasuryAddr = await treasury.getAddress();
  console.log("Treasury:", treasuryAddr);

  const BondDepository = await ethers.getContractFactory("BondDepository");
  const bond = await BondDepository.deploy(peptAddr, treasuryAddr);
  await bond.waitForDeployment();
  const bondAddr = await bond.getAddress();
  console.log("BondDepository:", bondAddr);

  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(peptAddr);
  await staking.waitForDeployment();
  const stakingAddr = await staking.getAddress();
  console.log("Staking:", stakingAddr);

  const PeptideOracle = await ethers.getContractFactory("PeptideOracle");
  const oracle = await PeptideOracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log("PeptideOracle:", oracleAddr);

  await (await pept.setMinter(treasuryAddr, true)).wait();
  await (await pept.setMinter(bondAddr, true)).wait();
  console.log("PEPT minters: Treasury + BondDepository");

  // ── PLP + Perps (USDG collateral) ─────────────────────────────────
  const PLP = await ethers.getContractFactory("PLP");
  const plpToken = await PLP.deploy();
  await plpToken.waitForDeployment();
  const plpTokenAddr = await plpToken.getAddress();
  console.log("PLP:", plpTokenAddr);

  const Pool = await ethers.getContractFactory("PerpsLiquidityPool");
  const pool = await Pool.deploy(MAINNET_USDG, plpTokenAddr);
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log("PerpsLiquidityPool:", poolAddr);
  await (await plpToken.setMinter(poolAddr)).wait();

  const Engine = await ethers.getContractFactory("PerpsEngine");
  const engine = await Engine.deploy(MAINNET_USDG, oracleAddr, treasuryAddr);
  await engine.waitForDeployment();
  const engineAddr = await engine.getAddress();
  console.log("PerpsEngine:", engineAddr);
  console.log("  collateralDecimals:", (await engine.collateralDecimals()).toString());

  await (await pool.setEngine(engineAddr)).wait();
  await (await engine.setLiquidityPool(poolAddr)).wait();

  try {
    await (await treasury.setDepositor(engineAddr, true)).wait();
    await (await treasury.setReserveToken(MAINNET_USDG, true)).wait();
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
    // Bootstrap oracle with 48h staleness so markets are readable immediately
    const bootstrap =
      m.symbol === "SEMA-PERP"
        ? ethers.parseEther("5.06")
        : m.symbol === "GLP1-IDX-PERP"
          ? ethers.parseEther("4.69")
          : m.symbol === "TIRZ-PERP"
            ? ethers.parseEther("5.50")
            : m.symbol === "RETA-PERP"
              ? ethers.parseEther("6.37")
              : ethers.parseEther("1");
    // First push sets price; set longer staleness so markets stay tradeable
    await (await oracle.pushPrice(key, bootstrap, "Mainnet bootstrap · multi-vendor")).wait();
    try {
      await (await oracle.setStalenessWindow(key, 172800)).wait(); // 48h
    } catch {
      /* optional */
    }
    console.log(`Market ${m.symbol} @ ${m.maxLeverageX}x · oracle seeded`);
  }

  // Optional PLP seed (real USDG only)
  const seedHuman = BigInt(process.env.SEED_PLP_USDG || "0");
  const seedRaw = seedHuman * 10n ** BigInt(Number(decimals));
  let seeded = "0";
  if (seedRaw > 0n) {
    const bal = await usdg.balanceOf(deployer.address);
    if (bal >= seedRaw) {
      await (await usdg.approve(poolAddr, seedRaw)).wait();
      await (await pool.deposit(seedRaw)).wait();
      seeded = seedHuman.toString();
      console.log("Seeded PLP with", seeded, "USDG");
    } else {
      console.warn(
        `SEED_PLP_USDG=${seedHuman} but balance is ${ethers.formatUnits(bal, decimals)} — skip seed`,
      );
    }
  } else {
    console.log("No PLP seed (set SEED_PLP_USDG to deposit USDG into vault)");
  }

  // ── Marketplace ───────────────────────────────────────────────────
  const Voucher = await ethers.getContractFactory("PeptideVoucher");
  const voucher = await Voucher.deploy();
  await voucher.waitForDeployment();
  const voucherAddr = await voucher.getAddress();
  console.log("PeptideVoucher:", voucherAddr);

  const Shop = await ethers.getContractFactory("MarketplaceShop");
  const shop = await Shop.deploy(MAINNET_USDG, treasuryAddr, voucherAddr);
  await shop.waitForDeployment();
  const shopAddr = await shop.getAddress();
  console.log("MarketplaceShop:", shopAddr);
  await (await voucher.setMinter(shopAddr)).wait();

  const ids: string[] = [];
  const prices: bigint[] = [];
  for (const item of catalog as { id: string; priceFrom: number }[]) {
    ids.push(ethers.id(item.id));
    prices.push(BigInt(Math.round(item.priceFrom * 1_000_000)));
  }
  // Batch in chunks to avoid huge txs
  const CHUNK = 20;
  for (let i = 0; i < ids.length; i += CHUNK) {
    await (await shop.setPrices(ids.slice(i, i + CHUNK), prices.slice(i, i + CHUNK))).wait();
  }
  console.log("Listed", ids.length, "marketplace products in USDG");

  const deployment = {
    network: "robinhoodMainnet",
    chainId: 4663,
    rpcUrl: process.env.ROBINHOOD_MAINNET_RPC || "https://rpc.mainnet.chain.robinhood.com",
    explorer: "https://robinhoodchain.blockscout.com",
    deployedAt: new Date().toISOString().slice(0, 10),
    deployer: deployer.address,
    contracts: {
      PEPT: peptAddr,
      Treasury: treasuryAddr,
      BondDepository: bondAddr,
      Staking: stakingAddr,
      PeptideOracle: oracleAddr,
      PerpsEngine: engineAddr,
      PLP: plpTokenAddr,
      PerpsLiquidityPool: poolAddr,
      USDG: MAINNET_USDG,
      MarketplaceShop: shopAddr,
      PeptideVoucher: voucherAddr,
    },
    collateral: {
      symbol: "USDG",
      name: "Global Dollar",
      address: MAINNET_USDG,
      decimals: Number(decimals),
      note: "Robinhood Chain mainnet Global Dollar (USDG). Official stable for payments.",
    },
    plp: {
      seededAt: seeded !== "0" ? new Date().toISOString() : null,
      seedAmountHuman: seeded,
      maxUtilizationBps: 5000,
      reserveBps: 2000,
      collateral: "USDG",
    },
    marketplace: {
      listedAt: new Date().toISOString(),
      productCount: ids.length,
      collateral: "USDG",
      decimals: Number(decimals),
      voucher: voucherAddr,
      note: "Pay USDG, receive PeptideVoucher NFT",
    },
  };

  const outPath = join(__dirname, "..", "deployments", "mainnet.json");
  writeFileSync(outPath, JSON.stringify(deployment, null, 2) + "\n");
  console.log("Wrote", outPath);

  // Sync frontend deployments if present
  const fePath = join(__dirname, "..", "..", "frontend", "src", "lib", "mainnet.generated.json");
  try {
    writeFileSync(fePath, JSON.stringify(deployment, null, 2) + "\n");
    console.log("Wrote frontend", fePath);
  } catch {
    /* optional */
  }

  console.log("\n=== MAINNET DEPLOY COMPLETE ===");
  console.log(JSON.stringify(deployment.contracts, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
