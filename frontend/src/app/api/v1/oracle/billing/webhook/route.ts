import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { json } from "@/lib/oracle-api/http";
import { updateKeyTier } from "@/lib/oracle-api/keys";
import type { OracleTier } from "@/lib/oracle-api/tiers";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook endpoint.
 * Configure: STRIPE_WEBHOOK_SECRET
 * Events: checkout.session.completed, customer.subscription.updated/deleted
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const raw = await req.text();

  if (secret) {
    const sig = req.headers.get("stripe-signature") ?? "";
    // Minimal Stripe signature verification (v1)
    const ok = verifyStripeSignature(raw, sig, secret);
    if (!ok) {
      return json({ error: "invalid_signature" }, { status: 400 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return json(
      { error: "webhook_not_configured", message: "Set STRIPE_WEBHOOK_SECRET" },
      { status: 503 },
    );
  }

  let event: {
    type?: string;
    data?: { object?: Record<string, unknown> };
  };
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const obj = event.data?.object ?? {};
  const type = event.type ?? "";

  if (type === "checkout.session.completed") {
    const keyId = String(obj.client_reference_id ?? (obj.metadata as Record<string, string>)?.pept_key_id ?? "");
    const tier = String((obj.metadata as Record<string, string>)?.pept_tier ?? "pro") as OracleTier;
    if (keyId && keyId !== "anonymous" && keyId !== "demo") {
      await updateKeyTier(keyId, tier === "enterprise" ? "enterprise" : "pro", {
        customerId: String(obj.customer ?? ""),
        subscriptionId: String(obj.subscription ?? ""),
      });
    }
  }

  if (type === "customer.subscription.deleted") {
    // Downgrade handled when we store customer→key mapping; best-effort via metadata
    const meta = (obj.metadata ?? {}) as Record<string, string>;
    if (meta.pept_key_id) {
      await updateKeyTier(meta.pept_key_id, "free");
    }
  }

  return json({ received: true, type });
}

function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  try {
    const parts = Object.fromEntries(
      header.split(",").map((p) => {
        const [k, v] = p.split("=");
        return [k, v];
      }),
    ) as Record<string, string>;
    const t = parts.t;
    const v1 = parts.v1;
    if (!t || !v1) return false;
    const signed = `${t}.${payload}`;
    const expect = createHmac("sha256", secret).update(signed).digest("hex");
    const a = Buffer.from(expect);
    const b = Buffer.from(v1);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
