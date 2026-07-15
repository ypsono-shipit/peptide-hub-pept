/**
 * Dry-run dual-source scrape (PeptideScouter + vendor basket) without chain txs.
 *
 *   npm run scrape:glp1
 *   SKIP_BASKET=1 npm run scrape:glp1
 *   SKIP_SCOUTER=1 npm run scrape:glp1
 */
import * as fs from "fs";
import * as path from "path";
import { resolveAllDualSources } from "./lib/dual-source";
import referenceData from "../data/glp1-reference-prices.json";
import { roundPrice } from "./lib/stats";

async function main() {
  console.log("Dual-source scrape: PeptideScouter + vendor basket …\n");

  const dual = await resolveAllDualSources({
    skipScouter: process.env.SKIP_SCOUTER === "1",
    skipBasket: process.env.SKIP_BASKET === "1",
  });

  if (dual.sourceErrors.length) {
    console.log("Source errors (non-fatal when the other source works):");
    for (const e of dual.sourceErrors) console.log(`  ⚠ ${e}`);
    console.log("");
  }

  const weights = referenceData.glp1Index.weights;
  const indexPrice = roundPrice(
    dual.results.semaglutide.pricePerMg * weights.semaglutide +
      dual.results.tirzepatide.pricePerMg * weights.tirzepatide +
      dual.results.retatrutide.pricePerMg * weights.retatrutide,
  );

  for (const slug of ["semaglutide", "tirzepatide", "retatrutide"] as const) {
    const r = dual.results[slug];
    const sc = dual.scouter[slug];
    const bk = dual.basket[slug];
    console.log(
      `${slug.padEnd(12)}  dual=$${r.pricePerMg.toFixed(4)}/mg  ` +
        `scouter=${sc ? "$" + sc.pricePerMg.toFixed(4) : "—"}  ` +
        `basket=${bk ? "$" + bk.pricePerMg.toFixed(4) + ` (n=${bk.sampleCount}, vendors=${bk.vendorCount})` : "—"}` +
        (r.divergenceWarning ? "  ⚠ DIVERGENCE" : ""),
    );
    if (bk?.errors?.length) {
      for (const err of bk.errors.slice(0, 5)) {
        console.log(`    basket err ${err.vendor}: ${err.error}`);
      }
      if (bk.errors.length > 5) console.log(`    … +${bk.errors.length - 5} more`);
    }
  }
  console.log(
    `${"glp1-index".padEnd(12)}  $${indexPrice.toFixed(4)}/mg  (60/25/15)`,
  );

  const snapshot = {
    scrapedAt: new Date().toISOString(),
    method: "dual source: PeptideScouter + vendor basket",
    sourceErrors: dual.sourceErrors,
    peptides: {
      semaglutide: dual.results.semaglutide,
      tirzepatide: dual.results.tirzepatide,
      retatrutide: dual.results.retatrutide,
    },
    scouter: dual.scouter,
    basket: {
      semaglutide: dual.basket.semaglutide
        ? compactBasket(dual.basket.semaglutide)
        : null,
      tirzepatide: dual.basket.tirzepatide
        ? compactBasket(dual.basket.tirzepatide)
        : null,
      retatrutide: dual.basket.retatrutide
        ? compactBasket(dual.basket.retatrutide)
        : null,
    },
    glp1Index: {
      symbol: referenceData.glp1Index.symbol,
      weights,
      pricePerMg: indexPrice,
    },
  };

  const outPath = path.join(__dirname, "../data/glp1-last-scrape.json");
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`\nWrote snapshot → ${outPath}`);
}

function compactBasket(b: {
  pricePerMg: number;
  sampleCount: number;
  vendorCount: number;
  offerCount: number;
  offers: { vendor: string; sizeMg: number; priceUsd: number; pricePerMg: number; method: string }[];
  errors: { vendor: string; url: string; error: string }[];
  source: string;
}) {
  return {
    pricePerMg: b.pricePerMg,
    sampleCount: b.sampleCount,
    vendorCount: b.vendorCount,
    offerCount: b.offerCount,
    source: b.source,
    offers: b.offers.map((o) => ({
      vendor: o.vendor,
      sizeMg: o.sizeMg,
      priceUsd: o.priceUsd,
      pricePerMg: o.pricePerMg,
      method: o.method,
    })),
    errors: b.errors,
  };
}

main().catch((err) => {
  console.error("SCRAPE FAILED:", err);
  process.exitCode = 1;
});
