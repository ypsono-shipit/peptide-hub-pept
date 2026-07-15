import { ExternalLink } from "lucide-react";
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
        selected ? "border-ink/40 bg-white/15" : "border-transparent hover:bg-white/10",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        {peptide.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={peptide.imageUrl}
            alt={peptide.name}
            className="h-11 w-11 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-on-primary">
            <DynamicIcon name={peptide.icon} size={20} />
          </div>
        )}
        {peptide.bestseller && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-on-primary">
            Bestseller
          </span>
        )}
      </div>
      <div className="text-sm font-semibold text-ink">{peptide.name}</div>
      <div className="font-mono text-[10px] text-ink-soft">{peptide.sku}</div>
      <div className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{peptide.description}</div>
      <div className="mt-2 text-[11px] text-ink-soft">
        {peptide.kitLabel} · {peptide.purity}
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="text-[11px] text-ink-soft">{peptide.priceIsFrom ? "From" : "Price"}</div>
          <div className="text-sm font-semibold tabular-nums text-ink">${peptide.priceFrom.toFixed(2)}</div>
        </div>
        <a
          href={peptide.partnerUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary hover:bg-accent"
        >
          Buy
          <ExternalLink size={11} />
        </a>
      </div>
    </button>
  );
}
