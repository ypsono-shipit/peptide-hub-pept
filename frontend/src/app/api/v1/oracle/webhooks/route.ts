import { NextRequest } from "next/server";
import { gate, json, options, withMeta } from "@/lib/oracle-api/http";
import { TIER_LIMITS } from "@/lib/oracle-api/tiers";
import { createWebhook, listWebhooks } from "@/lib/oracle-api/webhooks";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await gate(req, "webhooks");
  if (!g.ok) return g.response;
  if (g.auth.keyId === "anonymous" || g.auth.keyId === "demo") {
    return json(
      { error: "upgrade_required", message: "Register an API key to manage webhooks." },
      { status: 403 },
    );
  }
  const hooks = await listWebhooks(g.auth.keyId);
  return json(
    withMeta(
      {
        count: hooks.length,
        webhooks: hooks.map((h) => ({
          id: h.id,
          url: h.url,
          events: h.events,
          createdAt: h.createdAt,
          failCount: h.failCount,
          // secret only returned at create time
        })),
      },
      g.auth,
    ),
  );
}

export async function POST(req: NextRequest) {
  const g = await gate(req, "webhooks_create");
  if (!g.ok) return g.response;

  const limits = TIER_LIMITS[g.auth.tier];
  if (limits.webhooks <= 0 || g.auth.keyId === "anonymous" || g.auth.keyId === "demo") {
    return json(
      {
        error: "upgrade_required",
        message: "Webhooks require Free tier or higher with a registered API key.",
      },
      { status: 403 },
    );
  }

  const existing = await listWebhooks(g.auth.keyId);
  if (existing.length >= limits.webhooks) {
    return json(
      {
        error: "limit_reached",
        message: `Tier allows ${limits.webhooks} webhook(s).`,
      },
      { status: 400 },
    );
  }

  let body: { url?: string; events?: string[] };
  try {
    body = (await req.json()) as { url?: string; events?: string[] };
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.url || !/^https:\/\//i.test(body.url)) {
    return json(
      { error: "invalid_url", message: "url must be https://" },
      { status: 400 },
    );
  }

  const hook = await createWebhook({
    keyId: g.auth.keyId,
    url: body.url,
    events: body.events,
  });

  return json(
    withMeta(
      {
        webhook: {
          id: hook.id,
          url: hook.url,
          events: hook.events,
          secret: hook.secret,
          createdAt: hook.createdAt,
        },
        note: "Store webhook.secret now; it is not shown again.",
      },
      g.auth,
    ),
    { status: 201 },
  );
}

export async function OPTIONS() {
  return options();
}
