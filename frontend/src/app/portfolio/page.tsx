"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits } from "viem";
import { TopBar } from "@/components/TopBar";
import { PositionsTable } from "@/components/PositionsTable";
import { AccountCard } from "@/components/AccountCard";
import { MyVouchers } from "@/components/marketplace/MyVouchers";
import { usePositions } from "@/lib/usePositions";
import { useAppContracts, useNetworkConfig } from "@/lib/useAppContracts";
import { Panel } from "@/components/ui/Panel";
import { SPOT_MAINNET, SPOT_TESTNET } from "@/lib/spot";
import { ERC20_ABI } from "@/lib/uniswap-v2";
import { SEMA_PER_KIT } from "@/lib/redeem/constants";

const ZERO = "0x0000000000000000000000000000000000000000";

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const network = useNetworkConfig();
  const { perpsEngine } = useAppContracts();
  const { positions, refetch } = usePositions(address);
  const [closingId, setClosingId] = useState<bigint | undefined>();
  const { writeContract, data: hash } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const pairCfg = network.testnet ? SPOT_TESTNET : SPOT_MAINNET;
  const spotLive =
    pairCfg.live &&
    pairCfg.baseToken !== ZERO &&
    pairCfg.quoteToken !== ZERO;

  const { data: semaBal } = useReadContract({
    address: pairCfg.baseToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && spotLive && !!address,
      refetchInterval: 12_000,
    },
  });
  const { data: usdgBal } = useReadContract({
    address: pairCfg.quoteToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && spotLive && !!address,
      refetchInterval: 12_000,
    },
  });
  const { data: lpBal } = useReadContract({
    address: pairCfg.pair,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && spotLive && pairCfg.pair !== ZERO && !!address,
      refetchInterval: 12_000,
    },
  });

  const sema =
    semaBal !== undefined
      ? Number(formatUnits(semaBal as bigint, pairCfg.baseDecimals))
      : null;
  const usdg =
    usdgBal !== undefined
      ? Number(formatUnits(usdgBal as bigint, pairCfg.quoteDecimals))
      : null;
  const lp =
    lpBal !== undefined ? Number(formatUnits(lpBal as bigint, 18)) : null;

  useEffect(() => {
    if (!isSuccess || closingId === undefined) return;
    setClosingId(undefined);
    refetch();
  }, [isSuccess, closingId, refetch]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar />
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <div>
          <h1 className="text-lg font-semibold text-ink">Portfolio</h1>
          <p className="text-sm text-muted">
            Spot balances, perps positions, and kit voucher NFTs on Robinhood Chain
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            {/* Spot balances — SEMA from Uniswap swaps lands here */}
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Spot balances</h2>
                  <p className="text-xs text-muted">
                    {pairCfg.baseSymbol}/{pairCfg.quoteSymbol} on{" "}
                    {network.shortLabel}
                  </p>
                </div>
                <Link
                  href="/spot"
                  className="text-xs font-medium text-ink underline-offset-4 hover:underline"
                >
                  Trade spot →
                </Link>
              </div>
              <Panel className="p-4">
                {!isConnected ? (
                  <p className="text-sm text-muted">Connect a wallet to view balances.</p>
                ) : !spotLive ? (
                  <p className="text-sm text-muted">
                    Spot pool not live on this network yet. Switch to mainnet for SEMA/USDG.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <BalanceTile
                        symbol={pairCfg.baseSymbol}
                        label="Semaglutide token"
                        value={sema}
                        decimals={4}
                        highlight
                      />
                      <BalanceTile
                        symbol={pairCfg.quoteSymbol}
                        label="Global Dollar"
                        value={usdg}
                        decimals={2}
                      />
                      <BalanceTile
                        symbol="LP"
                        label="SEMA/USDG pool share"
                        value={lp}
                        decimals={6}
                      />
                    </div>
                    {sema != null && sema > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green/25 bg-green/5 px-3 py-2 text-xs text-ink-soft">
                        <span>
                          You hold{" "}
                          <strong className="font-mono text-ink">
                            {sema.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                            SEMA
                          </strong>
                          {sema >= SEMA_PER_KIT
                            ? ` · enough for ${Math.floor(sema / SEMA_PER_KIT)} kit${Math.floor(sema / SEMA_PER_KIT) === 1 ? "" : "s"} (${SEMA_PER_KIT} SEMA each)`
                            : ` · need ${SEMA_PER_KIT} SEMA per research kit`}
                        </span>
                        <div className="flex gap-2">
                          <Link
                            href="/redeem"
                            className="font-semibold text-green-soft hover:underline"
                          >
                            Redeem →
                          </Link>
                          <Link
                            href="/spot"
                            className="font-semibold text-ink hover:underline"
                          >
                            Buy more →
                          </Link>
                        </div>
                      </div>
                    )}
                    {sema != null && sema === 0 && (
                      <p className="text-xs text-muted">
                        No SEMA yet.{" "}
                        <Link href="/spot" className="text-green-soft hover:underline">
                          Swap USDG → SEMA on Spot
                        </Link>
                      </p>
                    )}
                  </div>
                )}
              </Panel>
            </section>

            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Positions</h2>
                  <p className="text-xs text-muted">Isolated-margin peptide perps</p>
                </div>
                <Link
                  href="/perps"
                  className="text-xs font-medium text-ink underline-offset-4 hover:underline"
                >
                  Trade →
                </Link>
              </div>
              <Panel className="p-4">
                {!isConnected ? (
                  <p className="text-sm text-muted">Connect a wallet to view positions.</p>
                ) : (
                  <PositionsTable
                    positions={positions}
                    onClose={(id) => {
                      setClosingId(id);
                      writeContract({
                        ...perpsEngine,
                        functionName: "closePosition",
                        args: [id],
                      });
                    }}
                    closingId={closingId}
                  />
                )}
              </Panel>
            </section>

            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Kit voucher NFTs</h2>
                  <p className="text-xs text-muted">
                    PEPT-KIT receipts from marketplace purchases — redeemable for physical kits
                  </p>
                </div>
                <Link
                  href="/waitlist?from=marketplace"
                  className="text-xs font-medium text-ink underline-offset-4 hover:underline"
                >
                  Waitlist →
                </Link>
              </div>
              <MyVouchers
                title="Vial / kit NFTs"
                description="Each marketplace checkout mints a PEPT-KIT NFT to your wallet"
                compact={false}
              />
            </section>
          </div>

          <div className="space-y-3">
            <AccountCard />
          </div>
        </div>
      </div>
    </div>
  );
}

function BalanceTile({
  symbol,
  label,
  value,
  decimals,
  highlight,
}: {
  symbol: string;
  label: string;
  value: number | null;
  decimals: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-xl border border-green/30 bg-green/5 px-3 py-3"
          : "rounded-xl border border-border bg-bg px-3 py-3"
      }
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        {symbol}
      </div>
      <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-ink">
        {value == null
          ? "—"
          : value.toLocaleString(undefined, {
              maximumFractionDigits: decimals,
              minimumFractionDigits: 0,
            })}
      </div>
      <div className="mt-0.5 text-[10px] text-muted">{label}</div>
    </div>
  );
}
