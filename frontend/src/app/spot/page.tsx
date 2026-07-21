"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useAccount,
  useConnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits, maxUint256 } from "viem";
import { ArrowDownUp, ExternalLink, FlaskConical, Info, Coins } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { AccountCard } from "@/components/AccountCard";
import { ChartPanel } from "@/components/ChartPanel";
import { cn } from "@/lib/cn";
import { useOraclePrice } from "@/lib/useOraclePrice";
import { useNetworkConfig } from "@/lib/useAppContracts";
import {
  SPOT_MAINNET,
  SPOT_TESTNET,
  DIVERGENCE_WARN_BPS,
  divergenceBps,
  LP_POINTS_PER_USDG,
  MONTHLY_KIT_CAP,
} from "@/lib/spot";
import { MOCK_MARKETS } from "@/lib/markets";
import { ERC20_ABI, UNI_V2_PAIR_ABI, UNI_V2_ROUTER_ABI } from "@/lib/uniswap-v2";
import { SEMA_PER_KIT } from "@/lib/redeem/constants";

const ZERO = "0x0000000000000000000000000000000000000000";

export default function SpotPage() {
  const network = useNetworkConfig();
  const pairCfg = network.testnet ? SPOT_TESTNET : SPOT_MAINNET;
  const seMarket = MOCK_MARKETS.find((m) => m.symbol === "SEMA-PERP")!;
  const { price: oraclePrice, isLive } = useOraclePrice(pairCfg.oracleKey, seMarket.price);
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  const live =
    pairCfg.live &&
    pairCfg.baseToken !== ZERO &&
    pairCfg.pair !== ZERO &&
    pairCfg.router !== ZERO;

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amountIn, setAmountIn] = useState("");
  const [slippageBps, setSlippageBps] = useState(100); // 1%
  /** Tracks which write is in flight so approve → swap handoff works. */
  const [pendingAction, setPendingAction] = useState<"approve" | "swap" | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [readyToSwap, setReadyToSwap] = useState(false);

  const { data: reserves } = useReadContract({
    address: pairCfg.pair,
    abi: UNI_V2_PAIR_ABI,
    functionName: "getReserves",
    query: { enabled: live, refetchInterval: 15_000 },
  });
  const { data: token0 } = useReadContract({
    address: pairCfg.pair,
    abi: UNI_V2_PAIR_ABI,
    functionName: "token0",
    query: { enabled: live },
  });

  const poolPrice = useMemo(() => {
    if (!live || !reserves || !token0) {
      return oraclePrice > 0 ? oraclePrice * 1.012 : 0;
    }
    const [r0, r1] = reserves as readonly [bigint, bigint, number];
    const baseIs0 = (token0 as string).toLowerCase() === pairCfg.baseToken.toLowerCase();
    const reserveBase = baseIs0 ? r0 : r1;
    const reserveQuote = baseIs0 ? r1 : r0;
    if (reserveBase === 0n) return 0;
    // quote per base, adjust decimals: base 18, quote 6
    const q = Number(formatUnits(reserveQuote, pairCfg.quoteDecimals));
    const b = Number(formatUnits(reserveBase, pairCfg.baseDecimals));
    return b > 0 ? q / b : 0;
  }, [live, reserves, token0, pairCfg, oraclePrice]);

  const divBps = divergenceBps(poolPrice, oraclePrice);
  const divWarn = divBps != null && divBps >= DIVERGENCE_WARN_BPS;

  const inToken = side === "buy" ? pairCfg.quoteToken : pairCfg.baseToken;
  const outToken = side === "buy" ? pairCfg.baseToken : pairCfg.quoteToken;
  const inDecimals = side === "buy" ? pairCfg.quoteDecimals : pairCfg.baseDecimals;
  const outDecimals = side === "buy" ? pairCfg.baseDecimals : pairCfg.quoteDecimals;
  const inLabel = side === "buy" ? pairCfg.quoteSymbol : pairCfg.baseSymbol;
  const outLabel = side === "buy" ? pairCfg.baseSymbol : pairCfg.quoteSymbol;

  const amountInWei =
    amountIn && Number(amountIn) > 0 ? parseUnits(amountIn, inDecimals) : 0n;

  const { data: amountsOut } = useReadContract({
    address: pairCfg.router,
    abi: UNI_V2_ROUTER_ABI,
    functionName: "getAmountsOut",
    args: [amountInWei, [inToken, outToken]],
    query: {
      enabled: live && amountInWei > 0n && isConnected,
      refetchInterval: 10_000,
    },
  });

  const amountOutWei =
    amountsOut && Array.isArray(amountsOut) && amountsOut.length >= 2
      ? (amountsOut[1] as bigint)
      : 0n;
  const amountOutHuman =
    amountOutWei > 0n ? Number(formatUnits(amountOutWei, outDecimals)) : 0;

  const {
    data: allowance,
    refetch: refetchAllowance,
  } = useReadContract({
    address: inToken,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, pairCfg.router] : undefined,
    query: { enabled: live && !!address, refetchInterval: 8_000 },
  });

  const { data: semaBal, refetch: refetchSema } = useReadContract({
    address: pairCfg.baseToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: live && !!address && pairCfg.baseToken !== ZERO, refetchInterval: 12_000 },
  });
  const { data: usdgBal, refetch: refetchUsdg } = useReadContract({
    address: pairCfg.quoteToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: live && !!address && pairCfg.quoteToken !== ZERO, refetchInterval: 12_000 },
  });

  const needsApprove =
    live &&
    amountInWei > 0n &&
    (allowance === undefined || (allowance as bigint) < amountInWei);

  const { writeContract, data: txHash, isPending, reset, error: writeError } = useWriteContract();
  const { isLoading: confirming, isSuccess, isError: receiptError } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (!isSuccess || !pendingAction) return;
    if (pendingAction === "approve") {
      void refetchAllowance();
      setReadyToSwap(true);
      setStatusMsg(
        `✓ ${inLabel} approved. Confirm swap to receive ${outLabel}.`,
      );
      setPendingAction(null);
      reset();
      return;
    }
    if (pendingAction === "swap") {
      void refetchSema();
      void refetchUsdg();
      void refetchAllowance();
      setReadyToSwap(false);
      setStatusMsg(
        side === "buy"
          ? `✓ Swapped — ${outLabel} is in your wallet. Open Portfolio to view balances.`
          : `✓ Swapped — ${outLabel} is in your wallet.`,
      );
      setAmountIn("");
      setPendingAction(null);
      reset();
    }
  }, [
    isSuccess,
    pendingAction,
    inLabel,
    outLabel,
    side,
    refetchAllowance,
    refetchSema,
    refetchUsdg,
    reset,
  ]);

  useEffect(() => {
    if (receiptError || writeError) {
      setPendingAction(null);
      setStatusMsg(
        writeError?.message?.slice(0, 120) ||
          "Transaction failed or was rejected. Try again.",
      );
    }
  }, [receiptError, writeError]);

  // After approve, allowance may update — clear ready banner once swap available
  useEffect(() => {
    if (readyToSwap && !needsApprove && amountInWei > 0n) {
      setReadyToSwap(true);
    }
  }, [readyToSwap, needsApprove, amountInWei]);

  const { data: lpBal } = useReadContract({
    address: pairCfg.pair,
    abi: UNI_V2_PAIR_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: live && !!address },
  });
  const { data: lpSupply } = useReadContract({
    address: pairCfg.pair,
    abi: UNI_V2_PAIR_ABI,
    functionName: "totalSupply",
    query: { enabled: live },
  });

  const semaHuman =
    semaBal !== undefined
      ? Number(formatUnits(semaBal as bigint, pairCfg.baseDecimals))
      : null;
  const usdgHuman =
    usdgBal !== undefined
      ? Number(formatUnits(usdgBal as bigint, pairCfg.quoteDecimals))
      : null;

  const lpPoints = useMemo(() => {
    if (!live || !lpBal || !lpSupply || !reserves || (lpSupply as bigint) === 0n) return 0;
    const [r0, r1] = reserves as readonly [bigint, bigint, number];
    const baseIs0 =
      token0 && (token0 as string).toLowerCase() === pairCfg.baseToken.toLowerCase();
    const reserveQuote = baseIs0 ? r1 : r0;
    const share = Number(lpBal as bigint) / Number(lpSupply as bigint);
    const quoteOwned = share * Number(formatUnits(reserveQuote, pairCfg.quoteDecimals));
    // Count both sides roughly as 2x quote for TVL share
    return Math.floor(quoteOwned * 2 * LP_POINTS_PER_USDG);
  }, [live, lpBal, lpSupply, reserves, token0, pairCfg]);

  function onApprove() {
    setStatusMsg(null);
    setPendingAction("approve");
    writeContract({
      address: inToken,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [pairCfg.router, maxUint256],
    });
  }

  function onSwap() {
    if (!address || amountInWei === 0n || amountOutWei === 0n) return;
    setStatusMsg(null);
    setPendingAction("swap");
    const minOut = (amountOutWei * BigInt(10_000 - slippageBps)) / 10_000n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    writeContract({
      address: pairCfg.router,
      abi: UNI_V2_ROUTER_ABI,
      functionName: "swapExactTokensForTokens",
      args: [amountInWei, minOut, [inToken, outToken], address, deadline],
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar
        market={{
          symbol: `${pairCfg.baseSymbol}/${pairCfg.quoteSymbol}`,
          name: pairCfg.baseName,
          price: oraclePrice,
          change24h: 0,
          volume24h: 0,
          unit: "$/mg",
          oracleKey: pairCfg.oracleKey,
        }}
        price={oraclePrice}
        isLive={isLive}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex-row lg:overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-green/15 px-2.5 py-1 text-xs font-semibold text-green">
              Spot · Uniswap V2
            </span>
            <Link
              href="/perps"
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-muted hover:bg-panel hover:text-ink"
            >
              Perps →
            </Link>
            <Link
              href="/earn"
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-muted hover:bg-panel hover:text-ink"
            >
              Earn LP →
            </Link>
            <Link
              href="/risk"
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-muted hover:bg-panel hover:text-ink"
            >
              SEMA risk →
            </Link>
            <Link
              href="/redeem"
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-muted hover:bg-panel hover:text-ink"
            >
              Redeem kits →
            </Link>
            <Link
              href="/launchpad"
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-muted hover:bg-panel hover:text-ink"
            >
              Launchpad →
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <PriceCard
              label="Official research price"
              value={oraclePrice}
              unit="$/mg"
              note={
                isLive
                  ? network.testnet
                    ? "PeptideOracle · SEMA-PERP"
                    : "Research mark · SEMA-PERP (testnet oracle feed)"
                  : "Oracle offline · reference"
              }
              tone="oracle"
            />
            <PriceCard
              label="Pool price"
              value={poolPrice}
              unit={`${pairCfg.quoteSymbol} / ${pairCfg.baseSymbol}`}
              note={
                live
                  ? `Uniswap V2 ${pairCfg.baseSymbol}/${pairCfg.quoteSymbol}`
                  : "Deploy SEMA + seed pool to go live"
              }
              tone="pool"
            />
            <PriceCard
              label="Oracle ↔ pool"
              value={divBps != null ? divBps / 100 : null}
              unit="%"
              note={divWarn ? "Divergence elevated" : "Within soft band"}
              tone={divWarn ? "warn" : "neutral"}
              isPercent
            />
          </div>

          {divWarn && (
            <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-panel px-4 py-3 text-xs text-ink-soft">
              <Info size={16} className="mt-0.5 shrink-0 text-amber-400" />
              <p>
                Pool is{" "}
                <span className="font-semibold text-ink">{(divBps! / 100).toFixed(1)}%</span>{" "}
                from the research oracle. Oracle is blended lab/vendor $/mg — not AMM settlement.
              </p>
            </div>
          )}

          <div className="grid min-h-[320px] gap-3 lg:grid-cols-[1fr_200px]">
            <ChartPanel symbol="SEMA-PERP" price={oraclePrice} unit="$/mg" />
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-panel p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                  <FlaskConical size={16} className="text-green" />
                  Kit redemption
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                  <strong className="text-ink">1 SEMA ≈ 1 vial</strong>. Research Only kits =
                  10 vials → need <strong className="text-ink">≥{SEMA_PER_KIT} SEMA</strong>.
                  Transfer SEMA to treasury, then shipping form. Cap{" "}
                  <strong className="text-ink">{MONTHLY_KIT_CAP} kits/month</strong> per wallet.
                </p>
                <Link
                  href="/redeem"
                  className="btn-green mt-4 inline-flex w-full justify-center py-2 text-xs"
                >
                  Redeem flow
                </Link>
              </div>
              <div className="rounded-xl border border-border bg-panel p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                  <Coins size={16} className="text-green" />
                  LP points
                </div>
                <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-ink">
                  {lpPoints.toLocaleString()}
                </p>
                <p className="mt-1 text-[10px] text-muted">
                  Est. from your LP share · {LP_POINTS_PER_USDG} pts per $ LP TVL. Incentives
                  expand post-launch.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-panel p-4 text-xs text-ink-soft">
            <div className="font-semibold text-ink">Mainnet notes</div>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>
                Stable on Robinhood mainnet is <strong className="text-ink">USDG</strong>{" "}
                (Global Dollar) — no Circle USDC deployment found; pair is SEMA/USDG.
              </li>
              <li>
                Uniswap V2 Router{" "}
                <code className="text-[10px] text-ink">{pairCfg.router.slice(0, 10)}…</code>
              </li>
              <li>
                Deploy:{" "}
                <code className="text-[10px]">
                  npx hardhat run scripts/deploy-sema-spot.ts --network robinhoodMainnet
                </code>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[340px] lg:overflow-y-auto">
          <AccountCard />

          <div className="rounded-xl border border-border bg-panel p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Swap</h2>
              <span className="text-[10px] uppercase tracking-wide text-muted">
                {pairCfg.baseSymbol}/{pairCfg.quoteSymbol}
              </span>
            </div>

            {isConnected && live && (
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-[11px]">
                <div>
                  <div className="text-muted">{pairCfg.baseSymbol}</div>
                  <div className="font-mono tabular-nums text-ink">
                    {semaHuman != null
                      ? semaHuman.toLocaleString(undefined, { maximumFractionDigits: 4 })
                      : "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-muted">{pairCfg.quoteSymbol}</div>
                  <div className="font-mono tabular-nums text-ink">
                    {usdgHuman != null
                      ? usdgHuman.toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : "—"}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 flex gap-1 rounded-lg bg-bg p-0.5">
              {(["buy", "sell"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className={cn(
                    "flex-1 rounded-md py-1.5 text-xs font-semibold capitalize",
                    side === s
                      ? s === "buy"
                        ? "bg-green text-black"
                        : "bg-panel-hover text-ink"
                      : "text-muted hover:text-ink",
                  )}
                >
                  {s === "buy" ? `Buy ${pairCfg.baseSymbol}` : `Sell ${pairCfg.baseSymbol}`}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wide text-muted">
              You pay
            </label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-border-strong bg-bg px-3 py-2">
              <input
                type="number"
                min={0}
                step="any"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                placeholder="0.0"
                className="min-w-0 flex-1 bg-transparent font-mono text-sm text-ink outline-none"
              />
              <span className="shrink-0 text-xs font-semibold text-ink">{inLabel}</span>
            </div>

            <button
              type="button"
              onClick={() => setSide(side === "buy" ? "sell" : "buy")}
              className="mx-auto my-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-panel-hover text-muted hover:text-ink"
              aria-label="Flip sides"
            >
              <ArrowDownUp size={14} />
            </button>

            <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted">
              You receive (est.)
            </label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2">
              <div className="min-w-0 flex-1 font-mono text-sm tabular-nums text-ink">
                {amountOutHuman > 0 ? amountOutHuman.toFixed(6) : "—"}
              </div>
              <span className="shrink-0 text-xs font-semibold text-ink">{outLabel}</span>
            </div>

            <div className="mt-3 space-y-1 text-[11px] text-muted">
              <div className="flex justify-between">
                <span>Pool rate</span>
                <span className="font-mono text-ink-soft">
                  1 {pairCfg.baseSymbol} ≈ {poolPrice > 0 ? poolPrice.toFixed(4) : "—"}{" "}
                  {pairCfg.quoteSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Oracle</span>
                <span className="font-mono text-ink-soft">${oraclePrice.toFixed(4)}/mg</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Slippage</span>
                <select
                  value={slippageBps}
                  onChange={(e) => setSlippageBps(Number(e.target.value))}
                  className="rounded border border-border bg-bg px-1 py-0.5 text-ink"
                >
                  <option value={50}>0.5%</option>
                  <option value={100}>1%</option>
                  <option value={200}>2%</option>
                </select>
              </div>
            </div>

            {statusMsg && (
              <div
                className={cn(
                  "mt-3 rounded-lg border px-3 py-2.5 text-[11px] leading-relaxed",
                  readyToSwap || statusMsg.startsWith("✓")
                    ? "border-green/40 bg-green/10 text-ink"
                    : "border-border bg-bg text-ink-soft",
                )}
              >
                <p>{statusMsg}</p>
                {readyToSwap && !needsApprove && (
                  <p className="mt-1 font-semibold text-green-soft">
                    Next step: Swap {inLabel} → {outLabel}
                  </p>
                )}
                {statusMsg.includes("Portfolio") && (
                  <Link
                    href="/portfolio"
                    className="mt-2 inline-flex font-semibold text-green-soft hover:underline"
                  >
                    View portfolio →
                  </Link>
                )}
              </div>
            )}

            {!isConnected ? (
              <button
                type="button"
                className="btn-green mt-4 w-full py-2.5 text-sm"
                onClick={() => {
                  const c = connectors[0];
                  if (c) connect({ connector: c });
                }}
              >
                Connect wallet
              </button>
            ) : !live ? (
              <div className="mt-4 rounded-lg border border-border-strong bg-bg px-3 py-3 text-center">
                <div className="text-xs font-semibold text-ink">Pool not live yet</div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Deploy SEMA + seed Uniswap V2 liquidity, then set{" "}
                  <code className="text-ink-soft">SPOT_MAINNET.live = true</code>.
                </p>
              </div>
            ) : needsApprove ? (
              <button
                type="button"
                className="btn-green mt-4 w-full py-2.5 text-sm"
                disabled={isPending || confirming || amountInWei === 0n}
                onClick={onApprove}
              >
                {pendingAction === "approve" && (isPending || confirming)
                  ? "Confirm approve in wallet…"
                  : `1 · Approve ${inLabel}`}
              </button>
            ) : (
              <button
                type="button"
                className={cn(
                  "btn-green mt-4 w-full py-2.5 text-sm",
                  readyToSwap && "ring-2 ring-green/50 ring-offset-2 ring-offset-panel",
                )}
                disabled={isPending || confirming || amountInWei === 0n || amountOutWei === 0n}
                onClick={onSwap}
              >
                {pendingAction === "swap" && (isPending || confirming)
                  ? "Confirm swap in wallet…"
                  : readyToSwap
                    ? `2 · Swap ${inLabel} → ${outLabel}`
                    : `Swap ${inLabel} → ${outLabel}`}
              </button>
            )}

            {needsApprove && amountInWei > 0n && (
              <p className="mt-2 text-center text-[10px] text-muted">
                Step 1 of 2: approve router to spend {inLabel}, then swap
              </p>
            )}

            {txHash && (
              <a
                href={`${network.explorer}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center justify-center gap-1 text-[10px] text-green-soft hover:underline"
              >
                View tx <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceCard({
  label,
  value,
  unit,
  note,
  tone,
  isPercent,
}: {
  label: string;
  value: number | null;
  unit: string;
  note: string;
  tone: "oracle" | "pool" | "warn" | "neutral";
  isPercent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-panel p-4",
        tone === "oracle" && "border-green/30",
        tone === "warn" && "border-amber-500/40",
        (tone === "pool" || tone === "neutral") && "border-border",
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-ink">
        {value == null || !Number.isFinite(value)
          ? "—"
          : isPercent
            ? `${value.toFixed(2)}${unit}`
            : `$${value.toFixed(4)}`}
        {!isPercent && value != null && (
          <span className="ml-1 text-xs font-normal text-muted">{unit}</span>
        )}
      </div>
      <div className="mt-1 text-[11px] text-ink-soft">{note}</div>
    </div>
  );
}
