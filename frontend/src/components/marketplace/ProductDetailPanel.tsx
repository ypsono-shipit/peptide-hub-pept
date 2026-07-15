import { ArrowLeft, Heart, ArrowRight, Star, CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import type { Peptide, Lab } from "@/lib/marketplaceData";

export function ProductDetailPanel({ peptide, labs }: { peptide: Peptide; labs: Lab[] }) {
  return (
    <>
      <div className="flex items-center justify-between px-1">
        <button className="flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink">
          <ArrowLeft size={14} />
          Back to Marketplace
        </button>
        <button className="text-ink-soft hover:text-negative">
          <Heart size={16} />
        </button>
      </div>

      <GlassCard className="p-5">
        <div className="mb-4 flex h-28 items-center justify-center rounded-2xl bg-white/5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-cloud">
            <DynamicIcon name={peptide.icon} size={26} />
          </div>
        </div>

        <h3 className="text-base font-semibold text-ink">{peptide.name}</h3>
        <p className="text-xs text-ink-soft">{peptide.description}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {peptide.bestseller && (
            <Badge className="bg-gradient-to-r from-primary to-accent text-cloud">Bestseller</Badge>
          )}
          {peptide.inStock && <Badge className="bg-positive/20 text-positive">In Stock</Badge>}
        </div>

        <div className="mt-3 space-y-1.5 text-xs text-ink-soft">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} /> {peptide.form} Powder
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} /> {peptide.researchUseOnly ? "Research Use Only" : "General Use"}
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-ink-soft">
          {peptide.name} is a synthetic {peptide.description.toLowerCase()} analog, offered at {peptide.purity}{" "}
          from {peptide.labCount} verified laboratories…
        </p>

        <button className="mt-4 flex items-center gap-1 text-xs font-medium text-primary hover:opacity-80">
          View full details <ArrowRight size={13} />
        </button>
      </GlassCard>

      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-ink">Compare Labs ({peptide.labCount})</h3>
        <button className="text-xs text-ink-soft hover:text-ink">View All</button>
      </div>
      <div className="flex flex-col gap-3">
        {labs.map((lab) => (
          <LabCompareCard key={lab.id} lab={lab} />
        ))}
      </div>

      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-ink">Can&apos;t find what you&apos;re looking for?</h3>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          Our team can source custom peptides for your research needs.
        </p>
        <button className="mt-4 w-full rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-cloud hover:opacity-90">
          Request Custom Peptide
        </button>
      </GlassCard>
    </>
  );
}

function LabCompareCard({ lab }: { lab: Lab }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-semibold text-cloud">
          {lab.name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm font-medium text-ink">
            {lab.name}
            {lab.verified && <CheckCircle2 size={13} className="text-primary" />}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-ink-soft">
            <Star size={10} className="fill-amber-400 text-amber-400" />
            {lab.rating} ({lab.ratingCount}) · {lab.successRate}% Success
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums text-ink">${lab.price.toFixed(2)}</div>
          <div className="text-[11px] text-ink-soft">USDT</div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-ink-soft">
        <span>
          {lab.region} · {lab.shipTime} {lab.freeShipping && "· Free Shipping"}
        </span>
      </div>
      <button className="mt-3 w-full rounded-xl bg-gradient-to-r from-primary to-accent py-1.5 text-xs font-semibold text-cloud hover:opacity-90">
        Request Quote
      </button>
    </GlassCard>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${className}`}>{children}</span>;
}
