export type Market = {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
};

// Placeholder MVP data for the paper trading simulator (PRD §4, §7 Phase 1).
// Swap for a real feed (Chainlink for Stock Tokens, PeptideOracle for the
// synthetic index) once Phase 2 wiring lands.
export const MOCK_MARKETS: Market[] = [
  { symbol: "PEPTIDE-IDX", name: "Peptide Index", price: 42.18, change24h: 3.2, volume24h: 1_240_000 },
  { symbol: "LLY-PERP", name: "Eli Lilly (perp)", price: 812.44, change24h: -1.1, volume24h: 3_420_000 },
  { symbol: "TSHA-PERP", name: "Taysha Gene Therapies (perp)", price: 6.72, change24h: 5.8, volume24h: 480_000 },
  { symbol: "GLP1-BASKET", name: "GLP-1 Correlated Basket", price: 118.05, change24h: 0.6, volume24h: 910_000 },
];
