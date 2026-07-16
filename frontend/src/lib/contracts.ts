import type { Abi, Address } from "viem";
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
import { getNetwork, DEFAULT_CHAIN_ID, type NetworkConfig } from "./deployments";

export type AppContracts = {
  pept: { address: Address; abi: Abi };
  staking: { address: Address; abi: Abi };
  bondDepository: { address: Address; abi: Abi };
  peptideOracle: { address: Address; abi: Abi };
  perpsEngine: { address: Address; abi: Abi };
  collateral: { address: Address; abi: Abi };
  plpToken: { address: Address; abi: Abi };
  plpPool: { address: Address; abi: Abi };
  marketplaceShop: { address: Address; abi: Abi };
  peptideVoucher: { address: Address; abi: Abi };
  network: NetworkConfig;
};

export function getContracts(chainId: number | undefined): AppContracts {
  const network = getNetwork(chainId);
  const c = network.contracts;
  return {
    network,
    pept: { address: c.PEPT, abi: PEPT_ABI as Abi },
    staking: { address: c.Staking, abi: STAKING_ABI as Abi },
    bondDepository: { address: c.BondDepository, abi: BOND_DEPOSITORY_ABI as Abi },
    peptideOracle: { address: c.PeptideOracle, abi: PEPTIDE_ORACLE_ABI as Abi },
    perpsEngine: { address: c.PerpsEngine, abi: PERPS_ENGINE_ABI as Abi },
    collateral: { address: c.collateral, abi: MOCK_ERC20_ABI as Abi },
    plpToken: { address: c.PLP, abi: PLP_ABI as Abi },
    plpPool: { address: c.PerpsLiquidityPool, abi: PERPS_LIQUIDITY_POOL_ABI as Abi },
    marketplaceShop: { address: c.MarketplaceShop, abi: MARKETPLACE_SHOP_ABI as Abi },
    peptideVoucher: { address: c.PeptideVoucher, abi: PEPTIDE_VOUCHER_ABI as Abi },
  };
}

// ── Default (testnet) exports for server components / oracle API ────
const defaults = getContracts(DEFAULT_CHAIN_ID);

/** @deprecated Prefer useAppContracts() for client multi-network support */
export const peptContract = defaults.pept;
/** @deprecated Prefer useAppContracts() */
export const stakingContract = defaults.staking;
/** @deprecated Prefer useAppContracts() */
export const bondDepositoryContract = defaults.bondDepository;
/** @deprecated Prefer useAppContracts() */
export const peptideOracleContract = defaults.peptideOracle;
/** @deprecated Prefer useAppContracts() */
export const perpsEngineContract = defaults.perpsEngine;
/** @deprecated Prefer useAppContracts() */
export const collateralContract = defaults.collateral;
/** @deprecated Prefer useAppContracts() */
export const plpTokenContract = defaults.plpToken;
/** @deprecated Prefer useAppContracts() */
export const plpPoolContract = defaults.plpPool;
/** @deprecated Prefer useAppContracts() */
export const marketplaceShopContract = defaults.marketplaceShop;
/** @deprecated Prefer useAppContracts() */
export const peptideVoucherContract = defaults.peptideVoucher;
