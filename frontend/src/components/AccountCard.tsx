"use client";

import { formatUnits, parseUnits } from "viem";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useEffect } from "react";
import { COLLATERAL_DECIMALS } from "@/lib/deployments";
import { useAppContracts, useNetworkConfig } from "@/lib/useAppContracts";

export function AccountCard() {
  const { address, isConnected } = useAccount();
  const { collateral, plpPool } = useAppContracts();
  const network = useNetworkConfig();

  const bal = useReadContract({
    ...collateral,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && network.contractsLive },
  });
  const oi = useReadContract({
    ...plpPool,
    functionName: "openInterestUsd",
    query: { enabled: network.contractsLive },
  });

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess) return;
    bal.refetch();
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const usdc =
    bal.data !== undefined
      ? Number(formatUnits(bal.data as bigint, COLLATERAL_DECIMALS))
      : 0;

  return (
    <div className="rounded-xl border border-border bg-panel p-3">
      <div className="text-[10px] text-muted">Account Value</div>
      <div className="font-mono text-xl font-semibold tabular-nums text-ink">
        {isConnected
          ? `$${usdc.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
          : "; "}
      </div>
      <div className="mt-0.5 text-[11px] text-muted">
        Wallet {network.collateralSymbol}
        {isConnected ? "" : " · connect wallet"}
        {!network.contractsLive && isConnected ? " · mainnet deploy pending" : ""}
      </div>
      {network.contractsLive && (
        <div className="mt-2 space-y-1 border-t border-border pt-2 text-[11px] text-muted">
          <div className="flex justify-between">
            <span>Open interest</span>
            <span className="font-mono text-ink-soft">
              {oi.data !== undefined
                ? `$${Number(formatUnits(oi.data as bigint, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : "—"}
            </span>
          </div>
        </div>
      )}
      {isConnected && network.canMintCollateral && network.contractsLive && (
        <button
          disabled={isPending}
          onClick={() =>
            writeContract({
              ...collateral,
              functionName: "mint",
              args: [address, parseUnits("10000", COLLATERAL_DECIMALS)],
            })
          }
          className="mt-3 w-full rounded-lg border border-border bg-bg py-2 text-xs font-semibold text-ink hover:bg-panel-hover disabled:opacity-50"
        >
          {isPending ? "Minting…" : `Deposit / Mint ${network.collateralSymbol}`}
        </button>
      )}
      {isConnected && !network.canMintCollateral && (
        <p className="mt-3 text-[10px] leading-relaxed text-muted">
          Mainnet uses real {network.collateralSymbol} ({network.collateralName}). No faucet mint.
        </p>
      )}
    </div>
  );
}
