"use client";

import { TopBar } from "@/components/TopBar";
import { LiquidityPanel } from "@/components/LiquidityPanel";
import { TESTNET_CONTRACTS } from "@/lib/deployments";

export default function LiquidityPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <h1 className="text-lg font-semibold text-ink">PLP Liquidity</h1>
          <p className="text-sm text-muted">
            Deposit testnet USDC to backstop peptide perps open interest
          </p>
        </div>
        <LiquidityPanel />
        <div className="rounded-xl border border-border bg-panel p-3 font-mono text-[10px] leading-relaxed text-muted">
          Pool {TESTNET_CONTRACTS.PerpsLiquidityPool}
          <br />
          PLP {TESTNET_CONTRACTS.PLP}
          <br />
          Engine {TESTNET_CONTRACTS.PerpsEngine}
          <br />
          USDC {TESTNET_CONTRACTS.USDC}
        </div>
      </div>
    </div>
  );
}
