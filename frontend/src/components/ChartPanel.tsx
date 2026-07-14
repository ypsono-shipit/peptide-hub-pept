"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, type IChartApi } from "lightweight-charts";

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
    candles.push({ time: now - i * 3600, open, high, low, close });
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
        background: { type: ColorType.Solid, color: "#151619" },
        textColor: "#8B8D93",
      },
      grid: {
        vertLines: { color: "#26282C" },
        horzLines: { color: "#26282C" },
      },
      width: containerRef.current.clientWidth,
      height: 420,
      timeScale: { timeVisible: true },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#00C853",
      downColor: "#FF3B30",
      borderVisible: false,
      wickUpColor: "#00C853",
      wickDownColor: "#FF3B30",
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
    <div className="flex-1 border-b border-border bg-panel">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <span className="text-sm font-semibold">{symbol}</span>
        <div className="ml-auto flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              className="rounded px-2 py-1 text-xs text-text-secondary hover:bg-surface hover:text-text-primary"
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
