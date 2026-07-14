"use client";

import { useState } from "react";
import { MOCK_MARKETS, type Market } from "@/lib/markets";
import { useOraclePrice } from "@/lib/useOraclePrice";
import { cn } from "@/lib/cn";

function WatchlistItem({
  market,
  selected,
  onSelect,
}: {
  market: Market;
  selected: boolean;
  onSelect: (symbol: string) => void;
}) {
  const { price } = useOraclePrice(market.oracleKey, market.price);

  return (
    <button
      onClick={() => onSelect(market.symbol)}
      className={cn(
        "flex w-full flex-col gap-0.5 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-white/25",
        selected && "bg-white/40"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{market.symbol}</span>
        <span className="text-sm tabular-nums text-ink">${price.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-soft">{market.name}</span>
        <span className={market.change24h >= 0 ? "text-positive" : "text-negative"}>
          {market.change24h >= 0 ? "+" : ""}
          {market.change24h.toFixed(1)}%
        </span>
      </div>
    </button>
  );
}

export function WatchlistSidebar({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (symbol: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = MOCK_MARKETS.filter(
    (m) =>
      m.symbol.toLowerCase().includes(query.toLowerCase()) ||
      m.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <aside className="glass-panel flex w-64 shrink-0 flex-col overflow-y-auto p-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search markets"
        className="mb-2 w-full rounded-2xl bg-white/40 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-soft"
      />
      <div className="flex flex-col gap-0.5">
        {filtered.map((m) => (
          <WatchlistItem key={m.symbol} market={m} selected={selected === m.symbol} onSelect={onSelect} />
        ))}
      </div>
    </aside>
  );
}
