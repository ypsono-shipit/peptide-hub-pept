import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { parseTimeframe, samplesToOhlc, type PriceSample } from "@/lib/ohlc";

export const dynamic = "force-dynamic";

async function loadSamples(): Promise<PriceSample[]> {
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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const market = searchParams.get("market") ?? "SEMA-PERP";
  const tf = parseTimeframe(searchParams.get("tf"));
  const live = searchParams.get("live");
  const livePrice = live ? Number(live) : undefined;

  const samples = await loadSamples();
  const candles = samplesToOhlc(samples, market, tf, {
    livePrice: Number.isFinite(livePrice) ? livePrice : undefined,
    maxBars: 150,
  });

  return NextResponse.json({
    market,
    tf,
    count: candles.length,
    sampleCount: samples.filter((s) => s.market === market).length,
    source: "oracle-json-history",
    candles,
  });
}
