import { keccak256, toBytes } from "viem";

export type Market = {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  /** keccak256("<symbol>") market key on PeptideOracle, if this market has a live on-chain price. */
  oracleKey?: `0x${string}`;
};

// MVP data for the paper trading simulator (PRD §4, §7 Phase 1).
// PEPT-USD is real — its price comes from PeptideOracle on Robinhood Chain
// Testnet (genesis-bootstrapped at $1.00, see scripts/push-pept-price.ts).
// The rest are still placeholders pending real Stock Token oracle wiring.
export const MOCK_MARKETS: Market[] = [
  {
    symbol: "PEPT-USD",
    name: "Peptide ($PEPT)",
    price: 1.0,
    change24h: 0,
    volume24h: 0,
    oracleKey: keccak256(toBytes("PEPT-USD")),
  },
  { symbol: "LLY-PERP", name: "Eli Lilly (perp)", price: 812.44, change24h: -1.1, volume24h: 3_420_000 },
  { symbol: "TSHA-PERP", name: "Taysha Gene Therapies (perp)", price: 6.72, change24h: 5.8, volume24h: 480_000 },
  { symbol: "GLP1-BASKET", name: "GLP-1 Correlated Basket", price: 118.05, change24h: 0.6, volume24h: 910_000 },
];
