import { keccak256, toBytes } from "viem";

/**
 * Spot market config — SEMA / USDG (or testnet USDC) Uniswap-style pair.
 * Addresses filled after deploy:SEMA + pool seed; UI works in demo mode until live.
 */
export const SEMA_ORACLE_KEY = keccak256(toBytes("SEMA-PERP"));

export type SpotPairConfig = {
  baseSymbol: string;
  baseName: string;
  quoteSymbol: string;
  /** ERC-20 SEMA token — zero until deployed */
  baseToken: `0x${string}`;
  /** USDG mainnet / USDC testnet collateral */
  quoteToken: `0x${string}`;
  /** Uniswap V2 pair (or router) — zero until pool exists */
  pair: `0x${string}`;
  router: `0x${string}`;
  baseDecimals: number;
  quoteDecimals: number;
  /** mg peptide equivalent per 1 whole SEMA token (redemption ratio) */
  mgPerToken: number;
  oracleKey: `0x${string}`;
  live: boolean;
};

const ZERO = "0x0000000000000000000000000000000000000000" as const;

/** Testnet placeholders — wire after SemaToken + pool deploy */
export const SPOT_TESTNET: SpotPairConfig = {
  baseSymbol: "SEMA",
  baseName: "Semaglutide research token",
  quoteSymbol: "USDC",
  baseToken: ZERO,
  quoteToken: "0xAc80194dc1aE8eF52df73e7e1864fB3C62290fe0",
  pair: ZERO,
  router: ZERO,
  baseDecimals: 18,
  quoteDecimals: 6,
  mgPerToken: 1,
  oracleKey: SEMA_ORACLE_KEY,
  live: false,
};

/** Mainnet — USDG pair when pool is seeded */
export const SPOT_MAINNET: SpotPairConfig = {
  baseSymbol: "SEMA",
  baseName: "Semaglutide research token",
  quoteSymbol: "USDG",
  baseToken: ZERO,
  quoteToken: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  pair: ZERO,
  router: ZERO,
  baseDecimals: 18,
  quoteDecimals: 6,
  mgPerToken: 1,
  oracleKey: SEMA_ORACLE_KEY,
  live: false,
};

export function divergenceBps(poolPrice: number, oraclePrice: number): number | null {
  if (!oraclePrice || oraclePrice <= 0 || !poolPrice || poolPrice <= 0) return null;
  return Math.round((Math.abs(poolPrice - oraclePrice) / oraclePrice) * 10_000);
}

/** Soft warning when pool drifts from research oracle (>15%). */
export const DIVERGENCE_WARN_BPS = 1500;
