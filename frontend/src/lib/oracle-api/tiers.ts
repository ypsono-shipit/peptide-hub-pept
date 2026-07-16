export type OracleTier = "demo" | "free" | "pro" | "enterprise";

export type TierLimits = {
  rpm: number; // requests per minute
  daily: number; // requests per day
  historyLimit: number;
  ohlcLimit: number;
  webhooks: number;
  signedQuotes: boolean;
  stripePriceEnv?: string; // env var name for Stripe price id
};

export const TIER_LIMITS: Record<OracleTier, TierLimits> = {
  demo: {
    rpm: 60,
    daily: 2_000,
    historyLimit: 200,
    ohlcLimit: 150,
    webhooks: 0,
    signedQuotes: false,
  },
  free: {
    rpm: 120,
    daily: 10_000,
    historyLimit: 500,
    ohlcLimit: 200,
    webhooks: 1,
    signedQuotes: false,
  },
  pro: {
    rpm: 600,
    daily: 200_000,
    historyLimit: 2000,
    ohlcLimit: 500,
    webhooks: 10,
    signedQuotes: true,
    stripePriceEnv: "STRIPE_PRICE_ORACLE_PRO",
  },
  enterprise: {
    rpm: 3000,
    daily: 2_000_000,
    historyLimit: 5000,
    ohlcLimit: 1000,
    webhooks: 50,
    signedQuotes: true,
    stripePriceEnv: "STRIPE_PRICE_ORACLE_ENTERPRISE",
  },
};

export const TIER_PRICING = {
  free: { monthlyUsd: 0, label: "Free" },
  pro: { monthlyUsd: 99, label: "Pro" },
  enterprise: { monthlyUsd: 499, label: "Enterprise" },
} as const;
