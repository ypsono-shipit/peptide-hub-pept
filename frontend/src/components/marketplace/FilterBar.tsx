"use client";

import { Grid3x3, List } from "lucide-react";
import { cn } from "@/lib/cn";

export function FilterBar({
  view,
  onViewChange,
  inStockOnly,
  onInStockOnlyChange,
  sort,
  onSortChange,
  resultCount,
}: {
  view: "list" | "grid";
  onViewChange: (v: "list" | "grid") => void;
  inStockOnly: boolean;
  onInStockOnlyChange: (v: boolean) => void;
  sort: "featured" | "az" | "price-asc" | "price-desc";
  onSortChange: (s: "featured" | "az" | "price-asc" | "price-desc") => void;
  resultCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-ink">
        {resultCount} compounds
      </span>
      <button
        onClick={() => onInStockOnlyChange(!inStockOnly)}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          inStockOnly ? "bg-white/20 text-ink" : "bg-white/8 text-ink-soft hover:bg-white/15",
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-positive" />
        In Stock
      </button>

      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as typeof sort)}
        className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-medium text-ink-soft outline-none hover:bg-white/15 hover:text-ink"
      >
        <option value="featured">Sort: Featured</option>
        <option value="az">A–Z</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
      </select>

      <div className="ml-auto flex items-center gap-1 rounded-full bg-white/8 p-1">
        <button
          onClick={() => onViewChange("grid")}
          className={cn("rounded-full p-1.5", view === "grid" ? "bg-white/25 text-ink" : "text-ink-soft")}
        >
          <Grid3x3 size={14} />
        </button>
        <button
          onClick={() => onViewChange("list")}
          className={cn("rounded-full p-1.5", view === "list" ? "bg-white/25 text-ink" : "text-ink-soft")}
        >
          <List size={14} />
        </button>
      </div>
    </div>
  );
}
