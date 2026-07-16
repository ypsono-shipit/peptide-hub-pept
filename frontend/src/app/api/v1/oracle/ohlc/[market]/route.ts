import { NextRequest } from "next/server";
import { gate, json, options, withMeta } from "@/lib/oracle-api/http";
import { getMarketDef } from "@/lib/oracle-api/registry";
import { loadHistory, latestSample } from "@/lib/oracle-api/history";
import { fetchOnChainQuote } from "@/lib/oracle-api/onchain";
import { parseTimeframe, samplesToOhlc } from "@/lib/ohlc";

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
      { error: "unknown_market", message: `Unknown market "${raw}"` },
      { status: 404 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const tf = parseTimeframe(sp.get("tf"));
  const wantLive = sp.get("live") !== "0" && sp.get("live") !== "false";
  const maxBars = Math.min(Math.max(Number(sp.get("limit") ?? 150), 10), 500);

  const hist = await loadHistory();
  let livePrice: number | undefined;
  if (wantLive) {
    const onchain = await fetchOnChainQuote(def.id);
    if (onchain && !onchain.paused && onchain.price > 0) livePrice = onchain.price;
    else {
      const s = await latestSample(def.id);
      if (s) livePrice = s.price;
    }
  }

  const candles = samplesToOhlc(hist.samples, def.id, tf, {
    livePrice,
    maxBars,
  });

  return json(
    withMeta(
      {
        market: def.id,
        unit: def.unit,
        tf,
        count: candles.length,
        sampleCount: hist.samples.filter((s) => s.market === def.id).length,
        livePrice: livePrice ?? null,
        candles,
      },
      g,
    ),
  );
}

export async function OPTIONS() {
  return options();
}
