/**
 * Deploy SEMA ERC-20 + Uniswap V2 SEMA/USDG pool on Robinhood mainnet (4663).
 *
 * Note: Robinhood mainnet's liquid stable is USDG (Global Dollar), not Circle USDC.
 * User-facing copy may say "stable"; pair is SEMA/USDG.
 *
 * Usage:
 *   cd contracts
 *   npx hardhat run scripts/deploy-sema-spot.ts --network robinhoodMainnet
 *
 * Env:
 *   DEPLOYER_PRIVATE_KEY   required
 *   SEED_SEMA              human SEMA to mint+seed (default 10000)
 *   SEED_USDG              human USDG to seed (default 0 — set when funded)
 *   SKIP_SEED=1            deploy token only, no pool/liquidity
 *
 * Uniswap V2 (official RH mainnet, matches Uniswap docs WETH):
 *   Factory  0xaA5f8c18EF9be81ffED30c223F9CD0D012a2AdB9
 *   Router02 0x8bc3ce37f87d5F3Ca1DcD4D86c0EcbC6039e3B17
 *   WETH     0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73
 *   USDG     0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168
 */

import { ethers } from "hardhat";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export const MAINNET_USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
export const UNI_V2_FACTORY = "0xaA5f8c18EF9be81ffED30c223F9CD0D012a2AdB9";
export const UNI_V2_ROUTER = "0x8bc3ce37f87d5F3Ca1DcD4D86c0EcbC6039e3B17";
export const MAINNET_WETH = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function allowance(address,address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
];

const FACTORY_ABI = [
  "function getPair(address,address) view returns (address)",
  "function createPair(address,address) returns (address)",
];

const ROUTER_ABI = [
  "function factory() view returns (address)",
  "function WETH() view returns (address)",
  "function addLiquidity(address,address,uint,uint,uint,uint,address,uint) returns (uint,uint,uint)",
  "function swapExactTokensForTokens(uint,uint,address[],address,uint) returns (uint[])",
  "function getAmountsOut(uint,address[]) view returns (uint[])",
];

