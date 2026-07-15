"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { collateralContract, plpPoolContract, plpTokenContract } from "@/lib/contracts";
import { cn } from "@/lib/cn";

export function LiquidityPanel() {
  const { address, isConnected } = useAccount();
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");

  const parsed = (() => {
    try {
      return amount ? parseEther(amount) : 0n;
    } catch {
      return 0n;
    }
  })();

  const tpusdBal = useReadContract({
    ...collateralContract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const plpBal = useReadContract({
    ...plpTokenContract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const totalAssets = useReadContract({ ...plpPoolContract, functionName: "totalAssets" });
  const maxOi = useReadContract({ ...plpPoolContract, functionName: "maxOpenInterest" });
  const oi = useReadContract({ ...plpPoolContract, functionName: "openInterestUsd" });
  const available = useReadContract({ ...plpPoolContract, functionName: "availableAssets" });
  const fees = useReadContract({ ...plpPoolContract, functionName: "totalFeesReceived" });
  const profits = useReadContract({ ...plpPoolContract, functionName: "totalProfitsPaid" });
  const losses = useReadContract({ ...plpPoolContract, functionName: "totalLossesReceived" });
  const plpSupply = useReadContract({ ...plpTokenContract, functionName: "totalSupply" });

  const allowance = useReadContract({
    ...collateralContract,
    functionName: "allowance",
    args: address ? [address, plpPoolContract.address] : undefined,
    query: { enabled: !!address },
  });

  const previewDeposit = useReadContract({
    ...plpPoolContract,
    functionName: "previewDeposit",
    args: [parsed],
    query: { enabled: mode === "deposit" && parsed > 0n },
  });
  const previewWithdraw = useReadContract({
    ...plpPoolContract,
    functionName: "previewWithdraw",
    args: [parsed],
    query: { enabled: mode === "withdraw" && parsed > 0n },
  });

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isSuccess) return;
    tpusdBal.refetch();
    plpBal.refetch();
    totalAssets.refetch();
    maxOi.refetch();
    oi.refetch();
    available.refetch();
    fees.refetch();
    plpSupply.refetch();
    allowance.refetch();
    reset();
    setAmount("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const needsApproval =
    mode === "deposit" && parsed > 0n && ((allowance.data as bigint | undefined) ?? 0n) < parsed;
  const busy = isPending || confirming;

  const aum = (totalAssets.data as bigint | undefined) ?? 0n;
  const openInt = (oi.data as bigint | undefined) ?? 0n;
  const maxOpen = (maxOi.data as bigint | undefined) ?? 0n;
  const utilPct =
    maxOpen > 0n ? Number((openInt * 10_000n) / maxOpen) / 100 : 0;

  const mintFaucet = () => {
    if (!address) return;
    writeContract({
      ...collateralContract,
      functionName: "mint",
      args: [address, parseEther("10000")],
    });
  };

  const approve = () =>
    writeContract({
      ...collateralContract,
      functionName: "approve",
      args: [plpPoolContract.address, parsed],
    });

  const deposit = () =>
    writeContract({
      ...plpPoolContract,
      functionName: "deposit",
      args: [parsed],
    });

  const withdraw = () =>
    writeContract({
      ...plpPoolContract,
      functionName: "withdraw",
      args: [parsed],
    });

  const fmt = (v: bigint | undefined) =>
    v === undefined ? "—" : Number(formatEther(v)).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="space-y-5">
      <div className="glass-panel grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pool AUM (tPUSD)" value={fmt(aum)} />
        <Stat label="Max OI (50% util)" value={fmt(maxOpen as bigint)} />
        <Stat label="Open interest" value={`${fmt(openInt)} (${utilPct.toFixed(1)}%)`} />
        <Stat label="Withdrawable" value={fmt(available.data as bigint | undefined)} />
        <Stat label="Fees to LPs" value={fmt(fees.data as bigint | undefined)} />
        <Stat label="Profits paid" value={fmt(profits.data as bigint | undefined)} />
        <Stat label="Losses received" value={fmt(losses.data as bigint | undefined)} />
        <Stat label="PLP supply" value={fmt(plpSupply.data as bigint | undefined)} />
      </div>

      <div className="glass-panel space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">Provide liquidity (PLP)</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Deposit tPUSD to mint PLP shares. LPs backstop perps open interest, earn trading fees and
            trader losses, and pay trader profits (GMX-style). Withdrawals are limited while risk is
            open.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white/30 p-1">
          <button
            onClick={() => setMode("deposit")}
            className={cn(
              "rounded-xl py-2 text-sm font-semibold",
              mode === "deposit" ? "bg-white/50 text-ink" : "text-ink-soft",
            )}
          >
            Deposit
          </button>
          <button
            onClick={() => setMode("withdraw")}
            className={cn(
              "rounded-xl py-2 text-sm font-semibold",
              mode === "withdraw" ? "bg-white/50 text-ink" : "text-ink-soft",
            )}
          >
            Withdraw
          </button>
        </div>

        {!isConnected ? (
          <p className="text-sm text-ink-soft">Connect a wallet to deposit or withdraw.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 text-xs text-ink-soft">
              <span>
                tPUSD balance:{" "}
                <strong className="text-ink">{fmt(tpusdBal.data as bigint | undefined)}</strong>
              </span>
              <span>
                Your PLP: <strong className="text-ink">{fmt(plpBal.data as bigint | undefined)}</strong>
              </span>
            </div>

            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={mode === "deposit" ? "tPUSD amount" : "PLP shares"}
              className="w-full rounded-2xl bg-white/40 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-soft"
            />

            {parsed > 0n && (
              <p className="text-xs text-ink-soft">
                {mode === "deposit"
                  ? `You receive ~${fmt(previewDeposit.data as bigint | undefined)} PLP`
                  : `You receive ~${fmt(previewWithdraw.data as bigint | undefined)} tPUSD`}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={mintFaucet}
                disabled={busy}
                className="rounded-2xl bg-white/25 px-4 py-2 text-xs font-semibold text-ink hover:bg-white/35 disabled:opacity-50"
              >
                Faucet 10k tPUSD
              </button>
              {mode === "deposit" && needsApproval ? (
                <button
                  type="button"
                  onClick={approve}
                  disabled={busy || parsed === 0n}
                  className="rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-xs font-semibold text-cloud disabled:opacity-50"
                >
                  {busy ? "Confirm…" : "Approve tPUSD"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={mode === "deposit" ? deposit : withdraw}
                  disabled={busy || parsed === 0n}
                  className="rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-xs font-semibold text-cloud disabled:opacity-50"
                >
                  {busy ? "Confirm…" : mode === "deposit" ? "Deposit" : "Withdraw"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/25 px-3 py-2.5">
      <div className="text-[11px] text-ink-soft">{label}</div>
      <div className="text-sm font-semibold tabular-nums text-ink">{value}</div>
    </div>
  );
}
