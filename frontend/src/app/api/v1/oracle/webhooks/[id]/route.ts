import { NextRequest } from "next/server";
import { gate, json, options, withMeta } from "@/lib/oracle-api/http";
import { deleteWebhook } from "@/lib/oracle-api/webhooks";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await gate(req, "webhooks_delete");
  if (!g.ok) return g.response;
  if (g.auth.keyId === "anonymous" || g.auth.keyId === "demo") {
    return json({ error: "upgrade_required" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const ok = await deleteWebhook(g.auth.keyId, id);
  if (!ok) return json({ error: "not_found" }, { status: 404 });
  return json(withMeta({ deleted: true, id }, g.auth));
}

export async function OPTIONS() {
  return options();
}
