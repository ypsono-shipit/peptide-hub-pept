/**
 * Append oracle price samples to JSON history files.
 * Canonical copies (when paths exist):
 *   - contracts/data/price-history.json
 *   - frontend/public/data/price-history.json
 */

import * as fs from "fs";
import * as path from "path";

export type PriceSample = {
  market: string;
  /** Unix seconds */
  ts: number;
  price: number;
  source?: string;
  txHash?: string;
};

export type PriceHistoryFile = {
  updatedAt: string;
  note: string;
  samples: PriceSample[];
};

const NOTE =
  "Oracle mark samples for PEPT Trade charts. Appended on each successful pushPrice. Sparse (e.g. 3h cadence) — OHLC stair-steps are expected.";

function historyPaths(): string[] {
  const contractsData = path.join(__dirname, "../../data/price-history.json");
  const frontendPublic = path.join(__dirname, "../../../frontend/public/data/price-history.json");
  return [contractsData, frontendPublic];
}

export function loadHistory(filePath: string): PriceHistoryFile {
  if (!fs.existsSync(filePath)) {
    return { updatedAt: new Date().toISOString(), note: NOTE, samples: [] };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as PriceHistoryFile;
    return {
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      note: raw.note ?? NOTE,
      samples: Array.isArray(raw.samples) ? raw.samples : [],
    };
  } catch {
    return { updatedAt: new Date().toISOString(), note: NOTE, samples: [] };
  }
}

export function appendPriceSamples(samples: PriceSample[]): string[] {
  if (samples.length === 0) return [];
  const written: string[] = [];
  const ts = samples[0]!.ts;

  for (const filePath of historyPaths()) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        continue;
      }
    }
    // Prefer existing richer history if one path already has more samples
    let hist = loadHistory(filePath);
    // If another path has more data, merge from the densest file first
    for (const other of historyPaths()) {
      if (other === filePath || !fs.existsSync(other)) continue;
      const o = loadHistory(other);
      if (o.samples.length > hist.samples.length) hist = o;
    }

    const next = [...hist.samples];
    for (const s of samples) {
      // de-dupe same market within 60s
      const last = [...next].reverse().find((x) => x.market === s.market);
      if (last && Math.abs(last.ts - s.ts) < 60 && Math.abs(last.price - s.price) < 1e-9) {
        continue;
      }
      next.push(s);
    }
    // keep last ~5000 samples total
    const trimmed = next.length > 5000 ? next.slice(next.length - 5000) : next;
    const out: PriceHistoryFile = {
      updatedAt: new Date().toISOString(),
      note: NOTE,
      samples: trimmed,
    };
    fs.writeFileSync(filePath, JSON.stringify(out, null, 2) + "\n");
    written.push(filePath);
  }
  void ts;
  return written;
}
