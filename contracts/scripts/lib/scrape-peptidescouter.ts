/**
 * PeptideScouter.com scraper for research-peptide $/mg listings.
 *
 * Site notes (as of 2026-07-15):
 * - Pages like /peptides/semaglutide are Next.js SSR with a full HTML <table>
 *   (Vendor, Size, Price, $/mg, Stock, Updated, Promo, Buy).
 * - robots.txt allows User-Agent: * for page HTML; blocks named AI bots
 *   (GPTBot, ClaudeBot, …) and /api/*. Use a dedicated oracle bot UA.
 * - No public median API — we parse vendor rows and aggregate ourselves.
 * - Prefer sale $/mg when both list + promo prices appear in the $/mg cell.
 */

import * as cheerio from "cheerio";
import { iqrFilter, median, mean, roundPrice, sizeWeightedAverage, iqrThenSizeWeighted } from "./stats";

export const SCOUTER_BASE = "https://peptidescouter.com";

/** Identify this aggregator; robots.txt does not block custom bot names. */
export const ORACLE_USER_AGENT =
  "PeptideHubOracleBot/1.0 (+https://github.com/peptide-hub; research price oracle for PEPT perps; contact: oracle@peptide-hub.local)";

export type PeptideSlug = "semaglutide" | "tirzepatide" | "retatrutide";

export type VendorListing = {
  vendor: string;
  sizeMg: number | null;
  /** Preferential (sale) $/mg used for aggregation. */
  pricePerMg: number;
  /** Higher list $/mg when a strike-through price is present. */
  listPricePerMg: number | null;
  inStock: boolean;
  rawStock: string;
};

export type PeptideAggregate = {
  slug: PeptideSlug;
  url: string;
  scrapedAt: string;
  listingCount: number;
  inStockCount: number;
  /** In-stock listings after IQR filter — primary oracle input. */
  sampleCount: number;
  medianPerMg: number;
  meanPerMg: number;
  vwapPerMg: number | null;
  minPerMg: number;
  maxPerMg: number;
  /** Primary oracle input (size-weighted after IQR by default). */
  pricePerMg: number;
  method: "size_weighted_iqr" | "median_iqr" | "in_stock_median_iqr";
  source: string;
  listings: VendorListing[];
};

export type ScrapeOptions = {
  /** Min in-stock samples required after filtering; else throw. */
  minSamples?: number;
  fetchImpl?: typeof fetch;
  userAgent?: string;
  /** Delay between peptide page fetches (ms). */
  delayMs?: number;
};

const DEFAULT_MIN_SAMPLES = 5;

export async function scrapePeptideScouter(
  slug: PeptideSlug,
  opts: ScrapeOptions = {},
): Promise<PeptideAggregate> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const userAgent = opts.userAgent ?? ORACLE_USER_AGENT;
  const minSamples = opts.minSamples ?? DEFAULT_MIN_SAMPLES;
  const url = `${SCOUTER_BASE}/peptides/${slug}`;

  const res = await fetchImpl(url, {
    headers: {
      "User-Agent": userAgent,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`PeptideScouter ${slug}: HTTP ${res.status} for ${url}`);
  }

  const html = await res.text();
  const listings = parseListingsFromHtml(html);

  if (listings.length === 0) {
    throw new Error(
      `PeptideScouter ${slug}: parsed 0 vendor rows — page layout may have changed (${url})`,
    );
  }

  const inStock = listings.filter((l) => l.inStock && l.pricePerMg > 0);
  const prices = inStock.map((l) => l.pricePerMg);
  const filtered = iqrFilter(prices);
  if (filtered.length < minSamples) {
    throw new Error(
      `PeptideScouter ${slug}: only ${filtered.length} in-stock samples after filter ` +
        `(need ≥${minSamples}; raw in-stock=${inStock.length}, all=${listings.length})`,
    );
  }

  // Primary: size-weighted $/mg after IQR (larger vials count more). Fallback median.
  const agg = iqrThenSizeWeighted(
    inStock.map((l) => ({ pricePerMg: l.pricePerMg, sizeMg: l.sizeMg })),
  );
  const med = median(filtered);
  const vwapAll = sizeWeightedAverage(
    inStock
      .filter((l) => l.sizeMg != null)
      .map((l) => ({ pricePerMg: l.pricePerMg, sizeMg: l.sizeMg! })),
  );
  const scrapedAt = new Date().toISOString();
  const methodLabel =
    agg.method === "size_weighted_iqr" ? "size-weighted (IQR)" : "median (IQR)";
  const source =
    `PeptideScouter.com live scrape · ${slug} · ${methodLabel} ` +
    `n=${agg.sampleCount}/${inStock.length} · ${scrapedAt.slice(0, 10)}`;

  return {
    slug,
    url,
    scrapedAt,
    listingCount: listings.length,
    inStockCount: inStock.length,
    sampleCount: agg.sampleCount,
    medianPerMg: roundPrice(med),
    meanPerMg: roundPrice(mean(filtered)),
    vwapPerMg: vwapAll == null ? null : roundPrice(vwapAll),
    minPerMg: roundPrice(Math.min(...filtered)),
    maxPerMg: roundPrice(Math.max(...filtered)),
    pricePerMg: roundPrice(agg.price),
    method: agg.method,
    source,
    listings,
  };
}

