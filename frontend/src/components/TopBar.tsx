"use client";

import Link from "next/link";
import { Bell, Settings, ChevronDown } from "lucide-react";
import { formatEther } from "viem";
import { useAccount, useConnect, useDisconnect, useReadContract } from "wagmi";
import { peptContract } from "@/lib/contracts";

export function TopBar() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  const peptBalance = useReadContract({
    ...peptContract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return (
    <header className="flex shrink-0 items-center justify-end gap-3 px-5 pt-5">
      <div className="flex items-center gap-1.5 rounded-2xl border border-glass-border bg-glass px-3 py-2 text-xs font-medium text-ink backdrop-blur-2xl">
        Robinhood Testnet
        <ChevronDown size={13} className="text-ink-soft" />
      </div>

      <button className="flex h-9 w-9 items-center justify-center rounded-2xl border border-glass-border bg-glass text-ink-soft backdrop-blur-2xl hover:text-ink">
        <Bell size={15} />
      </button>

      <Link
        href="/settings"
        className="flex h-9 w-9 items-center justify-center rounded-2xl border border-glass-border bg-glass text-ink-soft backdrop-blur-2xl hover:text-ink"
      >
        <Settings size={15} />
      </Link>

      {isConnected ? (
        <button
          onClick={() => disconnect()}
          className="flex items-center gap-2 rounded-2xl border border-glass-border bg-glass px-3 py-2 text-xs font-medium text-ink backdrop-blur-2xl hover:bg-white/15"
        >
          {peptBalance.data !== undefined && (
            <span className="tabular-nums text-ink-soft">
              {Number(formatEther(peptBalance.data as bigint)).toFixed(2)} PEPT
            </span>
          )}
          <span className="rounded-xl bg-gradient-to-br from-primary to-accent px-2 py-1 text-cloud">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </button>
      ) : (
        <button
          onClick={() => connect({ connector: connectors[0] })}
          className="rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-xs font-semibold text-cloud shadow-glass-sm hover:opacity-90"
        >
          Connect Wallet
        </button>
      )}
    </header>
  );
}
