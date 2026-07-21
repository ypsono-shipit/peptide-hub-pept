import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { MOCK_MARKETS } from "@/lib/markets";
import {
  MARKETPLACE_BRAND,
  MARKETPLACE_STATS,
  PEPTIDES,
  RESEARCH_ONLY,
} from "@/lib/marketplaceData";
import { NetworkToggle } from "@/components/NetworkToggle";
import { BrandWordmark } from "@/components/BrandWordmark";

export const metadata: Metadata = {
  title: "PEPT Trade | Peptide Perpetuals on Robinhood Chain",
  description:
    "Oracle-marked peptide perps, USDG margin, and Pept Trade x Research Only kits on Robinhood Chain.",
};

const FEATURES = [
  {
    title: "Peptide perps",
    body: "Trade SEMA, GLP-1 index, and biotech markets with isolated margin and oracle marks, on-chain, 24/7.",
  },
  {
    title: "Real $/mg marks",
    body: "PeptideOracle aggregates research pricing across 30+ vendors and laboratories. SEMA and GLP1-IDX track institutional-grade $/mg marks.",
  },
  {
    title: "USDC + PLP",
    body: "Margin in testnet USDC. Liquidity providers backstop open interest through the PLP vault.",
  },
  {
    title: "Kit vouchers",
    body: `${MARKETPLACE_BRAND.name}: pay listed kit prices, receive a PEPT-KIT NFT redeemable for the physical peptide.`,
  },
];

const MARKETS = MOCK_MARKETS.filter((m) => m.unit === "$/mg" || m.symbol.startsWith("SEMA") || m.symbol.startsWith("GLP"));

