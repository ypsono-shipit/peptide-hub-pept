"use client";

export function VialHero({ symbol }: { symbol: string }) {
  return (
    <div className="relative flex min-h-[240px] flex-col overflow-hidden rounded-xl border border-border bg-panel">
      <div className="relative z-10 flex flex-1 items-center justify-center bg-black p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pept-vial.jpg"
          alt={`${symbol} research vial`}
          className="max-h-[240px] w-auto max-w-full object-contain"
        />
      </div>
      <div className="relative z-10 border-t border-border px-3 py-2 text-center">
        <div className="font-mono text-sm font-semibold tracking-tight text-ink">{symbol}</div>
        <div className="text-[10px] text-muted">Research Use Only</div>
      </div>
    </div>
  );
}
