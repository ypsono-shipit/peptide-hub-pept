import { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/oracle-api/auth";
import { json, options } from "@/lib/oracle-api/http";
import { revokeApiKey, updateKeyTier } from "@/lib/oracle-api/keys";
import type { OracleTier } from "@/lib/oracle-api/tiers";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = assertAdmin(req);
  if (!admin.ok) return admin.response;
  const { id } = await ctx.params;
  const ok = await revokeApiKey(id);
  if (!ok) return json({ error: "not_found" }, { status: 404 });
  return json({ revoked: true, id });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = assertAdmin(req);
  if (!admin.ok) return admin.response;
  const { id } = await ctx.params;
  let body: { tier?: OracleTier };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.tier) return json({ error: "tier_required" }, { status: 400 });
  const rec = await updateKeyTier(id, body.tier);
  if (!rec) return json({ error: "not_found" }, { status: 404 });
  return json({
    id: rec.id,
    tier: rec.tier,
    prefix: rec.prefix,
    name: rec.name,
  });
}

export async function OPTIONS() {
  return options();
}
