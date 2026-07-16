import Link from "next/link";
import type { Metadata } from "next";
import { TIER_PRICING, TIER_LIMITS } from "@/lib/oracle-api/tiers";

export const metadata: Metadata = {
  title: "PEPT Oracle | B2B Peptide Pricing Infrastructure",
  description:
    "The first peptide pricing oracle API. Live $/mg marks, history, OHLC, webhooks, and signed attestations for integrators.",
};

const TIERS = (["free", "pro", "enterprise"] as const).map((id) => ({
  id,
  ...TIER_PRICING[id],
  limits: TIER_LIMITS[id],
}));

export default function OracleProductPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          PEPT TRADE
        </Link>
        <div className="flex gap-4 text-sm text-muted">
          <Link href="/oracle/monitor" className="hover:text-ink">
            Monitor
          </Link>
          <Link href="/docs/oracle" className="hover:text-ink">
            Docs
          </Link>
          <Link href="/api/v1/oracle" className="hover:text-ink">
            API
          </Link>
          <Link
            href="/trade"
            className="rounded-full bg-green px-4 py-1.5 text-xs font-semibold text-black hover:bg-green-dim"
          >
            Launch Terminal
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
          Infrastructure · B2B
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          The first peptide pricing{" "}
          <em className="font-serif font-normal italic text-green">oracle</em>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
          Institutional peptide price infrastructure: research $/mg quotes aggregated across 30+
          vendors and laboratories, settled on Robinhood Chain, and delivered over REST so your
          protocol never has to crawl supplier catalogs. Live prices, history, OHLC, webhooks, and
          signed attestations.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/docs/oracle"
            className="rounded-full bg-green px-6 py-3 text-sm font-semibold text-black hover:bg-green-dim"
          >
            Read the docs
          </Link>
          <Link
            href="/api/v1/oracle/openapi.json"
            className="rounded-full border border-border-strong px-6 py-3 text-sm font-semibold hover:bg-panel"
          >
            OpenAPI JSON
          </Link>
          <a
            href="https://pept.trade/api/v1/oracle/prices/SEMA-PERP"
            className="rounded-full border border-border-strong px-6 py-3 text-sm font-semibold hover:bg-panel"
          >
            Try SEMA price
          </a>
        </div>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            {
              t: "Multi-vendor intelligence",
              d: "Pricing scraped and normalized across 30+ research vendors and laboratories into a single $/mg mark.",
            },
            {
              t: "Settle on-chain",
              d: "Same PeptideOracle feed PEPT Trade uses for perps. Verify marketKey + getPrice.",
            },
            {
              t: "Ship faster",
              d: "REST for apps and indexers. Webhooks when marks move. Signed quotes for Pro+.",
            },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-border bg-panel p-5">
              <h2 className="text-base font-semibold">{c.t}</h2>
              <p className="mt-2 text-sm text-ink-soft">{c.d}</p>
            </div>
          ))}
        </section>

        <section id="pricing" className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight">Pricing</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Start with the demo key. Upgrade when you need webhooks, volume, or signed marks.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {TIERS.map((t) => (
              <div
                key={t.id}
                className={`rounded-2xl border p-6 ${
                  t.id === "pro" ? "border-green bg-panel shadow-green" : "border-border bg-panel"
                }`}
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {t.label}
                </div>
                <div className="mt-2 font-mono text-3xl font-semibold text-ink">
                  ${t.monthlyUsd}
                  <span className="text-sm font-normal text-muted">/mo</span>
                </div>
                <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
                  <li>{t.limits.rpm} req/min</li>
                  <li>{t.limits.daily.toLocaleString()} req/day</li>
                  <li>{t.limits.webhooks} webhooks</li>
                  <li>
                    {t.limits.signedQuotes ? "Signed attestations" : "No signed quotes"}
                  </li>
                </ul>
                <a
                  href="https://t.me/blackswanhl"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex rounded-full border border-border-strong px-4 py-2 text-xs font-semibold text-ink transition hover:border-ink hover:bg-bg"
                >
                  Contact us
                </a>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-ink-soft">
            Questions or custom limits?{" "}
            <a
              href="https://t.me/blackswanhl"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-ink underline underline-offset-4 hover:text-green"
            >
              Contact us on Telegram @blackswanhl
            </a>
          </p>
        </section>

        <section className="mt-20">
          <h2 className="text-2xl font-semibold">Quickstart</h2>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-border bg-panel p-5 font-mono text-xs text-ink-soft">
{`# Latest mark
curl -sS "https://pept.trade/api/v1/oracle/prices/SEMA-PERP" \\
  -H "X-API-Key: pept_demo_public"

# Usage for your key
curl -sS "https://pept.trade/api/v1/oracle/me" \\
  -H "X-API-Key: YOUR_KEY"

# Create webhook (Free+)
curl -sS -X POST "https://pept.trade/api/v1/oracle/webhooks" \\
  -H "X-API-Key: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com/hooks/pept","events":["price.updated"]}'

# Signed attestation (Pro+)
curl -sS "https://pept.trade/api/v1/oracle/attest/SEMA-PERP" \\
  -H "X-API-Key: YOUR_PRO_KEY"`}
          </pre>
        </section>

        <section className="mt-20 rounded-2xl border border-border bg-panel p-8">
          <h2 className="text-xl font-semibold">Roadmap</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink-soft">
            <li>
              <strong className="text-ink">v1 live:</strong> REST, demo key, on-chain join, docs
            </li>
            <li>
              <strong className="text-ink">v1.1 live:</strong> API keys, tiers, metering, webhooks,
              attestations, api.pept.trade routing
            </li>
            <li>
              <strong className="text-ink">Next:</strong> Upstash Redis in prod, higher-frequency
              vendor sampling, mainnet oracle, multi-reporter committee
            </li>
            <li>
              <strong className="text-ink">Enterprise:</strong> SLA, private feeds, SOC2 path
            </li>
          </ol>
        </section>
      </main>
    </div>
  );
}
