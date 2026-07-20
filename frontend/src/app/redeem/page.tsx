"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useConnect } from "wagmi";
import { AlertTriangle, FlaskConical, Package, ShieldCheck } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { AccountCard } from "@/components/AccountCard";
import { cn } from "@/lib/cn";
import { useOraclePrice } from "@/lib/useOraclePrice";
import { SEMA_ORACLE_KEY } from "@/lib/spot";
import { MOCK_MARKETS } from "@/lib/markets";

type Step = "balance" | "request" | "done";

export default function RedeemPage() {
  const seMarket = MOCK_MARKETS.find((m) => m.symbol === "SEMA-PERP")!;
  const { price: oraclePrice, isLive } = useOraclePrice(SEMA_ORACLE_KEY, seMarket.price);
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  const [qty, setQty] = useState("1");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [accept, setAccept] = useState(false);
  const [step, setStep] = useState<Step>("balance");
  const [busy, setBusy] = useState(false);

  // SEMA not deployed yet — show demo balance 0
  const seBalance = 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accept || !isConnected) return;
    setBusy(true);
    // Off-chain queue placeholder — wire to Sheets/API later
    await new Promise((r) => setTimeout(r, 600));
    setStep("done");
    setBusy(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar
        market={{
          symbol: "REDEEM",
          name: "Vial redemption",
          price: oraclePrice,
          change24h: 0,
          volume24h: 0,
          unit: "$/mg",
          oracleKey: SEMA_ORACLE_KEY,
        }}
        price={oraclePrice}
        isLive={isLive}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Research utility
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Redeem SEMA for{" "}
              <em className="font-serif font-normal italic text-green-soft">research vials</em>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              <strong className="text-ink">1 SEMA token = 1 research vial</strong> (subject to
              availability, verification, and batch processing). Start is controlled —
              limited monthly capacity, light verification, fulfillment via partner lab.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: FlaskConical,
                title: "1:1 mapping",
                body: "Each SEMA is designed to correspond to one research unit of semaglutide product.",
              },
              {
                icon: Package,
                title: "Batch fulfillment",
                body: "Burns + requests are queued off-chain; shipping in scheduled research batches.",
              },
              {
                icon: ShieldCheck,
                title: "Controlled access",
                body: "Monthly caps, verification, and strong research-only disclaimers.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-border bg-panel p-4">
                <Icon size={18} className="text-green" />
                <div className="mt-2 text-sm font-semibold text-ink">{title}</div>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">{body}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 rounded-xl border border-amber-500/35 bg-panel px-4 py-3 text-xs text-ink-soft">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
            <div>
              <div className="font-semibold text-ink">Research use only</div>
              <p className="mt-1 leading-relaxed">
                Not for human consumption. Not a medical product. Redemption is{" "}
                <strong className="text-ink">not guaranteed immediately</strong> and may be
                delayed, limited, or declined for compliance reasons. By requesting, you
                confirm lawful research intent in your jurisdiction.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-panel p-4 text-xs text-ink-soft">
            <div className="font-semibold text-ink">How it works</div>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4">
              <li>Hold SEMA on Robinhood Chain (spot / LP).</li>
              <li>Connect wallet · request qty · provide contact for fulfillment.</li>
              <li>On approval: burn SEMA on-chain + pay shipping / handling fee.</li>
              <li>Partner lab ships research vial(s) in the next batch window.</li>
            </ol>
            <p className="mt-3 text-muted">
              Oracle reference: ~${oraclePrice.toFixed(4)}/mg research mark
              {isLive ? " (live)" : ""}. Spot trading:{" "}
              <Link href="/spot" className="text-green-soft hover:underline">
                /spot
              </Link>
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[360px]">
          <AccountCard />

          <div className="rounded-xl border border-border bg-panel p-4">
            {step === "done" ? (
              <div className="text-center">
                <div className="text-sm font-semibold text-ink">Request logged (demo)</div>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                  On-chain burn + fulfillment API is not live yet. Your demo request is
                  acknowledged in-session only. When SEMA + burn flow ship, this form will
                  queue real redemptions.
                </p>
                <button
                  type="button"
                  className="btn-green mt-4 w-full py-2 text-sm"
                  onClick={() => setStep("balance")}
                >
                  Back
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <h2 className="text-sm font-semibold text-ink">Redemption request</h2>

                <div className="rounded-lg border border-border bg-bg px-3 py-2 text-xs">
                  <div className="text-muted">SEMA balance</div>
                  <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-ink">
                    {seBalance.toFixed(4)}
                  </div>
                  <div className="text-[10px] text-muted">
                    Token not deployed on this network yet
                  </div>
                </div>

                <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Vials requested (1 SEMA each)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full rounded-lg border border-border-strong bg-bg px-3 py-2 font-mono text-sm text-ink outline-none focus:border-green"
                />

                <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Contact email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lab@example.com"
                  className="w-full rounded-lg border border-border-strong bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-green"
                />

                <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Notes (shipping / institution)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-green"
                  placeholder="Institution, preferred ship-to country…"
                />

                <label className="flex items-start gap-2 text-[11px] text-ink-soft">
                  <input
                    type="checkbox"
                    checked={accept}
                    onChange={(e) => setAccept(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I confirm research-only use, understand redemption is limited and not
                    immediate, and accept the disclaimers above.
                  </span>
                </label>

                {!isConnected ? (
                  <button
                    type="button"
                    className="btn-green w-full py-2.5 text-sm"
                    onClick={() => {
                      const c = connectors[0];
                      if (c) connect({ connector: c });
                    }}
                  >
                    Connect wallet
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!accept || busy}
                    className={cn(
                      "btn-green w-full py-2.5 text-sm",
                      (!accept || busy) && "opacity-50",
                    )}
                  >
                    {busy ? "Submitting…" : "Submit redemption request"}
                  </button>
                )}

                {address && (
                  <p className="truncate text-center font-mono text-[10px] text-faint">
                    {address}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
