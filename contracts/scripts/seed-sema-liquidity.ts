/**
 * Create SEMA/USDG pair (if missing) and add liquidity on Robinhood mainnet.
 *
 *   SEED_USDG=5000 SEED_SEMA=1000 npx hardhat run scripts/seed-sema-liquidity.ts --network robinhoodMainnet
 *
 * Reads SemaToken from deployments/mainnet-spot.json (or SEMA_TOKEN env).
 */

import { ethers } from "hardhat";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import {
  MAINNET_USDG,
  UNI_V2_FACTORY,
  UNI_V2_ROUTER,
} from "./deploy-sema-spot";

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function mint(address,uint256)",
];

const FACTORY_ABI = [
  "function getPair(address,address) view returns (address)",
  "function createPair(address,address) returns (address)",
];

const ROUTER_ABI = [
  "function addLiquidity(address,address,uint,uint,uint,uint,address,uint) returns (uint,uint,uint)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const path = join(__dirname, "../deployments/mainnet-spot.json");
  if (!existsSync(path) && !process.env.SEMA_TOKEN) {
    throw new Error("Run deploy-sema-spot first or set SEMA_TOKEN");
  }
  const dep = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf8"))
    : { contracts: {} };
  const semaAddr = (process.env.SEMA_TOKEN || dep.contracts?.SemaToken) as string;
  if (!semaAddr) throw new Error("No SEMA address");

  const seedSema = Number(process.env.SEED_SEMA || "1000");
  const seedUsdg = Number(process.env.SEED_USDG || "0");
  if (seedUsdg <= 0) throw new Error("Set SEED_USDG > 0");

  const sema = new ethers.Contract(semaAddr, ERC20_ABI, deployer);
  const usdg = new ethers.Contract(MAINNET_USDG, ERC20_ABI, deployer);
  const factory = new ethers.Contract(UNI_V2_FACTORY, FACTORY_ABI, deployer);
  const router = new ethers.Contract(UNI_V2_ROUTER, ROUTER_ABI, deployer);

  const usdgDec = Number(await usdg.decimals());
  const usdgAmt = ethers.parseUnits(String(seedUsdg), usdgDec);
  const semaAmt = ethers.parseEther(String(seedSema));

  // Mint more SEMA if needed
  const bal = await sema.balanceOf(deployer.address);
  if (bal < semaAmt) {
    await (await sema.mint(deployer.address, semaAmt - bal)).wait();
    console.log("Minted additional SEMA");
  }

  let pair = await factory.getPair(semaAddr, MAINNET_USDG);
  if (pair === ethers.ZeroAddress) {
    await (await factory.createPair(semaAddr, MAINNET_USDG)).wait();
    pair = await factory.getPair(semaAddr, MAINNET_USDG);
  }
  console.log("Pair:", pair);

  await (await sema.approve(UNI_V2_ROUTER, semaAmt)).wait();
  await (await usdg.approve(UNI_V2_ROUTER, usdgAmt)).wait();

  const deadline = Math.floor(Date.now() / 1000) + 1800;
  const tx = await router.addLiquidity(
    semaAddr,
    MAINNET_USDG,
    semaAmt,
    usdgAmt,
    0,
    0,
    deployer.address,
    deadline,
  );
  await tx.wait();
  console.log("Liquidity added", tx.hash);

  if (existsSync(path)) {
    dep.contracts.SemaUsdgPair = pair;
    dep.seed = { ...(dep.seed || {}), seedSema, seedUsdg, skipSeed: false };
    writeFileSync(path, JSON.stringify(dep, null, 2) + "\n");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
