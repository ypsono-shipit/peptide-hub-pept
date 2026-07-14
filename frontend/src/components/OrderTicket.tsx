"use client";

import { useState } from "react";

export function OrderTicket({ symbol, price }: { symbol: string; price: number }) {
  const [side, setSide] = useState<"long" | "short">("long");
  const [leverage, setLeverage] = useState(5);
  const [size, setSize] = useState("");

  const sizeNum = Number(size) || 0;
  const notional = sizeNum * leverage;
  const liquidationPrice =
    side === "long" ? price * (1 - 1 / leverage) : price * (1 + 1 / leverage);
  const estFee = notional * 0.0006;

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-panel p-4">
      <div className="mb-3 text-sm font-semibold">{symbol}</div>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-md bg-surface p-1">
        <button
          onClick={() => setSide("long")}
          className={`rounded py-1.5 text-sm font-semibold ${
            side === "long" ? "bg-long text-black" : "text-text-secondary"
          }`}
        >
          Long
        </button>
        <button
          onClick={() => setSide("short")}
          className={`rounded py-1.5 text-sm font-semibold ${
            side === "short" ? "bg-short text-black" : "text-text-secondary"
          }`}
        >
          Short
        </button>
      </div>

      <label className="mb-1 block text-xs text-text-secondary">Size (collateral, USD)</label>
      <input
        value={size}
        onChange={(e) => setSize(e.target.value)}
        placeholder="0.00"
        className="mb-4 w-full rounded-md bg-surface px-3 py-2 text-sm outline-none"
      />

      <label className="mb-1 flex justify-between text-xs text-text-secondary">
        <span>Leverage</span>
        <span>{leverage}x</span>
      </label>
      <input
        type="range"
        min={1}
        max={20}
        value={leverage}
        onChange={(e) => setLeverage(Number(e.target.value))}
        className="mb-4 w-full accent-accent"
      />

      <div className="mb-4 space-y-1.5 rounded-md bg-surface p-3 text-xs">
        <div className="flex justify-between text-text-secondary">
          <span>Notional</span>
          <span className="text-text-primary">${notional.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-text-secondary">
          <span>Est. liquidation price</span>
          <span className="text-text-primary">${liquidationPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-text-secondary">
          <span>Est. fee</span>
          <span className="text-text-primary">${estFee.toFixed(2)}</span>
        </div>
      </div>

      <button
        className={`w-full rounded-md py-2.5 text-sm font-semibold text-black ${
          side === "long" ? "bg-long" : "bg-short"
        }`}
      >
        {side === "long" ? "Open Long" : "Open Short"} · Paper Mode
      </button>
    </aside>
  );
}
