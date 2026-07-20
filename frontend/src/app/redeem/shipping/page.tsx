"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useConnect } from "wagmi";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/cn";
import { useOraclePrice } from "@/lib/useOraclePrice";
import { SEMA_ORACLE_KEY } from "@/lib/spot";
import { MOCK_MARKETS } from "@/lib/markets";
import {
  kitsToSema,
  MAX_KITS,
  MIN_KITS,
  SEMA_PER_KIT,
  VIALS_PER_KIT,
} from "@/lib/redeem/constants";

export default function RedeemShippingPage() {
  const seMarket = MOCK_MARKETS.find((m) => m.symbol === "SEMA-PERP")!;
  const { price: oraclePrice, isLive } = useOraclePrice(SEMA_ORACLE_KEY, seMarket.price);
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  const [kits, setKits] = useState(String(MIN_KITS));
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [institution, setInstitution] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ orderId: string; kits: number; seMa: number } | null>(
    null,
  );

  const kitsN = Math.floor(Number(kits) || 0);
  const seMaRequired = useMemo(() => kitsToSema(kitsN), [kitsN]);
  const vials = kitsN * VIALS_PER_KIT;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isConnected || !address) {
      setError("Connect your wallet first.");
      return;
    }
    if (!accept) {
      setError("Confirm research-only use to continue.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          wallet: address,
          kits: kitsN,
          fullName,
          institution: institution || undefined,
          address1,
          address2: address2 || undefined,
          city,
          stateRegion: stateRegion || undefined,
          postalCode,
          country,
          phone: phone || undefined,
          notes: notes || undefined,
          researchConfirm: accept,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        orderId?: string;
        kits?: number;
        seMaRequired?: number;
      };
      if (!res.ok || !data.ok || !data.orderId) {
        setError(data.error || "Could not submit order.");
        return;
      }
      setDone({
        orderId: data.orderId,
        kits: data.kits ?? kitsN,
        seMa: data.seMaRequired ?? seMaRequired,
      });
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar
        market={{
          symbol: "SHIP",
          name: "Shipping details",
          price: oraclePrice,
          change24h: 0,
          volume24h: 0,
          unit: "$/mg",
          oracleKey: SEMA_ORACLE_KEY,
        }}
        price={oraclePrice}
        isLive={isLive}
      />

      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        <div className="mx-auto max-w-xl">
          <Link
            href="/redeem"
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
          >
            <ArrowLeft size={12} /> Redeem overview
          </Link>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            Shipping &amp; kit order
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Whole kits only · {SEMA_PER_KIT} SEMA = {VIALS_PER_KIT} vials (Research Only pack size).
            Confirmation email after submit; we fulfill from the ops sheet.
          </p>

          {done ? (
            <div className="mt-8 rounded-2xl border border-green/35 bg-green/5 p-6 text-center">
              <CheckCircle2 className="mx-auto text-green" size={32} />
              <h2 className="mt-3 text-lg font-semibold text-ink">Request received</h2>
              <p className="mt-2 text-sm text-ink-soft">
                Order <span className="font-mono text-ink">{done.orderId}</span>
                <br />
                {done.kits} kit{done.kits === 1 ? "" : "s"} · {done.seMa} SEMA required ·{" "}
                {done.kits * VIALS_PER_KIT} vials
              </p>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Check your inbox for a confirmation email. PEPT will verify holdings and process
                fulfillment manually — not instant.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Link href="/spot" className="btn-green px-4 py-2 text-sm">
                  Back to spot
                </Link>
                <Link
                  href="/redeem"
                  className="rounded-lg border border-border-strong px-4 py-2 text-sm font-semibold text-ink hover:bg-panel"
                >
                  Redeem home
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-border bg-panel p-5">
              <div className="rounded-lg border border-border bg-bg px-3 py-2 text-xs">
                <div className="text-muted">Wallet (ship / SEMA holder)</div>
                {isConnected && address ? (
                  <div className="mt-0.5 truncate font-mono text-sm text-ink">{address}</div>
                ) : (
                  <button
                    type="button"
                    className="btn-green mt-2 w-full py-2 text-xs"
                    onClick={() => {
                      const c = connectors[0];
                      if (c) connect({ connector: c });
                    }}
                  >
                    Connect wallet
                  </button>
                )}
              </div>

              <Field label={`Kits (${SEMA_PER_KIT} SEMA each)`} required>
                <input
                  type="number"
                  min={MIN_KITS}
                  max={MAX_KITS}
                  step={1}
                  value={kits}
                  onChange={(e) => setKits(e.target.value)}
                  className={inputCls}
                />
                <p className="mt-1 text-[10px] text-muted">
                  = {Number.isFinite(vials) && kitsN > 0 ? vials : "—"} vials ·{" "}
                  <span className="font-mono text-ink-soft">{seMaRequired || "—"} SEMA</span>{" "}
                  required (min {SEMA_PER_KIT})
                </p>
              </Field>

              <Field label="Email (confirmation)" required>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lab@example.com"
                  className={inputCls}
                  autoComplete="email"
                />
              </Field>

              <Field label="Full name" required>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputCls}
                  autoComplete="name"
                />
              </Field>

              <Field label="Institution / lab (optional)">
                <input
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="Address line 1" required>
                <input
                  required
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  className={inputCls}
                  autoComplete="address-line1"
                />
              </Field>

              <Field label="Address line 2">
                <input
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  className={inputCls}
                  autoComplete="address-line2"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="City" required>
                  <input
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputCls}
                    autoComplete="address-level2"
                  />
                </Field>
                <Field label="State / region">
                  <input
                    value={stateRegion}
                    onChange={(e) => setStateRegion(e.target.value)}
                    className={inputCls}
                    autoComplete="address-level1"
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Postal code" required>
                  <input
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className={inputCls}
                    autoComplete="postal-code"
                  />
                </Field>
                <Field label="Country" required>
                  <input
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={inputCls}
                    autoComplete="country-name"
                  />
                </Field>
              </div>

              <Field label="Phone (optional)">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputCls}
                  autoComplete="tel"
                />
              </Field>

              <Field label="Notes (customs / access)">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className={cn(inputCls, "resize-none")}
                />
              </Field>

              <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-bg px-3 py-2 text-[11px] text-ink-soft">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
                Research use only. Not for human consumption. Manual fulfillment after we verify
                SEMA. On-chain burn may be required later.
              </div>

              <label className="flex items-start gap-2 text-[11px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={accept}
                  onChange={(e) => setAccept(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I confirm lawful research-only use, understand kits are {VIALS_PER_KIT} vials /
                  {SEMA_PER_KIT} SEMA each, and accept that fulfillment is not guaranteed
                  immediately.
                </span>
              </label>

              {error && (
                <p className="text-xs text-negative" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy || !isConnected || !accept}
                className={cn(
                  "btn-green w-full py-2.5 text-sm",
                  (busy || !isConnected || !accept) && "opacity-50",
                )}
              >
                {busy ? "Submitting…" : "Submit redemption order"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-border-strong bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-green";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
        {required ? " *" : ""}
      </div>
      {children}
    </label>
  );
}
