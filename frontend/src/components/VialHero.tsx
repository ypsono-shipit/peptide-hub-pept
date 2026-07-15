"use client";

import dynamic from "next/dynamic";

const PeptideCapsule3D = dynamic(
  () => import("@/components/ui/PeptideCapsule3D").then((m) => m.PeptideCapsule3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[220px] items-center justify-center text-xs text-muted">
        Loading…
      </div>
    ),
  },
);

export function VialHero({ symbol }: { symbol: string }) {
  return (
    <div className="relative flex min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-panel p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.12)_0%,transparent_65%)]" />
      <div className="relative z-10 h-[200px] w-full max-w-[200px]">
        <PeptideCapsule3D />
      </div>
      <div className="relative z-10 mt-2 text-center">
        <div className="text-[10px] font-medium tracking-widest text-positive/80">RESEARCH ONLY</div>
        <div className="font-mono text-lg font-semibold tracking-tight text-ink">{symbol}</div>
        <div className="text-[10px] text-muted">Research Use Only · Partner vial</div>
      </div>
    </div>
  );
}
