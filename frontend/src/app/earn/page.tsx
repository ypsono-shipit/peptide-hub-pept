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
import {
  ArrowDownUp,
  Coins,
  Droplets,
  ExternalLink,
  Flame,
  Info,
  Timer,
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { AccountCard } from "@/components/AccountCard";
import { cn } from "@/lib/cn";
import { useNetworkConfig } from "@/lib/useAppContracts";
import { SPOT_MAINNET, SPOT_TESTNET } from "@/lib/spot";
import { ERC20_ABI, GAUGE_ABI, UNI_V2_PAIR_ABI, UNI_V2_ROUTER_ABI } from "@/lib/uniswap-v2";
import {
  WEEKLY_EMISSION,
  estimateEpochPoints,
  formatDuration,
  pointsPerSecond,
  provisionalEpoch,
  epochFromStart,
  IDLE_LP_POINTS_NOTE,
} from "@/lib/points";

const ZERO = "0x0000000000000000000000000000000000000000";

export default function EarnPage() {
  const network = useNetworkConfig();
  const pair = network.testnet ? SPOT_TESTNET : SPOT_MAINNET;
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  const live = pair.live && pair.baseToken !== ZERO && pair.pair !== ZERO;
  const gaugeLive = live && pair.gauge !== ZERO;

  const [tab, setTab] = useState<"add" | "remove" | "stake">("add");
  const [semaAmt, setSemaAmt] = useState("");
  const [usdgAmt, setUsdgAmt] = useState("");
  const [lpAmt, setLpAmt] = useState("");
  const [stakeAmt, setStakeAmt] = useState("");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  /** Which side the user last edited — other side follows pool ratio. */
  const [lastEdited, setLastEdited] = useState<"sema" | "usdg" | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "approve-sema" | "approve-usdg" | "add" | "remove" | "stake" | "other" | null
  >(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: startTime } = useReadContract({
    address: pair.gauge,
    abi: GAUGE_ABI,
    functionName: "startTime",
    query: { enabled: gaugeLive },
  });

  const epoch = useMemo(() => {
    if (gaugeLive && startTime != null) {
      return epochFromStart(Number(startTime), now);
    }
    return provisionalEpoch(now);
  }, [gaugeLive, startTime, now]);

  const { data: reserves } = useReadContract({
    address: pair.pair,
    abi: UNI_V2_PAIR_ABI,
    functionName: "getReserves",
    query: { enabled: live, refetchInterval: 15_000 },
  });
  const { data: token0 } = useReadContract({
    address: pair.pair,
    abi: UNI_V2_PAIR_ABI,
    functionName: "token0",
    query: { enabled: live },
  });
  const { data: lpSupply } = useReadContract({
    address: pair.pair,
    abi: UNI_V2_PAIR_ABI,
    functionName: "totalSupply",
    query: { enabled: live },
  });
  const { data: walletLp } = useReadContract({
    address: pair.pair,
    abi: UNI_V2_PAIR_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: live && !!address },
  });
  const { data: semaBal } = useReadContract({
    address: pair.baseToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: live && !!address },
  });
  const { data: usdgBal } = useReadContract({
    address: pair.quoteToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: live && !!address },
  });

  const { data: gaugeUser } = useReadContract({
    address: pair.gauge,
    abi: GAUGE_ABI,
    functionName: "users",
    args: address ? [address] : undefined,
    query: { enabled: gaugeLive && !!address, refetchInterval: 12_000 },
  });
  const { data: pendingPts } = useReadContract({
    address: pair.gauge,
    abi: GAUGE_ABI,
    functionName: "pendingPoints",
    args: address ? [address] : undefined,
    query: { enabled: gaugeLive && !!address, refetchInterval: 12_000 },
  });
  const { data: totalStaked } = useReadContract({
    address: pair.gauge,
    abi: GAUGE_ABI,
    functionName: "totalStaked",
    query: { enabled: gaugeLive, refetchInterval: 15_000 },
  });
  const { data: weeklyOnChain } = useReadContract({
    address: pair.gauge,
    abi: GAUGE_ABI,
    functionName: "weeklyEmission",
    query: { enabled: gaugeLive },
  });

  const stakedLp = gaugeUser ? (gaugeUser as readonly [bigint, bigint, bigint])[0] : 0n;
  const lifetimePts = gaugeUser ? (gaugeUser as readonly [bigint, bigint, bigint])[2] : 0n;
  const pending = (pendingPts as bigint | undefined) ?? 0n;

  const stakeShare =
    totalStaked && (totalStaked as bigint) > 0n
      ? Number(stakedLp) / Number(totalStaked as bigint)
      : 0;

  const weeklyPtsEst = estimateEpochPoints(stakeShare, 1);
  const pps = pointsPerSecond(stakeShare);

  const tvlUsdg = useMemo(() => {
    if (!reserves || !token0) return null;
    const [r0, r1] = reserves as readonly [bigint, bigint, number];
    const baseIs0 = (token0 as string).toLowerCase() === pair.baseToken.toLowerCase();
    const reserveQuote = baseIs0 ? r1 : r0;
    // Approximate TVL as 2× quote side
    return Number(formatUnits(reserveQuote, pair.quoteDecimals)) * 2;
  }, [reserves, token0, pair]);

  const { data: allowSema, refetch: refetchAllowSema } = useReadContract({
    address: pair.baseToken,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, pair.router] : undefined,
    query: { enabled: live && !!address, refetchInterval: 8_000 },
  });
  const { data: allowUsdg, refetch: refetchAllowUsdg } = useReadContract({
    address: pair.quoteToken,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, pair.router] : undefined,
    query: { enabled: live && !!address, refetchInterval: 8_000 },
  });
  const { data: allowLpRouter, refetch: refetchAllowLpRouter } = useReadContract({
    address: pair.pair,
    abi: UNI_V2_PAIR_ABI,
    functionName: "allowance",
    args: address ? [address, pair.router] : undefined,
    query: { enabled: live && !!address, refetchInterval: 8_000 },
  });
  const { data: allowLpGauge, refetch: refetchAllowLpGauge } = useReadContract({
    address: pair.pair,
    abi: UNI_V2_PAIR_ABI,
    functionName: "allowance",
    args: address && gaugeLive ? [address, pair.gauge] : undefined,
    query: { enabled: gaugeLive && !!address, refetchInterval: 8_000 },
  });

  /** Pool reserves as human SEMA / USDG (correct token order). */
  const poolRatio = useMemo(() => {
    if (!reserves || !token0) return null;
    const [r0, r1] = reserves as readonly [bigint, bigint, number];
    const baseIs0 = (token0 as string).toLowerCase() === pair.baseToken.toLowerCase();
    const rBase = baseIs0 ? r0 : r1;
    const rQuote = baseIs0 ? r1 : r0;
    const sema = Number(formatUnits(rBase, pair.baseDecimals));
    const usdg = Number(formatUnits(rQuote, pair.quoteDecimals));
    if (!(sema > 0) || !(usdg > 0)) return null;
    return {
      sema,
      usdg,
      /** USDG per 1 SEMA */
      price: usdg / sema,
      /** SEMA per 1 USDG */
      semaPerUsdg: sema / usdg,
    };
  }, [reserves, token0, pair]);

  // Keep the other field in pool ratio when the user types one side
  useEffect(() => {
    if (!poolRatio || !lastEdited) return;
    if (lastEdited === "sema") {
      const s = Number(semaAmt);
      if (!Number.isFinite(s) || s <= 0) return;
      const needUsdg = s * poolRatio.price;
      setUsdgAmt(needUsdg.toFixed(6).replace(/\.?0+$/, ""));
    } else {
      const u = Number(usdgAmt);
      if (!Number.isFinite(u) || u <= 0) return;
      const needSema = u * poolRatio.semaPerUsdg;
      setSemaAmt(needSema.toFixed(6).replace(/\.?0+$/, ""));
    }
    // only re-run when the edited side or ratio changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semaAmt, usdgAmt, lastEdited, poolRatio?.price, poolRatio?.semaPerUsdg]);

  const { writeContract, data: txHash, isPending, reset, error: writeError } = useWriteContract();
  const { isLoading: confirming, isSuccess, isError: receiptError } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isSuccess || !pendingAction) return;
    void refetchAllowSema();
    void refetchAllowUsdg();
    void refetchAllowLpRouter();
    void refetchAllowLpGauge();
    if (pendingAction === "approve-sema") {
      setStatusMsg("✓ SEMA approved. Click again to approve USDG (or add LP if already approved).");
    } else if (pendingAction === "approve-usdg") {
      setStatusMsg("✓ USDG approved. Click again to add liquidity.");
    } else if (pendingAction === "add") {
      setStatusMsg("✓ Liquidity added. LP tokens are in your wallet — stake them for points.");
      setSemaAmt("");
      setUsdgAmt("");
      setLastEdited(null);
    } else if (pendingAction === "remove") {
      setStatusMsg("✓ Liquidity removed.");
      setLpAmt("");
    } else if (pendingAction === "stake") {
      setStatusMsg("✓ LP staked in gauge — points are accruing.");
      setStakeAmt("");
    } else if (pendingAction === "other") {
      setStatusMsg("✓ Approved. Click the action again to continue.");
    }
    setPendingAction(null);
    reset();
  }, [
    isSuccess,
    pendingAction,
    refetchAllowSema,
    refetchAllowUsdg,
    refetchAllowLpRouter,
    refetchAllowLpGauge,
    reset,
  ]);

  useEffect(() => {
    if (receiptError || writeError) {
      setPendingAction(null);
      const raw = writeError?.message || "Transaction failed or was rejected.";
      // Surface common Uniswap reverts more clearly
      let msg = raw.slice(0, 160);
      if (/INSUFFICIENT_A_AMOUNT|INSUFFICIENT_B_AMOUNT/i.test(raw)) {
        msg = "Amounts no longer match pool ratio (price moved). Re-enter one side to re-quote.";
      } else if (/transfer amount exceeds balance|ERC20: transfer/i.test(raw)) {
        msg = "Insufficient token balance for this deposit.";
      } else if (/user rejected|denied/i.test(raw)) {
        msg = "Transaction rejected in wallet.";
      }
      setStatusMsg(msg);
    }
  }, [receiptError, writeError]);

  function deadline() {
    return BigInt(Math.floor(Date.now() / 1000) + 1200);
  }

  function needsApprove(allowance: unknown, amount: bigint): boolean {
    // undefined = still loading or never approved → require approve before addLiquidity
    if (allowance === undefined || allowance === null) return true;
    return (allowance as bigint) < amount;
  }

  function onAddLiquidity() {
    if (!address || !live) return;
    const a = parseUnits(semaAmt || "0", pair.baseDecimals);
    const b = parseUnits(usdgAmt || "0", pair.quoteDecimals);
    if (a === 0n || b === 0n) {
      setStatusMsg("Enter both SEMA and USDG amounts (pool keeps the ratio).");
      return;
    }

    // Soft balance checks
    if (semaBal != null && a > (semaBal as bigint)) {
      setStatusMsg("Not enough SEMA in wallet for this deposit.");
      return;
    }
    if (usdgBal != null && b > (usdgBal as bigint)) {
      setStatusMsg("Not enough USDG in wallet for this deposit.");
      return;
    }

    setStatusMsg(null);
    if (needsApprove(allowSema, a)) {
      setPendingAction("approve-sema");
      writeContract({
        address: pair.baseToken,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [pair.router, maxUint256],
      });
      return;
    }
    if (needsApprove(allowUsdg, b)) {
      setPendingAction("approve-usdg");
      writeContract({
        address: pair.quoteToken,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [pair.router, maxUint256],
      });
      return;
    }
    setPendingAction("add");
    // amountAMin/BMin = 0: router picks optimal amounts along the pool curve.
    // Slight SEMA/USDG skew (e.g. 200/20 vs ~9.6:1) is OK — excess stays in wallet.
    writeContract({
      address: pair.router,
      abi: UNI_V2_ROUTER_ABI,
      functionName: "addLiquidity",
      args: [pair.baseToken, pair.quoteToken, a, b, 0n, 0n, address, deadline()],
    });
  }

  const addButtonLabel = useMemo(() => {
    if (isPending || confirming) {
      if (pendingAction === "approve-sema") return "Confirm SEMA approve…";
      if (pendingAction === "approve-usdg") return "Confirm USDG approve…";
      if (pendingAction === "add") return "Confirm add liquidity…";
      return "Confirm in wallet…";
    }
    try {
      const a = parseUnits(semaAmt || "0", pair.baseDecimals);
      const b = parseUnits(usdgAmt || "0", pair.quoteDecimals);
      if (a > 0n && needsApprove(allowSema, a)) return "1 · Approve SEMA";
      if (b > 0n && needsApprove(allowUsdg, b)) return "2 · Approve USDG";
      if (a > 0n && b > 0n) return "3 · Add liquidity";
    } catch {
      /* ignore parse */
    }
    return "Approve / Add liquidity";
  }, [
    isPending,
    confirming,
    pendingAction,
    semaAmt,
    usdgAmt,
    pair.baseDecimals,
    pair.quoteDecimals,
    allowSema,
    allowUsdg,
  ]);

  function onRemoveLiquidity() {
    if (!address || !live) return;
    const liq = parseUnits(lpAmt || "0", 18);
    if (liq === 0n) return;
    setStatusMsg(null);
    if (needsApprove(allowLpRouter, liq)) {
      setPendingAction("other");
      writeContract({
        address: pair.pair,
        abi: UNI_V2_PAIR_ABI,
        functionName: "approve",
        args: [pair.router, maxUint256],
      });
      return;
    }
    setPendingAction("remove");
    writeContract({
      address: pair.router,
      abi: UNI_V2_ROUTER_ABI,
      functionName: "removeLiquidity",
      args: [pair.baseToken, pair.quoteToken, liq, 0n, 0n, address, deadline()],
    });
  }

  function onStake() {
    if (!address || !gaugeLive) return;
    // Prefer exact wallet balance when field matches Max / full bal
    let amt = 0n;
    try {
      amt = parseUnits((stakeAmt || "0").trim() || "0", 18);
    } catch {
      setStatusMsg("Invalid LP amount.");
      return;
    }
    if (amt === 0n && walletLp != null && (walletLp as bigint) > 0n) {
      // Empty field → stake all
      amt = walletLp as bigint;
      setStakeAmt(formatUnits(amt, 18));
    }
    if (amt === 0n) {
      setStatusMsg("Enter an LP amount or tap Max.");
      return;
    }
    if (walletLp != null && amt > (walletLp as bigint)) {
      setStatusMsg("Amount exceeds wallet LP. Tap Max to use the exact balance.");
      return;
    }
    setStatusMsg(null);
    if (needsApprove(allowLpGauge, amt)) {
      setPendingAction("other");
      setStatusMsg("Approve LP for the gauge, then click Stake again.");
      writeContract({
        address: pair.pair,
        abi: UNI_V2_PAIR_ABI,
        functionName: "approve",
        args: [pair.gauge, maxUint256],
      });
      return;
    }
    setPendingAction("stake");
    writeContract({
      address: pair.gauge,
      abi: GAUGE_ABI,
      functionName: "deposit",
      args: [amt],
    });
  }

  function onUnstake() {
    if (!address || !gaugeLive || stakedLp === 0n) return;
    const amt = parseUnits(stakeAmt || "0", 18);
    const use = amt > 0n && amt <= stakedLp ? amt : stakedLp;
    writeContract({
      address: pair.gauge,
      abi: GAUGE_ABI,
      functionName: "withdraw",
      args: [use],
    });
  }

  function onClaim() {
    if (!gaugeLive) return;
    writeContract({
      address: pair.gauge,
      abi: GAUGE_ABI,
      functionName: "claimPoints",
      args: [],
    });
  }

  const weeklyDisplay =
    weeklyOnChain != null
      ? Number(formatUnits(weeklyOnChain as bigint, 18))
      : WEEKLY_EMISSION;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Liquidity · Points
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Earn on{" "}
              <em className="font-serif font-normal italic text-green-soft">
                SEMA/{pair.quoteSymbol}
              </em>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              Provide Uniswap V2 liquidity, stake LP in the PEPT gauge, and earn{" "}
              <strong className="text-ink">weekly points</strong> toward the upcoming{" "}
              <strong className="text-ink">$PEPT</strong> token. 1 epoch = 7 days · fixed emission
              per epoch.
            </p>
          </div>

          {/* Epoch strip */}
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat
              icon={Timer}
              label="Epoch"
              value={`#${epoch.epoch}`}
              note={`${formatDuration(epoch.secondsLeft)} left`}
            />
            <Stat
              icon={Flame}
              label="Weekly emission"
              value={weeklyDisplay.toLocaleString()}
              note="points / epoch"
            />
            <Stat
              icon={Droplets}
              label="Pool TVL (est.)"
              value={tvlUsdg != null ? `$${tvlUsdg.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
              note={live ? "2× quote side" : "Pool not live"}
            />
            <Stat
              icon={Coins}
              label="Your share"
              value={stakeShare > 0 ? `${(stakeShare * 100).toFixed(2)}%` : "0%"}
              note="of staked LP"
            />
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-panel-hover">
            <div
              className="h-full rounded-full bg-green transition-all"
              style={{ width: `${Math.round(epoch.progress * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted">
            Epoch progress · points stream continuously; full emission lands if you stay staked
            all week.
          </p>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-panel p-5">
              <h2 className="text-sm font-semibold text-ink">Your points</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase text-muted">Lifetime + claimed</div>
                  <div className="font-mono text-2xl font-semibold tabular-nums text-ink">
                    {gaugeLive
                      ? Number(formatUnits(pending, 18)).toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted">Harvested</div>
                  <div className="font-mono text-2xl font-semibold tabular-nums text-green">
                    {gaugeLive
                      ? Number(formatUnits(lifetimePts, 18)).toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })
                      : "—"}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-ink-soft">
                Est. this epoch if share holds:{" "}
                <span className="font-mono text-ink">{weeklyPtsEst.toFixed(1)}</span> pts ·{" "}
                <span className="font-mono text-ink">{pps.toFixed(4)}</span> pts/s
              </p>
              <button
                type="button"
                disabled={!gaugeLive || !isConnected || isPending || confirming}
                onClick={onClaim}
                className="btn-green mt-4 w-full py-2 text-sm disabled:opacity-50"
              >
                Harvest points score
              </button>
              <p className="mt-2 text-[10px] text-muted">{IDLE_LP_POINTS_NOTE}</p>
            </div>

            <div className="rounded-2xl border border-border bg-panel p-5">
              <h2 className="text-sm font-semibold text-ink">How points work</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-4 text-xs text-ink-soft">
                <li>
                  <strong className="text-ink">{weeklyDisplay.toLocaleString()} points</strong>{" "}
                  emitted every 7-day epoch to all staked LPs.
                </li>
                <li>Your share of staked LP determines your stream rate.</li>
                <li>
                  Points are an <strong className="text-ink">airdrop ledger</strong> for $PEPT —
                  not a transferable token yet.
                </li>
                <li>Unstaking stops accrual; claimed score stays on your address.</li>
                <li>
                  Trading fees from the Uniswap pool are separate yield (in SEMA +{" "}
                  {pair.quoteSymbol}).
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <Link href="/spot" className="text-green-soft hover:underline">
                  Spot swap →
                </Link>
                <Link href="/redeem" className="text-muted hover:text-ink hover:underline">
                  Redeem kits →
                </Link>
              </div>
            </div>
          </div>

          {!live && (
            <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-panel px-4 py-3 text-xs text-ink-soft">
              <Info size={16} className="mt-0.5 shrink-0 text-amber-400" />
              <p>
                Pool not live yet. After SEMA + Uniswap liquidity deploy, this page enables add /
                remove / stake. Points gauge deploys after the pair exists.
              </p>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[360px]">
          <AccountCard />

          <div className="rounded-xl border border-border bg-panel p-4">
            <div className="flex gap-1 rounded-lg bg-bg p-0.5">
              {(
                [
                  ["add", "Add LP"],
                  ["remove", "Remove"],
                  ["stake", "Stake"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={cn(
                    "flex-1 rounded-md py-1.5 text-xs font-semibold",
                    tab === k ? "bg-green text-black" : "text-muted hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

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
            ) : tab === "add" ? (
              <div className="mt-4 space-y-3">
                {poolRatio && (
                  <div className="rounded-lg border border-border bg-bg px-3 py-2 text-[10px] text-muted">
                    Pool ratio ≈{" "}
                    <span className="font-mono text-ink-soft">
                      {poolRatio.semaPerUsdg.toFixed(2)} SEMA
                    </span>{" "}
                    per 1 {pair.quoteSymbol} ·{" "}
                    <span className="font-mono text-ink-soft">
                      ${poolRatio.price.toFixed(4)}
                    </span>{" "}
                    / SEMA
                    <br />
                    Type one side — the other fills to match. Router deposits the optimal pair;
                    leftovers stay in your wallet.
                  </div>
                )}
                <Field
                  label={`SEMA`}
                  bal={
                    semaBal != null
                      ? Number(formatUnits(semaBal as bigint, pair.baseDecimals)).toFixed(4)
                      : "—"
                  }
                >
                  <input
                    value={semaAmt}
                    onChange={(e) => {
                      setLastEdited("sema");
                      setSemaAmt(e.target.value);
                    }}
                    placeholder="0.0"
                    className={inputCls}
                    type="number"
                    min={0}
                  />
                </Field>
                <div className="flex justify-center text-muted">
                  <ArrowDownUp size={14} />
                </div>
                <Field
                  label={pair.quoteSymbol}
                  bal={
                    usdgBal != null
                      ? Number(formatUnits(usdgBal as bigint, pair.quoteDecimals)).toFixed(4)
                      : "—"
                  }
                >
                  <input
                    value={usdgAmt}
                    onChange={(e) => {
                      setLastEdited("usdg");
                      setUsdgAmt(e.target.value);
                    }}
                    placeholder="0.0"
                    className={inputCls}
                    type="number"
                    min={0}
                  />
                </Field>
                {statusMsg && (
                  <div className="rounded-lg border border-green/30 bg-green/10 px-3 py-2 text-[11px] leading-relaxed text-ink">
                    {statusMsg}
                  </div>
                )}
                <button
                  type="button"
                  disabled={!live || isPending || confirming}
                  onClick={onAddLiquidity}
                  className="btn-green w-full py-2.5 text-sm disabled:opacity-50"
                >
                  {addButtonLabel}
                </button>
                <p className="text-center text-[10px] text-muted">
                  Up to 3 wallet confirms: approve SEMA → approve USDG → add LP
                </p>
              </div>
            ) : tab === "remove" ? (
              <div className="mt-4 space-y-3">
                <Field
                  label="LP tokens"
                  bal={
                    walletLp != null
                      ? Number(formatUnits(walletLp as bigint, 18)).toFixed(6)
                      : "—"
                  }
                >
                  <input
                    value={lpAmt}
                    onChange={(e) => setLpAmt(e.target.value)}
                    placeholder="0.0"
                    className={inputCls}
                    type="number"
                    min={0}
                  />
                </Field>
                <button
                  type="button"
                  disabled={!live || isPending || confirming}
                  onClick={onRemoveLiquidity}
                  className="btn-green w-full py-2.5 text-sm disabled:opacity-50"
                >
                  {isPending || confirming ? "Confirm…" : "Approve / Remove liquidity"}
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-border bg-bg px-3 py-2 text-xs">
                  <div className="text-muted">Wallet LP</div>
                  <div className="font-mono text-ink">
                    {walletLp != null
                      ? // Show full precision — Uni V2 LP for this pool is often &lt; 0.01
                        formatUnits(walletLp as bigint, 18)
                      : "—"}
                  </div>
                  <div className="mt-1 text-muted">Staked in gauge</div>
                  <div className="font-mono text-green">
                    {stakedLp > 0n ? formatUnits(stakedLp, 18) : "0"}
                  </div>
                </div>
                <p className="text-[10px] leading-relaxed text-muted">
                  LP amounts look tiny (~0.003) by Uniswap math — that can still be{" "}
                  <strong className="text-ink-soft">most of the pool</strong>. No minimum to stake;
                  use Max and confirm in wallet.
                </p>
                <Field label="Amount (LP)">
                  <div className="flex gap-2">
                    <input
                      value={stakeAmt}
                      onChange={(e) => setStakeAmt(e.target.value)}
                      placeholder="0.0"
                      className={inputCls}
                      type="text"
                      inputMode="decimal"
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded-lg border border-border-strong px-2.5 text-[11px] font-semibold text-ink hover:bg-bg disabled:opacity-40"
                      disabled={walletLp == null || (walletLp as bigint) === 0n}
                      onClick={() => {
                        if (walletLp != null && (walletLp as bigint) > 0n) {
                          // Exact balance string — avoid toFixed rounding that exceeds balance
                          setStakeAmt(formatUnits(walletLp as bigint, 18));
                        }
                      }}
                    >
                      Max
                    </button>
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={
                      !gaugeLive ||
                      isPending ||
                      confirming ||
                      walletLp == null ||
                      (walletLp as bigint) === 0n
                    }
                    onClick={onStake}
                    className="btn-green py-2 text-xs disabled:opacity-50"
                  >
                    {isPending || confirming ? "Confirm…" : "Stake LP"}
                  </button>
                  <button
                    type="button"
                    disabled={!gaugeLive || isPending || confirming || stakedLp === 0n}
                    onClick={onUnstake}
                    className="rounded-lg border border-border-strong py-2 text-xs font-semibold text-ink hover:bg-bg disabled:opacity-50"
                  >
                    Unstake
                  </button>
                </div>
                {!gaugeLive && (
                  <p className="text-[10px] text-muted">
                    Gauge deploys after the SEMA/{pair.quoteSymbol} pair is live.
                  </p>
                )}
              </div>
            )}

            {txHash && (
              <a
                href={`${network.explorer}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-1 text-[10px] text-green-soft hover:underline"
              >
                View tx <ExternalLink size={10} />
              </a>
            )}
          </div>

          <div className="rounded-xl border border-border bg-panel p-3 text-[10px] leading-relaxed text-muted">
            Trading fees accrue to LP holders from the pool. Points are separate and only for
            gauge-staked LP. Research use only · not investment advice.
          </div>
        </div>
      </div>

    </div>
  );
}

const inputCls =
  "input w-full rounded-lg border border-border-strong bg-bg px-3 py-2 font-mono text-sm text-ink outline-none focus:border-green";

function Stat({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
        <Icon size={12} className="text-green" />
        {label}
      </div>
      <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-ink">{value}</div>
      <div className="text-[10px] text-ink-soft">{note}</div>
    </div>
  );
}

function Field({
  label,
  bal,
  children,
}: {
  label: string;
  bal?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-muted">
        <span>{label}</span>
        {bal != null && <span className="font-mono normal-case text-faint">bal {bal}</span>}
      </div>
      {children}
    </label>
  );
}
