"use client";

import { formatEther } from "viem";
import { cn } from "@/lib/cn";
import { getMarketByOracleKey } from "@/lib/markets";
import { useOraclePrice } from "@/lib/useOraclePrice";
import type { OnChainPosition } from "@/lib/usePositions";

function PositionRow({
  position,
  onClose,
  closingId,
}: {
  position: OnChainPosition;
  onClose?: (id: bigint) => void;
  closingId?: bigint;
}) {
  const market = getMarketByOracleKey(position.marketKey);
  const entryPrice = Number(formatEther(position.entryPrice));
  const sizeUsd = Number(formatEther(position.sizeUsd));
  const collateral = Number(formatEther(position.collateral));
  const { price: markPrice } = useOraclePrice(position.marketKey, entryPrice);

  const direction = position.isLong ? 1 : -1;
  const pnl = entryPrice > 0 ? (direction * (markPrice - entryPrice) * sizeUsd) / entryPrice : 0;

  return (
    <tr className="border-b border-glass-border/60 last:border-0">
      <td className="px-4 py-2 font-medium text-ink">{market?.symbol ?? "Unknown"}</td>
      <td className={cn("px-4 py-2", position.isLong ? "text-positive" : "text-negative")}>
        {position.isLong ? "LONG" : "SHORT"}
      </td>
      <td className="px-4 py-2 tabular-nums text-ink">${collateral.toLocaleString()}</td>
      <td className="px-4 py-2 tabular-nums text-ink">${entryPrice.toFixed(2)}</td>
      <td className="px-4 py-2 tabular-nums text-ink">${markPrice.toFixed(2)}</td>
      <td className="px-4 py-2 tabular-nums text-ink-soft">—</td>
      <td className={cn("px-4 py-2 tabular-nums", pnl >= 0 ? "text-positive" : "text-negative")}>
        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
      </td>
      <td className="px-4 py-2 text-right">
        {onClose && (
          <button
            onClick={() => onClose(position.id)}
            disabled={closingId === position.id}
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-ink hover:bg-white/20 disabled:opacity-50"
          >
            {closingId === position.id ? "Closing…" : "Close"}
          </button>
        )}
      </td>
    </tr>
  );
}

export function PositionsTable({
  positions,
  onClose,
  closingId,
}: {
  positions: OnChainPosition[];
  onClose?: (id: bigint) => void;
  closingId?: bigint;
}) {
  if (positions.length === 0) {
    return (
      <div className="glass-panel px-4 py-6 text-center text-sm text-ink-soft">
        No open positions. Trades will appear here.
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-glass-border text-left text-xs text-ink-soft">
            <th className="px-4 py-2 font-medium">Market</th>
            <th className="px-4 py-2 font-medium">Side</th>
            <th className="px-4 py-2 font-medium">Collateral</th>
            <th className="px-4 py-2 font-medium">Entry</th>
            <th className="px-4 py-2 font-medium">Mark</th>
            <th className="px-4 py-2 font-medium">Funding</th>
            <th className="px-4 py-2 font-medium">PnL</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <PositionRow key={p.id.toString()} position={p} onClose={onClose} closingId={closingId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
