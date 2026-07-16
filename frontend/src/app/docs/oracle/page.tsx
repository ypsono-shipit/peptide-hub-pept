import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PEPT Oracle API | Developer Docs",
  description:
    "B2B peptide pricing oracle API: live $/mg marks, history, and OHLC for SEMA, TIRZ, RETA, and GLP-1 index.",
};

const BASE = "/api/v1/oracle";

const ENDPOINTS = [
  {
    method: "GET",
    path: `${BASE}`,
    desc: "Service discovery and endpoint index",
  },
  {
    method: "GET",
    path: `${BASE}/health`,
    desc: "Liveness + per-market feed freshness",
  },
  {
    method: "GET",
    path: `${BASE}/markets`,
    desc: "Supported markets, units, on-chain marketKey",
  },
  {
    method: "GET",
    path: `${BASE}/prices`,
    desc: "Latest mark for every market (on-chain preferred)",
  },
  {
    method: "GET",
    path: `${BASE}/prices/SEMA-PERP`,
    desc: "Latest mark for one market",
  },
  {
    method: "GET",
    path: `${BASE}/history/SEMA-PERP?limit=100`,
    desc: "Raw oracle samples (ts, price, source, txHash)",
  },
  {
    method: "GET",
    path: `${BASE}/ohlc/SEMA-PERP?tf=4h&live=1`,
    desc: "OHLC candles for charts (forward-filled)",
  },
];

export default function OracleDocsPage() {
  return (
    <div className="min-h-screen overflow-y-auto bg-bg text-ink">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
          Infrastructure · B2B
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          PEPT Peptide Oracle API
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft sm:text-base">
          Dual-source research peptide $/mg marks, settled on Robinhood Chain and served over REST
          so other protocols, dashboards, and marketplaces can integrate without scraping vendors
          themselves.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={BASE}
            className="rounded-full bg-green px-5 py-2.5 text-sm font-semibold text-black hover:bg-green-dim"
          >
            Open API index
          </Link>
          <Link
            href="/oracle"
            className="rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold text-ink hover:bg-panel"
          >
            Product & pricing
          </Link>
          <Link
            href="/api/v1/oracle/openapi.json"
            className="rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold text-ink hover:bg-panel"
          >
            OpenAPI
          </Link>
        </div>

        <section className="mt-12">
          <h2 className="text-lg font-semibold">What you get</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-soft">
            <li>Live and historical $/mg for SEMA, TIRZ, RETA, and GLP-1 index</li>
            <li>On-chain market keys (keccak256) for the PeptideOracle contract</li>
            <li>OHLC candles for charting (sparse samples, forward-filled)</li>
            <li>Source metadata and optional push tx hashes for audit trails</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Authentication</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Pass an API key via <code className="text-green-soft">X-API-Key</code> or{" "}
            <code className="text-green-soft">Authorization: Bearer</code>. Demo key for exploration:{" "}
            <code className="rounded bg-panel px-1.5 py-0.5 font-mono text-xs text-green">
              pept_demo_public
            </code>
            . Production B2B keys are issued out of band; set{" "}
            <code className="font-mono text-xs">ORACLE_API_REQUIRE_KEY=true</code> to enforce.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-panel p-4 font-mono text-xs text-ink-soft">
{`curl -sS "https://pept.trade/api/v1/oracle/prices/SEMA-PERP" \\
  -H "X-API-Key: pept_demo_public" | jq .`}
          </pre>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Endpoints</h2>
          <div className="mt-4 space-y-3">
            {ENDPOINTS.map((e) => (
              <div
                key={e.path}
                className="rounded-xl border border-border bg-panel px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-green-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-green">
                    {e.method}
                  </span>
                  <Link
                    href={e.path}
                    className="break-all font-mono text-xs text-green-soft hover:underline"
                  >
                    {e.path}
                  </Link>
                </div>
                <p className="mt-1.5 text-xs text-muted">{e.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">On-chain settlement</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Marks are pushed to <code className="font-mono text-xs">PeptideOracle</code> on Robinhood
            Chain Testnet (chain id 46630). Integrators can read REST for latency and UX, and verify
            the same feed on-chain for settlement-critical paths.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-panel p-4 font-mono text-xs text-ink-soft">
{`Oracle:  0x59d62e2735Bd583F34A8AC2573bA952Df5849449
Market:  keccak256(utf8("SEMA-PERP"))
Method:  getPrice(bytes32) → uint256 (18 decimals)`}
          </pre>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Integration notes</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-soft">
            <li>CORS is open for GET. Prefer server-side calls for production keys.</li>
            <li>Rate limits: ~60 req/min demo, ~300 req/min standard (per instance).</li>
            <li>History cadence is currently sparse (scrape/push); denser feeds are on the roadmap.</li>
            <li>
              Responses include a <code className="font-mono text-xs">meta</code> object with version
              and auth tier.
            </li>
          </ul>
        </section>

        <p className="mt-12 text-xs text-muted">
          Questions or enterprise access: open a PEPT Trade issue or contact the team. Research peptide
          pricing only; not medical or investment advice.
        </p>
      </div>
    </div>
  );
}
