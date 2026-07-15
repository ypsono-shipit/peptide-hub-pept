"use client";

import { Panel } from "@/components/ui/Panel";

export function MarketStatsRow({
  openInterestLabel,
}: {
  openInterestLabel?: string;
}) {
  const cells = [
    { label: "Open Interest", value: openInterestLabel ?? "—", note: "from PLP / engine" },
    { label: "24H Volume", value: "Demo", note: "not on-chain yet" },
    { label: "Liquidation (24H)", value: "Demo", note: "not on-chain yet" },
    { label: "Long / Short (24H)", value: "—", note: "not tracked" },
    { label: "Funding / 8h", value: "0.01%", note: "placeholder" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {cells.map((c) => (
        <Panel key={c.label} className="px-3 py-2.5">
          <div className="text-[10px] text-muted">{c.label}</div>
          <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-ink">{c.value}</div>
          <div className="text-[9px] text-faint">{c.note}</div>
        </Panel>
      ))}
    </div>
  );
}
