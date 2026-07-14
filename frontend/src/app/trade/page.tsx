"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { WatchlistSidebar } from "@/components/WatchlistSidebar";
import { ChartPanel } from "@/components/ChartPanel";
import { OrderTicket } from "@/components/OrderTicket";
import { PositionsTable } from "@/components/PositionsTable";
import { MOCK_MARKETS } from "@/lib/markets";
import { useOraclePrice } from "@/lib/useOraclePrice";
import { usePositions } from "@/lib/usePositions";
import { perpsEngineContract } from "@/lib/contracts";

export default function TradePage() {
  const [selected, setSelected] = useState(MOCK_MARKETS[0].symbol);
  const market = MOCK_MARKETS.find((m) => m.symbol === selected)!;
  const { price, isLive } = useOraclePrice(market.oracleKey, market.price);

  const { address } = useAccount();
  const { positions, refetch } = usePositions(address);

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

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-1 gap-5 overflow-hidden">
        <WatchlistSidebar selected={selected} onSelect={setSelected} />
        <div className="flex flex-1 flex-col gap-5">
          {isLive && (
            <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-positive">
              <span className="h-1.5 w-1.5 rounded-full bg-positive" />
              Live price from PeptideOracle on Robinhood Chain Testnet
            </div>
          )}
          <ChartPanel symbol={market.symbol} price={price} />
        </div>
        <OrderTicket symbol={market.symbol} price={price} marketKey={market.oracleKey} onPositionChanged={refetch} />
      </div>
      <PositionsTable positions={positions} onClose={handleClose} closingId={closingId} />
    </div>
  );
}
