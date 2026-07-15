import { keccak256, toBytes } from "viem";

export type Market = {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  /** keccak256(<market key seed>) — shared by PeptideOracle (price) and PerpsEngine (market config); same key on both by construction. */
  oracleKey?: `0x${string}`;
  /** $/mg for real peptide-chemical markets, $ (index/notional) for everything else. */
  unit: "$" | "$/mg";
  /** Priced (for index weighting / info) but no PerpsEngine market configured — not tradeable yet. */
  comingSoon?: boolean;
};

// On-chain PeptideOracle market keys. PEPT-IDX's key was pushed under the
// seed "PEPT-USD", decoupled from its "PEPT Index" display name/symbol —
// every other market's key matches its display symbol exactly.
const PEPT_ORACLE_KEY = keccak256(toBytes("PEPT-USD"));

export function getMarketByOracleKey(oracleKey: `0x${string}`): Market | undefined {
  return MOCK_MARKETS.find((m) => m.oracleKey === oracleKey);
}

export const MOCK_MARKETS: Market[] = [
  {
    symbol: "PEPT-IDX",
    name: "PEPT Index",
    price: 1.0,
    change24h: 2.84,
    volume24h: 0,
    oracleKey: PEPT_ORACLE_KEY,
    unit: "$",
  },
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
];
