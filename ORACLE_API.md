# PEPT Peptide Oracle API (B2B)

Infrastructure product: **research peptide $/mg marks** for third-party protocols, dashboards, and marketplaces.

## Why this exists

Scraping peptide vendor catalogs is fragile. PEPT already:

1. Dual-sources vendor prices (PeptideScouter + vendor basket)
2. Pushes weighted medians to **PeptideOracle** on Robinhood Chain
3. Appends samples to JSON history for charts

The Oracle API exposes that pipeline as a **versioned REST product**.

## Live base

```
https://pept.trade/api/v1/oracle
```

Human docs: https://pept.trade/docs/oracle

## Auth

| Header | Value |
|--------|--------|
| `X-API-Key` | issued key |
| `Authorization` | `Bearer <key>` |

Demo key (exploration): `pept_demo_public`

Production:

```bash
# Vercel / .env
ORACLE_API_KEYS=sk_live_xxx,sk_live_yyy
ORACLE_API_REQUIRE_KEY=true
ORACLE_API_PUBLIC_DEMO_KEY=pept_demo_public
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/oracle` | Service discovery |
| GET | `/api/v1/oracle/health` | Feed health |
| GET | `/api/v1/oracle/markets` | Catalog + `marketKey` |
| GET | `/api/v1/oracle/prices` | All latest marks |
| GET | `/api/v1/oracle/prices/{market}` | One mark |
| GET | `/api/v1/oracle/history/{market}` | Samples (`from`, `to`, `limit`) |
| GET | `/api/v1/oracle/ohlc/{market}` | Candles (`tf`, `live`, `limit`) |

### Example

```bash
curl -sS "https://pept.trade/api/v1/oracle/prices/SEMA-PERP" \
  -H "X-API-Key: pept_demo_public"
```

```json
{
  "market": "SEMA-PERP",
  "unit": "$/mg",
  "price": 5.06,
  "asOf": 1784180430,
  "source": "...",
  "onChain": { "marketKey": "0x...", "paused": false },
  "meta": { "apiVersion": "v1", "provider": "PEPT Oracle" }
}
```

## Markets (v1)

| id | Unit | Status |
|----|------|--------|
| SEMA-PERP | $/mg | live |
| GLP1-IDX-PERP | $/mg | live (60/25/15 basket) |
| TIRZ-PERP | $/mg | beta |
| RETA-PERP | $/mg | beta |

On-chain key: `keccak256(utf8(id))` on PeptideOracle  
`0x59d62e2735Bd583F34A8AC2573bA952Df5849449` (Robinhood testnet 46630).

## Architecture (current)

```
Vendors → scrapers (3h GHA) → PeptideOracle (on-chain)
                ↘ append price-history.json
                         ↘ REST /api/v1/oracle/*
```

## Product roadmap (B2B)

1. **v1 (this)** — REST read API, demo key, history + OHLC, on-chain join  
2. **v1.1** — Dedicated `api.pept.trade`, Redis rate limits, usage metering  
3. **v2** — Paid tiers, webhooks on mark update, signed price attestations  
4. **v2.1** — Multi-reporter committee (median-of-N), mainnet oracle  
5. **v3** — SLA, SOC2 path, enterprise private feeds  

## Code map

| Path | Role |
|------|------|
| `frontend/src/lib/oracle-api/` | Registry, history, auth, on-chain |
| `frontend/src/app/api/v1/oracle/` | Route handlers |
| `frontend/src/app/docs/oracle/` | Developer docs UI |
| `contracts/src/oracle/PeptideOracle.sol` | Settlement feed |
| `contracts/scripts/push-glp1-prices.ts` | Keeper / scrape → push |

## Disclaimer

Research peptide pricing infrastructure only. Not medical, diagnostic, or investment advice.
