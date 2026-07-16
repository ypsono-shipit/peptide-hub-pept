"use client";

import { TopBar } from "@/components/TopBar";
import { LiquidityPanel } from "@/components/LiquidityPanel";
import { useNetworkConfig } from "@/lib/useAppContracts";

export default function LiquidityPage() {
  const network = useNetworkConfig();
  const c = network.contracts;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <h1 className="text-lg font-semibold text-ink">PLP Liquidity</h1>
          <p className="text-sm text-muted">
            Deposit {network.collateralSymbol} to backstop peptide perps open interest ·{" "}
            {network.shortLabel}
          </p>
        </div>
        <LiquidityPanel />
        <div className="rounded-xl border border-border bg-panel p-3 font-mono text-[10px] leading-relaxed text-muted">
          Pool {c.PerpsLiquidityPool}
          <br />
          PLP {c.PLP}
          <br />
          Engine {c.PerpsEngine}
          <br />
          {network.collateralSymbol} {c.collateral}
        </div>
      </div>
    </div>
  );
}
