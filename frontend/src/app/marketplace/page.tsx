"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { CategorySidebar } from "@/components/marketplace/CategorySidebar";
import { MarketplaceHero } from "@/components/marketplace/MarketplaceHero";
import { FilterBar } from "@/components/marketplace/FilterBar";
import { PeptideListItem } from "@/components/marketplace/PeptideListItem";
import { PeptideGridItem } from "@/components/marketplace/PeptideGridItem";
import { ProductDetailPanel } from "@/components/marketplace/ProductDetailPanel";
import { PEPTIDES, PARTNER_LAB, RESEARCH_ONLY } from "@/lib/marketplaceData";
import { cn } from "@/lib/cn";

type Sort = "featured" | "az" | "price-asc" | "price-desc";

export default function MarketplacePage() {
  const [tab, setTab] = useState<"peptides" | "partner">("peptides");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [view, setView] = useState<"list" | "grid">("list");
  const [sort, setSort] = useState<Sort>("featured");
  const [selectedId, setSelectedId] = useState(PEPTIDES[0]!.id);

  const filtered = useMemo(() => {
    let list = PEPTIDES.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (inStockOnly && !p.inStock) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!`${p.name} ${p.description} ${p.sku}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    if (sort === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "price-asc") list = [...list].sort((a, b) => a.priceFrom - b.priceFrom);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.priceFrom - a.priceFrom);
    // featured = original Research Only shop order
    return list;
  }, [category, inStockOnly, query, sort]);

  const selected = PEPTIDES.find((p) => p.id === selectedId) ?? filtered[0] ?? PEPTIDES[0]!;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar />
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3">
      <CategorySidebar
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
      />

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        <MarketplaceHero />

        <GlassCard className="flex flex-col gap-4 p-5">
          <div className="flex gap-1 rounded-2xl bg-white/8 p-1">
            <button
              onClick={() => setTab("peptides")}
              className={cn(
                "rounded-xl px-4 py-1.5 text-sm font-medium",
                tab === "peptides" ? "bg-white/25 text-ink" : "text-ink-soft",
              )}
            >
              Compounds
            </button>
            <button
              onClick={() => setTab("partner")}
              className={cn(
                "rounded-xl px-4 py-1.5 text-sm font-medium",
                tab === "partner" ? "bg-white/25 text-ink" : "text-ink-soft",
              )}
            >
              Partner lab
            </button>
          </div>

          {tab === "peptides" ? (
            <>
              <FilterBar
                view={view}
                onViewChange={setView}
                inStockOnly={inStockOnly}
                onInStockOnlyChange={setInStockOnly}
                sort={sort}
                onSortChange={setSort}
                resultCount={filtered.length}
              />

              {filtered.length === 0 ? (
                <div className="py-10 text-center text-sm text-ink-soft">
                  No compounds match your filters.
                </div>
              ) : view === "list" ? (
                <div className="flex flex-col gap-1.5">
                  {filtered.map((p) => (
                    <PeptideListItem
                      key={p.id}
                      peptide={p}
                      selected={p.id === selected.id}
                      onSelect={() => setSelectedId(p.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                  {filtered.map((p) => (
                    <PeptideGridItem
                      key={p.id}
                      peptide={p}
                      selected={p.id === selected.id}
                      onSelect={() => setSelectedId(p.id)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <PartnerLabPanel />
          )}
        </GlassCard>
      </div>

      <div className="hidden w-[300px] shrink-0 flex-col gap-3 overflow-y-auto xl:flex">
        <ProductDetailPanel peptide={selected} />
      </div>
      </div>
    </div>
  );
}

function PartnerLabPanel() {
  return (
    <div className="space-y-4 py-2">
      <div>
        <h3 className="text-lg font-semibold text-ink">{PARTNER_LAB.name}</h3>
        <p className="mt-1 text-sm text-ink-soft">{RESEARCH_ONLY.tagline}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Info label="Compounds" value={String(PARTNER_LAB.productCount)} />
        <Info label="Purity" value={PARTNER_LAB.purity} />
        <Info label="Testing" value={PARTNER_LAB.testing} />
        <Info label="Shipping" value={PARTNER_LAB.shipTime} />
      </div>
      <p className="text-xs leading-relaxed text-ink-soft">{PARTNER_LAB.disclaimer}</p>
      <p className="text-xs leading-relaxed text-ink-soft">
        PEPT Trade partners with Research Only for physical research-peptide fulfillment. Browse
        the catalog here, then complete purchase on their store. Prices reflect their public shop
        listings (10-vial kits).
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={PARTNER_LAB.shopUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-accent"
        >
          Open shop
          <ExternalLink size={14} />
        </a>
        <a
          href={PARTNER_LAB.aboutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-2xl bg-white/12 px-4 py-2.5 text-sm font-medium text-ink hover:bg-white/18"
        >
          About Research Only
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/8 px-3 py-2.5">
      <div className="text-[11px] text-ink-soft">{label}</div>
      <div className="text-sm font-medium text-ink">{value}</div>
    </div>
  );
}