/** Featured kits for landing preview only — no checkout; waitlist CTA. */
const PREVIEW_KITS = PEPTIDES.filter((p) =>
  ["semaglutide", "tirzepatide", "retatrutide", "bpc-157", "tb-500", "kpv"].includes(p.id),
).slice(0, 6);
// fallback if ids differ
const KIT_PREVIEW =
  PREVIEW_KITS.length >= 4
    ? PREVIEW_KITS
    : PEPTIDES.filter((p) => p.bestseller || p.category === "weightloss").slice(0, 6);

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg">
      {/* subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #1f1f1f 1px, transparent 1px), linear-gradient(to bottom, #1f1f1f 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 20%, black 20%, transparent 75%)",
        }}
      />

      {/* Nav */}
      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="PEPT"
            width={36}
            height={36}
            className="rounded-lg ring-1 ring-border"
            priority
          />
          <BrandWordmark />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#markets" className="hover:text-ink">
            Markets
          </a>
          <a href="#product" className="hover:text-ink">
            Product
          </a>
          <a href="#marketplace" className="hover:text-ink">
            Marketplace
          </a>
          <Link href="/learn" className="hover:text-ink">
            Learn
          </Link>
          <Link href="/oracle" className="hover:text-ink">
            Oracle API
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <NetworkToggle />
          <Link
            href="/waitlist"
            className="rounded-full bg-green px-4 py-2 text-xs font-semibold text-black transition hover:bg-green-dim sm:text-sm"
          >
            Join waitlist
          </Link>
        </div>
      </header>

      {/* Hero: copy left, vial right */}
      <main className="relative z-10">
        <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 px-5 pb-16 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[1fr_minmax(280px,42%)] lg:gap-12 lg:pb-20">
          <div className="flex flex-col justify-center">
            <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.2em] text-muted sm:text-xs">
              Robinhood Chain Testnet · Peptide perps
            </p>

            <h1 className="max-w-4xl text-[2.15rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl md:text-6xl lg:text-[3.5rem] xl:text-[3.75rem]">
              Trade peptides
              <br />
              <span className="whitespace-nowrap">
                while the world{" "}
                <em className="font-serif font-normal italic text-green-soft">sleeps</em>
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
              Oracle-marked perpetual markets for research peptides: USDC margin, PLP liquidity, and a
              kit marketplace that mints redeemable NFT vouchers. $PEPT powers the platform.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/waitlist"
                className="inline-flex items-center justify-center rounded-full bg-green px-7 py-3.5 text-sm font-semibold text-black transition hover:bg-green-dim"
              >
                Join waitlist
              </Link>
              <a
                href="#marketplace"
                className="inline-flex items-center justify-center rounded-full border border-border-strong px-7 py-3.5 text-sm font-semibold text-ink transition hover:border-ink hover:bg-panel"
              >
                Preview kits
              </a>
            </div>

            <p className="mt-8 text-xs text-muted">
              Built for Robinhood Chain · Self-custodial · Mainnet coming soon
            </p>
          </div>

          {/* Vial bottle on the right */}
          <div className="relative mx-auto flex w-full max-w-md items-center justify-center lg:mx-0 lg:max-w-none lg:justify-end">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-8 rounded-full bg-white/[0.04] blur-3xl"
            />
            <div className="relative aspect-[3/4] w-full max-w-[340px] overflow-hidden rounded-3xl border border-border bg-black sm:max-w-[400px] lg:max-w-none lg:w-[min(100%,420px)]">
              <Image
                src="/pept-vial.jpg"
                alt="PEPT research peptide vial"
                fill
                priority
                sizes="(max-width: 1024px) 340px, 420px"
                className="object-cover object-center"
              />
            </div>
          </div>
        </section>

        {/* Markets strip */}
        <section id="markets" className="border-y border-border bg-panel/80">
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted">
                  Markets
                </h2>
                <p className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                  Peptide exposure.
                </p>
              </div>
              <Link href="/spot" className="shrink-0 text-xs font-medium text-ink underline-offset-4 hover:underline">
                Open trade →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {MARKETS.map((m) => (
                <div
                  key={m.symbol}
                  className="rounded-2xl border border-border bg-bg px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted">{m.symbol}</span>
                    {m.comingSoon ? (
                      <span className="rounded bg-panel-hover px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted">
                        Soon
                      </span>
                    ) : (
                      <span className="rounded bg-green-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-green-soft">
                        Live
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-ink">{m.name}</div>
                  <div className="mt-1 font-mono text-lg tabular-nums text-ink">
                    ${m.price.toFixed(2)}
                    {m.unit === "$/mg" && (
                      <span className="ml-1 text-xs font-normal text-muted">/mg</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product */}
        <section id="product" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl md:text-5xl">
            Where <em className="font-serif font-normal italic text-green-soft">real</em> peptides
            <br />
            meet <em className="font-serif font-normal italic text-green-soft">real</em> trading
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">
            PEPT Trade is a peptide-native perps terminal and research-kit marketplace.
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-panel p-6 transition hover:border-border-strong"
              >
                <div className="font-mono text-[11px] text-muted">
                  /{String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-ink">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-panel p-6">
            <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted">
              B2B infrastructure
            </div>
            <h3 className="mt-2 text-xl font-semibold text-ink">Peptide Oracle API</h3>
            <p className="mt-2 max-w-xl text-sm text-ink-soft">
              The same multi-vendor $/mg marks we settle on-chain, exposed as REST for other
              protocols and dashboards. Markets, live prices, history, and OHLC.
            </p>
            <Link
              href="/docs/oracle"
              className="mt-4 inline-flex text-sm font-semibold text-green hover:text-green-soft"
            >
              Read the Oracle API docs →
            </Link>
          </div>
        </section>

        {/* Marketplace preview — catalog teaser; checkout only via waitlist for now */}
        <section id="marketplace" className="border-t border-border bg-panel/60">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
                  {MARKETPLACE_BRAND.name}
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  Research kit{" "}
                  <em className="font-serif font-normal italic text-green-soft">marketplace</em>
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
                  {RESEARCH_ONLY.tagline}. Preview of the catalog — kit checkout opens with early
                  access. Join the waitlist to be first in line.
                </p>
              </div>
              <Link
                href="/waitlist?from=marketplace"
                className="shrink-0 rounded-full bg-green px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-green-dim"
              >
                Join waitlist
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Compounds", value: MARKETPLACE_STATS.peptidesListed },
                { label: "Purity", value: MARKETPLACE_STATS.purity },
                { label: "Kit size", value: MARKETPLACE_STATS.kitNote },
                { label: "Access", value: "Waitlist" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border bg-bg px-3 py-3"
                >
                  <div className="text-sm font-semibold tabular-nums text-ink">{s.value}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {KIT_PREVIEW.map((p) => (
                <div
                  key={p.id}
                  className="group flex flex-col rounded-2xl border border-border bg-bg p-4 transition hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-ink">{p.name}</div>
                      <div className="mt-0.5 text-[11px] text-muted">
                        {p.dosage} · {p.kitLabel}
                      </div>
                    </div>
                    {p.bestseller ? (
                      <span className="rounded bg-green-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-green-soft">
                        Featured
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-2 flex-1 text-xs leading-relaxed text-ink-soft">
                    {p.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="font-mono text-sm tabular-nums text-ink">
                      {p.priceIsFrom ? "from " : ""}${p.priceFrom.toFixed(0)}
                      <span className="ml-1 text-[10px] font-normal text-muted">/ kit</span>
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
                      Coming soon
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-bg/80 px-6 py-8 text-center">
              <p className="max-w-md text-sm text-ink-soft">
                Full marketplace checkout is invite-only while we finish on-chain kit vouchers and
                shipping. Get notified when you can buy.
              </p>
              <Link
                href="/waitlist?from=marketplace"
                className="inline-flex rounded-full bg-green px-8 py-3 text-sm font-semibold text-black transition hover:bg-green-dim"
              >
                Join waitlist for kit access
              </Link>
              <p className="text-[10px] text-faint">{RESEARCH_ONLY.disclaimer}</p>
            </div>
          </div>
        </section>

        {/* Built for RH chain */}
        <section className="border-t border-border bg-panel">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                The first peptide pricing{" "}
                <em className="font-serif font-normal italic text-green-soft">oracle</em>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
                Continuous price intelligence across 30+ research vendors and laboratories,
                synthesized into on-chain $/mg marks for SEMA, GLP-1, and the broader peptide
                complex.
              </p>
              <Link
                href="/waitlist"
                className="mt-8 inline-flex rounded-full bg-green px-6 py-3 text-sm font-semibold text-black hover:bg-green-dim"
              >
                Join waitlist
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: "Chain", v: "46630" },
                { k: "Collateral", v: "USDC" },
                { k: "Oracle", v: "30+ vendors" },
                { k: "LP", v: "PLP vault" },
              ].map((s) => (
                <div key={s.k} className="rounded-2xl border border-border bg-bg px-4 py-5">
                  <div className="text-[11px] uppercase tracking-wide text-muted">{s.k}</div>
                  <div className="mt-1 font-mono text-xl font-semibold text-ink">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-5 py-24 text-center sm:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
            Markets never sleep.
            <br />
            <em className="font-serif font-normal italic text-green-soft">Neither do peptides.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-ink-soft">
            Join the waitlist for early access to peptide perps, oracle marks, and kit checkout.
          </p>
          <Link
            href="/waitlist"
            className="mt-10 inline-flex rounded-full bg-green px-10 py-4 text-sm font-semibold text-black hover:bg-green-dim"
          >
            Join waitlist
          </Link>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={20} height={20} className="rounded" />
            <BrandWordmark className="text-ink-soft" />
            <span>·</span>
            <span>Peptide Hub</span>
          </div>
          <p className="text-faint">Testnet demo · Research use only kits</p>
        </div>
      </footer>
    </div>
  );
}
