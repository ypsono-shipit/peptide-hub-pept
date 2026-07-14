"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";

const TABS = [
  { href: "/markets", label: "Markets" },
  { href: "/trade", label: "Trade" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/stake", label: "Stake & Bond" },
];

export function TopNav() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <header className="flex items-center justify-between border-b border-border bg-panel px-6 py-3">
      <div className="flex items-center gap-8">
        <span className="text-lg font-semibold tracking-tight">
          Peptide Hub <span className="text-accent">$PEPT</span>
        </span>
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === tab.href
                  ? "bg-surface text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-text-secondary">
          Robinhood Chain Testnet · 46630
        </span>
        {isConnected ? (
          <button
            onClick={() => disconnect()}
            className="rounded-md bg-surface px-3 py-1.5 text-sm font-medium hover:bg-border"
          >
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </button>
        ) : (
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-surface hover:opacity-90"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