export async function scrapeGlp1Basket(opts: ScrapeOptions = {}): Promise<{
  semaglutide: PeptideAggregate;
  tirzepatide: PeptideAggregate;
  retatrutide: PeptideAggregate;
}> {
  const delayMs = opts.delayMs ?? 750;
  const slugs: PeptideSlug[] = ["semaglutide", "tirzepatide", "retatrutide"];
  const out: Partial<Record<PeptideSlug, PeptideAggregate>> = {};

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i]!;
    out[slug] = await scrapePeptideScouter(slug, opts);
    if (i < slugs.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return {
    semaglutide: out.semaglutide!,
    tirzepatide: out.tirzepatide!,
    retatrutide: out.retatrutide!,
  };
}

export function parseListingsFromHtml(html: string): VendorListing[] {
  const $ = cheerio.load(html);
  const listings: VendorListing[] = [];

  // Prefer the main comparison table; fall back to first table with enough columns.
  const tables = $("table").toArray();
  let rows = $();
  for (const table of tables) {
    const $table = $(table);
    const headerText = $table
      .find("th")
      .map((_, el) => $(el).text().toLowerCase())
      .get()
      .join(" ");
    const candidate = $table.find("tr").filter((_, el) => $(el).find("td").length >= 5);
    if (
      candidate.length > 0 &&
      (headerText.includes("$/mg") || headerText.includes("vendor") || headerText.includes("price"))
    ) {
      rows = candidate;
      break;
    }
  }
  if (rows.length === 0) {
    rows = $("table tr").filter((_, el) => $(el).find("td").length >= 5);
  }

  rows.each((_, el) => {
    const cells = $(el).find("td");
    if (cells.length < 5) return;

    const vendorRaw = cleanText($(cells[0]).text());
    const vendor = vendorRaw
      .replace(/\d\.\d\s*★.*/u, "")
      .replace(/No Trustpilot reviews/i, "")
      .replace(/\d+\s+reviews?/i, "")
      .trim();

    const sizeText = cleanText($(cells[1]).text());
    const sizeMatch = sizeText.match(/([0-9]+(?:\.[0-9]+)?)\s*mg/i);
    const sizeMg = sizeMatch ? Number(sizeMatch[1]) : null;

    // $/mg cell may contain list + sale (e.g. "$1.33$1.20"). Use the lower (sale) price.
    const ppmText = cleanText($(cells[3]).text());
    const ppmValues = [...ppmText.matchAll(/\$([0-9]+(?:\.[0-9]+)?)/g)].map((m) => Number(m[1]));
    if (ppmValues.length === 0) return;
    const pricePerMg = Math.min(...ppmValues);
    const listPricePerMg = ppmValues.length > 1 ? Math.max(...ppmValues) : null;

    // Sanity bounds for research peptide $/mg — reject parse garbage.
    if (!(pricePerMg >= 0.05 && pricePerMg <= 500)) return;

    const rawStock = cleanText($(cells[4]).text());
    const stockUpper = rawStock.toUpperCase();
    const inStock =
      stockUpper.includes("IN STOCK") ||
      (stockUpper.includes("STOCK") && !stockUpper.includes("OUT") && !stockUpper.includes("UNAVAILABLE"));

    listings.push({
      vendor: vendor || "unknown",
      sizeMg,
      pricePerMg,
      listPricePerMg,
      inStock,
      rawStock,
    });
  });

  return listings;
}

function cleanText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
