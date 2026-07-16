import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { MOCK_MARKETS } from "@/lib/markets";
import { MARKETPLACE_BRAND } from "@/lib/marketplaceData";

export const metadata: Metadata = {
  title: "PEPT Trade — Peptide Perpetuals on Robinhood Chain",
  description:
    "Oracle-marked peptide perps, USDC margin, PLP liquidity, and Pept Trade x Research Only kits. Launch the terminal on Robinhood Chain Testnet.",
};

const FEATURES = [
  {
    title: "Peptide perps",
    body: "Trade SEMA, GLP-1 index, and biotech markets with isolated margin and oracle marks — on-chain, 24/7.",
  },
  {
    title: "Real $/mg marks",
    body: "Dual-source scrapers feed PeptideOracle. SEMA and GLP1-IDX track research-grade peptide pricing.",
  },
  {
    title: "USDC + PLP",
    body: "Margin in testnet USDC. Liquidity providers backstop open interest through the PLP vault.",
  },
  {
    title: "Kit vouchers",
    body: `${MARKETPLACE_BRAND.name} — pay listed kit prices, receive a PEPT-KIT NFT redeemable for the physical peptide.`,
  },
];

const MARKETS = MOCK_MARKETS.filter((m) => m.unit === "$/mg" || m.symbol.startsWith("SEMA") || m.symbol.startsWith("GLP"));

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
            src="/logo-asterisk.jpg"
            alt="PEPT"
            width={36}
            height={36}
            className="rounded-lg ring-1 ring-border"
            priority
          />
          <span className="text-sm font-semibold tracking-tight text-ink">PEPT TRADE</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#markets" className="hover:text-ink">
            Markets
          </a>
          <a href="#product" className="hover:text-ink">
            Product
          </a>
          <Link href="/marketplace" className="hover:text-ink">
            Marketplace
          </Link>
        </nav>
        <Link
          href="/trade"
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-on-primary transition hover:bg-accent sm:text-sm"
        >
          Launch Terminal
        </Link>
      </header>

      {/* Hero — Arcus-style big type */}
      <main className="relative z-10">
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center px-5 pb-20 pt-10 sm:px-8 sm:pt-16">
          <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.2em] text-muted sm:text-xs">
            Robinhood Chain Testnet · Peptide perps
          </p>

          <h1 className="max-w-4xl text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl md:text-7xl lg:text-[5.25rem]">
            Trade peptides
            <br />
            while the world{" "}
            <em className="font-serif font-normal italic text-ink-soft">sleeps</em>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
            Oracle-marked perpetual markets for research peptides — USDC margin, PLP liquidity, and a
            kit marketplace that mints redeemable NFT vouchers. $PEPT powers the platform.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/trade"
              className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-on-primary transition hover:bg-accent"
            >
              Launch Terminal
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center rounded-full border border-border-strong px-7 py-3.5 text-sm font-semibold text-ink transition hover:border-ink hover:bg-panel"
            >
              Browse Kits
            </Link>
          </div>

          <p className="mt-8 text-xs text-muted">
            Built for Robinhood Chain · Self-custodial · Demo testnet
          </p>
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
                  Peptide exposure. On-chain marks.
                </p>
              </div>
              <Link href="/trade" className="shrink-0 text-xs font-medium text-ink underline-offset-4 hover:underline">
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
                      <span className="rounded bg-panel-hover px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink">
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
            Where <em className="font-serif font-normal italic text-ink-soft">real</em> peptides
            meet <em className="font-serif font-normal italic text-ink-soft">real</em> trading
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">
            PEPT Trade is a peptide-native perps terminal and research-kit marketplace — not a generic
            crypto perp fork with a biotech skin.
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
        </section>

        {/* Built for RH chain */}
        <section className="border-t border-border bg-panel">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Built to <em className="font-serif font-normal italic text-ink-soft">last</em>.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
                Deployed on Robinhood Chain Testnet with a GMX-style liquidity pool, dual-source
                oracle, and OHM-inspired $PEPT tokenomics for staking and treasury — separate from the
                markets you trade.
              </p>
              <Link
                href="/trade"
                className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-accent"
              >
                Launch Terminal
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: "Chain", v: "46630" },
                { k: "Collateral", v: "USDC" },
                { k: "Oracle", v: "Dual scrape" },
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
            <em className="font-serif font-normal italic text-ink-soft">Neither do peptides.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-ink-soft">
            Enter the monochrome terminal — charts, order ticket, positions, and kit checkout.
          </p>
          <Link
            href="/trade"
            className="mt-10 inline-flex rounded-full bg-primary px-10 py-4 text-sm font-semibold text-on-primary hover:bg-accent"
          >
            Launch Terminal
          </Link>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2">
            <Image src="/logo-asterisk.jpg" alt="" width={20} height={20} className="rounded" />
            <span className="text-ink-soft">PEPT Trade</span>
            <span>·</span>
            <span>Peptide Hub</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/trade" className="hover:text-ink">
              Trade
            </Link>
            <Link href="/marketplace" className="hover:text-ink">
              Marketplace
            </Link>
            <Link href="/liquidity" className="hover:text-ink">
              Liquidity
            </Link>
            <Link href="/stake" className="hover:text-ink">
              Stake
            </Link>
          </div>
          <p className="text-faint">Testnet demo · Research use only kits</p>
        </div>
      </footer>
    </div>
  );
}
