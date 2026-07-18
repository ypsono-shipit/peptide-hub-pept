"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BrandWordmark } from "@/components/BrandWordmark";
import { cn } from "@/lib/cn";

const PASSWORD_KEY = "pept_admin_password";

type VendorRow = {
  peptide: string;
  market: string;
  source: "vendor_basket" | "peptidescouter";
  vendor: string;
  url: string | null;
  sizeMg: number | null;
  priceUsd: number | null;
  pricePerMg: number;
  previousPricePerMg: number | null;
  changePct: number | null;
  inStock: boolean | null;
  method: string | null;
  significant: boolean;
};

type AdminPayload = {
  asOf: string;
  scrapedAt: string | null;
  previousScrapedAt: string | null;
  ageMinutes: number | null;
  method: string | null;
  alertPct: number;
  summary: {
    totalRows: number;
    basketOffers: number;
    scouterListings: number;
    alertCount: number;
    scrapeErrors: number;
    vendorDetailAvailable: boolean;
  };
  peptides: Record<
    string,
    {
      market: string;
      pricePerMg: number | null;
      basketMedian: number | null;
      scouterMedian: number | null;
      basketVendorCount: number | null;
      basketSampleCount: number | null;
      scouterSampleCount: number | null;
    }
  >;
  alerts: VendorRow[];
  rows: VendorRow[];
  scrapeErrors: { peptide: string; vendor: string; url: string; error: string }[];
  storageNote: string;
};

