import { NextRequest } from "next/server";
import { gate, json, options, withMeta } from "@/lib/oracle-api/http";
import { ORACLE_MARKETS, marketKeyOf } from "@/lib/oracle-api/registry";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await gate(req, "markets");
  if (!g.ok) return g.response;

  const markets = ORACLE_MARKETS.map((m) => ({
    id: m.id,
    name: m.name,
    unit: m.unit,
    description: m.description,
    status: m.status,
    category: m.category,
    decimals: m.decimals,
    marketKey: marketKeyOf(m.id),
  }));

  return json(withMeta({ count: markets.length, markets }, g.auth));
}

export async function OPTIONS() {
  return options();
}
