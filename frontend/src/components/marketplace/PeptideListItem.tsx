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
        "grid w-full cursor-pointer grid-cols-[88px_1fr] items-center gap-4 rounded-xl border p-3 text-left transition-colors sm:grid-cols-[96px_minmax(0,1fr)_auto]",
        selected
          ? "border-border-strong bg-panel-hover"
          : "border-border bg-panel hover:border-border-strong hover:bg-panel-hover",
      )}
    >
      {/* Product image */}
      <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-lg bg-white sm:h-24 sm:w-24">
        {peptide.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={peptide.imageUrl}
            alt={peptide.name}
            className="h-full w-full object-contain p-1.5"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-panel text-ink">
            <DynamicIcon name={peptide.icon} size={28} />
          </div>
        )}
      </div>

      {/* Title + meta */}
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-base font-semibold leading-snug tracking-tight text-ink">
            {peptide.name}
          </h3>
          {peptide.bestseller && (
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-on-primary">
              Bestseller
            </span>
          )}
        </div>
        <p className="font-mono text-[11px] leading-none text-muted">{peptide.sku}</p>
        <p className="line-clamp-1 text-sm leading-snug text-ink-soft">{peptide.description}</p>
        <p className="text-xs leading-relaxed text-muted">
          <span className="text-ink-soft">{peptide.kitLabel}</span>
          <span className="mx-1.5 text-faint">·</span>
          <span>{peptide.dosage}</span>
          <span className="mx-1.5 text-faint">·</span>
          <span>{peptide.purity}</span>
          <span className="mx-1.5 text-faint">·</span>
          <span>{peptide.form}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5 sm:hidden">
          {peptide.inStock ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-ink" />
              In stock · RUO · {COLLATERAL_SYMBOL}
            </span>
          ) : (
            <span className="text-xs text-muted">Out of stock</span>
          )}
        </div>
      </div>

      {/* Price + CTA — desktop */}
      <div className="col-span-2 flex items-center justify-between gap-4 border-t border-border pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-center sm:border-0 sm:pt-0 sm:pl-2">
        <div className="hidden items-center gap-1.5 text-xs text-ink-soft sm:flex">
          {peptide.inStock ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-ink" />
              In stock
            </>
          ) : (
            <span className="text-muted">Out of stock</span>
          )}
          <span className="text-faint">·</span>
          <span className="text-muted">RUO · {COLLATERAL_SYMBOL}</span>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-[11px] uppercase tracking-wide text-muted">
            {peptide.priceIsFrom ? "From" : "Price"}
          </div>
          <div className="font-mono text-lg font-semibold tabular-nums leading-tight text-ink">
            ${peptide.priceFrom.toFixed(2)}
          </div>
        </div>
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <BuyWithUsdc peptide={peptide} size="sm" label="Buy NFT" />
        </div>
      </div>
    </div>
  );
}
