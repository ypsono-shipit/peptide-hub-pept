import { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/oracle-api/auth";
import { json, options, corsHeaders } from "@/lib/oracle-api/http";
import { createApiKey, listApiKeys } from "@/lib/oracle-api/keys";
import type { OracleTier } from "@/lib/oracle-api/tiers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = assertAdmin(req);
  if (!admin.ok) return admin.response;
  const keys = await listApiKeys();
  return json({
    count: keys.length,
    keys: keys.map((k) => ({
      id: k.id,
      prefix: k.prefix,
      tier: k.tier,
      name: k.name,
      email: k.email,
      createdAt: k.createdAt,
      revokedAt: k.revokedAt ?? null,
      stripeCustomerId: k.stripeCustomerId ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const admin = assertAdmin(req);
  if (!admin.ok) return admin.response;

  let body: { tier?: OracleTier; name?: string; email?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const tier = (body.tier ?? "free") as OracleTier;
  if (!["free", "pro", "enterprise", "demo"].includes(tier)) {
    return json({ error: "invalid_tier" }, { status: 400 });
  }

  const { record, secret } = await createApiKey({
    tier,
    name: body.name ?? "api-key",
    email: body.email,
  });

  return json(
    {
      key: {
        id: record.id,
        prefix: record.prefix,
        tier: record.tier,
        name: record.name,
        email: record.email,
        createdAt: record.createdAt,
        secret,
      },
      note: "Store secret now; it cannot be retrieved again.",
    },
    { status: 201, headers: corsHeaders() },
  );
}

export async function OPTIONS() {
  return options();
}
