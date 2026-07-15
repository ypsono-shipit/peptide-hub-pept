import { ExternalLink } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { VialIllustration } from "@/components/ui/VialIllustration";
import { MARKETPLACE_STATS, RESEARCH_ONLY } from "@/lib/marketplaceData";

export function MarketplaceHero() {
  return (
    <GlassCard tone="rich" className="p-6">
      <div className="flex items-center gap-6">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium text-ink">
              Partner marketplace
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-ink">
              Research Only
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            Research Only Peptide Catalog
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            {RESEARCH_ONLY.tagline}. Every compound is research-use-only, sold as 10-vial kits.
            Checkout is completed on our partner store.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat value={MARKETPLACE_STATS.peptidesListed} label="Compounds" />
            <Stat value={MARKETPLACE_STATS.purity} label="Purity" />
            <Stat value={MARKETPLACE_STATS.kitNote} label="Kit size" />
            <Stat value={MARKETPLACE_STATS.shipping} label="Shipping" />
          </div>

          <a
            href={RESEARCH_ONLY.shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-accent"
          >
            Open Research Only shop
            <ExternalLink size={13} />
          </a>
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
