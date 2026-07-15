/**
 * Direct vendor product-page scraper — second oracle source.
 *
 * Fetches curated PDPs from data/vendor-basket.json, extracts price + vial
 * size (WooCommerce variations, JSON-LD offers, Shopify product JSON, or
 * fixed sizeMg from config), normalizes to USD/mg, then aggregates via
 * IQR-filtered median.
 */

import * as fs from "fs";
import * as path from "path";
import * as cheerio from "cheerio";
import { iqrFilter, median, mean, roundPrice, iqrThenSizeWeighted } from "./stats";
import { ORACLE_USER_AGENT } from "./scrape-peptidescouter";

export type PeptideSlug = "semaglutide" | "tirzepatide" | "retatrutide";

export type BasketProductConfig = {
  vendor: string;
  url: string;
  enabled?: boolean;
  /** Fixed vial size when the page is a single SKU. */
  sizeMg?: number;
};

export type VendorBasketConfig = {
  minVendorSamples: number;
  maxSourceDivergenceBps: number;
  fetchDelayMs: number;
  products: Record<PeptideSlug, BasketProductConfig[]>;
};

export type VendorOffer = {
  vendor: string;
  url: string;
  sizeMg: number;
  priceUsd: number;
  pricePerMg: number;
  inStock: boolean;
  method: string;
};

export type VendorBasketAggregate = {
  slug: PeptideSlug;
  scrapedAt: string;
  offerCount: number;
  sampleCount: number;
  vendorCount: number;
  pricePerMg: number;
  medianPerMg: number;
  meanPerMg: number;
  minPerMg: number;
  maxPerMg: number;
  method: "size_weighted_iqr" | "median_iqr" | "vendor_basket_median_iqr";
  source: string;
  offers: VendorOffer[];
  errors: { vendor: string; url: string; error: string }[];
};

export type ScrapeBasketOptions = {
  fetchImpl?: typeof fetch;
  userAgent?: string;
  delayMs?: number;
  minSamples?: number;
  config?: VendorBasketConfig;
};

const MIN_PRICE_PER_MG = 0.05;
const MAX_PRICE_PER_MG = 200;

export function loadVendorBasketConfig(
  configPath = path.join(__dirname, "../../data/vendor-basket.json"),
): VendorBasketConfig {
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  return {
    minVendorSamples: raw.minVendorSamples ?? 3,
    maxSourceDivergenceBps: raw.maxSourceDivergenceBps ?? 2500,
    fetchDelayMs: raw.fetchDelayMs ?? 400,
    products: raw.products,
  };
}

