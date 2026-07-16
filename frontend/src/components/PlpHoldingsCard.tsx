"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { COLLATERAL_DECIMALS, PLP_SHARE_DECIMALS } from "@/lib/deployments";
import { useAppContracts, useNetworkConfig } from "@/lib/useAppContracts";
import { Panel } from "@/components/ui/Panel";

function fmtUsdc(v: bigint | undefined) {
  if (v === undefined) return "—";
  return Number(formatUnits(v, COLLATERAL_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function fmtPlp(v: bigint | undefined) {
  if (v === undefined) return "—";
  return Number(formatUnits(v, PLP_SHARE_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function shareOf(amount: bigint, user: bigint, supply: bigint): bigint {
  if (supply === 0n) return 0n;
  return (amount * user) / supply;
}

/** PLP balance, redeemable value, and attributed pool yield for the connected wallet. */
export function PlpHoldingsCard() {
  const { address, isConnected } = useAccount();
  const { plpToken, plpPool } = useAppContracts();
  const network = useNetworkConfig();
  const live = network.contractsLive;
  const COLLATERAL_SYMBOL = network.collateralSymbol;

  const plpBal = useReadContract({
    ...plpToken,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && live },
  });
  const plpSupply = useReadContract({
    ...plpToken,
    functionName: "totalSupply",
    query: { enabled: live },
  });
  const totalAssets = useReadContract({
    ...plpPool,
    functionName: "totalAssets",
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
  const oi = useReadContract({
    ...plpPool,
    functionName: "openInterestUsd",
    query: { enabled: live },
  });
  const maxOi = useReadContract({
    ...plpPool,
    functionName: "maxOpenInterest",
    query: { enabled: live },
  });

  const shares = (plpBal.data as bigint | undefined) ?? 0n;
  const supply = (plpSupply.data as bigint | undefined) ?? 0n;
  const aum = (totalAssets.data as bigint | undefined) ?? 0n;
  const feesRaw = (fees.data as bigint | undefined) ?? 0n;
  const profitsRaw = (profits.data as bigint | undefined) ?? 0n;
  const lossesRaw = (losses.data as bigint | undefined) ?? 0n;

  const redeemable = supply > 0n ? (shares * aum) / supply : 0n;
  const ownershipBps = supply > 0n ? Number((shares * 10_000n) / supply) / 100 : 0;

  const myFees = shareOf(feesRaw, shares, supply);
  const myLosses = shareOf(lossesRaw, shares, supply);
  const myProfitsPaid = shareOf(profitsRaw, shares, supply);
  const myNetYield = myFees + myLosses - myProfitsPaid;

  const costBasisApprox = shares;
  const unrealized = redeemable - costBasisApprox;

  const openInt = (oi.data as bigint | undefined) ?? 0n;
  const maxOpen = (maxOi.data as bigint | undefined) ?? 0n;
  const utilPct = maxOpen > 0n ? Number((openInt * 10_000n) / maxOpen) / 100 : 0;

  const yieldPositive = myNetYield >= 0n;
  const unrealizedPositive = unrealized >= 0n;

  if (!isConnected) {
    return (
      <Panel className="p-4">
        <h3 className="text-sm font-semibold text-ink">PLP holdings</h3>
        <p className="mt-1 text-xs text-muted">Connect a wallet to see liquidity shares and yield.</p>
      </Panel>
    );
  }

  if (!live) {
    return (
      <Panel className="p-4">
        <h3 className="text-sm font-semibold text-ink">PLP holdings</h3>
        <p className="mt-1 text-xs text-muted">
          Mainnet vault not deployed yet. Switch to Testnet or fund deploy.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">PLP holdings</h3>
          <p className="mt-0.5 text-[11px] text-muted">
            Liquidity provider shares · {network.shortLabel} · {COLLATERAL_SYMBOL}
          </p>
        </div>
        <Link
          href="/liquidity"
          className="shrink-0 text-xs font-medium text-ink underline-offset-4 hover:underline"
        >
          Manage →
        </Link>
      </div>

      {shares === 0n ? (
        <div className="rounded-xl border border-border bg-bg px-3 py-4 text-center">
          <p className="text-xs text-muted">No PLP yet.</p>
          <Link
            href="/liquidity"
            className="mt-2 inline-block text-xs font-semibold text-ink underline underline-offset-2"
          >
            Deposit {COLLATERAL_SYMBOL} into the vault
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <Metric
              label="PLP shares"
              value={fmtPlp(shares)}
              note={`${ownershipBps.toFixed(2)}% of supply`}
            />
            <Metric
              label="Redeemable value"
              value={`${fmtUsdc(redeemable)} ${COLLATERAL_SYMBOL}`}
              note={`Pool AUM ${fmtUsdc(aum)} ${COLLATERAL_SYMBOL}`}
            />
            <Metric
              label="Your net yield"
              value={`${yieldPositive ? "+" : "−"}${fmtUsdc(myNetYield < 0n ? -myNetYield : myNetYield)} ${COLLATERAL_SYMBOL}`}
              note="Share of fees + losses − profits paid"
              accent={yieldPositive ? "green" : "muted"}
            />
            <Metric
              label="Share price PnL"
              value={`${unrealizedPositive ? "+" : "−"}${fmtUsdc(unrealized < 0n ? -unrealized : unrealized)} ${COLLATERAL_SYMBOL}`}
              note="Value vs 1:1 deposit basis"
              accent={unrealizedPositive ? "green" : "muted"}
            />
          </div>

          <div className="rounded-xl border border-border bg-bg px-3 py-3">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">
              Attributed pool yield
            </div>
            <div className="space-y-1.5 text-xs">
              <Row k="Fees earned (your share)" v={`+${fmtUsdc(myFees)} ${COLLATERAL_SYMBOL}`} good />
              <Row
                k="Trader losses absorbed"
                v={`+${fmtUsdc(myLosses)} ${COLLATERAL_SYMBOL}`}
                good
              />
              <Row
                k="Trader profits paid"
                v={`−${fmtUsdc(myProfitsPaid)} ${COLLATERAL_SYMBOL}`}
              />
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-ink">
                <span>Net to you</span>
                <span className="font-mono tabular-nums">
                  {yieldPositive ? "+" : "−"}
                  {fmtUsdc(myNetYield < 0n ? -myNetYield : myNetYield)} {COLLATERAL_SYMBOL}
                </span>
              </div>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-muted">
              Yield accrues in share price (AUM / supply). There is no separate claim — withdraw PLP
              to realize. Utilization {utilPct.toFixed(1)}%.
            </p>
          </div>
        </>
      )}

      <a
        href={`${network.explorer}/token/${plpToken.address}?a=${address}`}
        target="_blank"
        rel="noreferrer"
        className="block text-center text-[10px] text-muted underline"
      >
        PLP token on explorer ↗
      </a>
    </Panel>
  );
}

function Metric({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note?: string;
  accent?: "green" | "muted";
}) {
  return (
    <div className="rounded-xl border border-border bg-bg px-3 py-2.5">
      <div className="text-[11px] text-muted">{label}</div>
      <div
        className={
          accent === "green"
            ? "mt-0.5 font-mono text-sm font-semibold tabular-nums text-green-soft"
            : "mt-0.5 font-mono text-sm font-semibold tabular-nums text-ink"
        }
      >
        {value}
      </div>
      {note && <div className="mt-0.5 text-[10px] text-muted">{note}</div>}
    </div>
  );
}

function Row({ k, v, good }: { k: string; v: string; good?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-muted">
      <span>{k}</span>
      <span className={good ? "font-mono tabular-nums text-green-soft" : "font-mono tabular-nums text-ink"}>
        {v}
      </span>
    </div>
  );
}
