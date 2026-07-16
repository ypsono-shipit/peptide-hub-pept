"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { BrandWordmark } from "@/components/BrandWordmark";

type SourceQuote = {
  name: string;
  pricePerMg: number;
  sampleCount?: number;
  weight?: number;
};

type PeptideRow = {
  slug: string;
  market: string;
  pricePerMg?: number | null;
  method?: string;
  source?: string;
  singleSource?: boolean;
  divergenceBps?: number | null;
  divergenceWarning?: boolean;
  sources?: SourceQuote[];
  scouter?: { pricePerMg: number; sampleCount: number; inStockCount?: number } | null;
  basket?: {
    pricePerMg: number;
    sampleCount: number;
    vendorCount?: number;
    offerCount?: number;
  } | null;
  onChain?: {
    price: number | null;
    asOfIso: string | null;
    source: string | null;
    paused: boolean | null;
    error?: string;
  } | null;
};

type HistoryPt = { market: string; ts: number; price: number; txHash?: string };

type MonitorPayload = {
  asOf: string;
  scrape: {
    scrapedAt: string | null;
    ageMinutes: number | null;
    method: string | null;
    sourceErrors: string[];
    peptides: PeptideRow[];
    glp1Index: {
      market: string;
      pricePerMg?: number | null;
      weights?: Record<string, number>;
      onChain?: PeptideRow["onChain"];
    };
  };
  onChain: {
    oracle: string;
    chainId: number;
    markets: Record<string, NonNullable<PeptideRow["onChain"]>>;
    error?: string;
  };
  history: {
    updatedAt: string | null;
    sampleCount: number;
    byMarket: Record<string, HistoryPt[]>;
  };
  cadence: { cron: string; note: string };
};

function fmtUsd(n: number | null | undefined, d = 4) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${n.toFixed(d)}`;
}

function fmtAge(mins: number | null) {
  if (mins == null) return "unknown age";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m ago`;
}

