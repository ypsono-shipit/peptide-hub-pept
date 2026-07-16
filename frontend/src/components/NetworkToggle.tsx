"use client";

import { useChainId } from "wagmi";
import { cn } from "@/lib/cn";
import { CHAIN_MAINNET, getNetwork } from "@/lib/deployments";

/**
 * Network indicator (top-right). Shows the active chain only.
 * Hover tooltip surfaces mainnet status — no side-by-side toggle.
 */
export function NetworkToggle({ className }: { className?: string }) {
  const chainId = useChainId();
  const network = getNetwork(chainId);
  const onMainnet = chainId === CHAIN_MAINNET;

  const tooltip = onMainnet
    ? "Robinhood Chain mainnet · USDG payments"
    : network.contractsLive
      ? "Robinhood Chain Testnet · Mainnet coming soon (USDG)"
      : "Robinhood Chain Testnet · Mainnet coming soon";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg border border-border bg-panel px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft",
        className,
      )}
      title={tooltip}
      aria-label={tooltip}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          onMainnet ? "bg-green" : "bg-green/70",
        )}
      />
      <span className="hidden sm:inline">{network.shortLabel}</span>
      <span className="sm:hidden">{onMainnet ? "Main" : "Test"}</span>
    </div>
  );
}
