"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TopBar } from "@/components/TopBar";
import { PositionsTable } from "@/components/PositionsTable";
import { AccountCard } from "@/components/AccountCard";
import { usePositions } from "@/lib/usePositions";
import { perpsEngineContract } from "@/lib/contracts";
import { Panel } from "@/components/ui/Panel";

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { positions, refetch } = usePositions(address);
  const [closingId, setClosingId] = useState<bigint | undefined>();
  const { writeContract, data: hash } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  if (isSuccess && closingId !== undefined) {
    setClosingId(undefined);
    refetch();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar />
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <h1 className="text-lg font-semibold text-ink">Positions</h1>
          <p className="text-sm text-muted">Open perps positions on Robinhood testnet</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
          <Panel className="p-4">
            {!isConnected ? (
              <p className="text-sm text-muted">Connect a wallet to view positions.</p>
            ) : (
              <PositionsTable
                positions={positions}
                onClose={(id) => {
                  setClosingId(id);
                  writeContract({
                    ...perpsEngineContract,
                    functionName: "closePosition",
                    args: [id],
                  });
                }}
                closingId={closingId}
              />
            )}
          </Panel>
          <AccountCard />
        </div>
      </div>
    </div>
  );
}
