"use client";

import Link from "next/link";
import { type Market } from "@/lib/markets";
import { useOraclePrice } from "@/lib/useOraclePrice";
import { Sparkline } from "@/components/ui/Sparkline";
import { cn } from "@/lib/cn";

export function MarketRow({ market }: { market: Market }) {
  const { price, isLive } = useOraclePrice(market.oracleKey, market.price);
  const positive = market.change24h >= 0;

  return (
    <tr className="border-b border-glass-border/60 last:border-0">
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5 font-medium text-ink">
          {market.symbol}
          {isLive && <span className="h-1.5 w-1.5 rounded-full bg-green" title="Live on-chain price" />}
        </div>
        <div className="text-xs text-ink-soft">{market.name}</div>
      </td>
      <td className="px-3 py-3 tabular-nums text-ink">${price.toFixed(2)}</td>
      <td className={cn("px-3 py-3 tabular-nums", positive ? "text-positive" : "text-negative")}>
        {positive ? "+" : ""}
        {market.change24h.toFixed(1)}%
      </td>
      <td className="px-3 py-3 tabular-nums text-ink-soft">${market.volume24h.toLocaleString()}</td>
      <td className="px-3 py-3">
        <Sparkline seed={market.symbol} positive={positive} width={60} height={20} />
      </td>
      <td className="px-3 py-3 text-right">
        <Link
          href="/perps"
          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary hover:bg-accent"
        >
          Trade
        </Link>
      </td>
    </tr>
  );
}
