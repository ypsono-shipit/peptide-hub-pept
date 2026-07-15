import { CheckCircle2, FlaskConical } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { BuyWithUsdc } from "@/components/marketplace/BuyWithUsdc";
import {
  MARKETPLACE_BRAND,
  PARTNER_LAB,
  RESEARCH_ONLY,
  type Peptide,
} from "@/lib/marketplaceData";
import { COLLATERAL_SYMBOL } from "@/lib/deployments";

export function ProductDetailPanel({ peptide }: { peptide: Peptide }) {
  return (
    <>
      <GlassCard className="p-5">
        <div className="mb-4 flex h-36 items-center justify-center overflow-hidden rounded-2xl bg-white/5">
          {peptide.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={peptide.imageUrl}
              alt={peptide.name}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary">
              <DynamicIcon name={peptide.icon} size={26} />
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-ink">{peptide.name}</h3>
            <p className="text-xs text-ink-soft">{peptide.description}</p>
          </div>
          <span className="shrink-0 font-mono text-[10px] text-ink-soft">{peptide.sku}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {peptide.bestseller && (
            <Badge className="bg-primary text-on-primary">Bestseller</Badge>
          )}
          {peptide.inStock && (
            <Badge className="border border-border-strong bg-panel text-ink">In Stock</Badge>
          )}
          <Badge className="bg-white/10 text-ink-soft">Research Use Only</Badge>
        </div>

        <div className="mt-3 space-y-1.5 text-xs text-ink-soft">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-ink" /> {peptide.kitLabel} · {peptide.dosage}
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-ink" /> {peptide.purity} · {peptide.form}
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-ink" /> {RESEARCH_ONLY.testing}
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-ink" /> Pay with {COLLATERAL_SYMBOL} on-chain
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white/8 px-3 py-2">
          <div className="text-[11px] text-ink-soft">{peptide.priceIsFrom ? "From" : "Price"}</div>
          <div className="text-xl font-semibold tabular-nums text-ink">
            ${peptide.priceFrom.toFixed(2)}
          </div>
          <div className="text-[11px] text-ink-soft">
            {COLLATERAL_SYMBOL} · 10-vial kit · Robinhood testnet
          </div>
        </div>

        <div className="mt-4">
          <BuyWithUsdc peptide={peptide} size="md" />
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">{RESEARCH_ONLY.disclaimer}</p>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
            <FlaskConical size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-sm font-medium text-ink">
              {MARKETPLACE_BRAND.name}
              {PARTNER_LAB.verified && <CheckCircle2 size={13} className="text-ink" />}
            </div>
            <div className="text-[11px] text-ink-soft">
              Catalog partnership · {PARTNER_LAB.productCount} compounds · USDC checkout
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-ink-soft">
          <div>
            <div className="text-ink-soft">Purity</div>
            <div className="font-medium text-ink">{PARTNER_LAB.purity}</div>
          </div>
          <div>
            <div className="text-ink-soft">Testing</div>
            <div className="font-medium text-ink">{PARTNER_LAB.testing}</div>
          </div>
          <div className="col-span-2">
            <div className="text-ink-soft">Checkout</div>
            <div className="font-medium text-ink">
              {COLLATERAL_SYMBOL} on Robinhood Chain Testnet
            </div>
          </div>
        </div>
      </GlassCard>
    </>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${className}`}>
      {children}
    </span>
  );
}
