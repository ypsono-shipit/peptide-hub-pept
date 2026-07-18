import * as fs from "fs";
import * as path from "path";
import { ethers } from "hardhat";
import deployment from "../deployments/testnet.json";
import referenceData from "../data/glp1-reference-prices.json";
import { resolveAllDualSources, type DualSourceResult } from "./lib/dual-source";
import { roundPrice } from "./lib/stats";
import { appendPriceSamples, type PriceSample } from "./lib/price-history";

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
 *   (forcePushPrice removed — circuit breaker cannot be bypassed)
 *   SKIP_SCRAPE=1          Use data/glp1-reference-prices.json only
 *   SKIP_SCOUTER=1         Vendor basket only
 *   SKIP_BASKET=1          PeptideScouter only
 *   FALLBACK_ON_SCRAPE_ERROR=1
 *                          If dual scrape fails entirely, push reference JSON
 *
 * Scheduled by .github/workflows/refresh-glp1-prices.yml (every 5 minutes UTC).
 * Vendor basket: contracts/data/vendor-basket.json (expanded multi-vendor PDPs).
 * On success: on-chain pushPrice + append price-history.json (feeds /trade charts + /oracle).
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

/** Previous scrape (for per-vendor % change alerts on /admin). */
type PrevSnapshot = {
  scrapedAt?: string;
  peptides?: Record<
    string,
    {
      basket?: { offers?: Array<{ vendor: string; url?: string; sizeMg?: number; pricePerMg: number }> };
      scouter?: {
        listings?: Array<{ vendor: string; sizeMg?: number | null; pricePerMg: number }>;
      };
    }
  >;
};

function loadPreviousSnapshot(): PrevSnapshot | null {
  const candidates = [
    path.join(__dirname, "../../frontend/public/data/glp1-last-scrape.json"),
    path.join(__dirname, "../data/glp1-last-scrape.json"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, "utf8")) as PrevSnapshot;
      }
    } catch {
      /* next */
    }
  }
  return null;
}

function writeDualSnapshot(dual: Awaited<ReturnType<typeof resolveAllDualSources>>) {
  const weights = referenceData.glp1Index.weights;
  const indexPrice = roundPrice(
    dual.results.semaglutide.pricePerMg * weights.semaglutide +
      dual.results.tirzepatide.pricePerMg * weights.tirzepatide +
      dual.results.retatrutide.pricePerMg * weights.retatrutide,
  );

  const previous = loadPreviousSnapshot();

  // Preserve prior snapshot for admin change detection (even after this write).
  if (previous?.scrapedAt) {
    const prevPayload = JSON.stringify(previous, null, 2) + "\n";
    for (const prevPath of [
      path.join(__dirname, "../data/glp1-prev-scrape.json"),
      path.join(__dirname, "../../frontend/public/data/glp1-prev-scrape.json"),
    ]) {
      try {
        fs.mkdirSync(path.dirname(prevPath), { recursive: true });
        fs.writeFileSync(prevPath, prevPayload);
      } catch (e) {
        console.warn(`Could not write prev scrape → ${prevPath}:`, e);
      }
    }
  }

  const snapshot = {
    scrapedAt: new Date().toISOString(),
    method: "dual source: PeptideScouter + vendor basket",
    sourceErrors: dual.sourceErrors,
    previousScrapedAt: previous?.scrapedAt ?? null,
    peptides: {
      semaglutide: summarizeDual(dual, "semaglutide", previous),
      tirzepatide: summarizeDual(dual, "tirzepatide", previous),
      retatrutide: summarizeDual(dual, "retatrutide", previous),
    },
    glp1Index: {
      symbol: referenceData.glp1Index.symbol,
      weights,
      pricePerMg: indexPrice,
    },
  };

  const payload = JSON.stringify(snapshot, null, 2) + "\n";
  const outPaths = [
    path.join(__dirname, "../data/glp1-last-scrape.json"),
    // Frontend monitor + /admin (committed like price-history)
    path.join(__dirname, "../../frontend/public/data/glp1-last-scrape.json"),
  ];
  for (const outPath of outPaths) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, payload);
    console.log(`Wrote dual-source snapshot → ${outPath}`);
  }
}

function offerKey(vendor: string, sizeMg: number | null | undefined, url?: string): string {
  const v = vendor.trim().toLowerCase();
  const s = sizeMg != null && Number.isFinite(sizeMg) ? String(sizeMg) : "?";
  if (url) {
    try {
      const u = new URL(url);
      return `${v}|${s}|${u.hostname}${u.pathname}`;
    } catch {
      /* fall through */
    }
  }
  return `${v}|${s}`;
}

