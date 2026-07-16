// Multi-network deployments. Testnet: contracts/deployments/testnet.json
// Mainnet: contracts/deployments/mainnet.json (USDG collateral)

export const CHAIN_TESTNET = 46630;
export const CHAIN_MAINNET = 4663;

/** Both networks use 6-decimal stables (test USDC / mainnet USDG). */
export const COLLATERAL_DECIMALS = 6;

/**
 * PLP ERC20 reports 18 decimals, but PerpsLiquidityPool mints/burns shares 1:1
 * with raw collateral units. Display PLP with this scale.
 */
export const PLP_SHARE_DECIMALS = COLLATERAL_DECIMALS;

export type NetworkKey = "testnet" | "mainnet";

export type NetworkContracts = {
  PEPT: `0x${string}`;
  Treasury: `0x${string}`;
  BondDepository: `0x${string}`;
  Staking: `0x${string}`;
  PeptideOracle: `0x${string}`;
  PerpsEngine: `0x${string}`;
  PLP: `0x${string}`;
  PerpsLiquidityPool: `0x${string}`;
  /** Collateral token (USDC testnet / USDG mainnet) */
  collateral: `0x${string}`;
  MarketplaceShop: `0x${string}`;
  PeptideVoucher: `0x${string}`;
};

export type NetworkConfig = {
  key: NetworkKey;
  chainId: number;
  label: string;
  shortLabel: string;
  testnet: boolean;
  rpcUrl: string;
  explorer: string;
  collateralSymbol: string;
  collateralName: string;
  /** Public mint faucet available (testnet only) */
  canMintCollateral: boolean;
  contracts: NetworkContracts;
  /** False until deploy:mainnet has written real addresses */
  contractsLive: boolean;
};

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export const TESTNET_CONTRACTS = {
  PEPT: "0x240260c893CbB930aeCAce55E6d12f2e8EaD7A10",
  Treasury: "0x3F0b6D1Be32D2819ABA3893053C4ec3b93116Be5",
  BondDepository: "0x0B9EFc5DA4921B6d0249A06f3a1BB716636bD042",
  Staking: "0xebbFEb218117858871f96f204DE1BBD33A921456",
  PeptideOracle: "0x59d62e2735Bd583F34A8AC2573bA952Df5849449",
  PerpsEngine: "0x8C8860A35e748739a339cA7f09F3A091CEC4abAb",
  TestCollateral_tPUSD: "0xAc80194dc1aE8eF52df73e7e1864fB3C62290fe0",
  USDC: "0xAc80194dc1aE8eF52df73e7e1864fB3C62290fe0",
  PLP: "0xAB3CCa9068c692A0756a215C28Ebe53034362adF",
  PerpsLiquidityPool: "0xeae35fFDfC6038aAED495B0563E25daA4b8951e2",
  MarketplaceShop: "0xc45eFE5056a2829182145efD7773a72B2Daf1349",
  PeptideVoucher: "0xa4b737d17c8F2B29Ff0BF5db9DCffE44A3F12Fdc",
} as const;

/** Global Dollar (USDG) on Robinhood Chain mainnet */
export const MAINNET_USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const;

/**
 * Mainnet PEPT stack addresses. Filled by `npm run deploy:mainnet`.
 * Until then contractsLive is false and UI disables write paths.
 */
export const MAINNET_CONTRACTS = {
  PEPT: ZERO,
  Treasury: ZERO,
  BondDepository: ZERO,
  Staking: ZERO,
  PeptideOracle: ZERO,
  PerpsEngine: ZERO,
  PLP: ZERO,
  PerpsLiquidityPool: ZERO,
  USDG: MAINNET_USDG,
  MarketplaceShop: ZERO,
  PeptideVoucher: ZERO,
} as const;

export const NETWORKS: Record<number, NetworkConfig> = {
  [CHAIN_TESTNET]: {
    key: "testnet",
    chainId: CHAIN_TESTNET,
    label: "Robinhood Testnet",
    shortLabel: "Testnet",
    testnet: true,
    rpcUrl: "https://rpc.testnet.chain.robinhood.com",
    explorer: "https://explorer.testnet.chain.robinhood.com",
    collateralSymbol: "USDC",
    collateralName: "Test USD Coin",
    canMintCollateral: true,
    contractsLive: true,
    contracts: {
      PEPT: TESTNET_CONTRACTS.PEPT,
      Treasury: TESTNET_CONTRACTS.Treasury,
      BondDepository: TESTNET_CONTRACTS.BondDepository,
      Staking: TESTNET_CONTRACTS.Staking,
      PeptideOracle: TESTNET_CONTRACTS.PeptideOracle,
      PerpsEngine: TESTNET_CONTRACTS.PerpsEngine,
      PLP: TESTNET_CONTRACTS.PLP,
      PerpsLiquidityPool: TESTNET_CONTRACTS.PerpsLiquidityPool,
      collateral: TESTNET_CONTRACTS.USDC,
      MarketplaceShop: TESTNET_CONTRACTS.MarketplaceShop,
      PeptideVoucher: TESTNET_CONTRACTS.PeptideVoucher,
    },
  },
  [CHAIN_MAINNET]: {
    key: "mainnet",
    chainId: CHAIN_MAINNET,
    label: "Robinhood Mainnet",
    shortLabel: "Mainnet",
    testnet: false,
    rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
    explorer: "https://robinhoodchain.blockscout.com",
    collateralSymbol: "USDG",
    collateralName: "Global Dollar",
    canMintCollateral: false,
    contractsLive: MAINNET_CONTRACTS.PerpsEngine !== ZERO,
    contracts: {
      PEPT: MAINNET_CONTRACTS.PEPT,
      Treasury: MAINNET_CONTRACTS.Treasury,
      BondDepository: MAINNET_CONTRACTS.BondDepository,
      Staking: MAINNET_CONTRACTS.Staking,
      PeptideOracle: MAINNET_CONTRACTS.PeptideOracle,
      PerpsEngine: MAINNET_CONTRACTS.PerpsEngine,
      PLP: MAINNET_CONTRACTS.PLP,
      PerpsLiquidityPool: MAINNET_CONTRACTS.PerpsLiquidityPool,
      collateral: MAINNET_USDG,
      MarketplaceShop: MAINNET_CONTRACTS.MarketplaceShop,
      PeptideVoucher: MAINNET_CONTRACTS.PeptideVoucher,
    },
  },
};

export const DEFAULT_CHAIN_ID = CHAIN_TESTNET;

export function getNetwork(chainId: number | undefined): NetworkConfig {
  if (chainId && NETWORKS[chainId]) return NETWORKS[chainId]!;
  return NETWORKS[DEFAULT_CHAIN_ID]!;
}

/** @deprecated Prefer getNetwork(chainId).collateralSymbol */
export const COLLATERAL_SYMBOL = "USDC";
