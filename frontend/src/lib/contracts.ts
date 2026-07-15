import type { Abi } from "viem";
import PEPT_ABI from "./abis/PEPT.json";
import STAKING_ABI from "./abis/Staking.json";
import BOND_DEPOSITORY_ABI from "./abis/BondDepository.json";
import PEPTIDE_ORACLE_ABI from "./abis/PeptideOracle.json";
import PERPS_ENGINE_ABI from "./abis/PerpsEngine.json";
import MOCK_ERC20_ABI from "./abis/MockERC20.json";
import PLP_ABI from "./abis/PLP.json";
import PERPS_LIQUIDITY_POOL_ABI from "./abis/PerpsLiquidityPool.json";
import MARKETPLACE_SHOP_ABI from "./abis/MarketplaceShop.json";
import PEPTIDE_VOUCHER_ABI from "./abis/PeptideVoucher.json";
import { TESTNET_CONTRACTS } from "./deployments";

export const peptContract = {
  address: TESTNET_CONTRACTS.PEPT as `0x${string}`,
  abi: PEPT_ABI as Abi,
} as const;

export const stakingContract = {
  address: TESTNET_CONTRACTS.Staking as `0x${string}`,
  abi: STAKING_ABI as Abi,
} as const;

export const bondDepositoryContract = {
  address: TESTNET_CONTRACTS.BondDepository as `0x${string}`,
  abi: BOND_DEPOSITORY_ABI as Abi,
} as const;

export const peptideOracleContract = {
  address: TESTNET_CONTRACTS.PeptideOracle as `0x${string}`,
  abi: PEPTIDE_ORACLE_ABI as Abi,
} as const;

export const perpsEngineContract = {
  address: TESTNET_CONTRACTS.PerpsEngine as `0x${string}`,
  abi: PERPS_ENGINE_ABI as Abi,
} as const;

/** Testnet USDC (6 decimals, public mint). */
export const collateralContract = {
  address: TESTNET_CONTRACTS.USDC as `0x${string}`,
  abi: MOCK_ERC20_ABI as Abi,
} as const;

export const plpTokenContract = {
  address: TESTNET_CONTRACTS.PLP as `0x${string}`,
  abi: PLP_ABI as Abi,
} as const;

export const plpPoolContract = {
  address: TESTNET_CONTRACTS.PerpsLiquidityPool as `0x${string}`,
  abi: PERPS_LIQUIDITY_POOL_ABI as Abi,
} as const;

/** Pept Trade x Research Only catalog — pay kit price in testnet USDC, mint voucher NFT. */
export const marketplaceShopContract = {
  address: TESTNET_CONTRACTS.MarketplaceShop as `0x${string}`,
  abi: MARKETPLACE_SHOP_ABI as Abi,
} as const;

/** Redeemable peptide kit voucher (ERC-721). */
export const peptideVoucherContract = {
  address: TESTNET_CONTRACTS.PeptideVoucher as `0x${string}`,
  abi: PEPTIDE_VOUCHER_ABI as Abi,
} as const;
