# Peptide Hub — $PEPT Peptide Perps

Peptide/biotech-themed perpetual futures DEX on **Robinhood Chain** (Arbitrum Orbit L2 — mainnet Chain ID 4663, testnet Chain ID 46630), with OHM-fork tokenomics ($PEPT bonding, staking, protocol-owned treasury).

Currently targeting **testnet**: RPC `https://rpc.testnet.chain.robinhood.com`, explorer `https://explorer.testnet.chain.robinhood.com`, faucet `https://faucet.testnet.chain.robinhood.com`.

Full product spec: [Peptide-Hub-PRD](../Business-Ideas/Peptide-Hub-PRD.md)

## Structure

- `frontend/` — Next.js + TypeScript + Tailwind + wagmi/viem trading terminal (Trade, PLP Liquidity, Marketplace, Portfolio, Stake)
- `contracts/` — Hardhat + Solidity (PEPT, PLP / PerpsLiquidityPool, PerpsEngine, PeptideOracle, Staking, Treasury, BondDepository)

### Collateral & PLP

- **Collateral:** testnet **USDC** (`0xAc8019…`, 6 decimals, public `mint`) on Robinhood testnet — not official Circle; replaces the old tPUSD mock
- **PLP:** GMX-style LP vault — deposit USDC → mint PLP; max OI = 50% of AUM; fees/losses to LPs
- UI: `/liquidity` · deploy: `cd contracts && npm run deploy:usdc-plp`

### Oracle charts

- Each successful `pushPrice` appends to `frontend/public/data/price-history.json` (and contracts copy)
- API: `GET /api/ohlc?market=SEMA-PERP&tf=4h&live=5.06`
- ChartPanel loads OHLC from that history (forward-filled stair-steps between sparse samples)
- Seed empty charts: `cd contracts && npm run seed:history`

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

## GLP-1 oracle price refresh (dual source, weighted)

Prices are resolved from **two independent sources**, then **weight-averaged**:

1. **PeptideScouter.com** — multi-vendor tables → **size-weighted** $/mg after IQR filter  
2. **Vendor basket** — curated PDPs in `contracts/data/vendor-basket.json` → **size-weighted** $/mg after IQR  
3. **Combine** = weighted average of sources (default 55% Scouter / 45% basket, scaled by sample count) — see `contracts/data/oracle-pricing.json`  
4. **GLP1-IDX** = 60% SEMA + 25% TIRZ + 15% RETA  

### Run on your machine (optional)

```bash
cd contracts
npm run scrape:glp1          # dual-source scrape only
npm run push:glp1:dry        # scrape + print, no txs
npm run push:glp1            # scrape + push (needs DEPLOYER_PRIVATE_KEY)
FORCE_PUSH=1 npm run push:glp1
```

### Run outside local setup (recommended): GitHub Actions + external 5m cron

Workflow: `.github/workflows/refresh-glp1-prices.yml`

- **What each run does:** dual-source scrape (PeptideScouter + `vendor-basket.json`) → `pushPrice` on PeptideOracle → append `frontend/public/data/price-history.json` for `/trade` charts + `/oracle`  
- **On-chain floor:** PeptideOracle `MIN_PUSH_INTERVAL` is **5 minutes**  
- **Secret (Actions):** `DEPLOYER_PRIVATE_KEY` (oracle owner; push-only key recommended)  
- **Artifacts:** each run uploads `glp1-last-scrape.json` for audit  

#### Why “last scrape” is often 45–90+ minutes old

GitHub’s built-in `schedule: "*/5 * * * *"` is **best-effort**. Under load it is delayed or dropped (we measured ~18 schedule runs/day vs 288 expected). The monitor is correct when it shows ~1h age — the job simply did not fire.

#### True every-5-minutes cadence (required for dense `/trade` candles)

Trigger the same workflow via **`workflow_dispatch`** from any reliable external cron:

1. Create a GitHub PAT with **`actions: write`** (fine-scoped to this repo is fine).  
2. On the frontend host (Vercel env), set:
   - `CRON_SECRET` — random shared secret  
   - `ORACLE_DISPATCH_TOKEN` — that PAT  
   - optional: `ORACLE_DISPATCH_REPO=ypsono-shipit/peptide-hub-pept`  
3. Call every 5 minutes:

```bash
curl -X POST "https://<your-frontend>/api/cron/refresh-oracle" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Free option: [cron-job.org](https://cron-job.org) → URL above, interval 5 minutes, header `Authorization: Bearer <CRON_SECRET>`.

GHA `schedule` remains as a backup; external dispatch is what actually hits 5m.

**Note:** PeptidePricing.com is not scraped (bot protection). Tune weights in `oracle-pricing.json`; add/remove vendors in `vendor-basket.json`.
