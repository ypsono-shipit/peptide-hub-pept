"use client";

import { formatEther } from "viem";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState } from "react";
import { PositionsTable } from "@/components/PositionsTable";
import { GlassCard } from "@/components/ui/GlassCard";
import { stakingContract, collateralContract, perpsEngineContract } from "@/lib/contracts";
import { usePositions } from "@/lib/usePositions";

export default function PortfolioPage() {
  const { address } = useAccount();
  const { positions, refetch } = usePositions(address);

  const staked = useReadContract({
    ...stakingContract,
    functionName: "stakedOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const collateralBalance = useReadContract({
    ...collateralContract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

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
    <div className="p-2">
      <h1 className="mb-4 text-xl font-semibold tracking-tight text-ink">Portfolio</h1>
      <div className="mb-6 grid grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="text-xs text-ink-soft">tPUSD Balance</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-ink">
            {collateralBalance.data !== undefined ? Number(formatEther(collateralBalance.data as bigint)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"}
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="text-xs text-ink-soft">Staked $PEPT</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-ink">
            {staked.data !== undefined ? Number(formatEther(staked.data as bigint)).toFixed(2) : "0"}
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="text-xs text-ink-soft">Bonded Stock Tokens</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-ink">$0</div>
        </GlassCard>
      </div>
      <PositionsTable positions={positions} onClose={handleClose} closingId={closingId} />
    </div>
  );
}