function envNum(name: string, fallback: number): number {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  console.log("chainId:", network.chainId.toString());
  console.log("deployer:", deployer.address);

  if (network.chainId !== 4663n) {
    throw new Error(`Expected Robinhood mainnet 4663, got ${network.chainId}`);
  }

  const ethBal = await ethers.provider.getBalance(deployer.address);
  console.log("ETH:", ethers.formatEther(ethBal));
  if (ethBal === 0n) {
    throw new Error("Deployer has 0 ETH — fund gas first.");
  }

  const usdg = new ethers.Contract(MAINNET_USDG, ERC20_ABI, deployer);
  const usdgDecimals = Number(await usdg.decimals());
  const usdgBal = await usdg.balanceOf(deployer.address);
  console.log(
    `USDG balance: ${ethers.formatUnits(usdgBal, usdgDecimals)} (decimals=${usdgDecimals})`,
  );

  // ── SEMA token ───────────────────────────────────────────────────
  const Sema = await ethers.getContractFactory("SemaToken");
  const sema = await Sema.deploy(deployer.address);
  await sema.waitForDeployment();
  const semaAddr = await sema.getAddress();
  console.log("SEMA:", semaAddr);

  const seedSema = envNum("SEED_SEMA", 10_000);
  const mintAmt = ethers.parseEther(String(seedSema));
  await (await sema.mint(deployer.address, mintAmt)).wait();
  console.log(`Minted ${seedSema} SEMA to deployer`);

  // Redeem treasury = deployer (tokens from redemptions land here)
  const redeemTreasury = process.env.REDEEM_TREASURY?.trim() || deployer.address;

  let pairAddr = ethers.ZeroAddress;
  const skipSeed = process.env.SKIP_SEED === "1" || process.env.SKIP_SEED === "true";
  const seedUsdg = envNum("SEED_USDG", 0);

  if (!skipSeed && seedUsdg > 0) {
    const factory = new ethers.Contract(UNI_V2_FACTORY, FACTORY_ABI, deployer);
    const router = new ethers.Contract(UNI_V2_ROUTER, ROUTER_ABI, deployer);

    const facFromRouter = await router.factory();
    if (facFromRouter.toLowerCase() !== UNI_V2_FACTORY.toLowerCase()) {
      console.warn("Router.factory() mismatch:", facFromRouter, "expected", UNI_V2_FACTORY);
    }

    pairAddr = await factory.getPair(semaAddr, MAINNET_USDG);
    if (pairAddr === ethers.ZeroAddress) {
      console.log("Creating SEMA/USDG pair…");
      const tx = await factory.createPair(semaAddr, MAINNET_USDG);
      await tx.wait();
      pairAddr = await factory.getPair(semaAddr, MAINNET_USDG);
    }
    console.log("Pair:", pairAddr);

    const usdgAmt = ethers.parseUnits(String(seedUsdg), usdgDecimals);
    // Price hint: SEMA ≈ oracle $/mg — seed at 1 SEMA : seedUsdg/seedSema USDG
    // Default: use all seedSema against seedUsdg
    const semaLiq = mintAmt;
    if (usdgBal < usdgAmt) {
      throw new Error(
        `Need ${seedUsdg} USDG to seed; balance ${ethers.formatUnits(usdgBal, usdgDecimals)}`,
      );
    }

    console.log(`Adding liquidity: ${seedSema} SEMA + ${seedUsdg} USDG…`);
    await (await sema.approve(UNI_V2_ROUTER, semaLiq)).wait();
    await (await usdg.approve(UNI_V2_ROUTER, usdgAmt)).wait();

    const deadline = Math.floor(Date.now() / 1000) + 60 * 30;
    const liqTx = await router.addLiquidity(
      semaAddr,
      MAINNET_USDG,
      semaLiq,
      usdgAmt,
      0,
      0,
      deployer.address,
      deadline,
    );
    await liqTx.wait();
    console.log("Liquidity added. tx:", liqTx.hash);
  } else {
    console.log(
      "SKIP_SEED or SEED_USDG=0 — token deployed without pool. Set SEED_USDG and re-run seed script later.",
    );
  }

  const out = {
    network: "robinhoodMainnet",
    chainId: 4663,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    redeemTreasury,
    contracts: {
      SemaToken: semaAddr,
      USDG: MAINNET_USDG,
      UniswapV2Factory: UNI_V2_FACTORY,
      UniswapV2Router02: UNI_V2_ROUTER,
      WETH: MAINNET_WETH,
      SemaUsdgPair: pairAddr,
    },
    seed: {
      seedSema,
      seedUsdg,
      skipSeed: skipSeed || seedUsdg <= 0,
    },
    note: "Pair is SEMA/USDG (Global Dollar). No Circle USDC on RH mainnet yet.",
  };

  const dir = join(__dirname, "../deployments");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "mainnet-spot.json");
  writeFileSync(path, JSON.stringify(out, null, 2) + "\n");
  console.log("Wrote", path);

  // Patch frontend spot config if path exists
  const spotTs = join(__dirname, "../../frontend/src/lib/spot.ts");
  if (existsSync(spotTs) && pairAddr !== ethers.ZeroAddress) {
    console.log(
      "Update frontend/src/lib/spot.ts SPOT_MAINNET with:\n",
      JSON.stringify(
        {
          baseToken: semaAddr,
          quoteToken: MAINNET_USDG,
          pair: pairAddr,
          router: UNI_V2_ROUTER,
          live: true,
        },
        null,
        2,
      ),
    );
  }

  // ── LP points gauge (only when pair exists) ──────────────────────
  let gaugeAddr = ethers.ZeroAddress;
  if (pairAddr !== ethers.ZeroAddress) {
    const weekly = ethers.parseEther(String(process.env.WEEKLY_POINTS || "100000"));
    const Gauge = await ethers.getContractFactory("PeptLpGauge");
    const gauge = await Gauge.deploy(pairAddr, deployer.address, weekly);
    await gauge.waitForDeployment();
    gaugeAddr = await gauge.getAddress();
    console.log("PeptLpGauge:", gaugeAddr, "weeklyEmission", ethers.formatEther(weekly));
    (out as { contracts: Record<string, string> }).contracts.PeptLpGauge = gaugeAddr;
    writeFileSync(path, JSON.stringify(out, null, 2) + "\n");
  }

  console.log("\nDone. Redeem treasury:", redeemTreasury);
  console.log("Gauge:", gaugeAddr);
  console.log("Wire frontend SPOT_MAINNET: baseToken, pair, gauge, live:true");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
