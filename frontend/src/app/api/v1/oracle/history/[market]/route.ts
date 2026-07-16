import { NextRequest } from "next/server";
import { gate, json, options, withMeta } from "@/lib/oracle-api/http";
import { getMarketDef } from "@/lib/oracle-api/registry";
import { marketSamples } from "@/lib/oracle-api/history";
import { TIER_LIMITS } from "@/lib/oracle-api/tiers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ market: string }> },
) {
  const g = await gate(req, "history");
  if (!g.ok) return g.response;

  const { market: raw } = await ctx.params;
  const id = decodeURIComponent(raw).toUpperCase();
  const def = getMarketDef(id);
  if (!def) {
    return json(
      { error: "unknown_market", message: `Unknown market "${raw}"` },
      { status: 404 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") ? Number(sp.get("from")) : undefined;
  const to = sp.get("to") ? Number(sp.get("to")) : undefined;
  const cap = TIER_LIMITS[g.auth.tier].historyLimit;
  const limit = Math.min(Math.max(Number(sp.get("limit") ?? cap), 1), cap);

  const samples = await marketSamples(def.id, {
    from: Number.isFinite(from) ? from : undefined,
    to: Number.isFinite(to) ? to : undefined,
    limit,
  });

  return json(
    withMeta(
      {
        market: def.id,
        unit: def.unit,
        count: samples.length,
        samples,
      },
      g.auth,
    ),
  );
}

export async function OPTIONS() {
  return options();
}
