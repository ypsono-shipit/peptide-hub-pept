"use client";

import { useEffect, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { collateralContract, plpPoolContract, plpTokenContract } from "@/lib/contracts";
import { COLLATERAL_DECIMALS, COLLATERAL_SYMBOL } from "@/lib/deployments";
import { cn } from "@/lib/cn";

export function LiquidityPanel() {
  const { address, isConnected } = useAccount();
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");

  const parsed = (() => {
    try {
      // deposit: USDC units; withdraw: PLP is 18-dec shares
      if (!amount) return 0n;
      return mode === "deposit"
        ? parseUnits(amount, COLLATERAL_DECIMALS)
        : parseUnits(amount, 18);
    } catch {
      return 0n;
    }
  })();

  const usdcBal = useReadContract({
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
    usdcBal.refetch();
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
  const utilPct = maxOpen > 0n ? Number((openInt * 10_000n) / maxOpen) / 100 : 0;

  const fmtUsdc = (v: bigint | undefined) =>
    v === undefined
      ? "—"
      : Number(formatUnits(v, COLLATERAL_DECIMALS)).toLocaleString(undefined, {
          maximumFractionDigits: 2,
        });
  const fmtPlp = (v: bigint | undefined) =>
    v === undefined
      ? "—"
      : Number(formatUnits(v, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const fmtUsd18 = (v: bigint | undefined) =>
    v === undefined
      ? "—"
      : Number(formatUnits(v, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 });

  const mintFaucet = () => {
    if (!address) return;
    writeContract({
      ...collateralContract,
      functionName: "mint",
      args: [address, parseUnits("10000", COLLATERAL_DECIMALS)],
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

  return (
    <div className="space-y-5">
      <div className="glass-panel grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Pool AUM (${COLLATERAL_SYMBOL})`} value={fmtUsdc(aum)} />
        <Stat label="Max OI (50% util)" value={`$${fmtUsd18(maxOpen)}`} />
        <Stat label="Open interest" value={`$${fmtUsd18(openInt)} (${utilPct.toFixed(1)}%)`} />
        <Stat label="Withdrawable" value={fmtUsdc(available.data as bigint | undefined)} />
        <Stat label="Fees to LPs" value={fmtUsdc(fees.data as bigint | undefined)} />
        <Stat label="Profits paid" value={fmtUsdc(profits.data as bigint | undefined)} />
        <Stat label="Losses received" value={fmtUsdc(losses.data as bigint | undefined)} />
        <Stat label="PLP supply" value={fmtPlp(plpSupply.data as bigint | undefined)} />
      </div>

      <div className="glass-panel space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">Provide liquidity (PLP)</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Deposit testnet {COLLATERAL_SYMBOL} to mint PLP. LPs backstop perps open interest, earn
            fees and trader losses, and pay trader profits. Collateral is 6-decimal USDC on Robinhood
            testnet (public mint faucet).
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
                {COLLATERAL_SYMBOL}:{" "}
                <strong className="text-ink">{fmtUsdc(usdcBal.data as bigint | undefined)}</strong>
              </span>
              <span>
                PLP: <strong className="text-ink">{fmtPlp(plpBal.data as bigint | undefined)}</strong>
              </span>
            </div>

            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={mode === "deposit" ? `${COLLATERAL_SYMBOL} amount` : "PLP shares"}
              className="w-full rounded-2xl bg-white/40 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-soft"
            />

            {parsed > 0n && (
              <p className="text-xs text-ink-soft">
                {mode === "deposit"
                  ? `You receive ~${fmtPlp(previewDeposit.data as bigint | undefined)} PLP`
                  : `You receive ~${fmtUsdc(previewWithdraw.data as bigint | undefined)} ${COLLATERAL_SYMBOL}`}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={mintFaucet}
                disabled={busy}
                className="rounded-2xl bg-white/25 px-4 py-2 text-xs font-semibold text-ink hover:bg-white/35 disabled:opacity-50"
              >
                Mint 10k {COLLATERAL_SYMBOL}
              </button>
              {mode === "deposit" && needsApproval ? (
                <button
                  type="button"
                  onClick={approve}
                  disabled={busy || parsed === 0n}
                  className="rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-xs font-semibold text-cloud disabled:opacity-50"
                >
                  {busy ? "Confirm…" : `Approve ${COLLATERAL_SYMBOL}`}
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
