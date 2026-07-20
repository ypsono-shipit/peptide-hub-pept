"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  LineChart,
  ArrowLeftRight,
  Store,
  Wallet,
  Settings,
  HelpCircle,
  Rocket,
  Package,
  CandlestickChart,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/Logo";
import { BrandWordmark } from "@/components/BrandWordmark";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/spot", label: "Spot", icon: ArrowLeftRight },
  { href: "/earn", label: "Earn", icon: Sparkles },
  { href: "/perps", label: "Perps", icon: CandlestickChart },
  { href: "/redeem", label: "Redeem", icon: Package },
  { href: "/risk", label: "Risk", icon: ShieldAlert },
  { href: "/launchpad", label: "Launchpad", icon: Rocket },
  { href: "/portfolio", label: "Positions", icon: Wallet },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/oracle/monitor", label: "Oracle", icon: LineChart },
];

const BOTTOM = [{ href: "/settings", label: "Settings", icon: Settings }];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative z-20 flex w-[72px] shrink-0 flex-col overflow-hidden border-r border-border bg-bg py-4 lg:w-52">
      <Link href="/dashboard" className="mb-6 flex min-w-0 items-center gap-2.5 px-3 lg:px-4">
        <Logo size={36} className="shrink-0 ring-1 ring-border" />
        <div className="hidden min-w-0 flex-1 lg:block">
          <BrandWordmark className="block truncate" />
          <div className="truncate text-[10px] text-muted">Spot · Earn · Perps</div>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto px-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                // Inset ring only — outer shadow-green was bleeding over main content
                "flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-panel-hover font-medium text-ink ring-1 ring-inset ring-green/80"
                  : "text-muted hover:bg-panel hover:text-ink-soft",
              )}
            >
              <Icon size={18} className={cn("shrink-0", active && "text-green")} />
              <span className="hidden min-w-0 truncate lg:inline">{label}</span>
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
