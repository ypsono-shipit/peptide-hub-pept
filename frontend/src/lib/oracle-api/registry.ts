import { keccak256, stringToBytes } from "viem";

/**
 * Canonical peptide oracle market catalog for the B2B API.
 * market id string is what clients pass; marketKey = keccak256(utf8(id)).
 */
export type OracleMarketDef = {
  id: string;
  name: string;
  unit: "$/mg" | "$";
  description: string;
  /** If true, feed is reference-only / not fully productionized */
  status: "live" | "beta" | "coming_soon";
  decimals: 18;
  category: "glp1" | "index" | "other";
};

export const ORACLE_MARKETS: OracleMarketDef[] = [
  {
    id: "SEMA-PERP",
    name: "Semaglutide",
    unit: "$/mg",
    description: "Research-grade semaglutide street median ($/mg), dual-source weighted.",
    status: "live",
    decimals: 18,
    category: "glp1",
  },
  {
    id: "GLP1-IDX-PERP",
    name: "GLP-1 Index",
    unit: "$/mg",
    description: "Weighted basket: 60% SEMA / 25% TIRZ / 15% RETA.",
    status: "live",
    decimals: 18,
    category: "index",
  },
  {
    id: "TIRZ-PERP",
    name: "Tirzepatide",
    unit: "$/mg",
    description: "Research-grade tirzepatide street median ($/mg).",
    status: "beta",
    decimals: 18,
    category: "glp1",
  },
  {
    id: "RETA-PERP",
    name: "Retatrutide",
    unit: "$/mg",
    description: "Research-grade retatrutide street median ($/mg).",
    status: "beta",
    decimals: 18,
    category: "glp1",
  },
];

export function marketKeyOf(id: string): `0x${string}` {
  return keccak256(stringToBytes(id));
}

export function getMarketDef(id: string): OracleMarketDef | undefined {
  const upper = id.trim().toUpperCase();
  return ORACLE_MARKETS.find((m) => m.id === upper || m.id === id);
}

export function listMarketIds(): string[] {
  return ORACLE_MARKETS.map((m) => m.id);
}
