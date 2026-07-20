"use client";

import Link from "next/link";
import { AlertTriangle, FlaskConical, Package, ShieldCheck, Truck } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { AccountCard } from "@/components/AccountCard";
import { useOraclePrice } from "@/lib/useOraclePrice";
import { SEMA_ORACLE_KEY } from "@/lib/spot";
import { MOCK_MARKETS } from "@/lib/markets";
import { SEMA_PER_KIT, VIALS_PER_KIT } from "@/lib/redeem/constants";

export default function RedeemPage() {
  const seMarket = MOCK_MARKETS.find((m) => m.symbol === "SEMA-PERP")!;
  const { price: oraclePrice, isLive } = useOraclePrice(SEMA_ORACLE_KEY, seMarket.price);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar
        market={{
          symbol: "REDEEM",
          name: "Kit redemption",
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
              <em className="font-serif font-normal italic text-green-soft">
                Research Only kits
              </em>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              Economic unit: <strong className="text-ink">1 SEMA ≈ 1 research vial</strong>.
              Partner inventory (Research Only) ships in{" "}
              <strong className="text-ink">kits of {VIALS_PER_KIT} vials</strong>, so you need{" "}
              <strong className="text-ink">at least {SEMA_PER_KIT} SEMA</strong> to redeem{" "}
              <strong className="text-ink">1 kit</strong>.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: FlaskConical,
                title: `${SEMA_PER_KIT} SEMA = 1 kit`,
                body: `Each kit is ${VIALS_PER_KIT} vials. Whole kits only — no partial kit redemptions.`,
              },
              {
                icon: Truck,
                title: "Shipping form",
                body: "Submit ship-to details. We save the order and email you a confirmation.",
              },
              {
                icon: Package,
                title: "Manual fulfillment",
                body: "PEPT ops verifies SEMA + research intent, then fulfills from the sheet queue.",
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
                <strong className="text-ink">not instant</strong> — we fulfill manually after
                review. Orders may be delayed, limited, or declined for compliance.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-panel p-4 text-xs text-ink-soft">
            <div className="font-semibold text-ink">How it works now</div>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4">
              <li>
                Hold at least <strong className="text-ink">{SEMA_PER_KIT} SEMA</strong> (spot
                / future pool). On-chain burn ships later; today we verify balance off-chain.
              </li>
              <li>
                Open the shipping form · choose whole kits · enter ship-to + contact email.
              </li>
              <li>
                Order is written to our <strong className="text-ink">Google Sheet</strong>{" "}
                (ops queue). You get a <strong className="text-ink">confirmation email</strong>.
              </li>
              <li>
                We fulfill manually (partner kit batch). You&apos;ll hear when it ships.
              </li>
            </ol>
            <p className="mt-3 text-muted">
              Oracle reference: ~${oraclePrice.toFixed(4)}/mg
              {isLive ? " (live)" : ""}.{" "}
              <Link href="/spot" className="text-green-soft hover:underline">
                Trade SEMA spot →
              </Link>
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[360px]">
          <AccountCard />

          <div className="rounded-xl border border-border bg-panel p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ShieldCheck size={16} className="text-green" />
              Ready to redeem?
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Minimum <span className="font-mono text-ink">{SEMA_PER_KIT} SEMA</span> →{" "}
              <span className="font-mono text-ink">1 kit ({VIALS_PER_KIT} vials)</span>. Next
              step collects shipping details and emails confirmation.
            </p>
            <Link
              href="/redeem/shipping"
              className="btn-green mt-4 flex w-full items-center justify-center py-2.5 text-sm"
            >
              Continue to shipping →
            </Link>
            <p className="mt-3 text-center text-[10px] text-muted">
              No payment on this form — kit fulfillment is ops-reviewed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
