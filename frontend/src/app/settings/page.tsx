"use client";

import { TopBar } from "@/components/TopBar";
import { Panel } from "@/components/ui/Panel";
import { useNetworkConfig } from "@/lib/useAppContracts";
import { NetworkToggle } from "@/components/NetworkToggle";

export default function SettingsPage() {
  const network = useNetworkConfig();
  const c = network.contracts;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar />
      <div className="mx-auto w-full max-w-xl flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-ink">Settings</h1>
          <NetworkToggle />
        </div>
        <Panel className="space-y-3 p-4 text-sm">
          <Row k="Network" v={`${network.label} (${network.chainId})`} />
          <Row k="Collateral" v={`${network.collateralSymbol} · ${network.collateralName}`} />
          <Row k="Contracts live" v={network.contractsLive ? "Yes" : "Pending deploy"} />
          <Row k="Oracle" v={c.PeptideOracle} mono />
          <Row k="PerpsEngine" v={c.PerpsEngine} mono />
          <Row k="PLP Pool" v={c.PerpsLiquidityPool} mono />
          <Row k={network.collateralSymbol} v={c.collateral} mono />
          <Row k="Marketplace" v={c.MarketplaceShop} mono />
          <Row k="Voucher NFT" v={c.PeptideVoucher} mono />
          <Row k="Explorer" v={network.explorer} mono />
        </Panel>
        <p className="text-xs text-muted">
          {network.testnet
            ? "Testnet: mintable USDC faucet, oracle refresh via GitHub Actions."
            : "Mainnet: pay with real USDG (Global Dollar). No faucet mint."}
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
