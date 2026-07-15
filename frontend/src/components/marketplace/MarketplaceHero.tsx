import { GlassCard } from "@/components/ui/GlassCard";
import { VialIllustration } from "@/components/ui/VialIllustration";
import { MARKETPLACE_STATS } from "@/lib/marketplaceData";

export function MarketplaceHero() {
  return (
    <GlassCard tone="rich" className="p-6">
      <div className="flex items-center gap-6">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold tracking-tight text-cloud">Verified Peptide Marketplace</h2>
          <p className="mt-1 text-sm text-cloud-soft">
            Source peptides directly from trusted laboratories worldwide.
          </p>

          <div className="mt-6 grid grid-cols-4 gap-4">
            <Stat value={MARKETPLACE_STATS.peptidesListed} label="Peptides Listed" />
            <Stat value={String(MARKETPLACE_STATS.verifiedLabs)} label="Verified Labs" />
            <Stat value={MARKETPLACE_STATS.successRate} label="Average Success Rate" />
            <Stat value={MARKETPLACE_STATS.avgResponse} label="Average Quote Response" />
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
      <div className="text-lg font-semibold tabular-nums text-cloud">{value}</div>
      <div className="text-[11px] text-cloud-soft">{label}</div>
    </div>
  );
}
