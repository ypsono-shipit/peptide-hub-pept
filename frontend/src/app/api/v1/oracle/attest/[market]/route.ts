import { NextRequest } from "next/server";
import { gate, json, options, withMeta } from "@/lib/oracle-api/http";
import { getMarketDef, marketKeyOf } from "@/lib/oracle-api/registry";
import { latestSample } from "@/lib/oracle-api/history";
import { fetchOnChainQuote } from "@/lib/oracle-api/onchain";
import { canSign, createAttestation } from "@/lib/oracle-api/attest";
import { TESTNET_CONTRACTS } from "@/lib/deployments";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ market: string }> },
) {
  const g = await gate(req, "attest");
  if (!g.ok) return g.response;

  if (!canSign(g.auth.tier)) {
    return json(
      {
        error: "upgrade_required",
        message: "Signed attestations require Pro or Enterprise tier.",
        upgrade: "/oracle#pricing",
      },
      { status: 403 },
    );
  }

  const { market: raw } = await ctx.params;
  const id = decodeURIComponent(raw).toUpperCase();
  const def = getMarketDef(id);
  if (!def) {
    return json({ error: "unknown_market", message: `Unknown market "${raw}"` }, { status: 404 });
  }

  const [sample, onchain] = await Promise.all([
    latestSample(def.id),
    fetchOnChainQuote(def.id),
  ]);
  const price =
    onchain && !onchain.paused && onchain.price > 0 ? onchain.price : sample?.price ?? null;
  const asOf =
    onchain && !onchain.paused && onchain.updatedAt > 0 ? onchain.updatedAt : sample?.ts ?? null;

  if (price == null || asOf == null) {
    return json({ error: "no_price", message: "No mark available for market." }, { status: 404 });
  }

  const attestation = createAttestation({
    market: def.id,
    price,
    unit: def.unit,
    asOf,
    marketKey: marketKeyOf(def.id),
    chainId: 46630,
    oracle: TESTNET_CONTRACTS.PeptideOracle,
    source: onchain?.source ?? sample?.source ?? null,
  });

  return json(withMeta({ attestation }, g.auth));
}

export async function OPTIONS() {
  return options();
}
