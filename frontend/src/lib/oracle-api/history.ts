import { readFile } from "fs/promises";
import path from "path";
import type { PriceSample } from "@/lib/ohlc";

export type HistoryFile = {
  updatedAt?: string;
  note?: string;
  samples: PriceSample[];
};

let cache: { at: number; data: HistoryFile } | null = null;
const CACHE_MS = 15_000;

async function readHistoryFile(): Promise<HistoryFile> {
  const candidates = [
    path.join(process.cwd(), "public/data/price-history.json"),
    path.join(process.cwd(), "data/price-history.json"),
  ];
  for (const p of candidates) {
    try {
      const raw = await readFile(p, "utf8");
      const json = JSON.parse(raw) as HistoryFile;
      if (Array.isArray(json.samples)) return { ...json, samples: json.samples };
    } catch {
      // try next
    }
  }
  return { samples: [], updatedAt: new Date().toISOString() };
}

export async function loadHistory(force = false): Promise<HistoryFile> {
  const now = Date.now();
  if (!force && cache && now - cache.at < CACHE_MS) return cache.data;
  const data = await readHistoryFile();
  cache = { at: now, data };
  return data;
}

export async function latestSample(market: string): Promise<PriceSample | null> {
  const hist = await loadHistory();
  let best: PriceSample | null = null;
  for (const s of hist.samples) {
    if (s.market !== market) continue;
    if (!best || s.ts > best.ts) best = s;
  }
  return best;
}

export async function marketSamples(
  market: string,
  opts?: { from?: number; to?: number; limit?: number },
): Promise<PriceSample[]> {
  const hist = await loadHistory();
  let pts = hist.samples
    .filter((s) => s.market === market)
    .filter((s) => (opts?.from ? s.ts >= opts.from : true))
    .filter((s) => (opts?.to ? s.ts <= opts.to : true))
    .sort((a, b) => a.ts - b.ts);
  const limit = opts?.limit ?? 500;
  if (pts.length > limit) pts = pts.slice(pts.length - limit);
  return pts;
}

export function historyMeta(hist: HistoryFile) {
  return {
    updatedAt: hist.updatedAt ?? null,
    sampleCount: hist.samples.length,
    markets: [...new Set(hist.samples.map((s) => s.market))].sort(),
  };
}
