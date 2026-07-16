import { NextRequest } from "next/server";
import { gate, json, options, withMeta } from "@/lib/oracle-api/http";
import { getMarketDef, marketKeyOf } from "@/lib/oracle-api/registry";
import { latestSample } from "@/lib/oracle-api/history";
import { fetchOnChainQuote } from "@/lib/oracle-api/onchain";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ market: string }> },
) {
  const g = gate(req);
  if (!g.ok) return g.response;

  const { market: raw } = await ctx.params;
  const id = decodeURIComponent(raw).toUpperCase();
  const def = getMarketDef(id);
  if (!def) {
    return json(
      { error: "unknown_market", message: `Unknown market "${raw}". GET /api/v1/oracle/markets` },
      { status: 404 },
    );
  }

  const [sample, onchain] = await Promise.all([
    latestSample(def.id),
    fetchOnChainQuote(def.id),
  ]);

  const price =
    onchain && !onchain.paused && onchain.price > 0 ? onchain.price : sample?.price ?? null;
  const asOf =
    onchain && !onchain.paused && onchain.updatedAt > 0 ? onchain.updatedAt : sample?.ts ?? null;

  return json(
    withMeta(
      {
        market: def.id,
        name: def.name,
        unit: def.unit,
        status: def.status,
        marketKey: marketKeyOf(def.id),
        price,
        asOf,
        asOfIso: asOf ? new Date(asOf * 1000).toISOString() : null,
        source: onchain?.source ?? sample?.source ?? null,
        onChain: onchain,
        historyLatest: sample,
      },
      g,
    ),
  );
}

export async function OPTIONS() {
  return options();
}
