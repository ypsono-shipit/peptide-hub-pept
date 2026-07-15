/**
 * Combine PeptideScouter (source A) + vendor basket (source B) into a single
 * oracle price per peptide using weighted pricing.
 *
 * Policy (see data/oracle-pricing.json):
 * - Each source already size-weights listings after IQR.
 * - Dual combine: weighted average of source prices.
 *   weight_i = sourceWeights[i] * (weightBySampleCount ? sampleCount_i : 1)
 * - If sources diverge more than maxSourceDivergenceBps, still apply the
 *   weighted price but mark divergenceWarning (on-chain circuit breaker is
 *   the hard backstop).
 * - If only one source works, use it with singleSource: true.
 */

import * as fs from "fs";
import * as path from "path";
import { roundPrice, weightedAverage } from "./stats";
import { scrapePeptideScouter, type PeptideAggregate } from "./scrape-peptidescouter";
import {
  scrapeVendorBasket,
  loadVendorBasketConfig,
  type VendorBasketAggregate,
  type PeptideSlug,
} from "./scrape-vendor-basket";

export type SourceQuote = {
  name: string;
  pricePerMg: number;
  source: string;
  sampleCount: number;
  weight: number;
};

export type DualSourceResult = {
  slug: PeptideSlug;
  pricePerMg: number;
  sources: SourceQuote[];
  method: string;
  source: string;
  singleSource: boolean;
  divergenceBps: number | null;
  divergenceWarning: boolean;
  maxSourceDivergenceBps: number;
};

export type OraclePricingConfig = {
  listingAggregation: "size_weighted" | "median";
  sourceWeights: {
    peptidescouter: number;
    vendor_basket: number;
  };
  weightBySampleCount: boolean;
  maxSourceDivergenceBps: number;
};

export function loadOraclePricingConfig(
  configPath = path.join(__dirname, "../../data/oracle-pricing.json"),
): OraclePricingConfig {
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  return {
    listingAggregation: raw.listingAggregation === "median" ? "median" : "size_weighted",
    sourceWeights: {
      peptidescouter: Number(raw.sourceWeights?.peptidescouter ?? 0.55),
      vendor_basket: Number(raw.sourceWeights?.vendor_basket ?? 0.45),
    },
    weightBySampleCount: raw.weightBySampleCount !== false,
    maxSourceDivergenceBps: Number(raw.maxSourceDivergenceBps ?? 4000),
  };
}

export function combineDualSources(args: {
  slug: PeptideSlug;
  scouter?: PeptideAggregate | null;
  basket?: VendorBasketAggregate | null;
  maxSourceDivergenceBps?: number;
  pricing?: OraclePricingConfig;
}): DualSourceResult {
  const pricing = args.pricing ?? loadOraclePricingConfig();
  const maxDiv = args.maxSourceDivergenceBps ?? pricing.maxSourceDivergenceBps;
  const sources: SourceQuote[] = [];

  if (args.scouter) {
    const prior = pricing.sourceWeights.peptidescouter;
    const n = Math.max(1, args.scouter.sampleCount);
    const weight = pricing.weightBySampleCount ? prior * n : prior;
    sources.push({
      name: "peptidescouter",
      pricePerMg: args.scouter.pricePerMg,
      source: args.scouter.source,
      sampleCount: args.scouter.sampleCount,
      weight,
    });
  }
  if (args.basket) {
    const prior = pricing.sourceWeights.vendor_basket;
    const n = Math.max(1, args.basket.sampleCount);
    const weight = pricing.weightBySampleCount ? prior * n : prior;
    sources.push({
      name: "vendor_basket",
      pricePerMg: args.basket.pricePerMg,
      source: args.basket.source,
      sampleCount: args.basket.sampleCount,
      weight,
    });
  }

  if (sources.length === 0) {
    throw new Error(`dual-source ${args.slug}: no sources available`);
  }

  const combined = roundPrice(
    sources.length === 1
      ? sources[0]!.pricePerMg
      : weightedAverage(sources.map((s) => ({ value: s.pricePerMg, weight: s.weight }))),
  );

  const prices = sources.map((s) => s.pricePerMg);
  let divergenceBps: number | null = null;
  let divergenceWarning = false;
  if (sources.length >= 2) {
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    divergenceBps = lo > 0 ? Math.round(((hi - lo) / lo) * 10_000) : null;
    divergenceWarning = divergenceBps != null && divergenceBps > maxDiv;
  }

  const weightSummary = sources
    .map((s) => `${s.name}@w=${s.weight.toFixed(1)}`)
    .join("+");
  const method =
    sources.length === 1
      ? `single_source:${sources[0]!.name}`
      : `weighted(${weightSummary})`;

  const source =
    sources.length === 1
      ? sources[0]!.source
      : `Dual source weighted · ${sources.map((s) => `${s.name}=$${s.pricePerMg}(n=${s.sampleCount})`).join(" · ")}` +
        (divergenceBps != null ? ` · divergence=${(divergenceBps / 100).toFixed(1)}%` : "");

  return {
    slug: args.slug,
    pricePerMg: combined,
    sources,
    method,
    source,
    singleSource: sources.length === 1,
    divergenceBps,
    divergenceWarning,
    maxSourceDivergenceBps: maxDiv,
  };
}

export type DualResolveOptions = {
  skipScouter?: boolean;
  skipBasket?: boolean;
  maxSourceDivergenceBps?: number;
};

export async function resolveAllDualSources(opts: DualResolveOptions = {}): Promise<{
  results: {
    semaglutide: DualSourceResult;
    tirzepatide: DualSourceResult;
    retatrutide: DualSourceResult;
  };
  scouter: Partial<Record<PeptideSlug, PeptideAggregate>>;
  basket: Partial<Record<PeptideSlug, VendorBasketAggregate>>;
  sourceErrors: string[];
  pricing: OraclePricingConfig;
}> {
  const slugs: PeptideSlug[] = ["semaglutide", "tirzepatide", "retatrutide"];
  const pricing = loadOraclePricingConfig();
  const basketConfig = loadVendorBasketConfig();
  const maxDiv = opts.maxSourceDivergenceBps ?? pricing.maxSourceDivergenceBps;
  const sourceErrors: string[] = [];
  const scouter: Partial<Record<PeptideSlug, PeptideAggregate>> = {};
  const basket: Partial<Record<PeptideSlug, VendorBasketAggregate>> = {};

  if (!opts.skipScouter) {
    for (const slug of slugs) {
      try {
        scouter[slug] = await scrapePeptideScouter(slug);
      } catch (err) {
        sourceErrors.push(
          `scouter/${slug}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  if (!opts.skipBasket) {
    for (const slug of slugs) {
      try {
        basket[slug] = await scrapeVendorBasket(slug, { config: basketConfig });
      } catch (err) {
        sourceErrors.push(
          `basket/${slug}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  const results = {} as Record<PeptideSlug, DualSourceResult>;
  for (const slug of slugs) {
    results[slug] = combineDualSources({
      slug,
      scouter: scouter[slug] ?? null,
      basket: basket[slug] ?? null,
      maxSourceDivergenceBps: maxDiv,
      pricing,
    });
  }

  return {
    results: {
      semaglutide: results.semaglutide,
      tirzepatide: results.tirzepatide,
      retatrutide: results.retatrutide,
    },
    scouter,
    basket,
    sourceErrors,
    pricing,
  };
}
