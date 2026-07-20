import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { parseTimeframe, samplesToOhlc, type PriceSample } from "@/lib/ohlc";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Prefer live main-branch history so chart updates without Vercel redeploy. */
const REMOTE_HISTORY_URLS = [
  process.env.PRICE_HISTORY_URL,
  "https://raw.githubusercontent.com/ypsono-shipit/peptide-hub-pept/main/frontend/public/data/price-history.json",
].filter(Boolean) as string[];

function sampleKey(s: PriceSample): string {
  return `${s.market}|${s.ts}|${Number(s.price).toFixed(6)}`;
}

function mergeSamples(...lists: (PriceSample[] | null | undefined)[]): PriceSample[] {
  const map = new Map<string, PriceSample>();
  for (const list of lists) {
    if (!list) continue;
    for (const s of list) {
      if (!s?.market || !s.ts || !Number.isFinite(s.price) || s.price <= 0) continue;
      const k = sampleKey(s);
      const prev = map.get(k);
      // Prefer entry with txHash / longer source
      if (
        !prev ||
        (!!s.txHash && !prev.txHash) ||
        ((s.source?.length ?? 0) > (prev.source?.length ?? 0) && !prev.txHash)
      ) {
        map.set(k, s);
      }
    }
  }
  return [...map.values()].sort((a, b) => a.ts - b.ts || a.market.localeCompare(b.market));
}

async function loadSamplesFromRemote(): Promise<PriceSample[] | null> {
  for (const url of REMOTE_HISTORY_URLS) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        next: { revalidate: 0 },
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { samples?: PriceSample[] };
      if (Array.isArray(json.samples) && json.samples.length > 0) {
        return json.samples;
      }
    } catch {
      /* next */
    }
  }
  return null;
}

async function loadSamplesFromDisk(): Promise<PriceSample[]> {
  const candidates = [
    path.join(process.cwd(), "public/data/price-history.json"),
    path.join(process.cwd(), "data/price-history.json"),
  ];
  for (const p of candidates) {
    try {
      const raw = await readFile(p, "utf8");
      if (raw.includes("<<<<<<<")) continue;
      const json = JSON.parse(raw) as { samples?: PriceSample[] };
      if (Array.isArray(json.samples) && json.samples.length > 0) return json.samples;
    } catch {
      /* next */
    }
  }
  return [];
}

/**
 * Merge remote (cron-updated) + disk (deployed snapshot).
 * Never prefer a thin remote over a rich disk (or vice versa).
 */
async function loadSamples(): Promise<{ samples: PriceSample[]; source: string }> {
  const [remote, disk] = await Promise.all([loadSamplesFromRemote(), loadSamplesFromDisk()]);
  const samples = mergeSamples(disk, remote);
  const source =
    remote && disk.length
      ? `merged remote(${remote.length})+disk(${disk.length})→${samples.length}`
      : remote
        ? `remote(${remote.length})`
        : `disk(${disk.length})`;
  return { samples, source };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const market = searchParams.get("market") ?? "SEMA-PERP";
  const tf = parseTimeframe(searchParams.get("tf"));
  const live = searchParams.get("live");
  const livePrice = live ? Number(live) : undefined;

  const { samples, source } = await loadSamples();
  const candles = samplesToOhlc(samples, market, tf, {
    livePrice: Number.isFinite(livePrice) ? livePrice : undefined,
  });

  return NextResponse.json(
    {
      market,
      tf,
      count: candles.length,
      sampleCount: samples.filter((s) => s.market === market).length,
      source,
      candles,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    },
  );
}
