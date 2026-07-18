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
  "Oracle mark samples for PEPT Trade charts. Appended on each successful pushPrice (~5m cron). Fine TFs (5m/15m) need dense samples; coarser TFs still stair-step when marks are quiet.";

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
    const text = fs.readFileSync(filePath, "utf8");
    // Refuse conflict-marker corpses (treat as unloadable so denser sibling wins)
    if (text.includes("<<<<<<<") || text.includes(">>>>>>>")) {
      throw new Error(`merge conflict markers in ${filePath}`);
    }
    const raw = JSON.parse(text) as PriceHistoryFile;
    return {
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      note: raw.note ?? NOTE,
      samples: Array.isArray(raw.samples) ? raw.samples : [],
    };
  } catch (err) {
    console.warn(
      `price-history: failed to load ${filePath} (${err instanceof Error ? err.message : err}) — trying sibling / empty`,
    );
    return { updatedAt: new Date().toISOString(), note: NOTE, samples: [] };
  }
}

export function appendPriceSamples(samples: PriceSample[]): string[] {
  if (samples.length === 0) return [];
  const written: string[] = [];
  const ts = samples[0]!.ts;

  // Load densest valid history once across both paths (never start from empty if a sibling is rich).
  let densest: PriceHistoryFile = { updatedAt: new Date().toISOString(), note: NOTE, samples: [] };
  for (const p of historyPaths()) {
    if (!fs.existsSync(p)) continue;
    const h = loadHistory(p);
    if (h.samples.length > densest.samples.length) densest = h;
  }

  for (const filePath of historyPaths()) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        continue;
      }
    }

    const existing = loadHistory(filePath);
    // Always base on densest known history so a corrupt/empty file cannot wipe the series.
    const base =
      densest.samples.length >= existing.samples.length ? densest : existing;

    // Safety: refuse catastrophic shrink (e.g. empty parse + 3 new samples overwriting 2000+).
    if (base.samples.length === 0 && densest.samples.length === 0) {
      const siblingRich = historyPaths().some((p) => {
        if (p === filePath || !fs.existsSync(p)) return false;
        return loadHistory(p).samples.length > 50;
      });
      if (siblingRich) {
        console.warn(`price-history: skip write ${filePath} — empty base while sibling is rich`);
        continue;
      }
    }

    const next = [...base.samples];
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

    // Never write a file that drops >50% of a large history (race / corrupt base).
    if (base.samples.length > 100 && trimmed.length < base.samples.length * 0.5) {
      console.error(
        `price-history: refusing to write ${filePath} — would shrink ${base.samples.length} → ${trimmed.length}`,
      );
      continue;
    }

    const out: PriceHistoryFile = {
      updatedAt: new Date().toISOString(),
      note: NOTE,
      samples: trimmed,
    };
    fs.writeFileSync(filePath, JSON.stringify(out, null, 2) + "\n");
    written.push(filePath);
    // Keep densest in sync for the second path
    if (trimmed.length > densest.samples.length) {
      densest = out;
    }
  }
  void ts;
  return written;
}
