import * as fs from "fs";
import * as path from "path";
import { ethers } from "hardhat";
import deployment from "../deployments/testnet.json";
import referenceData from "../data/glp1-reference-prices.json";
import { resolveAllDualSources, type DualSourceResult } from "./lib/dual-source";
import { roundPrice } from "./lib/stats";

/**
 * Refresh GLP-1 peptide oracle prices on Robinhood Chain testnet.
 *
 * Default path (dual source):
 *   1. PeptideScouter.com vendor tables → in-stock $/mg median (IQR)
 *   2. Curated direct vendor PDPs (data/vendor-basket.json) → $/mg median (IQR)
 *   3. Combine = median of available source medians
 *   4. GLP1-IDX = 60% SEMA + 25% TIRZ + 15% RETA
 *   5. pushPrice each market on PeptideOracle
 *
 * Env flags:
 *   DRY_RUN=1              Scrape + print only; no chain txs
 *   FORCE_PUSH=1           Use forcePushPrice (bypasses 30% circuit breaker)
 *   SKIP_SCRAPE=1          Use data/glp1-reference-prices.json only
 *   SKIP_SCOUTER=1         Vendor basket only
 *   SKIP_BASKET=1          PeptideScouter only
 *   FALLBACK_ON_SCRAPE_ERROR=1
 *                          If dual scrape fails entirely, push reference JSON
 *
 * Scheduled by .github/workflows/refresh-glp1-prices.yml (every 12h).
 */

type PriceRow = {
  symbol: string;
  pricePerMg: number;
  source: string;
  name: string;
};

async function resolvePrices(): Promise<{ rows: PriceRow[]; meta: Record<string, unknown> }> {
  if (envFlag("SKIP_SCRAPE")) {
    console.log("SKIP_SCRAPE=1 — using data/glp1-reference-prices.json");
    return fromReferenceJson("manual reference file (SKIP_SCRAPE)");
  }

  try {
    console.log("Resolving dual-source prices (PeptideScouter + vendor basket) …");
    const dual = await resolveAllDualSources({
      skipScouter: envFlag("SKIP_SCOUTER"),
      skipBasket: envFlag("SKIP_BASKET"),
    });

    for (const err of dual.sourceErrors) {
      console.warn(`  ⚠ ${err}`);
    }

    writeDualSnapshot(dual);
    return fromDual(dual.results);
  } catch (err) {
    console.error("Dual-source scrape failed:", err);
    if (!envFlag("FALLBACK_ON_SCRAPE_ERROR")) throw err;
    console.warn("FALLBACK_ON_SCRAPE_ERROR=1 — pushing reference JSON instead");
    return fromReferenceJson("fallback after scrape error");
  }
}

function fromDual(results: {
  semaglutide: DualSourceResult;
  tirzepatide: DualSourceResult;
  retatrutide: DualSourceResult;
}): { rows: PriceRow[]; meta: Record<string, unknown> } {
  const weights = referenceData.glp1Index.weights;
  const bySlug = results;

  const rows: PriceRow[] = (
    Object.entries(referenceData.peptides) as [
      keyof typeof bySlug,
      (typeof referenceData.peptides)["semaglutide"],
    ][]
  ).map(([slug, meta]) => {
    const dual = bySlug[slug];
    if (dual.divergenceWarning) {
      console.warn(
        `  ⚠ ${slug}: source divergence ${(dual.divergenceBps! / 100).toFixed(1)}% ` +
          `exceeds ${(dual.maxSourceDivergenceBps / 100).toFixed(0)}% threshold`,
      );
    }
    if (dual.singleSource) {
      console.warn(`  ⚠ ${slug}: only one source available (${dual.method})`);
    }
    return {
      name: slug,
      symbol: meta.symbol,
      pricePerMg: dual.pricePerMg,
      source: dual.source,
    };
  });

  const indexPrice = roundPrice(
    results.semaglutide.pricePerMg * weights.semaglutide +
      results.tirzepatide.pricePerMg * weights.tirzepatide +
      results.retatrutide.pricePerMg * weights.retatrutide,
  );

  rows.push({
    name: "glp1Index",
    symbol: referenceData.glp1Index.symbol,
    pricePerMg: indexPrice,
    source:
      `Weighted ${weights.semaglutide * 100}% SEMA / ${weights.tirzepatide * 100}% TIRZ / ` +
      `${weights.retatrutide * 100}% RETA · dual-source medians`,
  });

  return {
    rows,
    meta: {
      mode: "dual_source",
      sources: {
        semaglutide: results.semaglutide.sources.map((s) => s.name),
        tirzepatide: results.tirzepatide.sources.map((s) => s.name),
        retatrutide: results.retatrutide.sources.map((s) => s.name),
      },
    },
  };
}

function fromReferenceJson(reason: string): { rows: PriceRow[]; meta: Record<string, unknown> } {
  const { peptides, glp1Index } = referenceData;
  const rows: PriceRow[] = Object.entries(peptides).map(([name, data]) => ({
    name,
    symbol: data.symbol,
    pricePerMg: data.pricePerMg,
    source: `${data.source} · ${reason}`,
  }));

  const indexPrice = roundPrice(
    peptides.semaglutide.pricePerMg * glp1Index.weights.semaglutide +
      peptides.tirzepatide.pricePerMg * glp1Index.weights.tirzepatide +
      peptides.retatrutide.pricePerMg * glp1Index.weights.retatrutide,
  );

  rows.push({
    name: "glp1Index",
    symbol: glp1Index.symbol,
    pricePerMg: indexPrice,
    source: `Weighted index from reference JSON · ${reason}`,
  });

  return { rows, meta: { mode: "reference_json", reason } };
}

