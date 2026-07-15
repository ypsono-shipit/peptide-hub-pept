"use client";

import Link from "next/link";
import { PEPTIDES } from "@/lib/marketplaceData";
import { Sparkline } from "@/components/ui/Sparkline";
import { cn } from "@/lib/cn";

const STRIP = PEPTIDES.filter((p) =>
  ["bpc-157", "tb-500", "cjc-1295-no-dac", "melanotan-ii", "ipamorelin", "semaglutide"].includes(
    p.id,
  ),
).slice(0, 5);

export function MarketplaceStrip() {
  return (
    <div className="rounded-xl border border-border bg-panel p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">Marketplace</h3>
          <p className="text-[11px] text-muted">
            Research Only partner catalog — research-use-only compounds
          </p>
        </div>
        <Link href="/marketplace" className="text-xs text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        {STRIP.map((p, i) => {
          const pos = i !== 3;
          return (
            <a
              key={p.id}
              href={p.partnerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-border bg-bg p-2.5 transition-colors hover:border-border-strong hover:bg-panel-hover"
            >
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-ink">{p.name}</div>
                  <div className="truncate text-[10px] text-muted">{p.description}</div>
                </div>
              </div>
              <div className="mt-2">
                <Sparkline seed={p.id} positive={pos} width={80} height={22} />
              </div>
              <div className="mt-1 flex items-end justify-between">
                <span className="font-mono text-xs tabular-nums text-ink">
                  ${p.priceFrom.toFixed(2)}
                </span>
                <span className={cn("text-[10px] tabular-nums", pos ? "text-positive" : "text-negative")}>
                  kit
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
