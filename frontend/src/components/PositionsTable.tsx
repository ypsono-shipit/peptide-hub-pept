"use client";

import { formatEther, formatUnits } from "viem";
import { cn } from "@/lib/cn";
import { getMarketByOracleKey } from "@/lib/markets";
import { useOraclePrice } from "@/lib/useOraclePrice";
import type { OnChainPosition } from "@/lib/usePositions";
import { COLLATERAL_DECIMALS } from "@/lib/deployments";
import { useNetworkConfig } from "@/lib/useAppContracts";

function PositionRow({
  position,
  onClose,
  closingId,
}: {
  position: OnChainPosition;
  onClose?: (id: bigint) => void;
  closingId?: bigint;
}) {
  const network = useNetworkConfig();
  const market = getMarketByOracleKey(position.marketKey);
  const entryPrice = Number(formatEther(position.entryPrice));
  const sizeUsd = Number(formatEther(position.sizeUsd));
  const collateral = Number(formatUnits(position.collateral, COLLATERAL_DECIMALS));
  const { price: markPrice } = useOraclePrice(position.marketKey, entryPrice);

  const direction = position.isLong ? 1 : -1;
  const pnl = entryPrice > 0 ? (direction * (markPrice - entryPrice) * sizeUsd) / entryPrice : 0;

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2 font-medium text-ink">{market?.symbol ?? "Unknown"}</td>
      <td className={cn("px-3 py-2 text-xs font-semibold", position.isLong ? "text-positive" : "text-negative")}>
        {position.isLong ? "LONG" : "SHORT"}
      </td>
      <td className="px-3 py-2 font-mono text-xs tabular-nums text-ink">
        {collateral.toLocaleString(undefined, { maximumFractionDigits: 2 })} {network.collateralSymbol}
      </td>
      <td className="px-3 py-2 font-mono text-xs tabular-nums text-ink">${entryPrice.toFixed(2)}</td>
      <td className="px-3 py-2 font-mono text-xs tabular-nums text-ink">${markPrice.toFixed(2)}</td>
      <td className={cn("px-3 py-2 font-mono text-xs tabular-nums", pnl >= 0 ? "text-positive" : "text-negative")}>
        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
      </td>
      <td className="px-3 py-2 text-right">
        {onClose && (
          <button
            onClick={() => onClose(position.id)}
            disabled={closingId === position.id}
            className="rounded-md bg-bg px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-panel-hover disabled:opacity-50"
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
      <div className="px-2 py-6 text-center text-sm text-muted">
        No open positions. Trades will appear here.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] text-muted">
            <th className="px-3 py-2 font-medium">Market</th>
            <th className="px-3 py-2 font-medium">Side</th>
            <th className="px-3 py-2 font-medium">Margin</th>
            <th className="px-3 py-2 font-medium">Entry</th>
            <th className="px-3 py-2 font-medium">Mark</th>
            <th className="px-3 py-2 font-medium">PnL</th>
            <th className="px-3 py-2 font-medium" />
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