function writeDualSnapshot(dual: Awaited<ReturnType<typeof resolveAllDualSources>>) {
  const weights = referenceData.glp1Index.weights;
  const indexPrice = roundPrice(
    dual.results.semaglutide.pricePerMg * weights.semaglutide +
      dual.results.tirzepatide.pricePerMg * weights.tirzepatide +
      dual.results.retatrutide.pricePerMg * weights.retatrutide,
  );

  const snapshot = {
    scrapedAt: new Date().toISOString(),
    method: "dual source: PeptideScouter + vendor basket",
    sourceErrors: dual.sourceErrors,
    peptides: {
      semaglutide: summarizeDual(dual, "semaglutide"),
      tirzepatide: summarizeDual(dual, "tirzepatide"),
      retatrutide: summarizeDual(dual, "retatrutide"),
    },
    glp1Index: {
      symbol: referenceData.glp1Index.symbol,
      weights,
      pricePerMg: indexPrice,
    },
  };

  const outPath = path.join(__dirname, "../data/glp1-last-scrape.json");
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`Wrote dual-source snapshot → ${outPath}`);
}

function summarizeDual(
  dual: Awaited<ReturnType<typeof resolveAllDualSources>>,
  slug: "semaglutide" | "tirzepatide" | "retatrutide",
) {
  const r = dual.results[slug];
  return {
    pricePerMg: r.pricePerMg,
    method: r.method,
    source: r.source,
    singleSource: r.singleSource,
    divergenceBps: r.divergenceBps,
    divergenceWarning: r.divergenceWarning,
    sources: r.sources,
    scouter: dual.scouter[slug]
      ? {
          pricePerMg: dual.scouter[slug]!.pricePerMg,
          sampleCount: dual.scouter[slug]!.sampleCount,
          inStockCount: dual.scouter[slug]!.inStockCount,
        }
      : null,
    basket: dual.basket[slug]
      ? {
          pricePerMg: dual.basket[slug]!.pricePerMg,
          sampleCount: dual.basket[slug]!.sampleCount,
          vendorCount: dual.basket[slug]!.vendorCount,
          offerCount: dual.basket[slug]!.offerCount,
          errors: dual.basket[slug]!.errors,
        }
      : null,
  };
}

async function main() {
  const dryRun = envFlag("DRY_RUN");
  const forcePush = envFlag("FORCE_PUSH");
  const { rows, meta } = await resolvePrices();

  console.log("\nResolved prices:", JSON.stringify(meta));
  for (const r of rows) {
    console.log(`  ${r.symbol.padEnd(14)} $${r.pricePerMg.toFixed(4)}/mg  ← ${r.source.slice(0, 100)}`);
  }

  if (dryRun) {
    console.log("\nDRY_RUN=1 — not sending transactions.");
    return;
  }

  const oracleAddr = deployment.contracts.PeptideOracle;
  if (!oracleAddr) throw new Error("deployments/testnet.json missing PeptideOracle");
  const oracle = await ethers.getContractAt("PeptideOracle", oracleAddr);
  const [signer] = await ethers.getSigners();
  console.log(`\nPushing as ${signer.address} → oracle ${oracleAddr}${forcePush ? " (FORCE)" : ""}`);

  let anyPaused = false;

  for (const row of rows) {
    const marketKey = ethers.keccak256(ethers.toUtf8Bytes(row.symbol));
    const priceWei = ethers.parseEther(row.pricePerMg.toFixed(4));

    try {
      const prev = await oracle.latestPrice(marketKey);
      const prevNum = Number(ethers.formatEther(prev));
      if (prevNum > 0) {
        const pct = (Math.abs(row.pricePerMg - prevNum) / prevNum) * 100;
        console.log(
          `  ${row.symbol}: on-chain $${prevNum.toFixed(4)} → $${row.pricePerMg.toFixed(4)} (${pct.toFixed(1)}% move)` +
            (pct > 30 && !forcePush ? "  ⚠ will trip circuit breaker unless FORCE_PUSH=1" : ""),
        );
      }
    } catch {
      console.log(`  ${row.symbol}: no readable prior price (new/paused/stale)`);
    }

    const tx = forcePush
      ? await oracle.forcePushPrice(marketKey, priceWei, row.source)
      : await oracle.pushPrice(marketKey, priceWei, row.source);
    await tx.wait();

    const feed = await oracle.feeds(marketKey);
    if (feed.paused) {
      anyPaused = true;
      console.warn(
        `⚠ ${row.symbol}: circuit breaker paused (push deviated >30%) — review then FORCE_PUSH=1`,
      );
    } else {
      const onChain = await oracle.latestPrice(marketKey);
      console.log(`✓ ${row.symbol}: $${ethers.formatEther(onChain)}/mg  tx=${tx.hash}`);
    }
  }

  if (anyPaused) {
    console.warn(
      "\nOne or more feeds are paused. Trading on those markets reverts until admin forcePushPrice / unpause.",
    );
  }
}

function envFlag(name: string): boolean {
  const v = process.env[name];
  return v === "1" || v === "true" || v === "yes";
}

main().catch((error) => {
  console.error("PRICE PUSH FAILED:", error);
  process.exitCode = 1;
});
