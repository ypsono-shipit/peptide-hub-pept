import { Search } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import {
  CATEGORIES,
  HOW_IT_WORKS,
  MARKETPLACE_BRAND,
  RESEARCH_ONLY,
  categoryCounts,
} from "@/lib/marketplaceData";
import { COLLATERAL_SYMBOL } from "@/lib/deployments";
import { cn } from "@/lib/cn";

export function CategorySidebar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
}) {
  const counts = categoryCounts();

  return (
    <div className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto">
      <GlassCard className="p-5">
        <h1 className="text-base font-semibold text-ink">Marketplace</h1>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          <span className="font-medium text-ink">{MARKETPLACE_BRAND.name}</span>
          . Research-grade peptides, &gt;99% purity. Pay kit prices in{" "}
          {COLLATERAL_SYMBOL} on Robinhood testnet.
        </p>

        <div className="relative mt-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search compounds or SKU..."
            className="w-full rounded-2xl bg-white/10 py-2 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-soft"
          />
        </div>

        <div className="mt-4 flex flex-col gap-0.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => onCategoryChange(c.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl px-3 py-2 text-left text-sm transition-colors",
                category === c.id
                  ? "bg-white/15 font-medium text-ink"
                  : "text-ink-soft hover:bg-white/10 hover:text-ink",
              )}
            >
              <DynamicIcon name={c.icon} size={15} />
              <span className="flex-1">{c.label}</span>
              <span className="tabular-nums text-[11px] text-ink-soft">{counts[c.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-ink">How it works</h3>
        <div className="flex flex-col gap-4">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-on-primary">
                  {s.step}
                </div>
                {i < HOW_IT_WORKS.length - 1 && <div className="mt-1 h-full w-px bg-glass-border" />}
              </div>
              <div className="pb-1">
                <div className="text-sm font-medium text-ink">{s.title}</div>
                <div className="text-xs text-ink-soft">{s.description}</div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <p className="text-[11px] leading-relaxed text-ink-soft">{RESEARCH_ONLY.disclaimer}</p>
      </GlassCard>
    </div>
  );
}