function summarizeDual(
  dual: Awaited<ReturnType<typeof resolveAllDualSources>>,
  slug: "semaglutide" | "tirzepatide" | "retatrutide",
  previous: PrevSnapshot | null,
) {
  const r = dual.results[slug];
  const scouter = dual.scouter[slug];
  const basket = dual.basket[slug];
  const prevPep = previous?.peptides?.[slug];

  const prevBasketByKey = new Map<string, number>();
  for (const o of prevPep?.basket?.offers ?? []) {
    prevBasketByKey.set(offerKey(o.vendor, o.sizeMg, o.url), o.pricePerMg);
  }
  const prevScouterByKey = new Map<string, number>();
  for (const l of prevPep?.scouter?.listings ?? []) {
    prevScouterByKey.set(offerKey(l.vendor, l.sizeMg ?? null), l.pricePerMg);
  }

  return {
    pricePerMg: r.pricePerMg,
    method: r.method,
    source: r.source,
    singleSource: r.singleSource,
    divergenceBps: r.divergenceBps,
    divergenceWarning: r.divergenceWarning,
    sources: r.sources,
    scouter: scouter
      ? {
          pricePerMg: scouter.pricePerMg,
          sampleCount: scouter.sampleCount,
          inStockCount: scouter.inStockCount,
          listings: scouter.listings.map((l) => {
            const prev = prevScouterByKey.get(offerKey(l.vendor, l.sizeMg));
            const changePct =
              prev != null && prev > 0 ? ((l.pricePerMg - prev) / prev) * 100 : null;
            return {
              vendor: l.vendor,
              sizeMg: l.sizeMg,
              pricePerMg: l.pricePerMg,
              listPricePerMg: l.listPricePerMg,
              inStock: l.inStock,
              previousPricePerMg: prev ?? null,
              changePct: changePct != null ? Math.round(changePct * 100) / 100 : null,
            };
          }),
        }
      : null,
    basket: basket
      ? {
          pricePerMg: basket.pricePerMg,
          sampleCount: basket.sampleCount,
          vendorCount: basket.vendorCount,
          offerCount: basket.offerCount,
          errors: basket.errors,
          offers: basket.offers.map((o) => {
            const prev = prevBasketByKey.get(offerKey(o.vendor, o.sizeMg, o.url));
            const changePct =
              prev != null && prev > 0 ? ((o.pricePerMg - prev) / prev) * 100 : null;
            return {
              vendor: o.vendor,
              url: o.url,
              sizeMg: o.sizeMg,
              priceUsd: o.priceUsd,
              pricePerMg: o.pricePerMg,
              inStock: o.inStock,
              method: o.method,
              previousPricePerMg: prev ?? null,
              changePct: changePct != null ? Math.round(changePct * 100) / 100 : null,
            };
          }),
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
  const historySamples: PriceSample[] = [];
  const nowTs = Math.floor(Date.now() / 1000);

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

    // forcePushPrice removed: large moves pause the feed instead of applying.
    try {
      const tx = await oracle.pushPrice(marketKey, priceWei, row.source);
      await tx.wait();

      const feed = await oracle.feeds(marketKey);
      if (feed.paused) {
        anyPaused = true;
        console.warn(
          `⚠ ${row.symbol}: circuit breaker paused (push deviated >30%) — unpause after review, then push a smaller step`,
        );
      } else {
        const onChain = await oracle.latestPrice(marketKey);
        const priceNum = Number(ethers.formatEther(onChain));
        console.log(`✓ ${row.symbol}: $${priceNum}/mg  tx=${tx.hash}`);
        historySamples.push({
          market: row.symbol,
          ts: nowTs,
          price: priceNum,
          source: row.source.slice(0, 200),
          txHash: tx.hash,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // MIN_PUSH_INTERVAL = 5m — if a prior run just landed, still sample charts.
      if (/too soon/i.test(msg)) {
        console.warn(`⏭ ${row.symbol}: push too soon (min 5m interval) — sampling on-chain mark for charts`);
        try {
          const onChain = await oracle.latestPrice(marketKey);
          const priceNum = Number(ethers.formatEther(onChain));
          if (priceNum > 0) {
            historySamples.push({
              market: row.symbol,
              ts: nowTs,
              price: priceNum,
              source: `on-chain sample (push skipped: too soon) · ${row.source.slice(0, 120)}`,
            });
          }
        } catch {
          /* ignore */
        }
        continue;
      }
      throw err;
    }
  }

  if (historySamples.length > 0) {
    const paths = appendPriceSamples(historySamples);
    console.log(`Appended ${historySamples.length} samples to price history:`, paths);

    // Notify B2B webhook subscribers (optional; set ORACLE_API_FANOUT_URL + ORACLE_ADMIN_SECRET)
    const fanoutUrl = process.env.ORACLE_API_FANOUT_URL;
    const adminSecret = process.env.ORACLE_ADMIN_SECRET;
    if (fanoutUrl && adminSecret && !dryRun) {
      try {
        const res = await fetch(fanoutUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Secret": adminSecret,
          },
          body: JSON.stringify({
            prices: historySamples.map((s) => ({
              market: s.market,
              price: s.price,
              unit: "$/mg",
              asOf: s.ts,
              source: s.source,
            })),
          }),
        });
        console.log(`Webhook fanout: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
      } catch (e) {
        console.warn("Webhook fanout failed (non-fatal):", e);
      }
    }
  }

  if (anyPaused) {
    console.warn(
      "\nOne or more feeds are paused. Trading reverts until a pusher unpause()s, then push in ≤30% steps.",
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
