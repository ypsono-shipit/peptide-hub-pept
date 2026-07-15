"use client";

import { useEffect, useMemo } from "react";
import { formatUnits, keccak256, parseUnits, stringToBytes } from "viem";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { cn } from "@/lib/cn";
import { collateralContract, marketplaceShopContract } from "@/lib/contracts";
import { COLLATERAL_DECIMALS, COLLATERAL_SYMBOL } from "@/lib/deployments";
import type { Peptide } from "@/lib/marketplaceData";

export function productIdBytes(id: string): `0x${string}` {
  return keccak256(stringToBytes(id));
}

export function priceToUsdcRaw(priceUsd: number): bigint {
  // catalog prices are USD; USDC has 6 decimals on RH testnet
  return parseUnits(priceUsd.toFixed(2), COLLATERAL_DECIMALS);
}

export function BuyWithUsdc({
  peptide,
  className,
  size = "md",
  label,
}: {
  peptide: Peptide;
  className?: string;
  size?: "sm" | "md";
  label?: string;
}) {
  const { address, isConnected } = useAccount();
  const productId = useMemo(() => productIdBytes(peptide.id), [peptide.id]);
  const amount = useMemo(() => priceToUsdcRaw(peptide.priceFrom), [peptide.priceFrom]);

  const balance = useReadContract({
    ...collateralContract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const allowance = useReadContract({
    ...collateralContract,
    functionName: "allowance",
    args: address ? [address, marketplaceShopContract.address] : undefined,
    query: { enabled: !!address },
  });
  const onChainPrice = useReadContract({
    ...marketplaceShopContract,
    functionName: "priceOf",
    args: [productId],
  });
  const listed = useReadContract({
    ...marketplaceShopContract,
    functionName: "listed",
    args: [productId],
  });

  const { writeContract, data: txHash, isPending, reset, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isSuccess) return;
    balance.refetch();
    allowance.refetch();
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const bal = (balance.data as bigint | undefined) ?? 0n;
  const allw = (allowance.data as bigint | undefined) ?? 0n;
  const payAmount = (onChainPrice.data as bigint | undefined) && (onChainPrice.data as bigint) > 0n
    ? (onChainPrice.data as bigint)
    : amount;
  const isListed = listed.data === undefined ? true : Boolean(listed.data);
  const needsApproval = allw < payAmount;
  const needsFunds = bal < payAmount;
  const busy = isPending || confirming;

  const mint = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!address) return;
    writeContract({
      ...collateralContract,
      functionName: "mint",
      args: [address, parseUnits("10000", COLLATERAL_DECIMALS)],
    });
  };

  const approve = (e: React.MouseEvent) => {
    e.stopPropagation();
    writeContract({
      ...collateralContract,
      functionName: "approve",
      args: [marketplaceShopContract.address, payAmount],
    });
  };

  const buy = (e: React.MouseEvent) => {
    e.stopPropagation();
    writeContract({
      ...marketplaceShopContract,
      functionName: "purchase",
      args: [productId, 1n],
    });
  };

  const base =
    size === "sm"
      ? "rounded-2xl px-3.5 py-2 text-xs font-semibold"
      : "rounded-2xl px-4 py-2.5 text-sm font-semibold";

  if (!peptide.inStock) {
    return (
      <button type="button" disabled className={cn(base, "bg-panel text-muted opacity-60", className)}>
        Out of stock
      </button>
    );
  }

  if (!isConnected) {
    return (
      <button
        type="button"
        disabled
        className={cn(base, "bg-panel text-muted", className)}
        title="Connect wallet to buy with USDC"
      >
        Connect to buy
      </button>
    );
  }

  if (!isListed) {
    return (
      <button type="button" disabled className={cn(base, "bg-panel text-muted", className)}>
        Not listed
      </button>
    );
  }

  if (needsFunds) {
    return (
      <button
        type="button"
        onClick={mint}
        disabled={busy}
        className={cn(base, "bg-primary text-on-primary hover:bg-accent disabled:opacity-50", className)}
      >
        {busy ? "Confirming…" : `Mint test ${COLLATERAL_SYMBOL}`}
      </button>
    );
  }

  if (needsApproval) {
    return (
      <button
        type="button"
        onClick={approve}
        disabled={busy}
        className={cn(base, "bg-primary text-on-primary hover:bg-accent disabled:opacity-50", className)}
      >
        {busy ? "Confirming…" : `Approve ${COLLATERAL_SYMBOL}`}
      </button>
    );
  }

  return (
    <div className={cn("flex flex-col items-stretch gap-1", className)} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={buy}
        disabled={busy || payAmount === 0n}
        className={cn(base, "bg-primary text-on-primary hover:bg-accent disabled:opacity-50")}
      >
        {busy
          ? "Confirming…"
          : label ??
            `Buy · ${formatUnits(payAmount, COLLATERAL_DECIMALS)} ${COLLATERAL_SYMBOL}`}
      </button>
      {txHash && (
        <a
          href={`https://explorer.testnet.chain.robinhood.com/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="text-center text-[10px] text-muted underline"
          onClick={(e) => e.stopPropagation()}
        >
          View tx ↗
        </a>
      )}
      {error && (
        <span className="text-center text-[10px] text-negative">
          {(error as Error).message?.slice(0, 80) || "Tx failed"}
        </span>
      )}
    </div>
  );
}
