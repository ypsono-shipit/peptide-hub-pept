/** Build OHLC candles from sparse oracle price samples. */

export type PriceSample = {
  market: string;
  ts: number;
  price: number;
  source?: string;
  txHash?: string;
};

export type Candle = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
};

export type Timeframe = "5m" | "15m" | "1h" | "4h" | "1D" | "1W";

const TF_SECONDS: Record<Timeframe, number> = {
  "5m": 5 * 60,
  "15m": 15 * 60,
  "1h": 3600,
  "4h": 4 * 3600,
  "1D": 24 * 3600,
  "1W": 7 * 24 * 3600,
};

export function parseTimeframe(raw: string | null): Timeframe {
  if (raw === "5m" || raw === "15m" || raw === "1h" || raw === "4h" || raw === "1D" || raw === "1W") {
    return raw;
  }
  if (raw === "1m") return "5m";
  return "5m";
}

/**
 * Forward-fill samples into fixed buckets, then OHLC.
 * Empty buckets inherit previous close (stair-step, correct for infrequent oracle).
 */
export function samplesToOhlc(
  samples: PriceSample[],
  market: string,
  tf: Timeframe,
  opts?: { livePrice?: number; liveTs?: number; maxBars?: number },
): Candle[] {
  const interval = TF_SECONDS[tf];
  // Window length by TF — long enough to zoom out to multi-day / multi-week views
  const defaultMax =
    tf === "5m"
      ? 864 // ~3 days of 5m bars
      : tf === "15m"
        ? 672 // ~7 days
        : tf === "1h"
          ? 720 // ~30 days
          : tf === "4h"
            ? 360 // ~60 days
            : tf === "1D"
              ? 400 // ~13 months
              : 200; // 1W
  const maxBars = opts?.maxBars ?? defaultMax;

  let pts = samples
    .filter((s) => s.market === market && Number.isFinite(s.price) && s.price > 0 && s.ts > 0)
    .map((s) => ({ ts: s.ts, price: s.price }))
    .sort((a, b) => a.ts - b.ts);

  if (opts?.livePrice && opts.livePrice > 0) {
    const liveTs = opts.liveTs ?? Math.floor(Date.now() / 1000);
    const last = pts[pts.length - 1];
    if (!last || liveTs >= last.ts) {
      pts = [...pts, { ts: liveTs, price: opts.livePrice }];
    }
  }

  if (pts.length === 0) return [];

  const end = Math.floor(pts[pts.length - 1]!.ts / interval) * interval;
  const dataStart = Math.floor(pts[0]!.ts / interval) * interval;
  // Use full sample span when short (so fine TFs aren't collapsed to 1–2 bars)
  const spanBars = Math.max(1, Math.floor((end - dataStart) / interval) + 1);
  const idealStart = end - (maxBars - 1) * interval;
  // If history is shorter than maxBars, start at first sample (not mid-window)
  const start = spanBars <= maxBars ? dataStart : Math.max(dataStart, idealStart);

  const buckets = new Map<number, number[]>();
  for (const p of pts) {
    if (p.ts < start) continue;
    const b = Math.floor(p.ts / interval) * interval;
    const arr = buckets.get(b) ?? [];
    arr.push(p.price);
    buckets.set(b, arr);
  }

  // Seed prevClose from last sample before window (or first in window)
  let prevClose = pts[0]!.price;
  for (const p of pts) {
    if (p.ts < start) prevClose = p.price;
    else break;
  }

  const candles: Candle[] = [];

  // Always emit bars for every interval in [start, end] (forward-fill gaps)
  // Cap iterations to maxBars to avoid pathological huge ranges
  let t = start;
  let guard = 0;
  while (t <= end && guard < maxBars + 2) {
    const prices = buckets.get(t);
    if (prices && prices.length > 0) {
      const open = prevClose;
      const close = prices[prices.length - 1]!;
      const high = Math.max(open, close, ...prices);
      const low = Math.min(open, close, ...prices);
      candles.push({ time: t, open, high, low, close });
      prevClose = close;
    } else {
      candles.push({
        time: t,
        open: prevClose,
        high: prevClose,
        low: prevClose,
        close: prevClose,
      });
    }
    t += interval;
    guard += 1;
  }

  return candles.length > maxBars ? candles.slice(candles.length - maxBars) : candles;
}
