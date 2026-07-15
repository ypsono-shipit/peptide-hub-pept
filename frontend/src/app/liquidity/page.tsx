"use client";

import { LiquidityPanel } from "@/components/LiquidityPanel";
import { TESTNET_CONTRACTS } from "@/lib/deployments";

export default function LiquidityPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-2">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">PLP Liquidity</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Peptide Liquidity Provider pool — backstops perps open interest on Robinhood testnet.
        </p>
      </div>
      <LiquidityPanel />
      <div className="rounded-2xl bg-white/20 p-3 text-[11px] leading-relaxed text-ink-soft">
        Pool <code className="text-ink">{TESTNET_CONTRACTS.PerpsLiquidityPool}</code>
        <br />
        PLP token <code className="text-ink">{TESTNET_CONTRACTS.PLP}</code>
        <br />
        PerpsEngine <code className="text-ink">{TESTNET_CONTRACTS.PerpsEngine}</code>
      </div>
    </div>
  );
}
