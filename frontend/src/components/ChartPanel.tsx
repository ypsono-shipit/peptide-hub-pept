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

const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1D", "1W"] as const;
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

/** Keep bars readable when history is short (don't stretch 1–2 candles full width). */
function applyDefaultView(chart: IChartApi, n: number) {
  const ts = chart.timeScale();
  if (n <= 0) return;
  if (n === 1) {
    ts.setVisibleLogicalRange({ from: -4, to: 12 });
    return;
  }
  if (n < 8) {
    ts.setVisibleLogicalRange({ from: -2, to: Math.max(n + 6, 12) });
    return;
  }
  if (n < 40) {
    // Show all bars with a little padding so zoom-out still has room
    ts.setVisibleLogicalRange({ from: -1, to: n + 3 });
    return;
  }
  ts.fitContent();
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
  /** Fit / set range only when symbol/tf changes — not on every poll. */
  const shouldFitRef = useRef(true);
  // Fine TF by default — daily only has 1 bar until multi-day history exists
  const [tf, setTf] = useState<Tf>("15m");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [sampleCount, setSampleCount] = useState(0);
  const [status, setStatus] = useState<"loading" | "ok" | "empty" | "error">("loading");

  useEffect(() => {
    shouldFitRef.current = true;
  }, [symbol, tf]);

  useEffect(() => {
    let cancelled = false;
    const load = (silent = false) => {
      if (!silent) setStatus("loading");
      const q = new URLSearchParams({
        market: symbol,
        tf,
        live: String(price),
      });
      fetch(`/api/ohlc?${q}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data: { candles?: Candle[]; sampleCount?: number }) => {
          if (cancelled) return;
          const c = data.candles ?? [];
          setCandles(c);
          setSampleCount(data.sampleCount ?? 0);
          setStatus(c.length === 0 ? "empty" : "ok");
        })
        .catch(() => {
          if (!cancelled && !silent) setStatus("error");
        });
    };
    load(false);
    const id = setInterval(() => load(true), 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbol, tf, price]);

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
      rightPriceScale: {
        borderColor: "#1f1f1f",
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: "#1f1f1f",
        timeVisible: true,
        secondsVisible: false,
        // Tiny min spacing → wheel zoom can pull way out past “1 bar fills the screen”
        minBarSpacing: 0.05,
        barSpacing: 8,
        rightOffset: 6,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
        shiftVisibleRangeOnNewBar: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: { time: true, price: true },
        mouseWheel: true,
        pinch: true,
        axisDoubleClickReset: true,
      },
      crosshair: {
        vertLine: { color: "#404040" },
        horzLine: { color: "#404040" },
      },
    });

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

    // Capture wheel on chart container so page doesn't steal zoom
    const el = containerRef.current;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    });
    ro.observe(containerRef.current);

    return () => {
      el.removeEventListener("wheel", onWheel);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    if (candles.length === 0) {
      if (price > 0) {
        const t = Math.floor(Date.now() / 1000) as UTCTimestamp;
        seriesRef.current.setData([
          { time: t, open: price, high: price, low: price, close: price },
        ]);
        if (shouldFitRef.current) {
          applyDefaultView(chartRef.current, 1);
          shouldFitRef.current = false;
        }
      }
      return;
    }
    seriesRef.current.setData(toChartData(candles));
    if (shouldFitRef.current) {
      applyDefaultView(chartRef.current, candles.length);
      shouldFitRef.current = false;
    }
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
        <div className="ml-auto flex flex-wrap items-center gap-0.5">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTf(t)}
              className={cn(
                "rounded px-2 py-1 text-[11px] font-medium",
                tf === t ? "bg-panel-hover text-ink" : "text-muted hover:text-ink-soft",
              )}
            >
              {t}
            </button>
          ))}
          <button
            type="button"
            title="Show all loaded candles"
            onClick={() => {
              if (!chartRef.current) return;
              applyDefaultView(chartRef.current, Math.max(candles.length, 1));
            }}
            className="ml-1 rounded px-2 py-1 text-[11px] font-medium text-muted hover:text-ink-soft"
          >
            Fit
          </button>
          <button
            type="button"
            title="Zoom out"
            onClick={() => {
              const ts = chartRef.current?.timeScale();
              if (!ts) return;
              const r = ts.getVisibleLogicalRange();
              if (!r) {
                applyDefaultView(chartRef.current!, Math.max(candles.length, 1));
                return;
              }
              const span = r.to - r.from;
              const pad = Math.max(span * 0.35, 4);
              ts.setVisibleLogicalRange({ from: r.from - pad, to: r.to + pad });
            }}
            className="rounded px-2 py-1 text-[11px] font-medium text-muted hover:text-ink-soft"
          >
            −
          </button>
          <button
            type="button"
            title="Zoom in"
            onClick={() => {
              const ts = chartRef.current?.timeScale();
              if (!ts) return;
              const r = ts.getVisibleLogicalRange();
              if (!r) return;
              const span = r.to - r.from;
              const shrink = Math.max(span * 0.2, 1);
              if (span - 2 * shrink < 3) return;
              ts.setVisibleLogicalRange({ from: r.from + shrink, to: r.to - shrink });
            }}
            className="rounded px-2 py-1 text-[11px] font-medium text-muted hover:text-ink-soft"
          >
            +
          </button>
        </div>
      </div>
      <div ref={containerRef} className="min-h-[280px] w-full flex-1 touch-none" />
      <div className="border-t border-border px-3 py-1 text-[10px] text-faint">
        {status === "loading" && "Loading oracle history…"}
        {status === "error" && "Failed to load history; showing live mark only"}
        {status === "empty" && "No history yet; live oracle mark only (cron will fill this)"}
        {status === "ok" && (
          <>
            {sampleCount} samples · {candles.length} {tf} bars · scroll / pinch / − + to zoom
            {candles.length < 5
              ? " · short history — prefer 5m/15m until multi-day samples accumulate"
              : ""}
            {unit === "$/mg" ? " · $/mg" : ""}
          </>
        )}
      </div>
    </div>
  );
}
