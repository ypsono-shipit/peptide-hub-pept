// Robinhood Chain Testnet (46630) deployment — source of truth is
// contracts/deployments/testnet.json in this repo. Keep in sync manually
// until a shared package/codegen step exists.
export const TESTNET_CONTRACTS = {
  PEPT: "0x240260c893CbB930aeCAce55E6d12f2e8EaD7A10",
  Treasury: "0x3F0b6D1Be32D2819ABA3893053C4ec3b93116Be5",
  BondDepository: "0x0B9EFc5DA4921B6d0249A06f3a1BB716636bD042",
  Staking: "0xebbFEb218117858871f96f204DE1BBD33A921456",
  PeptideOracle: "0x59d62e2735Bd583F34A8AC2573bA952Df5849449",
  PerpsEngine: "0x849a45a0BCd64247b0878E5080E0983EcC0FA05C",
  TestCollateral_tPUSD: "0xACD157418837F63E4FD3CDc86E026522352E7DCE",
  PLP: "0xFaF2346b877601b0663D178dc29e351e42A3789d",
  PerpsLiquidityPool: "0xa1e13DF22cBB2Fcdb906256632eA36D1569d2d4D",
} as const;
