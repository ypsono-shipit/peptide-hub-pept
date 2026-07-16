// Robinhood Chain Testnet (46630). Source of truth: contracts/deployments/testnet.json

/** Collateral is testnet USDC (6 decimals), not the old 18-dec tPUSD mock. */
export const COLLATERAL_DECIMALS = 6;
export const COLLATERAL_SYMBOL = "USDC";

export const TESTNET_CONTRACTS = {
  PEPT: "0x240260c893CbB930aeCAce55E6d12f2e8EaD7A10",
  Treasury: "0x3F0b6D1Be32D2819ABA3893053C4ec3b93116Be5",
  BondDepository: "0x0B9EFc5DA4921B6d0249A06f3a1BB716636bD042",
  Staking: "0xebbFEb218117858871f96f204DE1BBD33A921456",
  PeptideOracle: "0x59d62e2735Bd583F34A8AC2573bA952Df5849449",
  PerpsEngine: "0x8C8860A35e748739a339cA7f09F3A091CEC4abAb",
  /** @deprecated alias, same as USDC */
  TestCollateral_tPUSD: "0xAc80194dc1aE8eF52df73e7e1864fB3C62290fe0",
  USDC: "0xAc80194dc1aE8eF52df73e7e1864fB3C62290fe0",
  PLP: "0xAB3CCa9068c692A0756a215C28Ebe53034362adF",
  PerpsLiquidityPool: "0xeae35fFDfC6038aAED495B0563E25daA4b8951e2",
  /** Pept Trade x Research Only: USDC kit checkout (mints PeptideVoucher NFT) */
  MarketplaceShop: "0xc45eFE5056a2829182145efD7773a72B2Daf1349",
  /** Redeemable kit claim NFT (1 per purchase) */
  PeptideVoucher: "0xa4b737d17c8F2B29Ff0BF5db9DCffE44A3F12Fdc",
} as const;
