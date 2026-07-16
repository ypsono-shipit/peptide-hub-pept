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

async function loadSamplesFromRemote(): Promise<PriceSample[] | null> {
  for (const url of REMOTE_HISTORY_URLS) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        next: { revalidate: 0 },
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { samples?: PriceSample[]; updatedAt?: string };
      if (Array.isArray(json.samples) && json.samples.length > 0) {
        return json.samples;
      }
    } catch {
      // try next / fall through to disk
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
      const json = JSON.parse(raw) as { samples?: PriceSample[] };
      if (Array.isArray(json.samples)) return json.samples;
    } catch {
      // try next
    }
  }
  return [];
}

async function loadSamples(): Promise<{ samples: PriceSample[]; source: string }> {
  const remote = await loadSamplesFromRemote();
  if (remote) return { samples: remote, source: "oracle-json-history-remote" };
  const disk = await loadSamplesFromDisk();
  return { samples: disk, source: "oracle-json-history-disk" };
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
    maxBars: 150,
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
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
