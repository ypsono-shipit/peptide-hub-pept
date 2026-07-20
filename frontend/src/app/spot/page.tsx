"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useConnect } from "wagmi";
import { ArrowDownUp, ExternalLink, FlaskConical, Info } from "lucide-react";
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
} from "@/lib/spot";
import { MOCK_MARKETS } from "@/lib/markets";

export default function SpotPage() {
  const network = useNetworkConfig();
  const pair = network.testnet ? SPOT_TESTNET : SPOT_MAINNET;
  const seMarket = MOCK_MARKETS.find((m) => m.symbol === "SEMA-PERP")!;
  const { price: oraclePrice, isLive } = useOraclePrice(pair.oracleKey, seMarket.price);
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amountIn, setAmountIn] = useState("");
  // Demo pool mark: tracks oracle until Uniswap pair is live (± small spread for UI)
  const poolPrice = useMemo(() => {
    if (pair.live) return oraclePrice; // wire reserves later
    return oraclePrice > 0 ? oraclePrice * 1.012 : 0; // illustrative premium
  }, [oraclePrice, pair.live]);

  const divBps = divergenceBps(poolPrice, oraclePrice);
  const divWarn = divBps != null && divBps >= DIVERGENCE_WARN_BPS;

  const inNum = Number(amountIn);
  const amountOut =
    inNum > 0 && poolPrice > 0
      ? side === "buy"
        ? inNum / poolPrice // quote → SEMA
        : inNum * poolPrice // SEMA → quote
      : 0;

  const inLabel = side === "buy" ? pair.quoteSymbol : pair.baseSymbol;
  const outLabel = side === "buy" ? pair.baseSymbol : pair.quoteSymbol;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar
        market={{
          symbol: `${pair.baseSymbol}/${pair.quoteSymbol}`,
          name: pair.baseName,
          price: oraclePrice,
          change24h: 0,
          volume24h: 0,
          unit: "$/mg",
          oracleKey: pair.oracleKey,
        }}
        price={oraclePrice}
        isLive={isLive}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex-row lg:overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:overflow-y-auto">
          {/* Mode tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-green/15 px-2.5 py-1 text-xs font-semibold text-green">
              Spot
            </span>
            <Link
              href="/perps"
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-muted hover:bg-panel hover:text-ink"
            >
              Perps →
            </Link>
            <Link
              href="/redeem"
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-muted hover:bg-panel hover:text-ink"
            >
              Redeem vials →
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
                  ? "PeptideOracle · dual-source SEMA-PERP"
                  : "Oracle offline · reference mark"
              }
              tone="oracle"
            />
            <PriceCard
              label="Pool price (spot)"
              value={poolPrice}
              unit={`$ / ${pair.baseSymbol}`}
              note={
                pair.live
                  ? `Uniswap V2 ${pair.baseSymbol}/${pair.quoteSymbol}`
                  : "Demo mark until pool is seeded"
              }
              tone="pool"
            />
            <PriceCard
              label="Oracle ↔ pool"
              value={divBps != null ? divBps / 100 : null}
              unit="%"
              note={
                divWarn
                  ? "Divergence elevated — size carefully"
                  : "Within soft band"
              }
              tone={divWarn ? "warn" : "neutral"}
              isPercent
            />
          </div>

          {divWarn && (
            <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-panel px-4 py-3 text-xs text-ink-soft">
              <Info size={16} className="mt-0.5 shrink-0 text-amber-400" />
              <p>
                Spot pool is{" "}
                <span className="font-semibold text-ink">
                  {(divBps! / 100).toFixed(1)}%
                </span>{" "}
                away from the official research oracle. The oracle is the blended
                lab/vendor $/mg mark — use it for context, not as a hard settlement
                price on the AMM.
              </p>
            </div>
          )}

          <div className="grid min-h-[320px] gap-3 lg:grid-cols-[1fr_200px]">
            <ChartPanel symbol="SEMA-PERP" price={oraclePrice} unit="$/mg" />
            <div className="rounded-xl border border-border bg-panel p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                <FlaskConical size={16} className="text-green" />
                Research utility
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                <strong className="text-ink">1 {pair.baseSymbol} ≈ 1 vial unit</strong>.
                Research Only ships in <strong className="text-ink">kits of 10</strong>, so
                redeem needs <strong className="text-ink">≥10 SEMA</strong> per kit.
              </p>
              <Link
                href="/redeem"
                className="btn-green mt-4 inline-flex w-full justify-center py-2 text-xs"
              >
                Redeem kit flow
              </Link>
              <p className="mt-3 text-[10px] leading-relaxed text-muted">
                Research use only. Not for human consumption. Shipping form → sheet +
                confirmation email; we fulfill manually.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-panel p-4 text-xs text-ink-soft">
            <div className="font-semibold text-ink">Roadmap</div>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>
                Deploy {pair.baseSymbol} ERC-20 + Uniswap V2 pool vs{" "}
                {pair.quoteSymbol}
              </li>
              <li>Seed liquidity · wire router swap on this page</li>
              <li>LP points + limited monthly redemptions</li>
              <li>
                Fully-backed vial launches on{" "}
                <Link href="/launchpad" className="text-green-soft hover:underline">
                  /launchpad
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Swap ticket */}
        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[340px] lg:overflow-y-auto">
          <AccountCard />

          <div className="rounded-xl border border-border bg-panel p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Swap</h2>
              <span className="text-[10px] uppercase tracking-wide text-muted">
                {pair.baseSymbol}/{pair.quoteSymbol}
              </span>
            </div>

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
                  {s === "buy" ? `Buy ${pair.baseSymbol}` : `Sell ${pair.baseSymbol}`}
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
                {amountOut > 0 ? amountOut.toFixed(6) : "—"}
              </div>
              <span className="shrink-0 text-xs font-semibold text-ink">{outLabel}</span>
            </div>

            <div className="mt-3 space-y-1 text-[11px] text-muted">
              <div className="flex justify-between">
                <span>Est. rate</span>
                <span className="font-mono text-ink-soft">
                  1 {pair.baseSymbol} ≈ {poolPrice.toFixed(4)} {pair.quoteSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Oracle reference</span>
                <span className="font-mono text-ink-soft">
                  ${oraclePrice.toFixed(4)}/mg
                </span>
              </div>
              <div className="flex justify-between">
                <span>Slippage (default)</span>
                <span className="font-mono text-ink-soft">1.0%</span>
              </div>
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
            ) : pair.live ? (
              <button type="button" className="btn-green mt-4 w-full py-2.5 text-sm" disabled>
                Swap (wiring router…)
              </button>
            ) : (
              <div className="mt-4 rounded-lg border border-border-strong bg-bg px-3 py-3 text-center">
                <div className="text-xs font-semibold text-ink">Pool not live yet</div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  SEMA token + {pair.quoteSymbol} Uniswap V2 pool deploy next. UI and
                  oracle path are ready; swaps enable when{" "}
                  <code className="text-ink-soft">pair.live</code> is set.
                </p>
                {address && (
                  <p className="mt-2 truncate font-mono text-[10px] text-faint">
                    {address}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-panel p-3 text-[10px] leading-relaxed text-muted">
            Research use only. Not medical advice. Spot price is an AMM mark; official
            research pricing comes from PeptideOracle (PeptideScouter + vendor basket).
            {network.explorer && (
              <a
                href={network.explorer}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-green-soft hover:underline"
              >
                Explorer <ExternalLink size={10} />
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
