"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowUpRight, Activity } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Sparkline } from "@/components/ui/Sparkline";
import { DonutChart } from "@/components/ui/DonutChart";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { MOCK_MARKETS } from "@/lib/markets";
import { useOraclePrice } from "@/lib/useOraclePrice";
import { PEPT_INDEX_STATS, GLP1_INDEX_WEIGHTS, PORTFOLIO_ALLOCATION } from "@/lib/dashboardStats";
import { cn } from "@/lib/cn";

// WebGL can't run during SSR/static generation — load client-side only.
const PeptideCapsule3D = dynamic(() => import("@/components/ui/PeptideCapsule3D").then((m) => m.PeptideCapsule3D), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full animate-pulse rounded-glass bg-white/5" />,
});

const peptIndex = MOCK_MARKETS.find((m) => m.symbol === "PEPT-IDX")!;
const sema = MOCK_MARKETS.find((m) => m.symbol === "SEMA-PERP")!;
const glp1Idx = MOCK_MARKETS.find((m) => m.symbol === "GLP1-IDX-PERP")!;

function MarketOverviewRow({ market }: { market: (typeof MOCK_MARKETS)[number] }) {
  const { price } = useOraclePrice(market.oracleKey, market.price);
  const positive = market.change24h >= 0;

  return (
    <Link
      href="/trade"
      className="grid grid-cols-[1.4fr_0.9fr_0.9fr_1fr] items-center gap-3 rounded-2xl px-3 py-1.5 transition-colors hover:bg-white/25"
    >
      <div>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          {market.symbol}
          {market.comingSoon && <ComingSoonBadge />}
        </div>
        <div className="text-[11px] text-ink-soft">{market.name}</div>
      </div>
      <div className="text-sm tabular-nums text-ink">
        {market.unit === "$/mg" ? `$${price.toFixed(2)}/mg` : `$${price.toFixed(2)}`}
      </div>
      <div className={cn("text-sm tabular-nums", positive ? "text-positive" : "text-negative")}>
        {positive ? "+" : ""}
        {market.change24h.toFixed(2)}%
      </div>
      <div className="flex justify-end">
        <Sparkline seed={market.symbol} positive={positive} width={56} height={18} />
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { price: peptIndexPrice } = useOraclePrice(peptIndex.oracleKey, peptIndex.price);

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-1 gap-5 overflow-hidden">
        {/* Center column */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
          {/* Hero */}
          <GlassCard tone="rich" className="overflow-hidden p-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
              <div className="lg:w-[34%] lg:shrink-0">
                <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium tracking-wide text-cloud">
                  The World&apos;s First Peptide Index
                </span>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-cloud">PEPT-IDX</h1>
                <p className="mt-2 text-sm leading-relaxed text-cloud-soft">
                  A synthetic index tracking the global peptide and biotech economy.
                </p>

                <div className="mt-8 grid grid-cols-2 gap-5">
                  <Stat label="Index Value" value={`$${peptIndexPrice.toFixed(2)}`} />
                  <Stat label="24h Change" value={`+${peptIndex.change24h.toFixed(2)}%`} positive />
                  <Stat label="TVL" value={PEPT_INDEX_STATS.tvl} />
                  <Stat label="Open Interest" value={PEPT_INDEX_STATS.openInterest} />
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/trade"
                    className="rounded-2xl bg-cloud px-5 py-2.5 text-sm font-semibold text-primary shadow-glass-sm hover:opacity-90"
                  >
                    Trade PEPT Index
                  </Link>
                  <button className="rounded-2xl border border-white/30 px-5 py-2.5 text-sm font-medium text-cloud hover:bg-white/10">
                    View Components ({PEPT_INDEX_STATS.constituents})
                  </button>
                </div>
              </div>

              <div className="flex-1">
                <PeptideCapsule3D />
              </div>
            </div>
          </GlassCard>

          {/* Market Overview */}
          <GlassCard className="p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Market Overview</h2>
              <Link href="/trade" className="flex items-center gap-1 text-xs text-ink-soft hover:text-ink">
                View all <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="flex flex-col divide-y divide-glass-border">
              {MOCK_MARKETS.map((m) => (
                <MarketOverviewRow key={m.symbol} market={m} />
              ))}
            </div>
            <p className="mt-3 border-t border-glass-border pt-3 text-[11px] leading-relaxed text-ink-soft">
              Peptide markets (SEMA, GLP1-IDX, TIRZ, RETA) are priced from research-chemical vendor
              aggregators, not equities — research use only, not for human consumption. Prices are
              indicative and highly volatile.
            </p>
          </GlassCard>
        </div>

        {/* Right column */}
        <div className="flex w-[360px] shrink-0 flex-col gap-5 overflow-y-auto">
          <FeaturedPerpetualCard />
          <Glp1IndexCard />
          <GlassCard className="flex flex-1 flex-col p-5">
            <h3 className="mb-4 text-sm font-semibold text-ink">Portfolio Allocation</h3>
            <div className="flex flex-1 items-center">
              <DonutChart segments={PORTFOLIO_ALLOCATION} />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-cloud-soft">{label}</div>
      <div className={cn("mt-1 text-lg font-semibold tabular-nums", positive ? "text-positive" : "text-cloud")}>
        {value}
      </div>
    </div>
  );
}

function FeaturedPerpetualCard() {
  const { price } = useOraclePrice(sema.oracleKey, sema.price);
  return (
    <GlassCard className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-cloud">
          <Activity size={15} />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-soft">Featured Perpetual</div>
          <div className="text-sm font-semibold text-ink">SEMA-PERP · Semaglutide</div>
        </div>
      </div>
      <p className="mb-4 text-xs text-ink-soft">Flagship GLP-1 peptide market</p>
      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-ink">${price.toFixed(2)}/mg</span>
      </div>
      <Link
        href="/trade"
        className="block rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-center text-sm font-semibold text-cloud hover:opacity-90"
      >
        Trade Semaglutide
      </Link>
    </GlassCard>
  );
}

function Glp1IndexCard() {
  const { price } = useOraclePrice(glp1Idx.oracleKey, glp1Idx.price);
  return (
    <GlassCard className="p-5">
      <h3 className="mb-1.5 text-sm font-semibold text-ink">GLP-1 Index</h3>
      <p className="mb-4 text-xs leading-relaxed text-ink-soft">
        Weighted basket of Semaglutide, Tirzepatide, and Retatrutide research-chemical prices.
      </p>
      <div className="mb-4 text-lg font-semibold tabular-nums text-ink">${price.toFixed(2)}/mg</div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {GLP1_INDEX_WEIGHTS.map((w) => (
          <span key={w.label} className="rounded-full bg-white/40 px-2.5 py-1 text-[11px] font-medium text-ink">
            {w.label} {w.value}%
          </span>
        ))}
      </div>
      <Link
        href="/trade"
        className="block rounded-2xl border border-glass-border px-4 py-2.5 text-center text-sm font-medium text-ink hover:bg-white/25"
      >
        Trade GLP-1 Index
      </Link>
    </GlassCard>
  );
}
