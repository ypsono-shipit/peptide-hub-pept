import { keccak256, toBytes } from "viem";

export type Market = {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  /** keccak256(<market key seed>), shared by PeptideOracle + PerpsEngine. */
  oracleKey?: `0x${string}`;
  /** $/mg for peptide-chemical markets, $ for equity-style notionals. */
  unit: "$" | "$/mg";
  /** Shown in UI but not tradeable yet (no full PerpsEngine listing or hidden until ready). */
  comingSoon?: boolean;
};

export function getMarketByOracleKey(oracleKey: `0x${string}`): Market | undefined {
  return MOCK_MARKETS.find((m) => m.oracleKey === oracleKey);
}

/**
 * Tradeable peptide perps + coming-soon GLP-1 names.
 * $PEPT is the platform / OHM-fork token, not a perp market.
 * Keys: keccak256(utf8(symbol)) e.g. keccak256("TIRZ-PERP").
 */
export const MOCK_MARKETS: Market[] = [
  {
    symbol: "SEMA-PERP",
    name: "Semaglutide",
    price: 5.0,
    change24h: 0,
    volume24h: 0,
    oracleKey: keccak256(toBytes("SEMA-PERP")),
    unit: "$/mg",
  },
  {
    symbol: "GLP1-IDX-PERP",
    name: "GLP-1 Index (60% Sema / 25% Tirz / 15% Reta)",
    price: 5.3305,
    change24h: 0,
    volume24h: 0,
    oracleKey: keccak256(toBytes("GLP1-IDX-PERP")),
    unit: "$/mg",
  },
  {
    symbol: "TIRZ-PERP",
    name: "Tirzepatide",
    price: 5.5,
    change24h: 0,
    volume24h: 0,
    oracleKey: keccak256(toBytes("TIRZ-PERP")),
    unit: "$/mg",
    comingSoon: true,
  },
  {
    symbol: "RETA-PERP",
    name: "Retatrutide",
    price: 6.37,
    change24h: 0,
    volume24h: 0,
    oracleKey: keccak256(toBytes("RETA-PERP")),
    unit: "$/mg",
    comingSoon: true,
  },
  {
    symbol: "LLY-PERP",
    name: "Eli Lilly Perpetual",
    price: 812.44,
    change24h: 1.91,
    volume24h: 3_420_000,
    oracleKey: keccak256(toBytes("LLY-PERP")),
    unit: "$",
  },
  {
    symbol: "TSHA-PERP",
    name: "Taysha Gene Therapies",
    price: 6.72,
    change24h: -0.74,
    volume24h: 480_000,
    oracleKey: keccak256(toBytes("TSHA-PERP")),
    unit: "$",
  },
];
