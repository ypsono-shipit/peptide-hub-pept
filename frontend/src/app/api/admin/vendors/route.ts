import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { assertInternalAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REMOTE_BASE =
  "https://raw.githubusercontent.com/ypsono-shipit/peptide-hub-pept/main/frontend/public/data";

/** Absolute % move that counts as a significant vendor alert. */
const DEFAULT_ALERT_PCT = 10;

type BasketOffer = {
  vendor: string;
  url?: string;
  sizeMg?: number;
  priceUsd?: number;
  pricePerMg: number;
  inStock?: boolean;
  method?: string;
  previousPricePerMg?: number | null;
  changePct?: number | null;
};

type ScouterListing = {
  vendor: string;
  sizeMg?: number | null;
  pricePerMg: number;
  listPricePerMg?: number | null;
  inStock?: boolean;
  previousPricePerMg?: number | null;
  changePct?: number | null;
};

type PeptideSnap = {
  pricePerMg?: number;
  basket?: {
    pricePerMg?: number;
    sampleCount?: number;
    vendorCount?: number;
    offerCount?: number;
    offers?: BasketOffer[];
    errors?: { vendor: string; url: string; error: string }[];
  } | null;
  scouter?: {
    pricePerMg?: number;
    sampleCount?: number;
    inStockCount?: number;
    listings?: ScouterListing[];
  } | null;
};

type ScrapeSnapshot = {
  scrapedAt?: string;
  previousScrapedAt?: string | null;
  method?: string;
  sourceErrors?: string[];
  peptides?: Record<string, PeptideSnap>;
  glp1Index?: { pricePerMg?: number };
};

async function loadJsonRemoteOrDisk(name: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${REMOTE_BASE}/${name}`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    if (res.ok) return res.json();
  } catch {
    /* disk */
  }
  for (const p of [
    path.join(process.cwd(), "public/data", name),
    path.join(process.cwd(), "data", name),
  ]) {
    try {
      return JSON.parse(await readFile(p, "utf8"));
    } catch {
      /* next */
    }
  }
  return null;
}

export type VendorRow = {
  peptide: string;
  market: string;
  source: "vendor_basket" | "peptidescouter";
  vendor: string;
  url: string | null;
  sizeMg: number | null;
  priceUsd: number | null;
  pricePerMg: number;
  previousPricePerMg: number | null;
  changePct: number | null;
  inStock: boolean | null;
  method: string | null;
  significant: boolean;
};

const SLUG_MARKET: Record<string, string> = {
  semaglutide: "SEMA-PERP",
  tirzepatide: "TIRZ-PERP",
  retatrutide: "RETA-PERP",
};

export async function GET(req: NextRequest) {
  const gate = assertInternalAdmin(req);
  if (!gate.ok) return gate.response;

  const alertPct = Math.max(
    1,
    Number(req.nextUrl.searchParams.get("alertPct") ?? DEFAULT_ALERT_PCT) || DEFAULT_ALERT_PCT,
  );

  const scrape = ((await loadJsonRemoteOrDisk("glp1-last-scrape.json")) ??
    {}) as ScrapeSnapshot;

  const rows: VendorRow[] = [];
  const errors: { peptide: string; vendor: string; url: string; error: string }[] = [];

  for (const [slug, pep] of Object.entries(scrape.peptides ?? {})) {
    const market = SLUG_MARKET[slug] ?? slug.toUpperCase();

    for (const o of pep.basket?.offers ?? []) {
      const changePct =
        o.changePct != null && Number.isFinite(o.changePct)
          ? o.changePct
          : o.previousPricePerMg != null && o.previousPricePerMg > 0
            ? Math.round(
                ((o.pricePerMg - o.previousPricePerMg) / o.previousPricePerMg) * 10_000,
              ) / 100
            : null;
      rows.push({
        peptide: slug,
        market,
        source: "vendor_basket",
        vendor: o.vendor,
        url: o.url ?? null,
        sizeMg: o.sizeMg ?? null,
        priceUsd: o.priceUsd ?? null,
        pricePerMg: o.pricePerMg,
        previousPricePerMg: o.previousPricePerMg ?? null,
        changePct,
        inStock: o.inStock ?? null,
        method: o.method ?? null,
        significant: changePct != null && Math.abs(changePct) >= alertPct,
      });
    }

    for (const l of pep.scouter?.listings ?? []) {
      const changePct =
        l.changePct != null && Number.isFinite(l.changePct)
          ? l.changePct
          : l.previousPricePerMg != null && l.previousPricePerMg > 0
            ? Math.round(
                ((l.pricePerMg - l.previousPricePerMg) / l.previousPricePerMg) * 10_000,
              ) / 100
            : null;
      rows.push({
        peptide: slug,
        market,
        source: "peptidescouter",
        vendor: l.vendor,
        url: null,
        sizeMg: l.sizeMg ?? null,
        priceUsd: null,
        pricePerMg: l.pricePerMg,
        previousPricePerMg: l.previousPricePerMg ?? null,
        changePct,
        inStock: l.inStock ?? null,
        method: "peptidescouter",
        significant: changePct != null && Math.abs(changePct) >= alertPct,
      });
    }

    for (const e of pep.basket?.errors ?? []) {
      errors.push({ peptide: slug, vendor: e.vendor, url: e.url, error: e.error });
    }
  }

  rows.sort((a, b) => {
    // Significant alerts first, then by abs change, then peptide/vendor
    if (a.significant !== b.significant) return a.significant ? -1 : 1;
    const ac = Math.abs(a.changePct ?? 0);
    const bc = Math.abs(b.changePct ?? 0);
    if (ac !== bc) return bc - ac;
    if (a.peptide !== b.peptide) return a.peptide.localeCompare(b.peptide);
    return a.vendor.localeCompare(b.vendor);
  });

  const alerts = rows.filter((r) => r.significant);
  const offerCount = rows.filter((r) => r.source === "vendor_basket").length;
  const listingCount = rows.filter((r) => r.source === "peptidescouter").length;

  const scrapedAt = scrape.scrapedAt ? Date.parse(scrape.scrapedAt) : null;
  const ageMinutes =
    scrapedAt && Number.isFinite(scrapedAt)
      ? Math.round((Date.now() - scrapedAt) / 60_000)
      : null;

  return NextResponse.json(
    {
      asOf: new Date().toISOString(),
      scrapedAt: scrape.scrapedAt ?? null,
      previousScrapedAt: scrape.previousScrapedAt ?? null,
      ageMinutes,
      method: scrape.method ?? null,
      sourceErrors: scrape.sourceErrors ?? [],
      alertPct,
      summary: {
        totalRows: rows.length,
        basketOffers: offerCount,
        scouterListings: listingCount,
        alertCount: alerts.length,
        scrapeErrors: errors.length,
        // True once the push script has started writing per-vendor offers
        vendorDetailAvailable: offerCount > 0 || listingCount > 0,
      },
      peptides: Object.fromEntries(
        Object.entries(scrape.peptides ?? {}).map(([slug, p]) => [
          slug,
          {
            market: SLUG_MARKET[slug] ?? slug.toUpperCase(),
            pricePerMg: p.pricePerMg ?? null,
            basketMedian: p.basket?.pricePerMg ?? null,
            scouterMedian: p.scouter?.pricePerMg ?? null,
            basketVendorCount: p.basket?.vendorCount ?? null,
            basketSampleCount: p.basket?.sampleCount ?? null,
            scouterSampleCount: p.scouter?.sampleCount ?? null,
          },
        ]),
      ),
      glp1Index: scrape.glp1Index ?? null,
      alerts,
      rows,
      scrapeErrors: errors,
      storageNote:
        "Historical mark prices live in git JSON (frontend/public/data/price-history.json), not Supabase. Per-vendor rows are in glp1-last-scrape.json (current + previous snapshot for change %).",
    },
    {
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
