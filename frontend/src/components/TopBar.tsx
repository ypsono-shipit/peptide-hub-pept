"use client";

import { formatUnits } from "viem";
import { useAccount, useConnect, useDisconnect, useReadContract } from "wagmi";
import { Bell, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { collateralContract } from "@/lib/contracts";
import { COLLATERAL_DECIMALS, COLLATERAL_SYMBOL } from "@/lib/deployments";
import type { Market } from "@/lib/markets";

export function TopBar({
  market,
  price,
  isLive,
}: {
  market?: Market;
  price?: number;
  isLive?: boolean;
}) {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  const bal = useReadContract({
    ...collateralContract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const change = market?.change24h ?? 0;
  const pos = change >= 0;

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-bg px-4">
      {market && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-panel text-[10px] font-bold tracking-tight text-ink">
              {market.symbol.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">{market.symbol}</span>
                <span className="rounded bg-panel-hover px-1.5 py-0.5 text-[10px] text-muted">
                  Perpetual
                </span>
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
            <div>
              <div className="font-mono text-base font-semibold tabular-nums text-ink">
                ${price?.toFixed(market.unit === "$/mg" ? 2 : 4) ?? "—"}
                {market.unit === "$/mg" && (
                  <span className="ml-1 text-[10px] font-normal text-muted">/mg</span>
                )}
              </div>
              <div className={cn("font-mono tabular-nums", pos ? "text-positive" : "text-negative")}>
                {pos ? "+" : ""}
                {change.toFixed(2)}%
              </div>
            </div>
            <Stat label="Mark Price" value={price !== undefined ? `$${price.toFixed(2)}` : "—"} />
            <Stat
              label="24H Change"
              value={`${pos ? "+" : ""}${change.toFixed(2)}%`}
              tone={pos ? "pos" : "neg"}
            />
            <Stat label="Oracle" value={isLive ? "Live" : "Fallback"} tone={isLive ? "pos" : undefined} />
            <Stat label="24H Vol" value="Demo" muted />
          </div>
        </>
      )}

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-1.5 rounded-lg border border-border bg-panel px-2.5 py-1.5 text-xs text-ink-soft sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-ink" />
          Robinhood Testnet
          <ChevronDown size={12} className="text-muted" />
        </div>
        <button className="rounded-lg p-2 text-muted hover:bg-panel hover:text-ink">
          <Bell size={16} />
        </button>
        {isConnected ? (
          <button
            onClick={() => disconnect()}
            className="flex items-center gap-2 rounded-lg border border-border bg-panel px-2.5 py-1.5 text-xs hover:bg-panel-hover"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border-strong bg-panel-hover text-[10px] font-bold text-ink">
              {address?.slice(2, 4).toUpperCase()}
            </span>
            <span className="hidden font-mono text-ink sm:inline">
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </span>
            {bal.data !== undefined && (
              <span className="hidden text-muted md:inline">
                {Number(formatUnits(bal.data as bigint, COLLATERAL_DECIMALS)).toFixed(2)}{" "}
                {COLLATERAL_SYMBOL}
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary hover:bg-accent"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  tone,
  muted,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
  muted?: boolean;
}) {
  return (
    <div className="hidden lg:block">
      <div className="text-[10px] text-muted">{label}</div>
      <div
        className={cn(
          "font-mono text-xs tabular-nums",
          muted && "text-faint",
          tone === "pos" && "text-positive",
          tone === "neg" && "text-negative",
          !tone && !muted && "text-ink",
        )}
      >
        {value}
      </div>
    </div>
  );
}
