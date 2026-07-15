"use client";

import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { AccountCard } from "@/components/AccountCard";
import { MarketplaceStrip } from "@/components/MarketplaceStrip";
import { MOCK_MARKETS } from "@/lib/markets";
import { useOraclePrice } from "@/lib/useOraclePrice";
import { cn } from "@/lib/cn";
import { Panel } from "@/components/ui/Panel";

export default function DashboardPage() {
  const tradeable = MOCK_MARKETS.filter((m) => m.oracleKey && !m.comingSoon);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar />
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <h1 className="text-lg font-semibold text-ink">Overview</h1>
          <p className="text-sm text-muted">
            Peptide perpetuals on Robinhood Chain Testnet · oracle-marked · USDC margin
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
          <Panel className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Markets</h2>
            <div className="divide-y divide-border">
              {tradeable.map((m) => (
                <MarketRow key={m.symbol} market={m} />
              ))}
            </div>
            <Link
              href="/trade"
              className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
            >
              Open trade terminal →
            </Link>
          </Panel>
          <AccountCard />
        </div>

        <MarketplaceStrip />
      </div>
    </div>
  );
}

function MarketRow({ market }: { market: (typeof MOCK_MARKETS)[number] }) {
  const { price, isLive } = useOraclePrice(market.oracleKey, market.price);
  const pos = market.change24h >= 0;

  return (
    <Link
      href="/trade"
      className="flex items-center gap-3 py-2.5 transition-colors hover:bg-panel-hover/50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium text-ink">
          {market.symbol}
          {isLive && (
            <span className="rounded bg-positive/15 px-1.5 py-0.5 text-[9px] text-positive">
              LIVE
            </span>
          )}
        </div>
        <div className="truncate text-[11px] text-muted">{market.name}</div>
      </div>
      <div className="text-right font-mono text-sm tabular-nums text-ink">
        ${price.toFixed(2)}
        {market.unit === "$/mg" && <span className="text-[10px] text-muted">/mg</span>}
      </div>
      <div
        className={cn(
          "w-16 text-right font-mono text-xs tabular-nums",
          pos ? "text-positive" : "text-negative",
        )}
      >
        {pos ? "+" : ""}
        {market.change24h.toFixed(2)}%
      </div>
    </Link>
  );
}