function Sparkline({ pts }: { pts: HistoryPt[] }) {
  if (!pts.length) {
    return <div className="h-10 text-[10px] text-muted">No history</div>;
  }
  const prices = pts.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const w = 160;
  const h = 40;
  const d = pts
    .map((p, i) => {
      const x = (i / Math.max(pts.length - 1, 1)) * w;
      const y = h - ((p.price - min) / span) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full max-w-[160px] text-green" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function OracleMonitorPage() {
  const [data, setData] = useState<MonitorPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/oracle/monitor", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as MonitorPayload;
      setData(json);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
    const id = setInterval(() => load(true), 30_000);
    return () => clearInterval(id);
  }, [load]);

  const age = data?.scrape.ageMinutes ?? null;
  const stale = age != null && age > 30;
  const hot = age != null && age <= 10;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="PEPT"
            width={32}
            height={32}
            className="rounded-lg ring-1 ring-border"
          />
          <BrandWordmark />
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <Link href="/oracle" className="hover:text-ink">
            Oracle product
          </Link>
          <Link href="/docs/oracle" className="hover:text-ink">
            Docs
          </Link>
          <Link href="/trade" className="hover:text-ink">
            Trade
          </Link>
          <button
            type="button"
            onClick={() => load(false)}
            className="rounded-full border border-border-strong px-3 py-1 text-xs font-semibold text-ink hover:bg-panel"
          >
            Refresh
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
          Infrastructure · Live
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Oracle{" "}
          <em className="font-serif font-normal italic text-green-soft">monitor</em>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Dual-source scrape marks, on-chain settlement prices, source divergence, and recent push
          history. Auto-refreshes every 30s.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Last scrape"
            value={data?.scrape.scrapedAt ? fmtAge(age) : "—"}
            note={data?.scrape.scrapedAt?.replace("T", " ").slice(0, 19) ?? "awaiting snapshot"}
            tone={stale ? "warn" : hot ? "ok" : "neutral"}
          />
          <Stat
            label="History samples"
            value={data ? data.history.sampleCount.toLocaleString() : "—"}
            note={data?.cadence.cron ? `cron ${data.cadence.cron}` : ""}
          />
          <Stat
            label="On-chain oracle"
            value={data?.onChain.chainId === 46630 ? "Testnet 46630" : "—"}
            note={data?.onChain.oracle ? `${data.onChain.oracle.slice(0, 10)}…` : ""}
          />
          <Stat
            label="Method"
            value={data?.scrape.method ? "Dual source" : "—"}
            note={data?.scrape.method?.slice(0, 48) ?? ""}
          />
        </div>

        {err && (
          <p className="mt-4 rounded-xl border border-negative/40 bg-panel px-4 py-3 text-sm text-negative">
            {err}
          </p>
        )}
        {loading && !data && <p className="mt-8 text-sm text-muted">Loading monitor feed…</p>}

        {data?.scrape.sourceErrors && data.scrape.sourceErrors.length > 0 && (
          <div className="mt-4 rounded-xl border border-border bg-panel px-4 py-3 text-xs text-ink-soft">
            <div className="font-semibold text-ink">Source errors</div>
            <ul className="mt-1 list-disc pl-4">
              {data.scrape.sourceErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Live sources &amp; marks</h2>
          <p className="mt-1 text-xs text-muted">
            PeptideScouter vs vendor basket → combined mark → on-chain settlement
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {data?.scrape.peptides.map((p) => (
              <PeptideCard key={p.slug} p={p} history={data.history.byMarket[p.market] ?? []} />
            ))}
            {data && (
              <div className="rounded-2xl border border-border bg-panel p-5 lg:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                      GLP1-IDX-PERP
                    </div>
                    <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                      {fmtUsd(
                        data.scrape.glp1Index.pricePerMg ?? data.scrape.glp1Index.onChain?.price,
                      )}
                      <span className="ml-1 text-sm font-normal text-muted">/mg</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                      Index = 60% SEMA + 25% TIRZ + 15% RETA (dual-source legs)
                    </p>
                  </div>
                  <OnChainPill oc={data.scrape.glp1Index.onChain} />
                </div>
                <div className="mt-4">
                  <div className="mb-1 text-[10px] uppercase text-muted">Recent history</div>
                  <Sparkline pts={data.history.byMarket["GLP1-IDX-PERP"] ?? []} />
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold">Recent push history</h2>
          <p className="mt-1 text-xs text-muted">Last samples per market (from price-history.json)</p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="border-b border-border bg-panel text-[10px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Market</th>
                  <th className="px-3 py-2 font-medium">Time (UTC)</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium">Tx</th>
                </tr>
              </thead>
              <tbody>
                {data &&
                  Object.entries(data.history.byMarket)
                    .flatMap(([market, pts]) =>
                      pts.slice(-6).map((pt) => ({
                        market,
                        ts: pt.ts,
                        price: pt.price,
                        txHash: pt.txHash,
                      })),
                    )
                    .sort((a, b) => b.ts - a.ts)
                    .slice(0, 24)
                    .map((row) => (
                      <tr
                        key={`${row.market}-${row.ts}-${row.txHash ?? ""}`}
                        className="border-b border-border/60"
                      >
                        <td className="px-3 py-2 font-mono text-ink">{row.market}</td>
                        <td className="px-3 py-2 text-muted">
                          {new Date(row.ts * 1000).toISOString().replace("T", " ").slice(0, 19)}
                        </td>
                        <td className="px-3 py-2 font-mono tabular-nums text-ink">
                          {fmtUsd(row.price)}
                        </td>
                        <td className="px-3 py-2">
                          {row.txHash ? (
                            <a
                              href={`https://explorer.testnet.chain.robinhood.com/tx/${row.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-muted underline hover:text-ink"
                            >
                              {row.txHash.slice(0, 10)}…
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                {data && data.history.sampleCount === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted">
                      No history samples yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-8 text-[11px] leading-relaxed text-muted">
          Deferred: ML outlier detection, additional sources, on-chain history buffer, multi-reporter
          decentralization. Operational visibility only — not investment advice.
          {data?.asOf ? ` · Loaded ${data.asOf}` : ""}
        </p>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "ok" | "warn" | "neutral";
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel px-4 py-3">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div
        className={cn(
          "mt-1 font-mono text-lg font-semibold tabular-nums",
          tone === "ok" && "text-green-soft",
          tone === "warn" && "text-negative",
          (!tone || tone === "neutral") && "text-ink",
        )}
      >
        {value}
      </div>
      {note && <div className="mt-0.5 truncate text-[10px] text-muted">{note}</div>}
    </div>
  );
}

function OnChainPill({ oc }: { oc?: PeptideRow["onChain"] }) {
  if (!oc) return null;
  if (oc.error) {
    return (
      <span className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted">
        On-chain: {oc.error.slice(0, 40)}
      </span>
    );
  }
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase text-muted">On-chain</div>
      <div className="font-mono text-sm font-semibold tabular-nums text-ink">
        {fmtUsd(oc.price)}
        {oc.paused ? (
          <span className="ml-1 text-[10px] text-negative">paused</span>
        ) : (
          <span className="ml-1 text-[10px] text-green-soft">live</span>
        )}
      </div>
      {oc.asOfIso && (
        <div className="text-[10px] text-muted">
          {oc.asOfIso.replace("T", " ").slice(0, 19)} UTC
        </div>
      )}
    </div>
  );
}

function PeptideCard({ p, history }: { p: PeptideRow; history: HistoryPt[] }) {
  const divPct = p.divergenceBps != null ? (p.divergenceBps / 100).toFixed(1) : null;

  return (
    <div className="rounded-2xl border border-border bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">{p.market}</div>
          <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">
            {fmtUsd(p.pricePerMg)}
            <span className="ml-1 text-sm font-normal text-muted">/mg</span>
          </div>
          <div className="mt-0.5 text-[11px] capitalize text-ink-soft">{p.slug}</div>
        </div>
        <OnChainPill oc={p.onChain} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <SourceBox
          title="PeptideScouter"
          price={
            p.scouter?.pricePerMg ??
            p.sources?.find((s) => s.name === "peptidescouter")?.pricePerMg
          }
          n={p.scouter?.sampleCount}
        />
        <SourceBox
          title="Vendor basket"
          price={
            p.basket?.pricePerMg ??
            p.sources?.find((s) => s.name === "vendor_basket")?.pricePerMg
          }
          n={p.basket?.sampleCount}
          extra={p.basket?.vendorCount != null ? `${p.basket.vendorCount} vendors` : undefined}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        {divPct != null && (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 font-mono",
              p.divergenceWarning
                ? "border-negative/40 text-negative"
                : "border-border text-muted",
            )}
          >
            Δ {divPct}%
            {p.divergenceWarning ? " · high" : ""}
          </span>
        )}
        {p.singleSource && (
          <span className="rounded-full border border-border px-2 py-0.5 text-muted">
            single source
          </span>
        )}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <div className="mb-1 text-[10px] uppercase text-muted">Recent history</div>
        <Sparkline pts={history} />
      </div>
    </div>
  );
}

function SourceBox({
  title,
  price,
  n,
  extra,
}: {
  title: string;
  price?: number;
  n?: number;
  extra?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted">{title}</div>
      <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-ink">
        {fmtUsd(price)}
      </div>
      <div className="text-[10px] text-muted">
        {n != null ? `n=${n}` : "—"}
        {extra ? ` · ${extra}` : ""}
      </div>
    </div>
  );
}
