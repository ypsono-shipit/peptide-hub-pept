import { keccak256, toBytes } from "viem";

export type Market = {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  /** keccak256(<market key seed>) — shared by PeptideOracle (price) and PerpsEngine (market config); same key on both by construction. */
  oracleKey?: `0x${string}`;
};

// On-chain PeptideOracle market keys, pushed via contracts/scripts/
// push-pept-price.ts and push-market-prices.ts. All four are admin-set
// synthetic prices, not real feeds — Robinhood Chain's official token list
// (docs.robinhood.com/chain/contracts) has zero biotech/pharma Stock Tokens
// as of this writing, so there's nothing real to wire LLY/TSHA to yet.
// PEPT-IDX's on-chain key was pushed under the seed "PEPT-USD", decoupled
// from its "PEPT Index" display name/symbol.
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
  },
  {
    symbol: "LLY-PERP",
    name: "Eli Lilly Perpetual",
    price: 812.44,
    change24h: 1.91,
    volume24h: 3_420_000,
    oracleKey: keccak256(toBytes("LLY-PERP")),
  },
  {
    symbol: "TSHA-PERP",
    name: "Taysha Gene Therapies",
    price: 6.72,
    change24h: -0.74,
    volume24h: 480_000,
    oracleKey: keccak256(toBytes("TSHA-PERP")),
  },
  {
    symbol: "GLP1-BASKET",
    name: "GLP-1 Basket",
    price: 118.05,
    change24h: 3.21,
    volume24h: 910_000,
    oracleKey: keccak256(toBytes("GLP1-BASKET")),
  },
];
