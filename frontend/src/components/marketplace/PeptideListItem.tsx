import { Star } from "lucide-react";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { cn } from "@/lib/cn";
import type { Peptide } from "@/lib/marketplaceData";

export function PeptideListItem({
  peptide,
  selected,
  onSelect,
}: {
  peptide: Peptide;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-colors",
        selected ? "border-primary/40 bg-white/15" : "border-transparent hover:bg-white/10"
      )}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-cloud">
        <DynamicIcon name={peptide.icon} size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">{peptide.name}</span>
          {peptide.bestseller && (
            <span className="rounded-full bg-gradient-to-r from-primary to-accent px-2 py-0.5 text-[10px] font-semibold text-cloud">
              Bestseller
            </span>
          )}
        </div>
        <div className="truncate text-xs text-ink-soft">{peptide.description}</div>
        <div className="mt-0.5 text-[11px] text-ink-soft">
          {peptide.dosage} · {peptide.purity} · {peptide.form}
        </div>
      </div>

      <div className="w-24 shrink-0 text-xs text-ink-soft">{peptide.labCount} Labs</div>

      <div className="w-24 shrink-0">
        <div className="flex items-center gap-1 text-xs text-ink">
          <Star size={12} className="fill-amber-400 text-amber-400" />
          {peptide.rating} ({peptide.ratingCount})
        </div>
        {peptide.inStock && (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-positive">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" />
            In Stock
          </div>
        )}
      </div>

      <div className="w-28 shrink-0 text-right">
        <div className="text-xs text-ink-soft">From</div>
        <div className="text-sm font-semibold tabular-nums text-ink">${peptide.priceFrom.toFixed(2)} USDT</div>
      </div>

      <div className="shrink-0 rounded-2xl bg-white/15 px-3.5 py-2 text-xs font-medium text-ink">View Labs</div>
    </button>
  );
}
