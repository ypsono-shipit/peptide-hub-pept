/**
 * Push equity-style market marks (LLY-PERP, …) to PeptideOracle.
 *
 * LLY-PERP is backed by the Robinhood Chain mainnet stock token:
 *   0x8005d266423c7Ea827372c9c864491e5786600eA
 * Price = live RH equity quote after on-chain token verify.
 *
 * Usage:
 *   npx hardhat run scripts/push-market-prices.ts --network robinhoodTestnet
 *
 * Env:
 *   DRY_RUN=1
 *   SKIP_LLY=1
 */

import { ethers } from "hardhat";
import deployment from "../deployments/testnet.json";
import { resolveLlyPrice, MAINNET_LLY_TOKEN } from "./lib/scrape-lly-price";
import { roundPrice } from "./lib/stats";

/** Stay under on-chain MAX_DEVIATION_BPS (30%). */
const MAX_PUSH_STEP = 0.29;

function envFlag(name: string): boolean {
  const v = process.env[name];
  return v === "1" || v === "true" || v === "yes";
}

function stepTowardTarget(onChain: number, target: number): number {
  if (!(onChain > 0) || !(target > 0)) return target;
  const lo = onChain * (1 - MAX_PUSH_STEP);
  const hi = onChain * (1 + MAX_PUSH_STEP);
  if (target >= lo && target <= hi) return target;
  return target > onChain ? roundPrice(hi) : roundPrice(lo);
}

async function main() {
  const dryRun = envFlag("DRY_RUN");
  const oracleAddr = deployment.contracts.PeptideOracle;
  if (!oracleAddr) throw new Error("testnet.json missing PeptideOracle");

  const rows: { symbol: string; price: number; source: string }[] = [];

  if (!envFlag("SKIP_LLY")) {
    console.log("Resolving LLY from RH mainnet token + equity quote…");
    console.log("  token:", MAINNET_LLY_TOKEN);
    const lly = await resolveLlyPrice();
    console.log(
      `  ${lly.tokenSymbol} on-chain ok · mark $${lly.priceUsd} · ${lly.tokenName}`,
    );
    rows.push({
      symbol: lly.symbol,
      price: lly.priceUsd,
      source: lly.source.slice(0, 200),
    });
  }

  // TSHA still static until a RH stock token is listed
  if (!envFlag("SKIP_TSHA")) {
    rows.push({
      symbol: "TSHA-PERP",
      price: 6.72,
      source: "Static reference (no RH stock token listed yet)",
    });
  }

  if (rows.length === 0) {
    console.log("Nothing to push");
    return;
  }

  if (dryRun) {
    for (const r of rows) {
      console.log(`DRY ${r.symbol} $${r.price} ← ${r.source}`);
    }
    return;
  }

  const oracle = await ethers.getContractAt("PeptideOracle", oracleAddr);
  const [signer] = await ethers.getSigners();
  console.log(`\nPushing as ${signer.address} → ${oracleAddr}`);

  for (const row of rows) {
    const marketKey = ethers.keccak256(ethers.toUtf8Bytes(row.symbol));
    let pushPrice = row.price;

    try {
      const prev = await oracle.latestPrice(marketKey);
      const prevNum = Number(ethers.formatEther(prev));
      if (prevNum > 0) {
        const stepped = stepTowardTarget(prevNum, row.price);
        if (Math.abs(stepped - row.price) > 1e-9) {
          console.log(
            `  ${row.symbol}: target $${row.price} from $${prevNum.toFixed(4)}` +
              ` — step $${stepped} (≤${MAX_PUSH_STEP * 100}%)`,
          );
          pushPrice = stepped;
        } else {
          console.log(
            `  ${row.symbol}: $${prevNum.toFixed(4)} → $${row.price}`,
          );
        }
      }
    } catch {
      console.log(`  ${row.symbol}: no prior on-chain price`);
    }

    const priceWei = ethers.parseEther(pushPrice.toFixed(4));
    try {
      const tx = await oracle.pushPrice(marketKey, priceWei, row.source);
      await tx.wait();
      const feed = await oracle.feeds(marketKey);
      if (feed.paused) {
        console.warn(
          `⚠ ${row.symbol}: circuit breaker paused — unpause and step ≤30%`,
        );
      } else {
        const onChain = await oracle.latestPrice(marketKey);
        console.log(
          `✓ ${row.symbol}: $${ethers.formatEther(onChain)}  tx=${tx.hash}`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/too soon/i.test(msg)) {
        console.warn(`⏭ ${row.symbol}: push too soon (min interval)`);
        continue;
      }
      throw err;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
