import { GlassCard } from "@/components/ui/GlassCard";
import { MARKETPLACE_BRAND, MARKETPLACE_STATS, RESEARCH_ONLY } from "@/lib/marketplaceData";
import { COLLATERAL_SYMBOL } from "@/lib/deployments";

export function MarketplaceHero() {
  return (
    <GlassCard className="p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold text-on-primary">
          {MARKETPLACE_BRAND.name}
        </span>
        <span className="rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted">
          RUO
        </span>
        <span className="rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted">
          {COLLATERAL_SYMBOL} → PEPT-KIT NFT
        </span>
      </div>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-ink sm:text-xl">
        Research peptide kits
      </h2>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-soft sm:text-sm">
        {RESEARCH_ONLY.tagline}. Pay in testnet {COLLATERAL_SYMBOL}; receive a redeemable kit NFT.
      </p>
      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border pt-3">
        <Stat value={MARKETPLACE_STATS.peptidesListed} label="Compounds" />
        <Stat value={MARKETPLACE_STATS.purity} label="Purity" />
        <Stat value={MARKETPLACE_STATS.kitNote} label="Kit" />
        <Stat value={MARKETPLACE_STATS.shipping} label="Checkout" />
      </div>
    </GlassCard>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-sm font-semibold tabular-nums text-ink sm:text-base">{value}</div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}
