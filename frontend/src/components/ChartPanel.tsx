"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type CandlestickData,
} from "lightweight-charts";
import { cn } from "@/lib/cn";

const TIMEFRAMES = ["1h", "4h", "1D", "1W"] as const;
type Tf = (typeof TIMEFRAMES)[number];

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

function toChartData(candles: Candle[]): CandlestickData[] {
  return candles.map((c) => ({
    time: c.time as UTCTimestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

export function ChartPanel({
  symbol,
  price,
  unit,
}: {
  symbol: string;
  price: number;
  unit?: "$" | "$/mg";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [tf, setTf] = useState<Tf>("4h");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [sampleCount, setSampleCount] = useState(0);
  const [status, setStatus] = useState<"loading" | "ok" | "empty" | "error">("loading");

  // Fetch OHLC from oracle JSON history
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    const q = new URLSearchParams({
      market: symbol,
      tf,
      live: String(price),
    });
    fetch(`/api/ohlc?${q}`)
      .then((r) => r.json())
      .then((data: { candles?: Candle[]; sampleCount?: number }) => {
        if (cancelled) return;
        const c = data.candles ?? [];
        setCandles(c);
        setSampleCount(data.sampleCount ?? 0);
        setStatus(c.length === 0 ? "empty" : "ok");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, tf, price]);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0a0a0a" },
        textColor: "#737373",
        fontFamily: "JetBrains Mono, ui-monospace, monospace",
      },
      grid: {
        vertLines: { color: "#1a1a1a" },
        horzLines: { color: "#1a1a1a" },
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 360,
      rightPriceScale: { borderColor: "#1f1f1f" },
      timeScale: { borderColor: "#1f1f1f", timeVisible: true },
      crosshair: {
        vertLine: { color: "#404040" },
        horzLine: { color: "#404040" },
      },
    });

    // Robinhood neon up / gray down candles
    const series = chart.addCandlestickSeries({
      upColor: "#CCFF00",
      downColor: "#525252",
      borderVisible: true,
      borderUpColor: "#CCFF00",
      borderDownColor: "#737373",
      wickUpColor: "#CCFF00",
      wickDownColor: "#737373",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Push candle data when loaded
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    if (candles.length === 0) {
      // single mark candle so chart isn't blank
      if (price > 0) {
        const t = Math.floor(Date.now() / 1000) as UTCTimestamp;
        seriesRef.current.setData([{ time: t, open: price, high: price, low: price, close: price }]);
      }
      return;
    }
    seriesRef.current.setData(toChartData(candles));
    chartRef.current.timeScale().fitContent();
  }, [candles, price]);

  const last = candles[candles.length - 1];
  const open = last?.open ?? price;
  const high = last?.high ?? price;
  const low = last?.low ?? price;
  const close = price > 0 ? price : (last?.close ?? 0);
  const chg = open > 0 ? ((close - open) / open) * 100 : 0;
  const pos = chg >= 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-panel">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-xs font-semibold text-ink">
          {symbol} · {tf}
        </span>
        <span className="font-mono text-[11px] text-muted">
          O {open.toFixed(4)} H {high.toFixed(4)} L {low.toFixed(4)} C{" "}
          <span className={pos ? "text-positive" : "text-negative"}>{close.toFixed(4)}</span>
          <span className={cn("ml-1", pos ? "text-positive" : "text-negative")}>
            {pos ? "+" : ""}
            {chg.toFixed(2)}%
          </span>
        </span>
        <div className="ml-auto flex gap-0.5">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={cn(
                "rounded px-2 py-1 text-[11px] font-medium",
                tf === t ? "bg-panel-hover text-ink" : "text-muted hover:text-ink-soft",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="min-h-[280px] w-full flex-1" />
      <div className="border-t border-border px-3 py-1 text-[10px] text-faint">
        {status === "loading" && "Loading oracle history…"}
        {status === "error" && "Failed to load history; showing live mark only"}
        {status === "empty" && "No history yet; live oracle mark only (cron will fill this)"}
        {status === "ok" && (
          <>
            Oracle history · {sampleCount} samples · {tf} OHLC (forward-filled)
            {unit === "$/mg" ? " · $/mg" : ""} · live mark overlays last close
          </>
        )}
      </div>
    </div>
  );
}
