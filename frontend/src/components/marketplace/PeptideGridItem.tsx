import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { BuyWithUsdc } from "@/components/marketplace/BuyWithUsdc";
import { cn } from "@/lib/cn";
import { COLLATERAL_SYMBOL } from "@/lib/deployments";
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
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "flex cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition-colors",
        selected
          ? "border-border-strong bg-panel-hover"
          : "border-border bg-panel hover:border-border-strong hover:bg-panel-hover",
      )}
    >
      {/* Full-width product image */}
      <div className="relative aspect-square w-full bg-white">
        {peptide.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={peptide.imageUrl}
            alt={peptide.name}
            className="h-full w-full object-contain p-3"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-bg text-ink">
            <DynamicIcon name={peptide.icon} size={36} />
          </div>
        )}
        {peptide.bestseller && (
          <span className="absolute left-2 top-2 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-on-primary">
            Bestseller
          </span>
        )}
      </div>

      {/* Compact body — no huge empty padding */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <h3 className="text-sm font-semibold leading-snug text-ink">{peptide.name}</h3>
          <p className="mt-0.5 font-mono text-[10px] text-muted">{peptide.sku}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-soft">
            {peptide.description}
          </p>
        </div>

        <p className="text-[11px] leading-relaxed text-muted">
          {peptide.kitLabel}
          <span className="mx-1 text-faint">·</span>
          {peptide.purity}
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-border pt-2.5">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted">
              {peptide.priceIsFrom ? "From" : "Price"}
            </div>
            <div className="font-mono text-base font-semibold tabular-nums text-ink">
              ${peptide.priceFrom.toFixed(2)}
            </div>
            <div className="mt-0.5 text-[10px] text-muted">
              {peptide.inStock ? "In stock" : "Out of stock"} · {COLLATERAL_SYMBOL}
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <BuyWithUsdc peptide={peptide} size="sm" label="Buy" />
          </div>
        </div>
      </div>
    </div>
  );
}
