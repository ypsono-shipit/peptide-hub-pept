"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccount, useConnect } from "wagmi";

export default function WaitlistPage() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [already, setAlready] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch("/api/waitlist", { cache: "no-store" });
      const data = (await res.json()) as { count?: number };
      if (typeof data.count === "number") setCount(data.count);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 20_000);
    return () => clearInterval(t);
  }, [refreshCount]);

  useEffect(() => {
    if (isConnected && address) setWallet(address);
  }, [isConnected, address]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          wallet: wallet || undefined,
          xHandle: xHandle || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        alreadyJoined?: boolean;
        position?: number;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not join. Try again.");
        return;
      }
      setDone(true);
      setAlready(Boolean(data.alreadyJoined));
      if (typeof data.position === "number") setPosition(data.position);
      await refreshCount();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const displayCount = count ?? 0;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg">
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

      <header className="relative z-20 mx-auto flex w-full max-w-lg items-center justify-between px-5 py-5 sm:px-6">
        <Link href="/waitlist" className="flex items-center gap-2.5">
          <Image
            src="/logo-asterisk.jpg"
            alt="PEPT"
            width={32}
            height={32}
            className="rounded-lg ring-1 ring-border"
            priority
          />
          <span className="text-sm font-semibold tracking-tight text-ink">PEPT TRADE</span>
        </Link>
        <span className="rounded-full border border-border bg-panel px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-muted">
          Waitlist
        </span>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-col px-5 pb-20 pt-6 sm:px-6 sm:pt-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
          Early access
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
          Join the line for peptide{" "}
          <em className="font-serif font-normal italic text-green-soft">perps</em>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft sm:text-base">
          Oracle-marked markets, USDG margin, and research-kit NFTs on Robinhood Chain. Leave your
          details — we&apos;ll open access in waves.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-panel px-5 py-4">
          <div className="text-[11px] uppercase tracking-wide text-muted">Queue</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tabular-nums text-ink">
              {count === null ? "—" : displayCount.toLocaleString()}
            </span>
            <span className="text-sm text-ink-soft">
              trader{displayCount === 1 ? "" : "s"} in line
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted">Updates as people join the waitlist</p>
        </div>

        {done ? (
          <div className="mt-8 rounded-2xl border border-green/30 bg-green/5 px-5 py-6">
            <h2 className="text-lg font-semibold text-ink">
              {already ? "You're already on the list" : "You're on the list"}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              {position != null
                ? `About ${position.toLocaleString()} trader${position === 1 ? "" : "s"} in line including you.`
                : "We'll email you when your wave opens."}
            </p>
            <p className="mt-4 text-xs text-muted">
              Follow{" "}
              <a
                href="https://t.me/blackswanhl"
                target="_blank"
                rel="noreferrer"
                className="text-ink underline underline-offset-2"
              >
                @blackswanhl
              </a>{" "}
              for updates.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Email" required>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@lab.com"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-border-strong"
              />
            </Field>

            <Field label="Wallet address" hint="EVM address for access">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder="0x…"
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 font-mono text-sm text-ink outline-none placeholder:text-muted focus:border-border-strong"
                />
                <button
                  type="button"
                  onClick={() => connect({ connector: connectors[0] })}
                  className="shrink-0 rounded-xl border border-border-strong px-3 py-2 text-xs font-semibold text-ink hover:bg-panel"
                >
                  {isConnected ? "Linked" : "Connect"}
                </button>
              </div>
            </Field>

            <Field label="X handle" hint="Optional">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                  @
                </span>
                <input
                  type="text"
                  value={xHandle}
                  onChange={(e) => setXHandle(e.target.value)}
                  placeholder="handle"
                  className="w-full rounded-xl border border-border bg-bg py-2.5 pl-7 pr-3 text-sm text-ink outline-none placeholder:text-muted focus:border-border-strong"
                />
              </div>
            </Field>

            {error && (
              <p className="text-xs text-negative" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-green py-3.5 text-sm font-semibold text-black transition hover:bg-green-dim disabled:opacity-50"
            >
              {busy ? "Joining…" : "Join waitlist"}
            </button>

            <p className="text-center text-[11px] leading-relaxed text-muted">
              No spam. We only use this for access invites.{" "}
              <Link href="/home" className="text-ink-soft underline underline-offset-2">
                About PEPT
              </Link>
            </p>
          </form>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-ink">
          {label}
          {required && <span className="text-muted"> *</span>}
        </span>
        {hint && <span className="text-[10px] text-muted">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
