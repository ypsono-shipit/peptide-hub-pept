"use client";

import { useState } from "react";
import { MOCK_MARKETS } from "@/lib/markets";

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
    <aside className="w-64 shrink-0 border-r border-border bg-panel">
      <div className="border-b border-border p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search markets"
          className="w-full rounded-md bg-surface px-3 py-1.5 text-sm outline-none placeholder:text-text-secondary"
        />
      </div>
      <ul>
        {filtered.map((m) => (
          <li key={m.symbol}>
            <button
              onClick={() => onSelect(m.symbol)}
              className={`flex w-full flex-col gap-0.5 border-b border-border/50 px-3 py-2 text-left hover:bg-surface ${
                selected === m.symbol ? "bg-surface" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{m.symbol}</span>
                <span className="text-sm tabular-nums">${m.price.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">{m.name}</span>
                <span className={m.change24h >= 0 ? "text-long" : "text-short"}>
                  {m.change24h >= 0 ? "+" : ""}
                  {m.change24h.toFixed(1)}%
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
