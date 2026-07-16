"use client";

import { useEffect, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { COLLATERAL_DECIMALS, PLP_SHARE_DECIMALS } from "@/lib/deployments";
import { useAppContracts, useNetworkConfig } from "@/lib/useAppContracts";
import { cn } from "@/lib/cn";

export function LiquidityPanel() {
  const { address, isConnected } = useAccount();
  const { collateral, plpToken, plpPool } = useAppContracts();
  const network = useNetworkConfig();
  const COLLATERAL_SYMBOL = network.collateralSymbol;
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const live = network.contractsLive;

  const parsed = (() => {
    try {
      // deposit: USDC/USDG (6); withdraw: PLP shares 1:1 with raw collateral units
      if (!amount) return 0n;
      return mode === "deposit"
        ? parseUnits(amount, COLLATERAL_DECIMALS)
        : parseUnits(amount, PLP_SHARE_DECIMALS);
    } catch {
      return 0n;
    }
  })();

  const usdcBal = useReadContract({
    ...collateral,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && live },
  });
  const plpBal = useReadContract({
    ...plpToken,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && live },
  });
  const totalAssets = useReadContract({
    ...plpPool,
    functionName: "totalAssets",
    query: { enabled: live },
  });
  const maxOi = useReadContract({
    ...plpPool,
    functionName: "maxOpenInterest",
    query: { enabled: live },
  });
  const oi = useReadContract({
    ...plpPool,
    functionName: "openInterestUsd",
    query: { enabled: live },
  });
  const available = useReadContract({
    ...plpPool,
    functionName: "availableAssets",
    query: { enabled: live },
  });
  const fees = useReadContract({
    ...plpPool,
    functionName: "totalFeesReceived",
    query: { enabled: live },
  });
  const profits = useReadContract({
    ...plpPool,
    functionName: "totalProfitsPaid",
    query: { enabled: live },
  });
  const losses = useReadContract({
    ...plpPool,
    functionName: "totalLossesReceived",
    query: { enabled: live },
  });
  const plpSupply = useReadContract({
    ...plpToken,
    functionName: "totalSupply",
    query: { enabled: live },
  });

  const allowance = useReadContract({
    ...collateral,
    functionName: "allowance",
    args: address ? [address, plpPool.address] : undefined,
    query: { enabled: !!address && live },
  });

  const previewDeposit = useReadContract({
    ...plpPool,
    functionName: "previewDeposit",
    args: [parsed],
    query: { enabled: live && mode === "deposit" && parsed > 0n },
  });
  const previewWithdraw = useReadContract({
    ...plpPool,
    functionName: "previewWithdraw",
    args: [parsed],
    query: { enabled: live && mode === "withdraw" && parsed > 0n },
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
      ? "; "
      : Number(formatUnits(v, COLLATERAL_DECIMALS)).toLocaleString(undefined, {
          maximumFractionDigits: 2,
        });
  const fmtPlp = (v: bigint | undefined) =>
    v === undefined
      ? "; "
      : Number(formatUnits(v, PLP_SHARE_DECIMALS)).toLocaleString(undefined, {
          maximumFractionDigits: 2,
        });
  const fmtUsd18 = (v: bigint | undefined) =>
    v === undefined
      ? "; "
      : Number(formatUnits(v, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 });

  const mintFaucet = () => {
    if (!address || !network.canMintCollateral) return;
    writeContract({
      ...collateral,
      functionName: "mint",
      args: [address, parseUnits("10000", COLLATERAL_DECIMALS)],
    });
  };

  const approve = () =>
    writeContract({
      ...collateral,
      functionName: "approve",
      args: [plpPool.address, parsed],
    });

  const deposit = () =>
    writeContract({
      ...plpPool,
      functionName: "deposit",
      args: [parsed],
    });

  const withdraw = () =>
    writeContract({
      ...plpPool,
      functionName: "withdraw",
      args: [parsed],
    });

  if (!live) {
    return (
      <div className="panel p-6 text-sm text-muted">
        Mainnet PLP contracts are not deployed yet. Switch to Testnet or wait for mainnet deploy.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Pool AUM (${COLLATERAL_SYMBOL})`} value={fmtUsdc(aum)} />
        <Stat label="Max OI (50% util)" value={`$${fmtUsd18(maxOpen)}`} />
        <Stat label="Open interest" value={`$${fmtUsd18(openInt)} (${utilPct.toFixed(1)}%)`} />
        <Stat label="Withdrawable" value={fmtUsdc(available.data as bigint | undefined)} />
        <Stat label="Fees to LPs" value={fmtUsdc(fees.data as bigint | undefined)} />
        <Stat label="Profits paid" value={fmtUsdc(profits.data as bigint | undefined)} />
        <Stat label="Losses received" value={fmtUsdc(losses.data as bigint | undefined)} />
        <Stat label="PLP supply" value={fmtPlp(plpSupply.data as bigint | undefined)} />
      </div>

      <div className="panel space-y-4 p-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Provide liquidity (PLP)</h2>
          <p className="mt-1 text-sm text-muted">
            Deposit {COLLATERAL_SYMBOL} to mint PLP. LPs backstop OI, earn fees and losses, pay
            trader profits.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-bg p-1">
          <button
            onClick={() => setMode("deposit")}
            className={cn(
              "rounded-md py-2 text-sm font-semibold",
              mode === "deposit" ? "bg-panel-hover text-ink" : "text-muted",
            )}
          >
            Deposit
          </button>
          <button
            onClick={() => setMode("withdraw")}
            className={cn(
              "rounded-md py-2 text-sm font-semibold",
              mode === "withdraw" ? "bg-panel-hover text-ink" : "text-muted",
            )}
          >
            Withdraw
          </button>
        </div>

        {!isConnected ? (
          <p className="text-sm text-muted">Connect a wallet to deposit or withdraw.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 text-xs text-muted">
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
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none placeholder:text-muted"
            />

            {parsed > 0n && (
              <p className="text-xs text-muted">
                {mode === "deposit"
                  ? `You receive ~${fmtPlp(previewDeposit.data as bigint | undefined)} PLP`
                  : `You receive ~${fmtUsdc(previewWithdraw.data as bigint | undefined)} ${COLLATERAL_SYMBOL}`}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {network.canMintCollateral && (
                <button
                  type="button"
                  onClick={mintFaucet}
                  disabled={busy}
                  className="rounded-lg border border-border bg-bg px-4 py-2 text-xs font-semibold text-ink hover:bg-panel-hover disabled:opacity-50"
                >
                  Mint 10k {COLLATERAL_SYMBOL}
                </button>
              )}
              {mode === "deposit" && needsApproval ? (
                <button
                  type="button"
                  onClick={approve}
                  disabled={busy || parsed === 0n}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
                >
                  {busy ? "Confirm…" : `Approve ${COLLATERAL_SYMBOL}`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={mode === "deposit" ? deposit : withdraw}
                  disabled={busy || parsed === 0n}
                  className="rounded-lg border border-ink bg-transparent px-4 py-2 text-xs font-semibold text-ink disabled:opacity-50"
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
    <div className="rounded-lg bg-bg px-3 py-2.5">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="font-mono text-sm font-semibold tabular-nums text-ink">{value}</div>
    </div>
  );
}
