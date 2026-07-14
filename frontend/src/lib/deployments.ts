// Robinhood Chain Testnet (46630) deployment — source of truth is
// contracts/deployments/testnet.json in this repo. Keep in sync manually
// until a shared package/codegen step exists.
export const TESTNET_CONTRACTS = {
  PEPT: "0x240260c893CbB930aeCAce55E6d12f2e8EaD7A10",
  Treasury: "0x3F0b6D1Be32D2819ABA3893053C4ec3b93116Be5",
  BondDepository: "0x0B9EFc5DA4921B6d0249A06f3a1BB716636bD042",
  Staking: "0xebbFEb218117858871f96f204DE1BBD33A921456",
  PeptideOracle: "0x937C0a5eD4F19d9F6A3A7EEcdC46ED12aD34F941",
  PerpsEngine: "0x5f6848B92A3a587EE2C4e9322F297f9a14753f3a",
  TestCollateral_tPUSD: "0xACD157418837F63E4FD3CDc86E026522352E7DCE",
} as const;
