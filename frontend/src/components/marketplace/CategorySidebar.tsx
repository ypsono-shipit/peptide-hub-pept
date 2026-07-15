import { Search } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import {
  CATEGORIES,
  HOW_IT_WORKS,
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
    <div className="hidden w-56 shrink-0 flex-col gap-3 overflow-y-auto lg:flex">
      <GlassCard className="p-3">
        <h1 className="text-sm font-semibold text-ink">Marketplace</h1>
        <p className="mt-1 text-[11px] leading-snug text-muted">
          Pay {COLLATERAL_SYMBOL} · receive kit NFT
        </p>

        <div className="relative mt-3">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg border border-border bg-bg py-2 pl-8 pr-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-border-strong"
          />
        </div>

        <div className="mt-3 flex flex-col gap-0.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => onCategoryChange(c.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                category === c.id
                  ? "bg-panel-hover font-medium text-ink"
                  : "text-muted hover:bg-panel hover:text-ink",
              )}
            >
              <DynamicIcon name={c.icon} size={15} />
              <span className="flex-1">{c.label}</span>
              <span className="tabular-nums text-[11px] text-ink-soft">{counts[c.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-3">
        <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
          How it works
        </h3>
        <div className="flex flex-col gap-3">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.step} className="flex gap-2.5">
              <div className="flex flex-col items-center">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-on-primary">
                  {s.step}
                </div>
                {i < HOW_IT_WORKS.length - 1 && <div className="mt-1 h-full w-px bg-border" />}
              </div>
              <div className="min-w-0 pb-0.5">
                <div className="text-xs font-medium text-ink">{s.title}</div>
                <div className="text-[11px] leading-snug text-muted">{s.description}</div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-3">
        <p className="text-[10px] leading-snug text-muted">{RESEARCH_ONLY.disclaimer}</p>
      </GlassCard>
    </div>
  );
}
