"use client";

import { TopBar } from "@/components/TopBar";
import { Panel } from "@/components/ui/Panel";
import { COLLATERAL_SYMBOL, TESTNET_CONTRACTS } from "@/lib/deployments";

export default function SettingsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar />
      <div className="mx-auto w-full max-w-xl flex-1 space-y-4 overflow-y-auto p-4">
        <h1 className="text-lg font-semibold text-ink">Settings</h1>
        <Panel className="space-y-3 p-4 text-sm">
          <Row k="Network" v="Robinhood Chain Testnet (46630)" />
          <Row k="Collateral" v={COLLATERAL_SYMBOL} />
          <Row k="Oracle" v={TESTNET_CONTRACTS.PeptideOracle} mono />
          <Row k="PerpsEngine" v={TESTNET_CONTRACTS.PerpsEngine} mono />
          <Row k="PLP Pool" v={TESTNET_CONTRACTS.PerpsLiquidityPool} mono />
          <Row k="USDC" v={TESTNET_CONTRACTS.USDC} mono />
        </Panel>
        <p className="text-xs text-muted">
          Testnet only. Oracle prices refresh via GitHub Actions every 3 hours. Market orders only.
        </p>
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-0">
      <span className="text-[11px] text-muted">{k}</span>
      <span className={mono ? "break-all font-mono text-xs text-ink-soft" : "text-ink"}>{v}</span>
    </div>
  );
}
