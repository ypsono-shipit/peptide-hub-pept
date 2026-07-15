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

export type Timeframe = "1h" | "4h" | "1D" | "1W";

const TF_SECONDS: Record<Timeframe, number> = {
  "1h": 3600,
  "4h": 4 * 3600,
  "1D": 24 * 3600,
  "1W": 7 * 24 * 3600,
};

export function parseTimeframe(raw: string | null): Timeframe {
  if (raw === "1h" || raw === "4h" || raw === "1D" || raw === "1W") return raw;
  // Map fine TFs to coarser buckets for sparse oracle
  if (raw === "1m" || raw === "5m" || raw === "15m") return "1h";
  return "4h";
}

/**
 * Forward-fill samples into fixed buckets, then OHLC.
 * Empty buckets inherit previous close (stair-step — correct for infrequent oracle).
 */
export function samplesToOhlc(
  samples: PriceSample[],
  market: string,
  tf: Timeframe,
  opts?: { livePrice?: number; liveTs?: number; maxBars?: number },
): Candle[] {
  const interval = TF_SECONDS[tf];
  const maxBars = opts?.maxBars ?? 120;

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

  const start = Math.floor(pts[0]!.ts / interval) * interval;
  const end = Math.floor(pts[pts.length - 1]!.ts / interval) * interval;

  // Group prices by bucket
  const buckets = new Map<number, number[]>();
  for (const p of pts) {
    const b = Math.floor(p.ts / interval) * interval;
    const arr = buckets.get(b) ?? [];
    arr.push(p.price);
    buckets.set(b, arr);
  }

  const candles: Candle[] = [];
  let prevClose = pts[0]!.price;

  for (let t = start; t <= end; t += interval) {
    const prices = buckets.get(t);
    if (prices && prices.length > 0) {
      const open = prevClose;
      const close = prices[prices.length - 1]!;
      const high = Math.max(open, close, ...prices);
      const low = Math.min(open, close, ...prices);
      candles.push({ time: t, open, high, low, close });
      prevClose = close;
    } else {
      // forward-fill flat candle
      candles.push({
        time: t,
        open: prevClose,
        high: prevClose,
        low: prevClose,
        close: prevClose,
      });
    }
  }

  return candles.length > maxBars ? candles.slice(candles.length - maxBars) : candles;
}
