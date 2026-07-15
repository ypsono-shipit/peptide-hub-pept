"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { CategorySidebar } from "@/components/marketplace/CategorySidebar";
import { MarketplaceHero } from "@/components/marketplace/MarketplaceHero";
import { FilterBar } from "@/components/marketplace/FilterBar";
import { PeptideListItem } from "@/components/marketplace/PeptideListItem";
import { PeptideGridItem } from "@/components/marketplace/PeptideGridItem";
import { ProductDetailPanel } from "@/components/marketplace/ProductDetailPanel";
import { PEPTIDES, LABS } from "@/lib/marketplaceData";
import { cn } from "@/lib/cn";

export default function MarketplacePage() {
  const [tab, setTab] = useState<"peptides" | "labs">("peptides");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [view, setView] = useState<"list" | "grid">("list");
  const [selectedId, setSelectedId] = useState(PEPTIDES[0].id);

  const filtered = useMemo(() => {
    return PEPTIDES.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (inStockOnly && !p.inStock) return false;
      if (query && !`${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [category, inStockOnly, query]);

  const selected = PEPTIDES.find((p) => p.id === selectedId) ?? PEPTIDES[0];

  return (
    <div className="flex h-full gap-5">
      <CategorySidebar query={query} onQueryChange={setQuery} category={category} onCategoryChange={setCategory} />

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
        <MarketplaceHero />

        <GlassCard className="flex flex-col gap-4 p-5">
          <div className="flex gap-1 rounded-2xl bg-white/8 p-1">
            <button
              onClick={() => setTab("peptides")}
              className={cn(
                "rounded-xl px-4 py-1.5 text-sm font-medium",
                tab === "peptides" ? "bg-white/25 text-ink" : "text-ink-soft"
              )}
            >
              Peptides
            </button>
            <button
              onClick={() => setTab("labs")}
              className={cn(
                "rounded-xl px-4 py-1.5 text-sm font-medium",
                tab === "labs" ? "bg-white/25 text-ink" : "text-ink-soft"
              )}
            >
              Labs
            </button>
          </div>

          <FilterBar view={view} onViewChange={setView} inStockOnly={inStockOnly} onInStockOnlyChange={setInStockOnly} />

          {tab === "peptides" ? (
            filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-ink-soft">No peptides match your filters.</div>
            ) : view === "list" ? (
              <div className="flex flex-col gap-1.5">
                {filtered.map((p) => (
                  <PeptideListItem key={p.id} peptide={p} selected={p.id === selectedId} onSelect={() => setSelectedId(p.id)} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                {filtered.map((p) => (
                  <PeptideGridItem key={p.id} peptide={p} selected={p.id === selectedId} onSelect={() => setSelectedId(p.id)} />
                ))}
              </div>
            )
          ) : (
            <div className="py-10 text-center text-sm text-ink-soft">
              Lab directory view — browse labs from the peptide list&apos;s &quot;View Labs&quot; for now.
            </div>
          )}

          <div className="flex items-center justify-center gap-1 pt-2 text-xs text-ink-soft">
            <button className="rounded-full p-1.5 hover:bg-white/10">
              <ChevronLeft size={14} />
            </button>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                className={cn("h-7 w-7 rounded-full", n === 1 ? "bg-white/25 font-medium text-ink" : "hover:bg-white/10")}
              >
                {n}
              </button>
            ))}
            <span className="px-1">…</span>
            <button className="h-7 w-7 rounded-full hover:bg-white/10">41</button>
            <button className="rounded-full p-1.5 hover:bg-white/10">
              <ChevronRight size={14} />
            </button>
          </div>
        </GlassCard>
      </div>

      <div className="flex w-[340px] shrink-0 flex-col gap-3 overflow-y-auto">
        <ProductDetailPanel peptide={selected} labs={LABS} />
      </div>
    </div>
  );
}
