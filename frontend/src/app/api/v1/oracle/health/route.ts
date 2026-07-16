import { NextRequest } from "next/server";
import { gate, json, options, withMeta } from "@/lib/oracle-api/http";
import { ORACLE_MARKETS } from "@/lib/oracle-api/registry";
import { loadHistory, historyMeta, latestSample } from "@/lib/oracle-api/history";
import { fetchOnChainQuote } from "@/lib/oracle-api/onchain";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await gate(req, "health");
  if (!g.ok) return g.response;

  const hist = await loadHistory();
  const meta = historyMeta(hist);
  const now = Math.floor(Date.now() / 1000);

  const feeds = await Promise.all(
    ORACLE_MARKETS.map(async (m) => {
      const sample = await latestSample(m.id);
      const onchain = await fetchOnChainQuote(m.id);
      const ageSec = sample ? now - sample.ts : null;
      return {
        market: m.id,
        status: m.status,
        historyAgeSec: ageSec,
        historyPrice: sample?.price ?? null,
        onChainPrice: onchain?.price ?? null,
        onChainUpdatedAt: onchain?.updatedAt ?? null,
        onChainPaused: onchain?.paused ?? null,
        healthy:
          sample != null &&
          ageSec != null &&
          ageSec < 48 * 3600 &&
          !(onchain?.paused ?? false),
      };
    }),
  );

  const healthyCount = feeds.filter((f) => f.healthy).length;

  return json(
    withMeta(
      {
        status: healthyCount > 0 ? "ok" : "degraded",
        history: meta,
        feeds,
      },
      g.auth,
    ),
  );
}

export async function OPTIONS() {
  return options();
}
