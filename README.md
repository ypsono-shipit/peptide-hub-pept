# Peptide Hub — $PEPT Peptide Perps

Peptide/biotech-themed perpetual futures DEX on **Robinhood Chain** (Arbitrum Orbit L2 — mainnet Chain ID 4663, testnet Chain ID 46630), with OHM-fork tokenomics ($PEPT bonding, staking, protocol-owned treasury).

Currently targeting **testnet**: RPC `https://rpc.testnet.chain.robinhood.com`, explorer `https://explorer.testnet.chain.robinhood.com`, faucet `https://faucet.testnet.chain.robinhood.com`.

Full product spec: [Peptide-Hub-PRD](../Business-Ideas/Peptide-Hub-PRD.md)

## Structure

- `frontend/` — Next.js + TypeScript + Tailwind + wagmi/viem trading terminal (Markets, Trade, Portfolio, Stake & Bond)
- `contracts/` — Hardhat + Solidity contracts (PEPT ERC-20, BondDepository, Staking, Treasury, PerpsEngine, Oracle)

## Phased Roadmap

1. **MVP** — Paper trading simulator + basic staking UI
2. **Phase 2** — Bonding contracts + on-chain perps testnet
3. **Phase 3** — Mainnet perps, treasury operations
4. **Phase 4** — Full production, additional markets, audits

## Reference Repos

- [OlympusDAO contracts](https://github.com/OlympusDAO/olympus-contracts) — bonding/staking/treasury base
- [GMX contracts](https://github.com/gmx-io/gmx-contracts) / [gmx-synthetics](https://github.com/gmx-io/gmx-synthetics) — perps engine base
- [robinhood-chain-erc20-token](https://github.com/Karimkusin88/robinhood-chain-erc20-token), [robinhood-dex](https://github.com/Karimkusin88/robinhood-dex)

## Getting Started

```bash
# Frontend
cd frontend && npm install && npm run dev

# Contracts
cd contracts && npm install && npx hardhat compile
```
