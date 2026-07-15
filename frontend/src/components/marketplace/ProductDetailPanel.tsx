import { ExternalLink, CheckCircle2, FlaskConical } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { PARTNER_LAB, RESEARCH_ONLY, type Peptide } from "@/lib/marketplaceData";

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
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-cloud">
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
            <Badge className="bg-gradient-to-r from-primary to-accent text-cloud">Bestseller</Badge>
          )}
          {peptide.inStock && <Badge className="bg-positive/20 text-positive">In Stock</Badge>}
          <Badge className="bg-white/10 text-ink-soft">Research Use Only</Badge>
        </div>

        <div className="mt-3 space-y-1.5 text-xs text-ink-soft">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-primary" /> {peptide.kitLabel} · {peptide.dosage}
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-primary" /> {peptide.purity} · {peptide.form}
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-primary" /> {RESEARCH_ONLY.testing}
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-primary" /> {RESEARCH_ONLY.shipping}
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white/8 px-3 py-2">
          <div className="text-[11px] text-ink-soft">{peptide.priceIsFrom ? "From" : "Price"}</div>
          <div className="text-xl font-semibold tabular-nums text-ink">${peptide.priceFrom.toFixed(2)}</div>
          <div className="text-[11px] text-ink-soft">USD · 10-vial kit on Research Only</div>
        </div>

        <a
          href={peptide.partnerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-cloud hover:opacity-90"
        >
          Buy on Research Only
          <ExternalLink size={14} />
        </a>

        <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">{RESEARCH_ONLY.disclaimer}</p>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-cloud">
            <FlaskConical size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-sm font-medium text-ink">
              {PARTNER_LAB.name}
              {PARTNER_LAB.verified && <CheckCircle2 size={13} className="text-primary" />}
            </div>
            <div className="text-[11px] text-ink-soft">
              Exclusive marketplace partner · {PARTNER_LAB.productCount} compounds
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
            <div className="text-ink-soft">Shipping</div>
            <div className="font-medium text-ink">{PARTNER_LAB.shipTime}</div>
          </div>
        </div>
        <a
          href={PARTNER_LAB.shopUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-white/12 py-2 text-xs font-semibold text-ink hover:bg-white/18"
        >
          View full shop
          <ExternalLink size={12} />
        </a>
      </GlassCard>
    </>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${className}`}>{children}</span>;
}
