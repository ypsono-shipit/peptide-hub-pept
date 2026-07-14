import PEPT_ABI from "./abis/PEPT.json";
import STAKING_ABI from "./abis/Staking.json";
import BOND_DEPOSITORY_ABI from "./abis/BondDepository.json";
import PEPTIDE_ORACLE_ABI from "./abis/PeptideOracle.json";
import { TESTNET_CONTRACTS } from "./deployments";

export const peptContract = {
  address: TESTNET_CONTRACTS.PEPT as `0x${string}`,
  abi: PEPT_ABI,
} as const;

export const stakingContract = {
  address: TESTNET_CONTRACTS.Staking as `0x${string}`,
  abi: STAKING_ABI,
} as const;

export const bondDepositoryContract = {
  address: TESTNET_CONTRACTS.BondDepository as `0x${string}`,
  abi: BOND_DEPOSITORY_ABI,
} as const;

export const peptideOracleContract = {
  address: TESTNET_CONTRACTS.PeptideOracle as `0x${string}`,
  abi: PEPTIDE_ORACLE_ABI,
} as const;
