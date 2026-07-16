import { NextRequest } from "next/server";
import { gate, json, options, withMeta } from "@/lib/oracle-api/http";
import { getUsage } from "@/lib/oracle-api/usage";
import { TIER_LIMITS, TIER_PRICING } from "@/lib/oracle-api/tiers";
import { listWebhooks } from "@/lib/oracle-api/webhooks";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await gate(req, "me");
  if (!g.ok) return g.response;

  const usage = await getUsage(g.auth.keyId);
  const limits = TIER_LIMITS[g.auth.tier];
  const hooks =
    g.auth.tier === "demo" || g.auth.keyId === "anonymous"
      ? []
      : await listWebhooks(g.auth.keyId).catch(() => []);

  return json(
    withMeta(
      {
        keyId: g.auth.keyId,
        tier: g.auth.tier,
        name: g.auth.record?.name ?? g.auth.keyId,
        email: g.auth.record?.email ?? null,
        prefix: g.auth.record?.prefix ?? null,
        usage: {
          requestsToday: usage.day,
          requestsMonth: usage.month,
          day: usage.dayKey,
          month: usage.monthKey,
        },
        limits,
        pricing: TIER_PRICING,
        webhooks: hooks.map((h) => ({
          id: h.id,
          url: h.url,
          events: h.events,
          createdAt: h.createdAt,
          failCount: h.failCount,
        })),
      },
      g.auth,
    ),
  );
}

export async function OPTIONS() {
  return options();
}