export async function scrapeVendorBasket(
  slug: PeptideSlug,
  opts: ScrapeBasketOptions = {},
): Promise<VendorBasketAggregate> {
  const config = opts.config ?? loadVendorBasketConfig();
  const products = (config.products[slug] ?? []).filter((p) => p.enabled !== false);
  const fetchImpl = opts.fetchImpl ?? fetch;
  const userAgent = opts.userAgent ?? ORACLE_USER_AGENT;
  const delayMs = opts.delayMs ?? config.fetchDelayMs;
  const minSamples = opts.minSamples ?? config.minVendorSamples;

  const offers: VendorOffer[] = [];
  const errors: VendorBasketAggregate["errors"] = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i]!;
    try {
      const pageOffers = await scrapeProductPage(product, { fetchImpl, userAgent });
      offers.push(...pageOffers.filter((o) => o.inStock && o.pricePerMg > 0));
    } catch (err) {
      errors.push({
        vendor: product.vendor,
        url: product.url,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    if (i < products.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  const prices = offers.map((o) => o.pricePerMg);
  const filtered = iqrFilter(prices);
  if (filtered.length < minSamples) {
    throw new Error(
      `Vendor basket ${slug}: only ${filtered.length} usable offers after filter ` +
        `(need ≥${minSamples}; raw offers=${offers.length}, errors=${errors.length})`,
    );
  }

  // Primary: size-weighted $/mg after IQR (larger vials count more).
  const agg = iqrThenSizeWeighted(
    offers.map((o) => ({ pricePerMg: o.pricePerMg, sizeMg: o.sizeMg })),
  );
  const med = median(filtered);
  const scrapedAt = new Date().toISOString();
  const vendors = new Set(offers.map((o) => o.vendor));
  const methodLabel =
    agg.method === "size_weighted_iqr" ? "size-weighted (IQR)" : "median (IQR)";
  const source =
    `Vendor basket live scrape · ${slug} · ${methodLabel} ` +
    `n=${agg.sampleCount}/${offers.length} vendors=${vendors.size} · ${scrapedAt.slice(0, 10)}`;

  return {
    slug,
    scrapedAt,
    offerCount: offers.length,
    sampleCount: agg.sampleCount,
    vendorCount: vendors.size,
    pricePerMg: roundPrice(agg.price),
    medianPerMg: roundPrice(med),
    meanPerMg: roundPrice(mean(filtered)),
    minPerMg: roundPrice(Math.min(...filtered)),
    maxPerMg: roundPrice(Math.max(...filtered)),
    method: agg.method,
    source,
    offers,
    errors,
  };
}

export async function scrapeVendorBasketAll(opts: ScrapeBasketOptions = {}): Promise<{
  semaglutide: VendorBasketAggregate;
  tirzepatide: VendorBasketAggregate;
  retatrutide: VendorBasketAggregate;
}> {
  const slugs: PeptideSlug[] = ["semaglutide", "tirzepatide", "retatrutide"];
  const out: Partial<Record<PeptideSlug, VendorBasketAggregate>> = {};
  for (const slug of slugs) {
    out[slug] = await scrapeVendorBasket(slug, opts);
  }
  return {
    semaglutide: out.semaglutide!,
    tirzepatide: out.tirzepatide!,
    retatrutide: out.retatrutide!,
  };
}

async function scrapeProductPage(
  product: BasketProductConfig,
  opts: { fetchImpl: typeof fetch; userAgent: string },
): Promise<VendorOffer[]> {
  const res = await opts.fetchImpl(product.url, {
    headers: {
      "User-Agent": opts.userAgent,
      Accept: "text/html,application/xhtml+xml,application/json",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const body = await res.text();

  if (/just a moment|cf-ray|attention required|bot verification/i.test(body.slice(0, 4000))) {
    throw new Error("blocked by bot protection");
  }

  // Shopify product JSON sometimes returned for .js URLs; also try sibling .js
  if (contentType.includes("application/json") || product.url.endsWith(".js")) {
    return parseShopifyJson(body, product);
  }

  let offers = parseWooVariations(body, product);
  if (offers.length === 0) offers = parseJsonLdOffers(body, product);
  if (offers.length === 0) offers = parseShopifyEmbedded(body, product);
  if (offers.length === 0) offers = parseSimplePrice(body, product);

  // Shopify storefront fallback: /products/handle.js
  if (offers.length === 0 && /\/products\//i.test(product.url)) {
    try {
      const jsUrl = product.url.replace(/\/?(\?.*)?$/, "") + ".js";
      const jsRes = await opts.fetchImpl(jsUrl, {
        headers: { "User-Agent": opts.userAgent, Accept: "application/json" },
      });
      if (jsRes.ok) {
        offers = parseShopifyJson(await jsRes.text(), product);
      }
    } catch {
      // ignore secondary fetch errors
    }
  }

  if (offers.length === 0) {
    throw new Error("no parseable price/size on page");
  }

  return offers.filter(
    (o) =>
      o.sizeMg > 0 &&
      o.priceUsd > 0 &&
      o.pricePerMg >= MIN_PRICE_PER_MG &&
      o.pricePerMg <= MAX_PRICE_PER_MG,
  );
}

/** WooCommerce variable products embed variations as HTML-escaped JSON. */
export function parseWooVariations(html: string, product: BasketProductConfig): VendorOffer[] {
  const m = html.match(/data-product_variations="([^"]+)"/);
  if (!m) return [];

  let data: unknown;
  try {
    data = JSON.parse(decodeHtmlEntities(m[1]!));
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const offers: VendorOffer[] = [];
  for (const v of data) {
    if (!v || typeof v !== "object") continue;
    const row = v as Record<string, unknown>;
    const price = num(row.display_price) ?? num(row.display_regular_price) ?? num(row.price);
    if (price == null) continue;

    const attrs = (row.attributes ?? {}) as Record<string, string>;
    const attrText = Object.values(attrs).join(" ");
    const sizeMg =
      product.sizeMg ??
      extractSizeMg(attrText) ??
      extractSizeMg(String(row.sku ?? "")) ??
      extractSizeMg(product.url);

    if (sizeMg == null) continue;
    // Skip multi-vial kits if detectable
    if (looksLikeKit(attrText) || looksLikeKit(product.url)) continue;

    const inStock = row.is_in_stock !== false && row.is_purchasable !== false;
    offers.push({
      vendor: product.vendor,
      url: product.url,
      sizeMg,
      priceUsd: price,
      pricePerMg: roundPrice(price / sizeMg),
      inStock,
      method: "woocommerce_variation",
    });
  }
  return offers;
}

export function parseJsonLdOffers(html: string, product: BasketProductConfig): VendorOffer[] {
  const offers: VendorOffer[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    let data: unknown;
    try {
      data = JSON.parse(match[1]!);
    } catch {
      continue;
    }
    walkJsonLd(data, (node) => {
      const type = node["@type"];
      const types = Array.isArray(type) ? type : type ? [type] : [];
      if (!types.includes("Product") && !types.includes("ProductGroup") && !node.offers) return;

      const name = String(node.name ?? product.vendor);
      if (looksLikeKit(name) || looksLikeKit(product.url)) return;

      const offerNodes = normalizeOffers(node.offers);
      for (const offer of offerNodes) {
        const price = num(offer.price);
        if (price == null) continue;
        const sizeMg =
          product.sizeMg ??
          extractSizeMg(name) ??
          extractSizeMg(String(offer.name ?? "")) ??
          extractSizeMg(String(offer.url ?? product.url)) ??
          extractSizeMg(product.url);
        if (sizeMg == null) continue;

        const availability = String(offer.availability ?? "");
        const inStock = !/OutOfStock|SoldOut|Discontinued/i.test(availability);

        offers.push({
          vendor: product.vendor,
          url: product.url,
          sizeMg,
          priceUsd: price,
          pricePerMg: roundPrice(price / sizeMg),
          inStock,
          method: "json_ld",
        });
      }
    });
  }
  return dedupeOffers(offers);
}

export function parseShopifyJson(body: string, product: BasketProductConfig): VendorOffer[] {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(body);
  } catch {
    return [];
  }
  const variants = Array.isArray(data.variants) ? data.variants : [];
  const title = String(data.title ?? "");
  const offers: VendorOffer[] = [];

  for (const v of variants) {
    if (!v || typeof v !== "object") continue;
    const row = v as Record<string, unknown>;
    // Shopify prices often in cents as string "3500" for $35.00 when from .js
    let price = num(row.price);
    if (price == null) continue;
    // Heuristic: integer >= 100 with no decimal in original often means cents
    if (Number.isInteger(price) && price >= 100 && !String(row.price).includes(".")) {
      // could be cents OR $100+ product — use title/size context; prefer dollars if size known
      // Shopify .js always uses cents.
      price = price / 100;
    }

    const variantTitle = String(row.title ?? row.public_title ?? "");
    const sizeMg =
      product.sizeMg ??
      extractSizeMg(variantTitle) ??
      extractSizeMg(title) ??
      extractSizeMg(product.url);
    if (sizeMg == null) continue;
    if (looksLikeKit(variantTitle) || looksLikeKit(title)) continue;

    const inStock = row.available !== false;
    offers.push({
      vendor: product.vendor,
      url: product.url,
      sizeMg,
      priceUsd: price,
      pricePerMg: roundPrice(price / sizeMg),
      inStock,
      method: "shopify_json",
    });
  }
  return offers;
}

function parseShopifyEmbedded(html: string, product: BasketProductConfig): VendorOffer[] {
  const m = html.match(/<script[^>]*type=["']application\/json["'][^>]*data-product-json[^>]*>([\s\S]*?)<\/script>/i)
    ?? html.match(/var\s+meta\s*=\s*(\{[\s\S]*?\});\s*<\/script>/i);
  if (!m) return [];
  try {
    return parseShopifyJson(m[1]!, product);
  } catch {
    return [];
  }
}

/** Last-resort: one fixed price + config/title size. */
export function parseSimplePrice(html: string, product: BasketProductConfig): VendorOffer[] {
  const $ = cheerio.load(html);
  const title = $("h1").first().text() || $("title").text();
  if (looksLikeKit(title) || looksLikeKit(product.url)) return [];

  const sizeMg =
    product.sizeMg ?? extractSizeMg(title) ?? extractSizeMg(product.url) ?? extractSizeMg(html.slice(0, 2000));
  if (sizeMg == null) return [];

  // Prefer itemprop / woocommerce amount
  let price: number | null = null;
  const itemprop = $('[itemprop="price"]').attr("content") ?? $('[itemprop="price"]').first().text();
  price = num(itemprop);

  if (price == null) {
    const amount = $(".woocommerce-Price-amount bdi").first().text() || $(".price .amount").first().text();
    const m = amount.replace(/,/g, "").match(/([0-9]+(?:\.[0-9]+)?)/);
    if (m) price = Number(m[1]);
  }

  if (price == null) {
    // JSON-ish "price":"40"
    const m = html.match(/"price"\s*:\s*"([0-9]+(?:\.[0-9]+)?)"/);
    if (m) price = Number(m[1]);
  }

  if (price == null || price <= 0) return [];

  const inStock = !/out of stock/i.test($(".stock").text()) && !/out of stock/i.test(title);

  return [
    {
      vendor: product.vendor,
      url: product.url,
      sizeMg,
      priceUsd: price,
      pricePerMg: roundPrice(price / sizeMg),
      inStock,
      method: "simple_price",
    },
  ];
}

export function extractSizeMg(text: string): number | null {
  if (!text) return null;
  // Prefer explicit mg tokens; avoid matching "mg" inside longer words.
  const patterns = [
    /(?:^|[^\w])([0-9]+(?:\.[0-9]+)?)\s*-\s*mg(?:[^\w]|$)/i,
    /(?:^|[^\w])([0-9]+(?:\.[0-9]+)?)\s*mg(?:[^\w]|$)/i,
    /(?:^|[^\w])([0-9]+(?:\.[0-9]+)?)mg(?:[^\w]|$)/i,
    /dosage["']?\s*[:=]\s*["']?([0-9]+(?:\.[0-9]+)?)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = Number(m[1]);
      if (n > 0 && n <= 500) return n;
    }
  }
  return null;
}

function looksLikeKit(text: string): boolean {
  return /\b(kit|vial[- ]?pack|pack of|[0-9]+\s*vials?|x\s*[0-9]+\s*vials?)\b/i.test(text);
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function normalizeOffers(offers: unknown): Record<string, unknown>[] {
  if (!offers) return [];
  if (Array.isArray(offers)) return offers.filter((o) => o && typeof o === "object") as Record<string, unknown>[];
  if (typeof offers === "object") return [offers as Record<string, unknown>];
  return [];
}

function walkJsonLd(node: unknown, visit: (n: Record<string, unknown>) => void) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const x of node) walkJsonLd(x, visit);
    return;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    visit(obj);
    if (obj["@graph"]) walkJsonLd(obj["@graph"], visit);
    for (const v of Object.values(obj)) {
      if (v && typeof v === "object") walkJsonLd(v, visit);
    }
  }
}

function dedupeOffers(offers: VendorOffer[]): VendorOffer[] {
  const seen = new Set<string>();
  const out: VendorOffer[] = [];
  for (const o of offers) {
    const key = `${o.vendor}|${o.sizeMg}|${o.priceUsd}|${o.method}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
