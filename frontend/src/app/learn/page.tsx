"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  FlaskConical,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/cn";
import {
  LEARN_DISCLAIMER,
  PEPTIDE_LEARN,
  type PeptideLearn,
} from "@/lib/learn/peptides";

const COLOR: Record<
  PeptideLearn["color"],
  { ring: string; chip: string; soft: string; bar: string }
> = {
  green: {
    ring: "border-green/35",
    chip: "bg-green/15 text-green",
    soft: "text-green-soft",
    bar: "bg-green",
  },
  sky: {
    ring: "border-sky-500/35",
    chip: "bg-sky-500/15 text-sky-300",
    soft: "text-sky-300",
    bar: "bg-sky-400",
  },
  violet: {
    ring: "border-violet-500/35",
    chip: "bg-violet-500/15 text-violet-300",
    soft: "text-violet-300",
    bar: "bg-violet-400",
  },
};

export default function LearnPage() {
  const [activeId, setActiveId] = useState(PEPTIDE_LEARN[0]!.id);
  const peptide = PEPTIDE_LEARN.find((p) => p.id === activeId) ?? PEPTIDE_LEARN[0]!;
  const c = COLOR[peptide.color];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex-row lg:overflow-hidden">
        {/* Left rail */}
        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-64 lg:overflow-y-auto">
          <div className="rounded-2xl border border-border bg-panel p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Learn desk
            </p>
            <h1 className="mt-1 text-lg font-semibold text-ink">
              Peptide{" "}
              <em className="font-serif font-normal italic text-green-soft">101</em>
            </h1>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
              Simple cards on SEMA, TIRZ & RETA — what they are, how they help, sides & risks.
              Fun facts included. No jargon walls.
            </p>
          </div>

          <nav className="rounded-2xl border border-border bg-panel p-2">
            {PEPTIDE_LEARN.map((p) => {
              const active = p.id === activeId;
              const pc = COLOR[p.color];
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveId(p.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition",
                    active ? "bg-bg ring-1 ring-border-strong" : "hover:bg-bg/60",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold",
                      pc.chip,
                    )}
                  >
                    {p.short.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{p.short}</span>
                    <span className="block truncate text-[10px] text-muted">{p.fullName}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="rounded-2xl border border-amber-500/30 bg-panel p-3 text-[10px] leading-relaxed text-ink-soft">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
              <AlertTriangle size={12} />
              Read this first
            </div>
            {LEARN_DISCLAIMER}
          </div>

          <div className="flex flex-wrap gap-2 text-[11px]">
            <Link href="/risk" className="text-muted hover:text-ink hover:underline">
              SEMA risk desk →
            </Link>
            <Link href="/spot" className="text-green-soft hover:underline">
              Trade SEMA spot →
            </Link>
          </div>
        </div>

        {/* Main cards */}
        <div className="min-w-0 flex-1 space-y-3 lg:overflow-y-auto">
          {/* Hero card */}
          <div className={cn("rounded-2xl border bg-panel p-5 sm:p-6", c.ring)}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold", c.chip)}>
                    {peptide.short}
                  </span>
                  <span className="text-[10px] text-muted">{peptide.aka}</span>
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                  {peptide.fullName}
                </h2>
                <p className={cn("mt-1 text-sm font-medium", c.soft)}>{peptide.tagline}</p>
              </div>
              <FlaskConical className={cn("shrink-0 opacity-80", c.soft)} size={28} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <PlainCard
                icon={BookOpen}
                title="In plain English"
                body={peptide.inPlainEnglish}
              />
              <PlainCard
                icon={Sparkles}
                title="How it works"
                body={peptide.howItWorks}
              />
            </div>

            <div className="mt-3 flex gap-2 rounded-xl border border-border bg-bg/80 px-3 py-2.5 text-xs text-ink-soft">
              <Lightbulb size={16} className={cn("mt-0.5 shrink-0", c.soft)} />
              <p>
                <span className="font-semibold text-ink">Fun fact · </span>
                {peptide.funFact}
              </p>
            </div>
          </div>

          {/* Topic cards */}
          <div className="grid gap-3 md:grid-cols-3">
            {peptide.cards.map((card) => (
              <article
                key={card.id}
                className="flex flex-col rounded-2xl border border-border bg-panel p-4 transition hover:border-border-strong"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden>
                    {card.emoji}
                  </span>
                  <h3 className="text-sm font-semibold text-ink">{card.title}</h3>
                </div>
                <ul className="mt-3 flex-1 space-y-2">
                  {card.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-xs leading-relaxed text-ink-soft"
                    >
                      <span
                        className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", c.bar)}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          {/* Compare strip */}
          <div className="rounded-2xl border border-border bg-panel p-4">
            <h3 className="text-sm font-semibold text-ink">Quick compare</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted">
                    <th className="pb-2 pr-3 font-medium">Peptide</th>
                    <th className="pb-2 pr-3 font-medium">Targets</th>
                    <th className="pb-2 pr-3 font-medium">Vibe check</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-ink-soft">
                  <tr className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-semibold text-ink">SEMA</td>
                    <td className="py-2.5 pr-3">GLP-1</td>
                    <td className="py-2.5 pr-3">Classic weekly workhorse</td>
                    <td className="py-2.5">Widely prescribed brands</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-semibold text-ink">TIRZ</td>
                    <td className="py-2.5 pr-3">GIP + GLP-1</td>
                    <td className="py-2.5 pr-3">Dual path, often stronger</td>
                    <td className="py-2.5">Major approved brands</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-semibold text-ink">RETA</td>
                    <td className="py-2.5 pr-3">GIP + GLP-1 + glucagon</td>
                    <td className="py-2.5 pr-3">Triple, trial-era energy</td>
                    <td className="py-2.5">Investigational / evolving</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="pb-4 text-center text-[10px] text-faint">
            PEPT Trade education · Research use only materials are not for human consumption ·{" "}
            <Link href="/risk" className="underline-offset-2 hover:underline">
              Full SEMA risk notes
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function PlainCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg/70 p-3.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
        <Icon size={12} className="text-green" />
        {title}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-soft sm:text-[13px]">{body}</p>
    </div>
  );
}
