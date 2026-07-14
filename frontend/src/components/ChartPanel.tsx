"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import { cn } from "@/lib/cn";

const TIMEFRAMES = ["1D", "1W", "1M", "3M"] as const;

// Deterministic placeholder candles for the paper trading simulator.
// Swap for real OHLC once a market data source is wired in (Phase 2).
function mockCandles(basePrice: number) {
  const now = Math.floor(Date.now() / 1000);
  const candles = [];
  let price = basePrice;
  for (let i = 60; i >= 0; i--) {
    const open = price;
    const drift = (Math.sin(i / 3) + (i % 7 === 0 ? 0.5 : 0)) * (basePrice * 0.01);
    const close = open + drift;
    const high = Math.max(open, close) + basePrice * 0.004;
    const low = Math.min(open, close) - basePrice * 0.004;
    candles.push({ time: (now - i * 3600) as UTCTimestamp, open, high, low, close });
    price = close;
  }
  return candles;
}

export function ChartPanel({ symbol, price }: { symbol: string; price: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "rgba(255,255,255,0)" },
        textColor: "rgba(255,255,255,0.68)",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.06)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      width: containerRef.current.clientWidth,
      height: 420,
      timeScale: { timeVisible: true },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#3CCF7E",
      downColor: "#FF6B81",
      borderVisible: false,
      wickUpColor: "#3CCF7E",
      wickDownColor: "#FF6B81",
    });
    series.setData(mockCandles(price));

    chartRef.current = chart;

    const handleResize = () => chart.applyOptions({ width: containerRef.current?.clientWidth ?? 0 });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [symbol, price]);

  return (
    <div className="glass-panel flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-glass-border px-4 py-2.5">
        <span className="text-sm font-semibold text-ink">{symbol}</span>
        <div className="ml-auto flex gap-1">
          {TIMEFRAMES.map((tf, i) => (
            <button
              key={tf}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                i === 0 ? "bg-white/50 text-ink" : "text-ink-soft hover:bg-white/25 hover:text-ink"
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="w-full flex-1" />
    </div>
  );
}
