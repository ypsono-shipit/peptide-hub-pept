"use client";

import { useState } from "react";
import { WatchlistSidebar } from "@/components/WatchlistSidebar";
import { ChartPanel } from "@/components/ChartPanel";
import { OrderTicket } from "@/components/OrderTicket";
import { PositionsTable, type Position } from "@/components/PositionsTable";
import { MOCK_MARKETS } from "@/lib/markets";
import { useOraclePrice } from "@/lib/useOraclePrice";

// Paper trading MVP (PRD §7 Phase 1): no persisted positions yet.
const MOCK_POSITIONS: Position[] = [];

export default function TradePage() {
  const [selected, setSelected] = useState(MOCK_MARKETS[0].symbol);
  const market = MOCK_MARKETS.find((m) => m.symbol === selected)!;
  const { price, isLive } = useOraclePrice(market.oracleKey, market.price);

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col">
      <div className="flex flex-1 overflow-hidden">
        <WatchlistSidebar selected={selected} onSelect={setSelected} />
        <div className="flex flex-1 flex-col">
          {isLive && (
            <div className="flex items-center gap-1.5 border-b border-border bg-panel px-4 py-1 text-xs text-long">
              <span className="h-1.5 w-1.5 rounded-full bg-long" />
              Live price from PeptideOracle on Robinhood Chain Testnet
            </div>
          )}
          <ChartPanel symbol={market.symbol} price={price} />
        </div>
        <OrderTicket symbol={market.symbol} price={price} />
      </div>
      <PositionsTable positions={MOCK_POSITIONS} />
    </div>
  );
}
