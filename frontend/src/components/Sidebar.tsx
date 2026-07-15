"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  LineChart,
  Droplets,
  Store,
  Wallet,
  Coins,
  Settings,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/Logo";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/trade", label: "Trade", icon: LineChart },
  { href: "/portfolio", label: "Positions", icon: Wallet },
  { href: "/liquidity", label: "Liquidity", icon: Droplets },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/stake", label: "Stake", icon: Coins },
];

const BOTTOM = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[72px] shrink-0 flex-col border-r border-border bg-bg py-4 lg:w-52">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-3 lg:px-4">
        <Logo size={36} className="ring-1 ring-border" />
        <div className="hidden min-w-0 lg:block">
          <div className="truncate text-sm font-semibold tracking-tight text-ink">PEPT TRADE</div>
          <div className="truncate text-[10px] text-muted">Peptide Perpetuals</div>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-panel-hover font-medium text-ink"
                  : "text-muted hover:bg-panel hover:text-ink-soft",
              )}
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-border px-2 pt-3">
        {BOTTOM.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-panel hover:text-ink-soft"
          >
            <Icon size={18} className="shrink-0" />
            <span className="hidden lg:inline">{label}</span>
          </Link>
        ))}
        <a
          href="https://docs.robinhood.com/chain/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-panel hover:text-ink-soft"
        >
          <HelpCircle size={18} className="shrink-0" />
          <span className="hidden lg:inline">Help</span>
        </a>
      </div>
    </aside>
  );
}
