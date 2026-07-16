"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { cn } from "@/lib/cn";
import { CHAIN_MAINNET, CHAIN_TESTNET, NETWORKS } from "@/lib/deployments";

/**
 * Top-right testnet ↔ mainnet switcher.
 * Switches the wallet chain when connected; still updates UI chain via switchChain.
 */
export function NetworkToggle({ className }: { className?: string }) {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChain, isPending, error } = useSwitchChain();

  const active: "testnet" | "mainnet" =
    chainId === CHAIN_MAINNET ? "mainnet" : "testnet";

  const select = (target: "testnet" | "mainnet") => {
    const id = target === "mainnet" ? CHAIN_MAINNET : CHAIN_TESTNET;
    if (id === chainId) return;
    if (switchChain) {
      switchChain({ chainId: id });
    }
  };

  const mainnetLive = NETWORKS[CHAIN_MAINNET]?.contractsLive ?? false;

  return (
    <div className={cn("flex flex-col items-end gap-0.5", className)}>
      <div
        className="flex items-center rounded-lg border border-border bg-panel p-0.5 text-[11px] font-semibold"
        role="group"
        aria-label="Network"
      >
        <button
          type="button"
          disabled={isPending}
          onClick={() => select("testnet")}
          className={cn(
            "rounded-md px-2.5 py-1.5 transition",
            active === "testnet"
              ? "bg-panel-hover text-ink shadow-sm"
              : "text-muted hover:text-ink",
          )}
        >
          Testnet
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => select("mainnet")}
          title={
            mainnetLive
              ? "Robinhood Chain mainnet · USDG"
              : "Mainnet contracts pending deploy — switch still works for wallet"
          }
          className={cn(
            "rounded-md px-2.5 py-1.5 transition",
            active === "mainnet"
              ? "bg-green/15 text-green-soft ring-1 ring-green/40"
              : "text-muted hover:text-ink",
          )}
        >
          Mainnet
          {!mainnetLive && (
            <span className="ml-1 text-[9px] font-normal text-muted">soon</span>
          )}
        </button>
      </div>
      <div className="hidden text-[9px] text-muted sm:block">
        {active === "mainnet" ? "USDG · 4663" : "USDC · 46630"}
        {isConnected ? "" : " · connect to switch wallet"}
        {error ? ` · ${error.message.slice(0, 40)}` : ""}
      </div>
    </div>
  );
}
