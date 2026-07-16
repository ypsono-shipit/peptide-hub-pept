"use client";

import { useEffect, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { cn } from "@/lib/cn";
import { COLLATERAL_DECIMALS } from "@/lib/deployments";
import { useAppContracts, useNetworkConfig } from "@/lib/useAppContracts";

function sizeUsdFromMargin(collateralRaw: bigint, leverage: number): bigint {
  const scale = 10n ** BigInt(18 - COLLATERAL_DECIMALS);
  return collateralRaw * scale * BigInt(leverage);
}

export function OrderTicket({
  symbol,
  price,
  marketKey,
  unit,
  onPositionChanged,
}: {
  symbol: string;
  price: number;
  marketKey?: `0x${string}`;
  unit?: "$" | "$/mg";
  onPositionChanged?: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { collateral, perpsEngine } = useAppContracts();
  const network = useNetworkConfig();
  const COLLATERAL_SYMBOL = network.collateralSymbol;
  const [side, setSide] = useState<"long" | "short">("long");
  const [leverage, setLeverage] = useState(10);
  const [size, setSize] = useState("1000");
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop">("market");

  const sizeNum = Number(size) || 0;
  const notional = sizeNum * leverage;
  const liquidationPrice =
    side === "long" ? price * (1 - 1 / leverage) : price * (1 + 1 / leverage);
  const estFee = notional * 0.001;
  const posSize = price > 0 ? notional / price : 0;
  const maxProfit = notional * 0.12;
  const maxLoss = sizeNum * 0.9;

  const collateralAmount = (() => {
    try {
      return size ? parseUnits(size, COLLATERAL_DECIMALS) : 0n;
    } catch {
      return 0n;
    }
  })();
  const sizeUsd = sizeUsdFromMargin(collateralAmount, leverage);

  const collateralBalance = useReadContract({
    ...collateral,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && network.contractsLive },
  });
  const allowance = useReadContract({
    ...collateral,
    functionName: "allowance",
    args: address ? [address, perpsEngine.address] : undefined,
    query: { enabled: !!address && network.contractsLive },
  });

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isSuccess) return;
    collateralBalance.refetch();
    allowance.refetch();
    reset();
    onPositionChanged?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const needsApproval =
    collateralAmount > 0n && ((allowance.data as bigint | undefined) ?? 0n) < collateralAmount;
  const busy = isPending || confirming;
  const bal =
    collateralBalance.data !== undefined
      ? Number(formatUnits(collateralBalance.data as bigint, COLLATERAL_DECIMALS))
      : 0;

  const mint = () => {
    if (!network.canMintCollateral) return;
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
      args: [perpsEngine.address, collateralAmount],
    });
  const open = () => {
    if (!marketKey || !network.contractsLive) return;
    writeContract({
      ...perpsEngine,
      functionName: "openPosition",
      args: [marketKey, side === "long", sizeUsd, collateralAmount],
    });
  };

  const setPct = (pct: number) => {
    if (bal > 0) setSize((bal * pct).toFixed(2));
  };

  return (
    <div className="flex w-full flex-col rounded-xl border border-border bg-panel lg:w-[320px] lg:shrink-0">
      <div className="flex border-b border-border text-sm">
        <button className="flex-1 border-b-2 border-ink py-2.5 font-medium text-ink">Trade</button>
        <button className="flex-1 py-2.5 text-muted" title="Market orders only on-chain">
          Limit Order
        </button>
      </div>

      <div className="flex flex-col gap-3 p-3">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-bg p-1">
          <button
            onClick={() => setSide("long")}
            className={cn(
              "rounded-md py-2 text-sm font-semibold",
              side === "long" ? "bg-green text-black" : "text-muted hover:text-ink",
            )}
          >
            Buy / Long
          </button>
          <button
            onClick={() => setSide("short")}
            className={cn(
              "rounded-md py-2 text-sm font-semibold",
              side === "short"
                ? "border border-ink bg-transparent text-ink"
                : "text-muted hover:text-ink",
            )}
          >
            Sell / Short
          </button>
        </div>

        <div className="flex gap-1 text-[11px]">
          {(["market", "limit", "stop"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              disabled={t !== "market"}
              title={t !== "market" ? "Coming soon; oracle market orders only" : undefined}
              className={cn(
                "flex-1 rounded-md py-1.5 capitalize",
                orderType === t && t === "market"
                  ? "bg-panel-hover text-ink"
                  : "text-faint",
                t !== "market" && "cursor-not-allowed opacity-50",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-1 flex justify-between text-[11px] text-muted">
            <span>Available</span>
            <span className="font-mono tabular-nums text-ink-soft">
              {bal.toLocaleString(undefined, { maximumFractionDigits: 2 })} {COLLATERAL_SYMBOL}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2">
            <input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="min-w-0 flex-1 bg-transparent font-mono text-sm text-ink outline-none"
              placeholder="0.00"
            />
            <span className="text-xs text-muted">{COLLATERAL_SYMBOL}</span>
          </div>
          <div className="mt-2 flex gap-1">
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <button
                key={p}
                onClick={() => setPct(p)}
                className="flex-1 rounded bg-bg py-1 text-[10px] text-muted hover:text-ink"
              >
                {p * 100}%
              </button>
            ))}
          </div>
        </div>

        {isConnected && network.canMintCollateral && (
          <button
            onClick={mint}
            disabled={busy}
            className="text-left text-[11px] text-ink underline-offset-2 hover:underline disabled:opacity-50"
          >
            Mint 10,000 test {COLLATERAL_SYMBOL}
          </button>
        )}
        {isConnected && !network.contractsLive && (
          <p className="text-[11px] text-muted">Mainnet contracts pending deploy.</p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted">Leverage</span>
          <select
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="rounded-md border border-border bg-bg px-2 py-1 font-mono text-xs text-ink outline-none"
          >
            {[2, 3, 5, 10, 15, 20].map((x) => (
              <option key={x} value={x}>
                {x}x
              </option>
            ))}
          </select>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          value={leverage}
          onChange={(e) => setLeverage(Number(e.target.value))}
          className="w-full"
        />

        <div className="space-y-1.5 rounded-lg bg-bg p-2.5 text-[11px]">
          <Row label="Est. Liquidation Price" value={`${liquidationPrice.toFixed(4)} ${unit === "$/mg" ? "$/mg" : COLLATERAL_SYMBOL}`} />
          <Row label="Est. Position Size" value={`${posSize.toFixed(2)} units`} />
          <Row label="Est. Max Profit" value={`+${maxProfit.toFixed(2)} ${COLLATERAL_SYMBOL}`} tone="pos" />
          <Row label="Est. Max Loss" value={`-${maxLoss.toFixed(2)} ${COLLATERAL_SYMBOL}`} tone="neg" />
          <Row label="Est. Fee" value={`${estFee.toFixed(2)} ${COLLATERAL_SYMBOL}`} />
        </div>

        {!isConnected ? (
          <div className="rounded-lg bg-bg py-2.5 text-center text-sm text-muted">Connect wallet</div>
        ) : !marketKey ? (
          <div className="rounded-lg bg-bg py-2.5 text-center text-sm text-muted">Market not tradeable</div>
        ) : (
          <button
            disabled={busy || collateralAmount === 0n}
            onClick={needsApproval ? approve : open}
            className={cn(
              "w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-50",
              side === "long"
                ? "bg-green text-black hover:bg-green-dim"
                : "border border-ink bg-transparent text-ink hover:bg-panel-hover",
            )}
          >
            {busy
              ? "Confirming…"
              : needsApproval
                ? `Approve ${COLLATERAL_SYMBOL}`
                : `${side === "long" ? "Buy / Long" : "Sell / Short"} ${symbol}`}
          </button>
        )}

        {txHash && (
          <a
            href={`${network.explorer}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-center text-[11px] text-muted underline"
          >
            View tx ↗
          </a>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span
        className={cn(
          "font-mono tabular-nums",
          tone === "pos" && "text-positive",
          tone === "neg" && "text-negative",
          !tone && "text-ink-soft",
        )}
      >
        {value}
      </span>
    </div>
  );
}
