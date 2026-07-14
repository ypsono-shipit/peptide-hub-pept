"use client";

import { useState } from "react";
import { WatchlistSidebar } from "@/components/WatchlistSidebar";
import { ChartPanel } from "@/components/ChartPanel";
import { OrderTicket } from "@/components/OrderTicket";
import { PositionsTable, type Position } from "@/components/PositionsTable";
import { MOCK_MARKETS } from "@/lib/markets";

// Paper trading MVP (PRD §7 Phase 1): no persisted positions yet.
const MOCK_POSITIONS: Position[] = [];

export default function TradePage() {
  const [selected, setSelected] = useState(MOCK_MARKETS[0].symbol);
  const market = MOCK_MARKETS.find((m) => m.symbol === selected)!;

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col">
      <div className="flex flex-1 overflow-hidden">
        <WatchlistSidebar selected={selected} onSelect={setSelected} />
        <ChartPanel symbol={market.symbol} price={market.price} />
        <OrderTicket symbol={market.symbol} price={market.price} />
      </div>
      <PositionsTable positions={MOCK_POSITIONS} />
    </div>
  );
}
