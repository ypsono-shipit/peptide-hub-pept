"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { cn } from "@/lib/cn";
import {
  CHAIN_MAINNET,
  CHAIN_TESTNET,
  NETWORKS,
  getNetwork,
} from "@/lib/deployments";

/**
 * Network control: shows active network (default Testnet).
 * Dropdown opens downward with Testnet + Mainnet options.
 */
export function NetworkToggle({ className }: { className?: string }) {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Prefer testnet when wallet is on an unsupported chain
  const network = getNetwork(chainId);
  const onMainnet = chainId === CHAIN_MAINNET;
  const mainnetLive = NETWORKS[CHAIN_MAINNET]?.contractsLive ?? false;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (target: "testnet" | "mainnet") => {
    const id = target === "mainnet" ? CHAIN_MAINNET : CHAIN_TESTNET;
    setOpen(false);
    if (id === chainId) return;
    switchChain?.({ chainId: id });
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-panel px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft transition hover:bg-panel-hover hover:text-ink disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Network: ${network.shortLabel}. Open to switch.`}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            onMainnet ? "bg-green" : "bg-green/80",
          )}
        />
        <span className="hidden sm:inline">{network.shortLabel}</span>
        <span className="sm:hidden">{onMainnet ? "Main" : "Test"}</span>
        <ChevronDown
          size={12}
          className={cn("text-muted transition", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 min-w-[11.5rem] overflow-hidden rounded-xl border border-border bg-panel py-1 shadow-lg"
        >
          <NetworkOption
            active={!onMainnet}
            label="Testnet"
            detail="USDC · 46630"
            onClick={() => select("testnet")}
          />
          <NetworkOption
            active={onMainnet}
            label="Mainnet"
            detail={mainnetLive ? "USDG · 4663" : "Coming soon · USDG"}
            muted={!mainnetLive}
            onClick={() => select("mainnet")}
          />
          {!isConnected && (
            <p className="border-t border-border px-3 py-2 text-[10px] leading-snug text-muted">
              Connect a wallet to switch networks in MetaMask.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function NetworkOption({
  active,
  label,
  detail,
  muted,
  onClick,
}: {
  active: boolean;
  label: string;
  detail: string;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition hover:bg-panel-hover",
        active && "bg-bg",
        muted && "opacity-80",
      )}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
        {active && <span className="h-1.5 w-1.5 rounded-full bg-green" />}
        {label}
      </span>
      <span className="text-[10px] text-muted">{detail}</span>
    </button>
  );
}
