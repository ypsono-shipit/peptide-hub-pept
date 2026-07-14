"use client";

import Link from "next/link";
import { type Market } from "@/lib/markets";
import { useOraclePrice } from "@/lib/useOraclePrice";

export function MarketRow({ market }: { market: Market }) {
  const { price, isLive } = useOraclePrice(market.oracleKey, market.price);

  return (
    <tr className="border-b border-border/50">
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5 font-medium">
          {market.symbol}
          {isLive && <span className="h-1.5 w-1.5 rounded-full bg-long" title="Live on-chain price" />}
        </div>
        <div className="text-xs text-text-secondary">{market.name}</div>
      </td>
      <td className="px-3 py-3 tabular-nums">${price.toFixed(2)}</td>
      <td className={`px-3 py-3 tabular-nums ${market.change24h >= 0 ? "text-long" : "text-short"}`}>
        {isLive ? "—" : `${market.change24h >= 0 ? "+" : ""}${market.change24h.toFixed(1)}%`}
      </td>
      <td className="px-3 py-3 tabular-nums text-text-secondary">
        {isLive ? "—" : `$${market.volume24h.toLocaleString()}`}
      </td>
      <td className="px-3 py-3 text-right">
        <Link href="/trade" className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-surface">
          Trade
        </Link>
      </td>
    </tr>
  );
}
