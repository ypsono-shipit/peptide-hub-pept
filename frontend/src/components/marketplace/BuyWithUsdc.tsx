"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits, keccak256, parseUnits, stringToBytes } from "viem";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { cn } from "@/lib/cn";
import { COLLATERAL_DECIMALS } from "@/lib/deployments";
import { useAppContracts, useNetworkConfig } from "@/lib/useAppContracts";
import type { Peptide } from "@/lib/marketplaceData";

export function productIdBytes(id: string): `0x${string}` {
  return keccak256(stringToBytes(id));
}

export function priceToUsdcRaw(priceUsd: number): bigint {
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
  const { collateral, marketplaceShop, peptideVoucher, network } = useAppContracts();
  const COLLATERAL_SYMBOL = network.collateralSymbol;
  const productId = useMemo(() => productIdBytes(peptide.id), [peptide.id]);
  const amount = useMemo(() => priceToUsdcRaw(peptide.priceFrom), [peptide.priceFrom]);
  const [lastSuccess, setLastSuccess] = useState(false);
  const live = network.contractsLive;

  const balance = useReadContract({
    ...collateral,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && live },
  });
  const allowance = useReadContract({
    ...collateral,
    functionName: "allowance",
    args: address ? [address, marketplaceShop.address] : undefined,
    query: { enabled: !!address && live },
  });
  const onChainPrice = useReadContract({
    ...marketplaceShop,
    functionName: "priceOf",
    args: [productId],
    query: { enabled: live },
  });
  const listed = useReadContract({
    ...marketplaceShop,
    functionName: "listed",
    args: [productId],
    query: { enabled: live },
  });

  const { writeContract, data: txHash, isPending, reset, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isSuccess) return;
    balance.refetch();
    allowance.refetch();
    setLastSuccess(true);
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const bal = (balance.data as bigint | undefined) ?? 0n;
  const allw = (allowance.data as bigint | undefined) ?? 0n;
  const payAmount =
    (onChainPrice.data as bigint | undefined) && (onChainPrice.data as bigint) > 0n
      ? (onChainPrice.data as bigint)
      : amount;
  const isListed = listed.data === undefined ? true : Boolean(listed.data);
  const needsApproval = allw < payAmount;
  const needsFunds = bal < payAmount;
  const busy = isPending || confirming;

  const mint = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!address || !network.canMintCollateral) return;
    setLastSuccess(false);
    writeContract({
      ...collateral,
      functionName: "mint",
      args: [address, parseUnits("10000", COLLATERAL_DECIMALS)],
    });
  };

  const approve = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLastSuccess(false);
    writeContract({
      ...collateral,
      functionName: "approve",
      args: [marketplaceShop.address, payAmount],
    });
  };

  const buy = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLastSuccess(false);
    writeContract({
      ...marketplaceShop,
      functionName: "purchase",
      args: [productId, 1n],
    });
  };

  const base =
    size === "sm"
      ? "whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold"
      : "whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold";

  if (!live) {
    return (
      <button type="button" disabled className={cn(base, "bg-panel text-muted", className)}>
        Mainnet soon
      </button>
    );
  }

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
        title={`Connect wallet to buy with ${COLLATERAL_SYMBOL}`}
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
    if (!network.canMintCollateral) {
      return (
        <button type="button" disabled className={cn(base, "bg-panel text-muted", className)}>
          Need {COLLATERAL_SYMBOL}
        </button>
      );
    }
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
          ? "Minting voucher…"
          : label ??
            `Buy NFT · ${formatUnits(payAmount, COLLATERAL_DECIMALS)} ${COLLATERAL_SYMBOL}`}
      </button>
      {lastSuccess && (
        <span className="text-center text-[10px] text-ink">
          Kit voucher NFT minted · redeem later for physical kit
        </span>
      )}
      {txHash && (
        <a
          href={`${network.explorer}/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="text-center text-[10px] text-muted underline"
          onClick={(e) => e.stopPropagation()}
        >
          View tx ↗
        </a>
      )}
      {lastSuccess && (
        <a
          href={`${network.explorer}/token/${peptideVoucher.address}`}
          target="_blank"
          rel="noreferrer"
          className="text-center text-[10px] text-muted underline"
          onClick={(e) => e.stopPropagation()}
        >
          Voucher contract ↗
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
