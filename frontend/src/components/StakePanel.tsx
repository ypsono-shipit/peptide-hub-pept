"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { peptContract, stakingContract } from "@/lib/contracts";

export function StakePanel() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const parsedAmount = (() => {
    try {
      return amount ? parseEther(amount) : 0n;
    } catch {
      return 0n;
    }
  })();

  const peptBalance = useReadContract({
    ...peptContract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const staked = useReadContract({
    ...stakingContract,
    functionName: "stakedOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const pendingReward = useReadContract({
    ...stakingContract,
    functionName: "pendingReward",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const allowance = useReadContract({
    ...peptContract,
    functionName: "allowance",
    args: address ? [address, stakingContract.address] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract, data: txHash, isPending: isWritePending, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isConfirmed) return;
    peptBalance.refetch();
    staked.refetch();
    pendingReward.refetch();
    allowance.refetch();
    resetWrite();
    setAmount("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed]);

  const needsApproval = parsedAmount > 0n && ((allowance.data as bigint | undefined) ?? 0n) < parsedAmount;
  const busy = isWritePending || isConfirming;

  const approve = () =>
    writeContract({
      ...peptContract,
      functionName: "approve",
      args: [stakingContract.address, parsedAmount],
    });

  const stake = () =>
    writeContract({
      ...stakingContract,
      functionName: "stake",
      args: [parsedAmount],
    });

  const unstake = () =>
    writeContract({
      ...stakingContract,
      functionName: "unstake",
      args: [parsedAmount],
    });

  const claim = () => writeContract({ ...stakingContract, functionName: "claim", args: [] });

  if (!isConnected) {
    return (
      <div className="space-y-4 rounded-md border border-border bg-panel p-4">
        <p className="text-sm text-text-secondary">Connect a wallet to stake $PEPT on Robinhood Chain Testnet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border border-border bg-panel p-4">
      <p className="text-sm text-text-secondary">
        Earn real yield from perps trading fees and Treasury returns. No lockup.
      </p>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="rounded-md bg-surface p-2">
          <div className="text-text-secondary">Wallet PEPT</div>
          <div className="mt-1 tabular-nums">
            {peptBalance.data !== undefined ? formatEther(peptBalance.data as bigint) : "—"}
          </div>
        </div>
        <div className="rounded-md bg-surface p-2">
          <div className="text-text-secondary">Staked</div>
          <div className="mt-1 tabular-nums">{staked.data !== undefined ? formatEther(staked.data as bigint) : "—"}</div>
        </div>
        <div className="rounded-md bg-surface p-2">
          <div className="text-text-secondary">Pending Reward</div>
          <div className="mt-1 tabular-nums">
            {pendingReward.data !== undefined ? formatEther(pendingReward.data as bigint) : "—"}
          </div>
        </div>
      </div>

      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount of PEPT"
        className="w-full rounded-md bg-surface px-3 py-2 text-sm outline-none"
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={busy || parsedAmount === 0n}
          onClick={needsApproval ? approve : stake}
          className="rounded-md bg-accent py-2.5 text-sm font-semibold text-surface disabled:opacity-50"
        >
          {busy ? "Confirming…" : needsApproval ? "Approve" : "Stake"}
        </button>
        <button
          disabled={busy || parsedAmount === 0n}
          onClick={unstake}
          className="rounded-md bg-surface py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          Unstake
        </button>
      </div>

      <button
        disabled={busy || !pendingReward.data || (pendingReward.data as bigint) === 0n}
        onClick={claim}
        className="w-full rounded-md bg-surface py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        Claim Reward
      </button>

      {txHash && (
        <a
          href={`https://explorer.testnet.chain.robinhood.com/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="block text-center text-xs text-text-secondary underline"
        >
          View transaction ↗
        </a>
      )}
    </div>
  );
}
