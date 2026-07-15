"use client";

import { ChevronDown, Grid3x3, List } from "lucide-react";
import { cn } from "@/lib/cn";

export function FilterBar({
  view,
  onViewChange,
  inStockOnly,
  onInStockOnlyChange,
}: {
  view: "list" | "grid";
  onViewChange: (v: "list" | "grid") => void;
  inStockOnly: boolean;
  onInStockOnlyChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pill active>All</Pill>
      <button
        onClick={() => onInStockOnlyChange(!inStockOnly)}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          inStockOnly ? "bg-white/20 text-ink" : "bg-white/8 text-ink-soft hover:bg-white/15"
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-positive" />
        In Stock
      </button>
      <Pill>USA</Pill>
      <Pill>EU</Pill>
      <Pill>Asia</Pill>
      <Dropdown label="Target" />
      <Dropdown label="Purity" />
      <Dropdown label="Form" />
      <Dropdown label="Sort: Popular" />

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

function Pill({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium",
        active ? "bg-white/20 text-ink" : "bg-white/8 text-ink-soft"
      )}
    >
      {children}
    </span>
  );
}

function Dropdown({ label }: { label: string }) {
  return (
    <button className="flex items-center gap-1 rounded-full bg-white/8 px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-white/15 hover:text-ink">
      {label}
      <ChevronDown size={12} />
    </button>
  );
}