function fmtUsd(n: number | null | undefined, d = 4) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${n.toFixed(d)}`;
}

function fmtPct(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function fmtAge(mins: number | null) {
  if (mins == null) return "unknown age";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m ago`;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [data, setData] = useState<AdminPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [peptideFilter, setPeptideFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [alertPct, setAlertPct] = useState(10);
  const [q, setQ] = useState("");

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(PASSWORD_KEY);
      if (s) {
        setPassword(s);
        setUnlocked(true);
      }
    } catch {
      /* private mode */
    }
  }, []);

  const load = useCallback(
    async (pwd: string, silent = false) => {
      if (!pwd) return;
      if (!silent) setLoading(true);
      try {
        const res = await fetch(`/api/admin/vendors?alertPct=${alertPct}`, {
          cache: "no-store",
          headers: { "X-Admin-Secret": pwd },
        });
        if (res.status === 401) {
          setUnlocked(false);
          setErr("Invalid password.");
          setData(null);
          try {
            sessionStorage.removeItem(PASSWORD_KEY);
          } catch {
            /* */
          }
          return;
        }
        if (res.status === 503) {
          setErr("Admin dashboard is not configured.");
          setData(null);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as AdminPayload;
        setData(json);
        setErr(null);
        setUnlocked(true);
        try {
          sessionStorage.setItem(PASSWORD_KEY, pwd);
        } catch {
          /* */
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [alertPct],
  );

  useEffect(() => {
    if (!unlocked || !password) return;
    load(password, false);
    const id = setInterval(() => load(password, true), 60_000);
    return () => clearInterval(id);
  }, [unlocked, password, load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = alertsOnly ? data.alerts : data.rows;
    if (peptideFilter !== "all") {
      rows = rows.filter((r) => r.peptide === peptideFilter);
    }
    if (sourceFilter !== "all") {
      rows = rows.filter((r) => r.source === sourceFilter);
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.vendor.toLowerCase().includes(needle) ||
          r.peptide.includes(needle) ||
          (r.url ?? "").toLowerCase().includes(needle),
      );
    }
    return rows;
  }, [data, peptideFilter, sourceFilter, alertsOnly, q]);

  function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    load(password.trim(), false);
  }

  function logout() {
    setUnlocked(false);
    setData(null);
    setPassword("");
    try {
      sessionStorage.removeItem(PASSWORD_KEY);
    } catch {
      /* */
    }
  }

  function downloadCsv() {
    if (!password) return;
    const url = `/api/admin/export-history?format=csv`;
    void (async () => {
      const res = await fetch(url, { headers: { "X-Admin-Secret": password } });
      if (!res.ok) {
        setErr(`Export failed: HTTP ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `pept-price-history-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    })();
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
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
          <Link href="/oracle/monitor" className="hover:text-ink">
            Oracle monitor
          </Link>
          <Link href="/trade" className="hover:text-ink">
            Trade
          </Link>
          {unlocked && (
            <>
              <button
                type="button"
                onClick={() => load(password, false)}
                className="rounded-full border border-border-strong px-3 py-1 text-xs font-semibold text-ink hover:bg-panel"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:text-ink"
              >
                Lock
              </button>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
          Internal · Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Vendor{" "}
          <em className="font-serif font-normal italic text-green-soft">price desk</em>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Individual vendor basket + PeptideScouter listings, significant move alerts, and
          historical mark export. Not linked from public nav.
        </p>

        {!unlocked && (
          <form
            onSubmit={onUnlock}
            className="mt-10 max-w-md rounded-2xl border border-border bg-panel p-6"
          >
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
              Admin password
            </label>
            <p className="mt-1 text-xs text-ink-soft">
              Internal dashboard password (not the cron / oracle API secrets).
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-3 w-full rounded-lg border border-border-strong bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-green"
              placeholder="Password"
            />
            <button type="submit" className="btn-green mt-4 w-full py-2.5 text-sm">
              Unlock dashboard
            </button>
            {err && <p className="mt-3 text-xs text-negative">{err}</p>}
          </form>
        )}

        {unlocked && (
          <>
            {err && (
              <p className="mt-4 rounded-xl border border-negative/40 bg-panel px-4 py-3 text-sm text-negative">
                {err}
              </p>
            )}
            {loading && !data && (
              <p className="mt-8 text-sm text-muted">Loading vendor desk…</p>
            )}

            {data && (
              <>
                <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat
                    label="Last scrape"
                    value={data.scrapedAt ? fmtAge(data.ageMinutes) : "—"}
                    note={data.scrapedAt?.replace("T", " ").slice(0, 19) ?? "no snapshot"}
                  />
                  <Stat
                    label="Vendor rows"
                    value={data.summary.totalRows.toLocaleString()}
                    note={`${data.summary.basketOffers} basket · ${data.summary.scouterListings} scouter`}
                  />
                  <Stat
                    label="Price alerts"
                    value={String(data.summary.alertCount)}
                    note={`≥${data.alertPct}% vs previous scrape`}
                    tone={data.summary.alertCount > 0 ? "warn" : "ok"}
                  />
                  <Stat
                    label="Scrape errors"
                    value={String(data.summary.scrapeErrors)}
                    note="failed vendor PDP fetches"
                    tone={data.summary.scrapeErrors > 0 ? "warn" : "neutral"}
                  />
                </div>

                {!data.summary.vendorDetailAvailable && (
                  <div className="mt-4 rounded-xl border border-amber-500/40 bg-panel px-4 py-3 text-sm text-ink-soft">
                    <div className="font-semibold text-ink">
                      Per-vendor offers not in the current snapshot yet
                    </div>
                    <p className="mt-1 text-xs leading-relaxed">
                      The latest <code className="text-ink">glp1-last-scrape.json</code> only has
                      aggregate medians. After the next oracle refresh (with the updated push
                      script), each vendor basket offer and PeptideScouter listing will appear
                      here with change % vs the previous scrape.
                    </p>
                  </div>
                )}

                {/* Alerts */}
                <section className="mt-10">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">Significant price changes</h2>
                      <p className="mt-1 text-xs text-muted">
                        Compared to previous scrape
                        {data.previousScrapedAt
                          ? ` (${data.previousScrapedAt.replace("T", " ").slice(0, 19)} UTC)`
                          : " (no previous snapshot with vendor detail yet)"}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted">
                      Alert threshold
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={alertPct}
                        onChange={(e) => setAlertPct(Number(e.target.value) || 10)}
                        className="w-16 rounded border border-border bg-bg px-2 py-1 text-ink"
                      />
                      %
                    </label>
                  </div>

                  {data.alerts.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-border bg-panel px-4 py-6 text-sm text-muted">
                      No vendors moved ≥{data.alertPct}% since the previous scrape
                      {data.summary.vendorDetailAvailable
                        ? "."
                        : " (or vendor detail is not available yet)."}
                    </p>
                  ) : (
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-amber-500/30">
                      <table className="w-full min-w-[720px] text-left text-xs">
                        <thead className="border-b border-border bg-panel text-[10px] uppercase tracking-wide text-muted">
                          <tr>
                            <th className="px-3 py-2 font-medium">Peptide</th>
                            <th className="px-3 py-2 font-medium">Vendor</th>
                            <th className="px-3 py-2 font-medium">Source</th>
                            <th className="px-3 py-2 font-medium">Size</th>
                            <th className="px-3 py-2 font-medium">Prev $/mg</th>
                            <th className="px-3 py-2 font-medium">Now $/mg</th>
                            <th className="px-3 py-2 font-medium">Δ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.alerts.map((r, i) => (
                            <tr
                              key={`${r.source}-${r.vendor}-${r.sizeMg}-${i}`}
                              className="border-b border-border/60 hover:bg-panel-hover"
                            >
                              <td className="px-3 py-2 font-medium capitalize">{r.peptide}</td>
                              <td className="px-3 py-2">
                                {r.url ? (
                                  <a
                                    href={r.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-green-soft hover:underline"
                                  >
                                    {r.vendor}
                                  </a>
                                ) : (
                                  r.vendor
                                )}
                              </td>
                              <td className="px-3 py-2 text-muted">
                                {r.source === "vendor_basket" ? "basket" : "scouter"}
                              </td>
                              <td className="px-3 py-2 tabular-nums">
                                {r.sizeMg != null ? `${r.sizeMg} mg` : "—"}
                              </td>
                              <td className="px-3 py-2 font-mono tabular-nums">
                                {fmtUsd(r.previousPricePerMg)}
                              </td>
                              <td className="px-3 py-2 font-mono tabular-nums">
                                {fmtUsd(r.pricePerMg)}
                              </td>
                              <td
                                className={cn(
                                  "px-3 py-2 font-mono font-semibold tabular-nums",
                                  (r.changePct ?? 0) > 0 ? "text-green" : "text-ink-soft",
                                )}
                              >
                                {fmtPct(r.changePct)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* Mark summary */}
                <section className="mt-10">
                  <h2 className="text-lg font-semibold">Combined marks</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(data.peptides).map(([slug, p]) => (
                      <div key={slug} className="rounded-2xl border border-border bg-panel p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                          {p.market}
                        </div>
                        <div className="mt-1 font-mono text-xl font-semibold tabular-nums">
                          {fmtUsd(p.pricePerMg)}
                          <span className="ml-1 text-xs font-normal text-muted">/mg</span>
                        </div>
                        <div className="mt-2 space-y-0.5 text-[11px] text-ink-soft">
                          <div>
                            Scouter median {fmtUsd(p.scouterMedian)} · n=
                            {p.scouterSampleCount ?? "—"}
                          </div>
                          <div>
                            Basket median {fmtUsd(p.basketMedian)} · vendors=
                            {p.basketVendorCount ?? "—"} · n={p.basketSampleCount ?? "—"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* All vendors table */}
                <section className="mt-10">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">All vendor prices</h2>
                      <p className="mt-1 text-xs text-muted">
                        Showing {filtered.length.toLocaleString()} of{" "}
                        {data.rows.length.toLocaleString()} rows
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search vendor…"
                        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-ink outline-none focus:border-green"
                      />
                      <select
                        value={peptideFilter}
                        onChange={(e) => setPeptideFilter(e.target.value)}
                        className="rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-ink"
                      >
                        <option value="all">All peptides</option>
                        <option value="semaglutide">Semaglutide</option>
                        <option value="tirzepatide">Tirzepatide</option>
                        <option value="retatrutide">Retatrutide</option>
                      </select>
                      <select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-ink"
                      >
                        <option value="all">All sources</option>
                        <option value="vendor_basket">Vendor basket</option>
                        <option value="peptidescouter">PeptideScouter</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-muted">
                        <input
                          type="checkbox"
                          checked={alertsOnly}
                          onChange={(e) => setAlertsOnly(e.target.checked)}
                        />
                        Alerts only
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
                    <table className="w-full min-w-[880px] text-left text-xs">
                      <thead className="border-b border-border bg-panel text-[10px] uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-3 py-2 font-medium">Peptide</th>
                          <th className="px-3 py-2 font-medium">Vendor</th>
                          <th className="px-3 py-2 font-medium">Source</th>
                          <th className="px-3 py-2 font-medium">Size</th>
                          <th className="px-3 py-2 font-medium">Vial $</th>
                          <th className="px-3 py-2 font-medium">$/mg</th>
                          <th className="px-3 py-2 font-medium">Prev</th>
                          <th className="px-3 py-2 font-medium">Δ</th>
                          <th className="px-3 py-2 font-medium">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-3 py-8 text-center text-muted">
                              No rows match filters
                              {!data.summary.vendorDetailAvailable
                                ? " — wait for next oracle scrape with vendor offers"
                                : ""}
                              .
                            </td>
                          </tr>
                        ) : (
                          filtered.map((r, i) => (
                            <tr
                              key={`${r.source}-${r.peptide}-${r.vendor}-${r.sizeMg}-${i}`}
                              className={cn(
                                "border-b border-border/60 hover:bg-panel-hover",
                                r.significant && "bg-amber-500/5",
                              )}
                            >
                              <td className="px-3 py-2 capitalize">{r.peptide}</td>
                              <td className="px-3 py-2">
                                {r.url ? (
                                  <a
                                    href={r.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-green-soft hover:underline"
                                  >
                                    {r.vendor}
                                  </a>
                                ) : (
                                  r.vendor
                                )}
                              </td>
                              <td className="px-3 py-2 text-muted">
                                {r.source === "vendor_basket" ? "basket" : "scouter"}
                              </td>
                              <td className="px-3 py-2 tabular-nums">
                                {r.sizeMg != null ? `${r.sizeMg}` : "—"}
                              </td>
                              <td className="px-3 py-2 font-mono tabular-nums">
                                {fmtUsd(r.priceUsd, 2)}
                              </td>
                              <td className="px-3 py-2 font-mono font-medium tabular-nums">
                                {fmtUsd(r.pricePerMg)}
                              </td>
                              <td className="px-3 py-2 font-mono tabular-nums text-muted">
                                {fmtUsd(r.previousPricePerMg)}
                              </td>
                              <td
                                className={cn(
                                  "px-3 py-2 font-mono tabular-nums",
                                  r.significant && "font-semibold text-green",
                                )}
                              >
                                {fmtPct(r.changePct)}
                              </td>
                              <td className="px-3 py-2 text-muted">
                                {r.inStock == null ? "—" : r.inStock ? "in" : "out"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* History export */}
                <section className="mt-12 rounded-2xl border border-border bg-panel p-6">
                  <h2 className="text-lg font-semibold">Historical pricing export</h2>
                  <p className="mt-2 max-w-2xl text-sm text-ink-soft leading-relaxed">
                    {data.storageNote}
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-ink-soft">
                    <li>
                      <code className="text-ink">frontend/public/data/price-history.json</code> —
                      oracle mark samples (SEMA / TIRZ / RETA / GLP1-IDX) appended on each
                      successful push
                    </li>
                    <li>
                      Mirror:{" "}
                      <code className="text-ink">contracts/data/price-history.json</code>
                    </li>
                    <li>
                      Current dual-source snapshot:{" "}
                      <code className="text-ink">frontend/public/data/glp1-last-scrape.json</code>
                    </li>
                    <li className="text-muted">
                      Not in Supabase — waitlist uses Google Sheets only. History is git + GitHub
                      Actions commits.
                    </li>
                  </ul>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button type="button" onClick={downloadCsv} className="btn-green px-4 py-2">
                      Download price history (Excel CSV)
                    </button>
                    <a
                      href="https://raw.githubusercontent.com/ypsono-shipit/peptide-hub-pept/main/frontend/public/data/price-history.json"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-border-strong px-4 py-2 text-xs font-semibold text-ink hover:bg-bg"
                    >
                      Open raw JSON on GitHub
                    </a>
                    <a
                      href="/data/price-history.xlsx"
                      className="rounded-lg border border-border-strong px-4 py-2 text-xs font-semibold text-ink hover:bg-bg"
                    >
                      Download multi-sheet .xlsx
                    </a>
                  </div>
                </section>

                {data.scrapeErrors.length > 0 && (
                  <section className="mt-10">
                    <h2 className="text-lg font-semibold">Vendor fetch errors</h2>
                    <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-border bg-panel text-xs">
                      <ul className="divide-y divide-border">
                        {data.scrapeErrors.map((e, i) => (
                          <li key={i} className="px-3 py-2 text-ink-soft">
                            <span className="font-medium text-ink capitalize">{e.peptide}</span>
                            {" · "}
                            {e.vendor}
                            {" — "}
                            {e.error}
                            {e.url && (
                              <>
                                {" "}
                                <a
                                  href={e.url}
                                  className="text-green-soft hover:underline"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  link
                                </a>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "neutral" | "ok" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-panel p-4",
        tone === "warn" && "border-amber-500/40",
        tone === "ok" && "border-green/30",
        tone === "neutral" && "border-border",
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {note && <div className="mt-0.5 truncate text-[11px] text-ink-soft">{note}</div>}
    </div>
  );
}
