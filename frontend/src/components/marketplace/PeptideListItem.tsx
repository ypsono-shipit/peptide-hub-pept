import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { BuyWithUsdc } from "@/components/marketplace/BuyWithUsdc";
import { cn } from "@/lib/cn";
import { COLLATERAL_SYMBOL } from "@/lib/deployments";
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
        selected ? "border-ink/40 bg-white/15" : "border-transparent hover:bg-white/10",
      )}
    >
      <ProductThumb peptide={peptide} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink">{peptide.name}</span>
          <span className="font-mono text-[10px] text-ink-soft">{peptide.sku}</span>
          {peptide.bestseller && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-on-primary">
              Bestseller
            </span>
          )}
        </div>
        <div className="truncate text-xs text-ink-soft">{peptide.description}</div>
        <div className="mt-0.5 text-[11px] text-ink-soft">
          {peptide.kitLabel} · {peptide.dosage} · {peptide.purity}
        </div>
      </div>

      <div className="hidden w-28 shrink-0 text-xs text-ink-soft sm:block">
        Pept Trade × RO
      </div>

      <div className="w-24 shrink-0">
        {peptide.inStock && (
          <div className="flex items-center gap-1 text-[11px] text-positive">
            <span className="h-1.5 w-1.5 rounded-full bg-ink" />
            In Stock
          </div>
        )}
        <div className="mt-0.5 text-[11px] text-ink-soft">RUO · {COLLATERAL_SYMBOL}</div>
      </div>

      <div className="w-28 shrink-0 text-right">
        <div className="text-xs text-ink-soft">{peptide.priceIsFrom ? "From" : "Price"}</div>
        <div className="text-sm font-semibold tabular-nums text-ink">
          ${peptide.priceFrom.toFixed(2)}
        </div>
      </div>

      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <BuyWithUsdc peptide={peptide} size="sm" label="Buy" />
      </div>
    </button>
  );
}

function ProductThumb({ peptide }: { peptide: Peptide }) {
  if (peptide.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={peptide.imageUrl}
        alt={peptide.name}
        className="h-11 w-11 shrink-0 rounded-xl object-cover"
      />
    );
  }
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
      <DynamicIcon name={peptide.icon} size={20} />
    </div>
  );
}
