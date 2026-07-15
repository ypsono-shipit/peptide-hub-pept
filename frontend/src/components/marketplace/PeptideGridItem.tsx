import { Star } from "lucide-react";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { cn } from "@/lib/cn";
import type { Peptide } from "@/lib/marketplaceData";

export function PeptideGridItem({
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
        "flex flex-col rounded-2xl border p-4 text-left transition-colors",
        selected ? "border-primary/40 bg-white/15" : "border-transparent hover:bg-white/10"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-cloud">
          <DynamicIcon name={peptide.icon} size={20} />
        </div>
        {peptide.bestseller && (
          <span className="rounded-full bg-gradient-to-r from-primary to-accent px-2 py-0.5 text-[10px] font-semibold text-cloud">
            Bestseller
          </span>
        )}
      </div>
      <div className="text-sm font-semibold text-ink">{peptide.name}</div>
      <div className="text-xs text-ink-soft">{peptide.description}</div>
      <div className="mt-2 flex items-center gap-1 text-xs text-ink">
        <Star size={12} className="fill-amber-400 text-amber-400" />
        {peptide.rating} ({peptide.ratingCount})
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="text-[11px] text-ink-soft">From</div>
          <div className="text-sm font-semibold tabular-nums text-ink">${peptide.priceFrom.toFixed(2)}</div>
        </div>
        <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-ink">{peptide.labCount} Labs</span>
      </div>
    </button>
  );
}
