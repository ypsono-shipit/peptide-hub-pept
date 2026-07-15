import { GlassCard } from "@/components/ui/GlassCard";
import { VialIllustration } from "@/components/ui/VialIllustration";
import { MARKETPLACE_BRAND, MARKETPLACE_STATS, RESEARCH_ONLY } from "@/lib/marketplaceData";
import { COLLATERAL_SYMBOL } from "@/lib/deployments";

export function MarketplaceHero() {
  return (
    <GlassCard tone="rich" className="p-6">
      <div className="flex items-center gap-6">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium text-ink">
              {MARKETPLACE_BRAND.name}
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-ink">
              Research Use Only
            </span>
            <span className="rounded-full border border-border-strong px-2.5 py-0.5 text-[11px] font-medium text-ink">
              Pay with {COLLATERAL_SYMBOL}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            {MARKETPLACE_BRAND.name}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            {RESEARCH_ONLY.tagline}. Buy research kits on-chain with Robinhood testnet{" "}
            {COLLATERAL_SYMBOL} at listed prices — no external checkout.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat value={MARKETPLACE_STATS.peptidesListed} label="Compounds" />
            <Stat value={MARKETPLACE_STATS.purity} label="Purity" />
            <Stat value={MARKETPLACE_STATS.kitNote} label="Kit size" />
            <Stat value={MARKETPLACE_STATS.shipping} label="Checkout" />
          </div>
        </div>
        <div className="hidden w-40 shrink-0 lg:block">
          <VialIllustration />
        </div>
      </div>
    </GlassCard>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular-nums text-ink">{value}</div>
      <div className="text-[11px] text-ink-soft">{label}</div>
    </div>
  );
}
