"use client";

import { TopBar } from "@/components/TopBar";
import { StakePanel } from "@/components/StakePanel";
import { Panel } from "@/components/ui/Panel";

export default function StakePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar />
      <div className="mx-auto w-full max-w-xl flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <h1 className="text-lg font-semibold text-ink">Stake $PEPT</h1>
          <p className="text-sm text-muted">
            Stake protocol token for rewards (OHM-style bonding stays dormant on testnet)
          </p>
        </div>
        <StakePanel />
        <Panel className="p-3 text-xs text-muted">
          Bond markets are not configured; no reserve Stock Tokens on testnet yet.
        </Panel>
      </div>
    </div>
  );
}
