"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TopBar } from "@/components/TopBar";
import { ChartPanel } from "@/components/ChartPanel";
import { OrderTicket } from "@/components/OrderTicket";
import { PositionsTable } from "@/components/PositionsTable";
import { VialHero } from "@/components/VialHero";
import { MarketStatsRow } from "@/components/MarketStatsRow";
import { MarketplaceStrip } from "@/components/MarketplaceStrip";
import { AccountCard } from "@/components/AccountCard";
import { MOCK_MARKETS } from "@/lib/markets";
import { useOraclePrice } from "@/lib/useOraclePrice";
import { usePositions } from "@/lib/usePositions";
import { perpsEngineContract } from "@/lib/contracts";
import { cn } from "@/lib/cn";
import { formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { plpPoolContract } from "@/lib/contracts";

const TRADEABLE = MOCK_MARKETS.filter((m) => m.oracleKey && !m.comingSoon);

export default function TradePage() {
  const [selected, setSelected] = useState(
    TRADEABLE.find((m) => m.symbol === "SEMA-PERP")?.symbol ?? TRADEABLE[0]!.symbol,
  );
  const market = MOCK_MARKETS.find((m) => m.symbol === selected) ?? TRADEABLE[0]!;
  const { price, isLive } = useOraclePrice(market.oracleKey, market.price);
  const { address } = useAccount();
  const { positions, refetch } = usePositions(address);

  const oi = useReadContract({ ...plpPoolContract, functionName: "openInterestUsd" });

  const [closingId, setClosingId] = useState<bigint | undefined>();
  const { writeContract, data: closeTxHash } = useWriteContract();
  const { isSuccess: closeConfirmed } = useWaitForTransactionReceipt({ hash: closeTxHash });

  if (closeConfirmed && closingId !== undefined) {
    setClosingId(undefined);
    refetch();
  }

  const handleClose = (id: bigint) => {
    setClosingId(id);
    writeContract({ ...perpsEngineContract, functionName: "closePosition", args: [id] });
  };

  const oiLabel =
    oi.data !== undefined
      ? `$${Number(formatUnits(oi.data as bigint, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar market={market} price={price} isLive={isLive} />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex-row lg:overflow-hidden">
        {/* Center column */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:overflow-y-auto">
          {/* Market tabs */}
          <div className="flex flex-wrap gap-1">
            {TRADEABLE.map((m) => (
              <button
                key={m.symbol}
                onClick={() => setSelected(m.symbol)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-medium",
                  selected === m.symbol
                    ? "bg-panel-hover text-ink"
                    : "text-muted hover:bg-panel hover:text-ink-soft",
                )}
              >
                {m.symbol}
              </button>
            ))}
          </div>

          <div className="grid min-h-[320px] gap-3 lg:grid-cols-[1fr_220px]">
            <ChartPanel symbol={market.symbol} price={price} unit={market.unit} />
            <VialHero symbol={market.symbol.replace("-PERP", "")} />
          </div>

          <MarketStatsRow openInterestLabel={oiLabel} />
          <MarketplaceStrip />

          <div className="rounded-xl border border-border bg-panel p-3">
            <h3 className="mb-2 text-xs font-semibold text-ink">Open positions</h3>
            <PositionsTable positions={positions} onClose={handleClose} closingId={closingId} />
          </div>
        </div>

        {/* Right column */}
        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[320px] lg:overflow-y-auto">
          <AccountCard />
          <OrderTicket
            symbol={market.symbol}
            price={price}
            marketKey={market.oracleKey}
            unit={market.unit}
            onPositionChanged={refetch}
          />
        </div>
      </div>
    </div>
  );
}
