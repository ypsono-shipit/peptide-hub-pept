/**
 * Seed ~30 days of 3h oracle samples so charts aren't empty before the cron
 * has run many times. Uses mild deterministic walk around anchor prices.
 *
 *   npx ts-node scripts/seed-price-history.ts
 */
import * as fs from "fs";
import * as path from "path";
import { appendPriceSamples, type PriceSample } from "./lib/price-history";

const ANCHORS: Record<string, number> = {
  "SEMA-PERP": 5.06,
  "TIRZ-PERP": 3.59,
  "RETA-PERP": 5.0,
  "GLP1-IDX-PERP": 4.68,
};

function seededWalk(market: string, anchor: number, steps: number, endTs: number): PriceSample[] {
  const out: PriceSample[] = [];
  let p = anchor * 0.98;
  const interval = 3 * 3600;
  const start = endTs - steps * interval;
  for (let i = 0; i <= steps; i++) {
    const t = start + i * interval;
    // deterministic pseudo-noise from market+i
    let h = 0;
    const s = `${market}:${i}`;
    for (let c = 0; c < s.length; c++) h = (h * 31 + s.charCodeAt(c)) >>> 0;
    const n = ((h % 1000) / 1000 - 0.5) * 0.04; // ±2%
    p = Math.max(anchor * 0.7, Math.min(anchor * 1.35, p * (1 + n * 0.15) + (anchor - p) * 0.02));
    out.push({
      market,
      ts: t,
      price: Math.round(p * 10000) / 10000,
      source: "seed-walk",
    });
  }
  // pin last to anchor
  if (out.length) {
    out[out.length - 1]!.price = anchor;
    out[out.length - 1]!.source = "seed-anchor";
  }
  return out;
}

async function main() {
  const endTs = Math.floor(Date.now() / 1000);
  const steps = 30 * 8; // ~30 days @ 3h
  const all: PriceSample[] = [];
  for (const [market, anchor] of Object.entries(ANCHORS)) {
    all.push(...seededWalk(market, anchor, steps, endTs));
  }

  // Write fresh seed (overwrite densest path by writing after clear)
  for (const rel of ["../data/price-history.json", "../../frontend/public/data/price-history.json"]) {
    const p = path.join(__dirname, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(
      p,
      JSON.stringify(
        {
          updatedAt: new Date().toISOString(),
          note: "Seeded oracle mark history for charts; cron appends real pushes.",
          samples: [],
        },
        null,
        2,
      ) + "\n",
    );
  }

  const paths = appendPriceSamples(all);
  console.log(`Seeded ${all.length} samples →`, paths);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
