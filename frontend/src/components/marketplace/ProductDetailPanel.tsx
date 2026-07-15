import { CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { BuyWithUsdc } from "@/components/marketplace/BuyWithUsdc";
import { RESEARCH_ONLY, type Peptide } from "@/lib/marketplaceData";
import { COLLATERAL_SYMBOL } from "@/lib/deployments";

export function ProductDetailPanel({ peptide }: { peptide: Peptide }) {
  return (
    <>
      <GlassCard className="overflow-hidden p-0">
        <div className="flex aspect-square w-full items-center justify-center bg-white">
          {peptide.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={peptide.imageUrl}
              alt={peptide.name}
              className="h-full w-full object-contain p-4"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-panel text-ink">
              <DynamicIcon name={peptide.icon} size={28} />
            </div>
          )}
        </div>

        <div className="space-y-3 p-3">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold leading-snug text-ink">{peptide.name}</h3>
              <span className="shrink-0 font-mono text-[10px] text-muted">{peptide.sku}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{peptide.description}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {peptide.bestseller && (
              <Badge className="bg-primary text-on-primary">Bestseller</Badge>
            )}
            {peptide.inStock && (
              <Badge className="border border-border-strong bg-bg text-ink">In Stock</Badge>
            )}
            <Badge className="border border-border bg-bg text-muted">RUO</Badge>
          </div>

          <div className="space-y-1 text-xs leading-relaxed text-ink-soft">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="shrink-0 text-ink" />
              {peptide.kitLabel} · {peptide.dosage}
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="shrink-0 text-ink" />
              {peptide.purity} · {peptide.form}
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="shrink-0 text-ink" />
              {RESEARCH_ONLY.testing}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-bg px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-muted">
              {peptide.priceIsFrom ? "From" : "Price"}
            </div>
            <div className="font-mono text-xl font-semibold tabular-nums text-ink">
              ${peptide.priceFrom.toFixed(2)}
            </div>
            <div className="mt-0.5 text-[11px] text-muted">
              {COLLATERAL_SYMBOL} · PEPT-KIT NFT · redeemable kit
            </div>
          </div>

          <BuyWithUsdc peptide={peptide} size="md" />

          <p className="text-[10px] leading-snug text-muted">{RESEARCH_ONLY.disclaimer}</p>
        </div>
      </GlassCard>
    </>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${className}`}>
      {children}
    </span>
  );
}
