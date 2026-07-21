import { keccak256, toBytes } from "viem";

/**
 * Spot market — SEMA / USDG on Robinhood mainnet Uniswap V2.
 *
 * RH mainnet has Global Dollar (USDG), not Circle USDC. Pair is SEMA/USDG.
 *
 * Uniswap V2 (mainnet 4663):
 *   Factory  0xaA5f8c18EF9be81ffED30c223F9CD0D012a2AdB9
 *   Router02 0x8bc3ce37f87d5F3Ca1DcD4D86c0EcbC6039e3B17
 *   WETH     0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73
 *   USDG     0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168
 *
 * After `npx hardhat run scripts/deploy-sema-spot.ts --network robinhoodMainnet`,
 * paste SemaToken + pair into SPOT_MAINNET and set live: true.
 */
export const SEMA_ORACLE_KEY = keccak256(toBytes("SEMA-PERP"));

export const UNI_V2_FACTORY =
  "0xaA5f8c18EF9be81ffED30c223F9CD0D012a2AdB9" as const;
export const UNI_V2_ROUTER =
  "0x8bc3ce37f87d5F3Ca1DcD4D86c0EcbC6039e3B17" as const;
export const MAINNET_USDG =
  "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const;
export const MAINNET_WETH =
  "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73" as const;

export type SpotPairConfig = {
  baseSymbol: string;
  baseName: string;
  quoteSymbol: string;
  baseToken: `0x${string}`;
  quoteToken: `0x${string}`;
  pair: `0x${string}`;
  router: `0x${string}`;
  factory: `0x${string}`;
  baseDecimals: number;
  quoteDecimals: number;
  mgPerToken: number;
  oracleKey: `0x${string}`;
  /** Where redeemed SEMA is sent before shipping form */
  redeemTreasury: `0x${string}`;
  /** PeptLpGauge — stake LP for weekly PEPT points (zero until deployed) */
  gauge: `0x${string}`;
  live: boolean;
};

const ZERO = "0x0000000000000000000000000000000000000000" as const;

/** Deployer from mainnet.json — used as redeem treasury until overridden */
export const DEFAULT_DEPLOYER =
  "0x4f442C8bA22952bC4271Ff9ECBa7B37CA188C1fB" as const;

export const SPOT_TESTNET: SpotPairConfig = {
  baseSymbol: "SEMA",
  baseName: "Semaglutide research token",
  quoteSymbol: "USDC",
  baseToken: ZERO,
  quoteToken: "0xAc80194dc1aE8eF52df73e7e1864fB3C62290fe0",
  pair: ZERO,
  router: ZERO,
  factory: ZERO,
  baseDecimals: 18,
  quoteDecimals: 6,
  mgPerToken: 1,
  oracleKey: SEMA_ORACLE_KEY,
  redeemTreasury: DEFAULT_DEPLOYER,
  gauge: ZERO,
  live: false,
};

/**
 * Mainnet SEMA/USDG — live Uniswap V2 pool (deployed 2026-07-21).
 * Seed: 10_000 SEMA + 1_000 USDG → ~$0.10 / SEMA launch price.
 * See contracts/deployments/mainnet-spot.json
 */
export const SPOT_MAINNET: SpotPairConfig = {
  baseSymbol: "SEMA",
  baseName: "Semaglutide research token",
  quoteSymbol: "USDG",
  baseToken: "0x240260c893CbB930aeCAce55E6d12f2e8EaD7A10",
  quoteToken: MAINNET_USDG,
  pair: "0x133b31d825658D7781e5dCA4196C850Bb8F083fF",
  router: UNI_V2_ROUTER,
  factory: UNI_V2_FACTORY,
  baseDecimals: 18,
  quoteDecimals: 6,
  mgPerToken: 1,
  oracleKey: SEMA_ORACLE_KEY,
  redeemTreasury: DEFAULT_DEPLOYER,
  gauge: "0xF9b4131239eCfb09E457832a7145357886b1d6dE",
  live: true,
};

export function divergenceBps(poolPrice: number, oraclePrice: number): number | null {
  if (!oraclePrice || oraclePrice <= 0 || !poolPrice || poolPrice <= 0) return null;
  return Math.round((Math.abs(poolPrice - oraclePrice) / oraclePrice) * 10_000);
}

export const DIVERGENCE_WARN_BPS = 1500;

/** Soft monthly kit cap per wallet (ops can raise later). */
export const MONTHLY_KIT_CAP = 5;

/** LP points: rough points per 1 USDG of LP principal (UI estimate). */
export const LP_POINTS_PER_USDG = 10;
