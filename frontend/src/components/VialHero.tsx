"use client";

import dynamic from "next/dynamic";

const ResearchOnlyVial3D = dynamic(
  () => import("@/components/ui/ResearchOnlyVial3D").then((m) => m.ResearchOnlyVial3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[220px] items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/research-only-vial.png"
          alt="Research Only vial"
          className="h-[180px] w-auto object-contain opacity-80"
        />
      </div>
    ),
  },
);

export function VialHero({ symbol }: { symbol: string }) {
  return (
    <div className="relative flex min-h-[240px] flex-col overflow-hidden rounded-xl border border-border bg-panel">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_75%,rgba(34,197,94,0.14)_0%,transparent_55%)]" />
      <div className="relative z-10 flex-1 px-2 pt-3">
        <ResearchOnlyVial3D />
      </div>
      <div className="relative z-10 border-t border-border px-3 py-2 text-center">
        <div className="text-[10px] font-medium tracking-widest text-positive/90">RESEARCH ONLY</div>
        <div className="font-mono text-sm font-semibold tracking-tight text-ink">{symbol}</div>
        <div className="text-[10px] text-muted">Research Use Only · Partner product</div>
      </div>
    </div>
  );
}
