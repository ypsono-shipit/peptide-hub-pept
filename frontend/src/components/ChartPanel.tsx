"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import { cn } from "@/lib/cn";

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1D"] as const;

function mockCandles(basePrice: number) {
  const now = Math.floor(Date.now() / 1000);
  const candles = [];
  let price = basePrice * 0.96;
  for (let i = 80; i >= 0; i--) {
    const open = price;
    const drift = (Math.sin(i / 4) * 0.4 + ((i * 17) % 7) / 40 - 0.08) * (basePrice * 0.012);
    const close = Math.max(basePrice * 0.5, open + drift);
    const high = Math.max(open, close) + basePrice * 0.003;
    const low = Math.min(open, close) - basePrice * 0.003;
    candles.push({ time: (now - i * 900) as UTCTimestamp, open, high, low, close });
    price = close;
  }
  // pin last close near live price
  if (candles.length) {
    const last = candles[candles.length - 1]!;
    last.close = basePrice;
    last.high = Math.max(last.open, basePrice) + basePrice * 0.002;
    last.low = Math.min(last.open, basePrice) - basePrice * 0.002;
  }
  return candles;
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
  const [tf, setTf] = useState<(typeof TIMEFRAMES)[number]>("15m");

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#141414" },
        textColor: "#737373",
        fontFamily: "JetBrains Mono, ui-monospace, monospace",
      },
      grid: {
        vertLines: { color: "#1f1f1f" },
        horzLines: { color: "#1f1f1f" },
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

    const series = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    series.setData(mockCandles(price));
    chart.timeScale().fitContent();

    const chartApi: IChartApi = chart;
    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      chartApi.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [symbol, price, tf]);

  const chg = price > 0 ? ((price - price * 0.994) / (price * 0.994)) * 100 : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-panel">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-xs font-semibold text-ink">
          {symbol} · {tf}
        </span>
        <span className="font-mono text-[11px] text-muted">
          O {price.toFixed(4)} H {(price * 1.01).toFixed(4)} L {(price * 0.99).toFixed(4)} C{" "}
          <span className="text-positive">{price.toFixed(4)}</span>
          <span className="ml-1 text-positive">+{chg.toFixed(2)}%</span>
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
        Illustrative candles · mark from PeptideOracle{unit === "$/mg" ? " ($/mg)" : ""}
      </div>
    </div>
  );
}
