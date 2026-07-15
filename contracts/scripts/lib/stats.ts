/** Pure numeric helpers for oracle aggregation. */

export function median(values: number[]): number {
  if (values.length === 0) throw new Error("median: empty array");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function mean(values: number[]): number {
  if (values.length === 0) throw new Error("mean: empty array");
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Drop values outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR]. Returns original if too few samples. */
export function iqrFilter(values: number[], minSamples = 6): number[] {
  if (values.length < minSamples) return [...values];
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  if (iqr === 0) return sorted;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const filtered = sorted.filter((v) => v >= lo && v <= hi);
  // Never collapse to empty if everything was "outlier" (degenerate distribution).
  return filtered.length >= Math.min(3, values.length) ? filtered : sorted;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0]!;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const w = idx - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

/** Size-weighted average of $/mg (VWAP over vial size). */
export function sizeWeightedAverage(
  rows: { pricePerMg: number; sizeMg: number }[],
): number | null {
  let num = 0;
  let den = 0;
  for (const r of rows) {
    if (!(r.sizeMg > 0) || !(r.pricePerMg > 0)) continue;
    num += r.pricePerMg * r.sizeMg;
    den += r.sizeMg;
  }
  return den > 0 ? num / den : null;
}

/** Generic weighted average. Weights must be > 0. */
export function weightedAverage(rows: { value: number; weight: number }[]): number {
  let num = 0;
  let den = 0;
  for (const r of rows) {
    if (!(r.weight > 0) || !Number.isFinite(r.value)) continue;
    num += r.value * r.weight;
    den += r.weight;
  }
  if (den <= 0) throw new Error("weightedAverage: no positive weights");
  return num / den;
}

/**
 * Keep only rows whose pricePerMg survives IQR filtering (outlier drop),
 * then size-weight the survivors. Falls back to plain median of prices if
 * no sizes are available.
 */
export function iqrThenSizeWeighted(
  rows: { pricePerMg: number; sizeMg?: number | null }[],
): { price: number; method: "size_weighted_iqr" | "median_iqr"; sampleCount: number } {
  if (rows.length === 0) throw new Error("iqrThenSizeWeighted: empty");
  const prices = rows.map((r) => r.pricePerMg);
  const allowed = new Set(iqrFilter(prices));
  const kept = rows.filter((r) => allowed.has(r.pricePerMg));
  const withSize = kept
    .filter((r) => r.sizeMg != null && r.sizeMg! > 0)
    .map((r) => ({ pricePerMg: r.pricePerMg, sizeMg: r.sizeMg as number }));

  const vwap = sizeWeightedAverage(withSize);
  if (vwap != null && withSize.length >= Math.min(3, kept.length)) {
    return { price: vwap, method: "size_weighted_iqr", sampleCount: withSize.length };
  }
  const med = median(kept.map((r) => r.pricePerMg));
  return { price: med, method: "median_iqr", sampleCount: kept.length };
}

export function roundPrice(n: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
