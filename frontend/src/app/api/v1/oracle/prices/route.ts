import { NextRequest } from "next/server";
import { gate, json, options, withMeta } from "@/lib/oracle-api/http";
import { ORACLE_MARKETS } from "@/lib/oracle-api/registry";
import { latestSample } from "@/lib/oracle-api/history";
import { fetchOnChainQuote } from "@/lib/oracle-api/onchain";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await gate(req, "prices");
  if (!g.ok) return g.response;

  const prices = await Promise.all(
    ORACLE_MARKETS.map(async (m) => {
      const [sample, onchain] = await Promise.all([
        latestSample(m.id),
        fetchOnChainQuote(m.id),
      ]);

      // Prefer live on-chain if available and not paused; else history
      const price = onchain && !onchain.paused && onchain.price > 0 ? onchain.price : sample?.price ?? null;
      const asOf =
        onchain && !onchain.paused && onchain.updatedAt > 0
          ? onchain.updatedAt
          : sample?.ts ?? null;

      return {
        market: m.id,
        name: m.name,
        unit: m.unit,
        price,
        asOf,
        asOfIso: asOf ? new Date(asOf * 1000).toISOString() : null,
        source: onchain?.source ?? sample?.source ?? null,
        onChain: onchain
          ? {
              price: onchain.price,
              updatedAt: onchain.updatedAt,
              paused: onchain.paused,
              marketKey: onchain.marketKey,
              txHint: sample?.txHash ?? null,
            }
          : null,
        history: sample
          ? { price: sample.price, ts: sample.ts, source: sample.source ?? null }
          : null,
      };
    }),
  );

  return json(withMeta({ count: prices.length, prices }, g.auth));
}

export async function OPTIONS() {
  return options();
}
