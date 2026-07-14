"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { cn } from "@/lib/cn";
import { collateralContract, perpsEngineContract } from "@/lib/contracts";

export function OrderTicket({
  symbol,
  price,
  marketKey,
  onPositionChanged,
}: {
  symbol: string;
  price: number;
  marketKey?: `0x${string}`;
  onPositionChanged?: () => void;
}) {
  const { address, isConnected } = useAccount();
  const [side, setSide] = useState<"long" | "short">("long");
  const [leverage, setLeverage] = useState(5);
  const [size, setSize] = useState("");

  const sizeNum = Number(size) || 0;
  const notional = sizeNum * leverage;
  const liquidationPrice = side === "long" ? price * (1 - 1 / leverage) : price * (1 + 1 / leverage);
  const estFee = notional * 0.0006;

  const collateralAmount = (() => {
    try {
      return size ? parseEther(size) : 0n;
    } catch {
      return 0n;
    }
  })();
  const sizeUsd = collateralAmount * BigInt(leverage);

  const collateralBalance = useReadContract({
    ...collateralContract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const allowance = useReadContract({
    ...collateralContract,
    functionName: "allowance",
    args: address ? [address, perpsEngineContract.address] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract, data: txHash, isPending: isWritePending, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isConfirmed) return;
    collateralBalance.refetch();
    allowance.refetch();
    resetWrite();
    onPositionChanged?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed]);

  const needsApproval = collateralAmount > 0n && ((allowance.data as bigint | undefined) ?? 0n) < collateralAmount;
  const busy = isWritePending || isConfirming;

  const mintTestCollateral = () =>
    writeContract({
      ...collateralContract,
      functionName: "mint",
      args: [address, parseEther("1000")],
    });

  const approve = () =>
    writeContract({
      ...collateralContract,
      functionName: "approve",
      args: [perpsEngineContract.address, collateralAmount],
    });

  const openPosition = () => {
    if (!marketKey) return;
    writeContract({
      ...perpsEngineContract,
      functionName: "openPosition",
      args: [marketKey, side === "long", sizeUsd, collateralAmount],
    });
    setSize("");
  };

  return (
    <aside className="glass-panel w-80 shrink-0 p-5">
      <div className="mb-4 text-sm font-semibold text-ink">{symbol}</div>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-white/10 p-1">
        <button
          onClick={() => setSide("long")}
          className={cn(
            "rounded-xl py-1.5 text-sm font-semibold transition-colors",
            side === "long" ? "bg-positive text-cloud" : "text-ink-soft"
          )}
        >
          Long
        </button>
        <button
          onClick={() => setSide("short")}
          className={cn(
            "rounded-xl py-1.5 text-sm font-semibold transition-colors",
            side === "short" ? "bg-negative text-cloud" : "text-ink-soft"
          )}
        >
          Short
        </button>
      </div>

      <div className="mb-1 flex items-center justify-between text-xs text-ink-soft">
        <span>Size (tPUSD collateral)</span>
        {isConnected && (
          <span>
            Balance: {collateralBalance.data !== undefined ? formatEther(collateralBalance.data as bigint) : "—"}
          </span>
        )}
      </div>
      <input
        value={size}
        onChange={(e) => setSize(e.target.value)}
        placeholder="0.00"
        className="mb-2 w-full rounded-2xl bg-white/10 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-soft"
      />
      {isConnected && (
        <button
          onClick={mintTestCollateral}
          disabled={busy}
          className="mb-4 text-xs text-ink-soft underline hover:text-ink disabled:opacity-50"
        >
          Get 1,000 test tPUSD (testnet faucet)
        </button>
      )}

      <label className="mb-1 flex justify-between text-xs text-ink-soft">
        <span>Leverage</span>
        <span className="text-ink">{leverage}x</span>
      </label>
      <input
        type="range"
        min={1}
        max={20}
        value={leverage}
        onChange={(e) => setLeverage(Number(e.target.value))}
        className="mb-4 w-full accent-primary"
      />

      <div className="mb-4 space-y-1.5 rounded-2xl bg-white/10 p-3 text-xs">
        <div className="flex justify-between text-ink-soft">
          <span>Notional</span>
          <span className="text-ink">${notional.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-ink-soft">
          <span>Est. liquidation price</span>
          <span className="text-ink">${liquidationPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-ink-soft">
          <span>Est. fee</span>
          <span className="text-ink">${estFee.toFixed(2)}</span>
        </div>
      </div>

      {!isConnected ? (
        <div className="rounded-2xl bg-white/10 py-2.5 text-center text-sm text-ink-soft">Connect wallet to trade</div>
      ) : !marketKey ? (
        <div className="rounded-2xl bg-white/10 py-2.5 text-center text-sm text-ink-soft">Market not tradeable yet</div>
      ) : (
        <button
          disabled={busy || collateralAmount === 0n}
          onClick={needsApproval ? approve : openPosition}
          className={cn(
            "w-full rounded-2xl py-2.5 text-sm font-semibold text-cloud shadow-glass-sm disabled:opacity-50",
            side === "long" ? "bg-positive" : "bg-negative"
          )}
        >
          {busy
            ? "Confirming…"
            : needsApproval
              ? "Approve tPUSD"
              : `${side === "long" ? "Open Long" : "Open Short"}`}
        </button>
      )}

      {txHash && (
        <a
          href={`https://explorer.testnet.chain.robinhood.com/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-center text-xs text-ink-soft underline"
        >
          View transaction ↗
        </a>
      )}
    </aside>
  );
}
