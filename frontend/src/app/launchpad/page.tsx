"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BrandWordmark } from "@/components/BrandWordmark";
import { Rocket, Sparkles, Shield, Layers } from "lucide-react";

export default function LaunchpadPage() {
  const [count, setCount] = useState<number | null>(null);

  const refreshCount = useCallback(async () => {
    try {
      // Same queue as /waitlist → /api/waitlist → Supabase (or Sheets fallback)
      const res = await fetch("/api/waitlist", { cache: "no-store" });
      const data = (await res.json()) as { count?: number };
      if (typeof data.count === "number") setCount(data.count);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 30_000);
    return () => clearInterval(t);
  }, [refreshCount]);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
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
          <Link href="/spot" className="hover:text-ink">
            Spot
          </Link>
          <Link href="/perps" className="hover:text-ink">
            Perps
          </Link>
          <Link href="/redeem" className="hover:text-ink">
            Redeem
          </Link>
          <Link
            href="/waitlist?from=launchpad"
            className="rounded-full bg-green px-3 py-1 text-xs font-semibold text-black hover:bg-green-dim"
          >
            Join waitlist
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
        <div className="pt-10 sm:pt-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-green/30 bg-green/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-green">
            <Rocket size={12} />
            Launchpad
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Fully-backed peptide launches.{" "}
            <em className="font-serif font-normal italic text-green-soft">
              Coming soon.
            </em>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
            Phase 1 is live as spot SEMA with research-oracle pricing. Next: the Pept
            Trade Launchpad — fundraising and launches where{" "}
            <strong className="text-ink">1 token = 1 physical research vial</strong>, fully
            reserved and fulfilled through partner labs.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <PhaseCard
            phase="Phase 1 · Now"
            title="Trade SEMA spot"
            body="Uniswap-style SEMA / USDG (USDC on testnet) with PeptideOracle $/mg research mark, divergence education, and controlled vial redemption path."
            cta={{ href: "/spot", label: "Open spot desk" }}
            accent
          />
          <PhaseCard
            phase="Phase 2 · Soon"
            title="Launchpad RWA vials"
            body="Curated fully-backed launches: raise inventory capital, mint 1:1 research units, transparent reserves, and batch redemption. TIRZ, RETA, and more."
            cta={{ href: "/waitlist?from=launchpad", label: "Join waitlist" }}
          />
        </div>

        <section className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "Hype with substance",
              body: "Oracle-backed research pricing from day one — not pure narrative tokens.",
            },
            {
              icon: Shield,
              title: "Reserved inventory",
              body: "Future launches target real vial backing and partner-lab fulfillment.",
            },
            {
              icon: Layers,
              title: "Same rails",
              body: "Spot, perps, redeem, and launchpad share one PEPT Trade identity.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-panel p-5">
              <Icon size={20} className="text-green" />
              <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{body}</p>
            </div>
          ))}
        </section>

        <section
          id="waitlist"
          className="mt-16 scroll-mt-20 rounded-2xl border border-border bg-panel p-6 sm:p-8"
        >
          <h2 className="text-xl font-semibold text-ink">Get launch alerts</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Uses the <strong className="text-ink">same waitlist</strong> as{" "}
            <Link href="/waitlist" className="text-green-soft hover:underline">
              /waitlist
            </Link>
            {" "}
            (Supabase table <code className="text-ink">waitlist</code>, with Sheets fallback).
            {count != null && (
              <span className="text-muted">
                {" "}
                · {count.toLocaleString()} already in line
              </span>
            )}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/waitlist?from=launchpad"
              className="btn-green inline-flex justify-center px-6 py-2.5 text-sm"
            >
              Join the PEPT waitlist
            </Link>
            <Link
              href="/waitlist"
              className="inline-flex justify-center rounded-lg border border-border-strong px-4 py-2.5 text-sm font-semibold text-ink hover:bg-bg"
            >
              Open waitlist page
            </Link>
          </div>
          <p className="mt-4 text-[11px] text-muted">
            Research use only · not investment advice. One list powers product + launchpad.
          </p>
        </section>

        <p className="mt-10 text-center text-xs text-muted">
          <Link href="/perps" className="hover:text-ink">
            Perpetuals
          </Link>
          {" · "}
          <Link href="/redeem" className="hover:text-ink">
            Redeem
          </Link>
          {" · "}
          <Link href="/oracle/monitor" className="hover:text-ink">
            Oracle
          </Link>
        </p>
      </main>
    </div>
  );
}

function PhaseCard({
  phase,
  title,
  body,
  cta,
  accent,
}: {
  phase: string;
  title: string;
  body: string;
  cta: { href: string; label: string };
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-6 ${
        accent ? "border-green/35 bg-green/5" : "border-border bg-panel"
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        {phase}
      </div>
      <h2 className="mt-2 text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{body}</p>
      <Link
        href={cta.href}
        className={
          accent
            ? "btn-green mt-5 inline-flex justify-center py-2 text-sm"
            : "mt-5 inline-flex justify-center rounded-lg border border-border-strong px-4 py-2 text-sm font-semibold text-ink hover:bg-bg"
        }
      >
        {cta.label}
      </Link>
    </div>
  );
}
