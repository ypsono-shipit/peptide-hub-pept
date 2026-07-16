"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TopBar } from "@/components/TopBar";
import { PositionsTable } from "@/components/PositionsTable";
import { AccountCard } from "@/components/AccountCard";
import { MyVouchers } from "@/components/marketplace/MyVouchers";
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
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <div>
          <h1 className="text-lg font-semibold text-ink">Portfolio</h1>
          <p className="text-sm text-muted">
            Open perps positions and kit voucher NFTs on Robinhood testnet
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Positions</h2>
                  <p className="text-xs text-muted">Isolated-margin peptide perps</p>
                </div>
                <Link
                  href="/trade"
                  className="text-xs font-medium text-ink underline-offset-4 hover:underline"
                >
                  Trade →
                </Link>
              </div>
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
            </section>

            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Kit voucher NFTs</h2>
                  <p className="text-xs text-muted">
                    PEPT-KIT receipts from marketplace purchases — redeemable for physical kits
                  </p>
                </div>
                <Link
                  href="/marketplace"
                  className="text-xs font-medium text-ink underline-offset-4 hover:underline"
                >
                  Marketplace →
                </Link>
              </div>
              <MyVouchers
                title="Vial / kit NFTs"
                description="Each marketplace checkout mints a PEPT-KIT NFT to your wallet"
                compact={false}
              />
            </section>
          </div>

          <div className="space-y-3">
            <AccountCard />
          </div>
        </div>
      </div>
    </div>
  );
}
