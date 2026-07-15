"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatEther } from "viem";
import { useAccount, useConnect, useDisconnect, useReadContract } from "wagmi";
import { LayoutGrid, LineChart, Store, FlaskConical, Wallet, Coins, Settings, Atom } from "lucide-react";
import { peptContract } from "@/lib/contracts";
import { MOCK_MARKETS } from "@/lib/markets";
import { useOraclePrice } from "@/lib/useOraclePrice";
import { Sparkline } from "@/components/ui/Sparkline";
import { cn } from "@/lib/cn";
import { STATUS_BAR } from "@/lib/dashboardStats";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/trade", label: "Trade", icon: LineChart },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/labs", label: "Labs", icon: FlaskConical },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/stake", label: "Stake", icon: Coins },
  { href: "/settings", label: "Settings", icon: Settings },
];

function WatchRow({ symbol, name, price, change24h, oracleKey }: (typeof MOCK_MARKETS)[number]) {
  const { price: live } = useOraclePrice(oracleKey, price);
  const positive = change24h >= 0;

  return (
    <Link
      href="/trade"
      className="flex items-center gap-2.5 rounded-2xl px-2.5 py-2 transition-colors hover:bg-white/25"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-cloud">
        <Atom size={13} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold text-ink">{symbol}</div>
        <div className="truncate text-[11px] text-ink-soft">{name}</div>
      </div>
      <Sparkline seed={symbol} positive={positive} width={44} height={18} />
      <div className="text-right">
        <div className="text-xs font-medium tabular-nums text-ink">${live.toFixed(2)}</div>
        <div className={cn("text-[11px] tabular-nums", positive ? "text-positive" : "text-negative")}>
          {positive ? "+" : ""}
          {change24h.toFixed(2)}%
        </div>
      </div>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
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
    <aside className="glass-panel flex h-full w-72 shrink-0 flex-col gap-6 overflow-y-auto p-5">
      <div className="flex items-center gap-2 px-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-cloud">
          <Atom size={16} />
        </div>
        <span className="text-sm font-semibold tracking-tight text-ink">Peptide Hub</span>
      </div>

      <div className="rounded-2xl bg-white/5 p-3">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
          <StatMini label="PEPT TVL" value={STATUS_BAR.peptTvl} />
          <StatMini label="Labs" value={String(STATUS_BAR.labs)} />
          <StatMini label="Research Papers" value={String(STATUS_BAR.researchPapers)} />
          <StatMini label="Listings" value={String(STATUS_BAR.marketplaceListings)} />
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 border-t border-glass-border pt-2.5 text-[11px] font-medium text-positive">
          <span className="h-1.5 w-1.5 rounded-full bg-positive" />
          {STATUS_BAR.status}
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-white/40 text-ink shadow-glass-sm" : "text-ink-soft hover:bg-white/20 hover:text-ink"
              )}
            >
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1">
        <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-ink-soft">
          Market Watch
        </div>
        <div className="flex flex-col gap-0.5">
          {MOCK_MARKETS.map((m) => (
            <WatchRow key={m.symbol} {...m} />
          ))}
        </div>
      </div>

      <div className="border-t border-glass-border pt-4">
        {isConnected ? (
          <div className="space-y-2">
            {peptBalance.data !== undefined && (
              <div className="px-1 text-xs tabular-nums text-ink-soft">
                {Number(formatEther(peptBalance.data as bigint)).toFixed(2)} PEPT
              </div>
            )}
            <button
              onClick={() => disconnect()}
              className="w-full rounded-2xl bg-white/40 px-3 py-2 text-xs font-medium text-ink hover:bg-white/55"
            >
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </button>
          </div>
        ) : (
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="w-full rounded-2xl bg-gradient-to-r from-primary to-accent px-3 py-2.5 text-xs font-semibold text-cloud shadow-glass-sm hover:opacity-90"
          >
            Connect Wallet
          </button>
        )}
        <div className="mt-3 px-1 text-[11px] text-ink-soft">Robinhood Chain Testnet · 46630</div>
      </div>
    </aside>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-ink-soft">{label}</div>
      <div className="font-medium text-ink">{value}</div>
    </div>
  );
}
