import { NextRequest } from "next/server";
import { gate, json, options, withMeta } from "@/lib/oracle-api/http";
import { TIER_LIMITS, TIER_PRICING, type OracleTier } from "@/lib/oracle-api/tiers";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/oracle/billing/checkout
 * Body: { tier: "pro" | "enterprise", successUrl?, cancelUrl? }
 * Creates a Stripe Checkout Session when STRIPE_SECRET_KEY is configured.
 */
export async function POST(req: NextRequest) {
  const g = await gate(req, "billing_checkout");
  if (!g.ok) return g.response;

  let body: { tier?: OracleTier; successUrl?: string; cancelUrl?: string; email?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const tier = body.tier;
  if (tier !== "pro" && tier !== "enterprise") {
    return json(
      { error: "invalid_tier", message: "tier must be pro or enterprise" },
      { status: 400 },
    );
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const priceEnv = TIER_LIMITS[tier].stripePriceEnv!;
  const priceId = process.env[priceEnv];

  if (!secret || !priceId) {
    return json(
      withMeta(
        {
          status: "not_configured",
          message:
            "Stripe is not fully configured. Set STRIPE_SECRET_KEY and " +
            `${priceEnv}. Pricing intent recorded for sales follow-up.`,
          tier,
          pricing: TIER_PRICING[tier],
          contact: "Use /api/v1/oracle/admin/keys with ORACLE_ADMIN_SECRET to issue keys manually.",
        },
        g.auth,
      ),
      { status: 503 },
    );
  }

  const origin = req.nextUrl.origin;
  const successUrl =
    body.successUrl ?? `${origin}/oracle?checkout=success&tier=${tier}`;
  const cancelUrl = body.cancelUrl ?? `${origin}/oracle?checkout=cancel`;

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("client_reference_id", g.auth.keyId);
  params.set("metadata[pept_key_id]", g.auth.keyId);
  params.set("metadata[pept_tier]", tier);
  if (body.email || g.auth.record?.email) {
    params.set("customer_email", body.email ?? g.auth.record!.email!);
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !data.url) {
    return json(
      {
        error: "stripe_error",
        message: data.error?.message ?? "Failed to create checkout session",
      },
      { status: 502 },
    );
  }

  return json(
    withMeta(
      {
        status: "ok",
        checkoutSessionId: data.id,
        url: data.url,
        tier,
      },
      g.auth,
    ),
  );
}

export async function OPTIONS() {
  return options();
}
