"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  FlaskConical,
  Gavel,
  Package,
  ShieldAlert,
  Snowflake,
  Syringe,
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/cn";
import { SEMA_RISK, type RiskSection } from "@/lib/risk/sema";
import { useOraclePrice } from "@/lib/useOraclePrice";
import { SEMA_ORACLE_KEY } from "@/lib/spot";
import { MOCK_MARKETS } from "@/lib/markets";

const SECTION_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  overview: BookOpen,
  dosage: Syringe,
  "side-effects": AlertTriangle,
  legal: Gavel,
  storage: Snowflake,
  "black-market": ShieldAlert,
};

export default function RiskPage() {
  const seMarket = MOCK_MARKETS.find((m) => m.symbol === "SEMA-PERP")!;
  const { price, isLive } = useOraclePrice(SEMA_ORACLE_KEY, seMarket.price);
  const [active, setActive] = useState(SEMA_RISK.sections[0]!.id);

  const section =
    SEMA_RISK.sections.find((s) => s.id === active) ?? SEMA_RISK.sections[0]!;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar
        market={{
          symbol: "SEMA-RISK",
          name: "Risk education",
          price,
          change24h: 0,
          volume24h: 0,
          unit: "$/mg",
          oracleKey: SEMA_ORACLE_KEY,
        }}
        price={price}
        isLive={isLive}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex-row lg:overflow-hidden">
        {/* Left: nav + intro */}
        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-64 lg:overflow-y-auto">
          <div className="rounded-2xl border border-border bg-panel p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Risk desk
            </p>
            <h1 className="mt-1 text-lg font-semibold text-ink">SEMA risk</h1>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
              {SEMA_RISK.tagline}
            </p>
            <div className="mt-3 rounded-lg border border-border bg-bg px-3 py-2 text-[11px]">
              <div className="text-muted">Research mark (oracle)</div>
              <div className="font-mono text-sm font-semibold text-ink">
                ${price.toFixed(4)}
                <span className="ml-1 text-[10px] font-normal text-muted">/mg</span>
                {isLive && (
                  <span className="ml-2 rounded bg-green/15 px-1.5 py-0.5 text-[9px] text-green">
                    LIVE
                  </span>
                )}
              </div>
            </div>
          </div>

          <nav className="rounded-2xl border border-border bg-panel p-2">
            {SEMA_RISK.sections.map((s) => {
              const Icon = SECTION_ICONS[s.id] ?? FlaskConical;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    active === s.id
                      ? "bg-panel-hover font-medium text-ink shadow-green"
                      : "text-muted hover:bg-bg hover:text-ink",
                  )}
                >
                  <Icon
                    size={15}
                    className={cn(
                      "shrink-0",
                      active === s.id ? "text-green" : "text-faint",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  {s.severity === "critical" && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="rounded-2xl border border-amber-500/35 bg-panel p-3 text-[10px] leading-relaxed text-ink-soft">
            <div className="flex items-center gap-1.5 font-semibold text-ink">
              <AlertTriangle size={12} className="text-amber-400" />
              Disclaimer
            </div>
            <p className="mt-1.5">{SEMA_RISK.disclaimer}</p>
          </div>
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-4 lg:overflow-y-auto">
          <SectionCard section={section} />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SEMA_RISK.quickChecks.map((q) => (
              <div
                key={q.label}
                className="rounded-xl border border-border bg-panel p-3"
              >
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {q.label}
                </div>
                <div className="mt-1 text-xs leading-snug text-ink-soft">{q.detail}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-panel p-4">
            <h2 className="text-sm font-semibold text-ink">All sections</h2>
            <p className="mt-1 text-[11px] text-muted">
              Scroll or use the sidebar — starting with SEMA; more compounds later.
            </p>
            <div className="mt-4 space-y-3">
              {SEMA_RISK.sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setActive(s.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-left transition-colors hover:border-border-strong"
                >
                  <div className="flex items-center gap-2">
                    <SeverityDot severity={s.severity} />
                    <span className="text-sm font-medium text-ink">{s.title}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-soft">
                    {s.summary}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pb-6 text-xs">
            {SEMA_RISK.related.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="rounded-full border border-border-strong px-3 py-1.5 font-medium text-ink hover:bg-panel"
              >
                {r.label} →
              </Link>
            ))}
            <Link
              href="/docs/oracle"
              className="rounded-full border border-border px-3 py-1.5 text-muted hover:text-ink"
            >
              Oracle docs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ section }: { section: RiskSection }) {
  const Icon = SECTION_ICONS[section.id] ?? Package;
  return (
    <article
      className={cn(
        "rounded-2xl border bg-panel p-5 sm:p-6",
        section.severity === "critical" && "border-amber-500/40",
        section.severity === "warn" && "border-amber-500/25",
        section.severity === "info" && "border-border",
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg">
          <Icon size={18} className="text-green" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              {section.title}
            </h2>
            <SeverityBadge severity={section.severity} />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{section.summary}</p>
        </div>
      </div>

      <ul className="mt-5 space-y-2.5 border-t border-border pt-5">
        {section.bullets.map((b) => (
          <li key={b} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-green" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function SeverityBadge({ severity }: { severity?: RiskSection["severity"] }) {
  if (!severity) return null;
  const map = {
    info: "bg-panel-hover text-muted",
    warn: "bg-amber-500/15 text-amber-200",
    critical: "bg-amber-500/25 text-amber-100",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        map[severity],
      )}
    >
      {severity}
    </span>
  );
}

function SeverityDot({ severity }: { severity?: RiskSection["severity"] }) {
  return (
    <span
      className={cn(
        "h-2 w-2 shrink-0 rounded-full",
        severity === "critical" && "bg-amber-400",
        severity === "warn" && "bg-amber-500/70",
        (!severity || severity === "info") && "bg-faint",
      )}
    />
  );
}
