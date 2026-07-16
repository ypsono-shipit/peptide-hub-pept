import { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/oracle-api/auth";
import { json, options } from "@/lib/oracle-api/http";
import { fanoutPriceUpdated } from "@/lib/oracle-api/webhooks";
import { ORACLE_MARKETS } from "@/lib/oracle-api/registry";
import { latestSample } from "@/lib/oracle-api/history";
import { fetchOnChainQuote } from "@/lib/oracle-api/onchain";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/oracle/admin/fanout
 * Called by keepers after a successful price push to notify webhook subscribers.
 * Auth: X-Admin-Secret
 */
export async function POST(req: NextRequest) {
  const admin = assertAdmin(req);
  if (!admin.ok) return admin.response;

  let body: { prices?: { market: string; price: number; unit?: string; asOf?: number; source?: string }[] } =
    {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // empty body → fanout current marks
  }

  let prices = body.prices;
  if (!prices || prices.length === 0) {
    prices = [];
    for (const m of ORACLE_MARKETS) {
      const [s, o] = await Promise.all([latestSample(m.id), fetchOnChainQuote(m.id)]);
      const price = o && !o.paused && o.price > 0 ? o.price : s?.price;
      const asOf = o && !o.paused && o.updatedAt > 0 ? o.updatedAt : s?.ts;
      if (price != null && asOf != null) {
        prices.push({
          market: m.id,
          price,
          unit: m.unit,
          asOf,
          source: o?.source ?? s?.source,
        });
      }
    }
  }

  const result = await fanoutPriceUpdated(
    prices.map((p) => ({
      market: p.market,
      price: p.price,
      unit: p.unit ?? "$/mg",
      asOf: p.asOf ?? Math.floor(Date.now() / 1000),
      source: p.source ?? null,
    })),
  );

  return json({ ok: true, prices: prices.length, ...result });
}

export async function OPTIONS() {
  return options();
}
