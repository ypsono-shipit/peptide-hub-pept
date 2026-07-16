# PEPT Peptide Oracle API (B2B product)

**Base:** `https://pept.trade/api/v1/oracle`  
**Product:** https://pept.trade/oracle  
**Docs:** https://pept.trade/docs/oracle  
**OpenAPI:** https://pept.trade/api/v1/oracle/openapi.json  

Optional host: point **`api.pept.trade`** CNAME at Vercel. Middleware rewrites `/v1/*` and short paths to the oracle API.

---

## What shipped (roadmap)

| Stage | Status | Deliverables |
|-------|--------|----------------|
| **v1** | Live | REST read API, markets, prices, history, OHLC, demo key, docs |
| **v1.1** | Live | API key store, tiers, usage metering, RPM/daily limits, webhooks, signed attestations, Stripe checkout + webhook, admin key issuance, fanout hook, OpenAPI, `/oracle` product page, `api.pept.trade` routing |
| **v1.2** | Config | Upstash Redis for multi-instance durability (set env) |
| **v2** | Planned | Denser scrape cadence, mainnet oracle, multi-reporter committee |
| **Enterprise** | Planned | SLA, private feeds, SOC2 |

---

## Auth

| Header | Value |
|--------|--------|
| `X-API-Key` | issued secret |
| `Authorization` | `Bearer <secret>` |
| `X-Admin-Secret` | admin routes only |

Demo key: `pept_demo_public`

### Issue a key (admin)

```bash
curl -sS -X POST "https://pept.trade/api/v1/oracle/admin/keys" \
  -H "X-Admin-Secret: $ORACLE_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"tier":"pro","name":"acme","email":"dev@acme.com"}'
```

Response includes `key.secret` once.

### Tiers

| Tier | RPM | Daily | Webhooks | Signed quotes | List |
|------|-----|-------|----------|---------------|------|
| demo | 60 | 2k | 0 | no | free explore |
| free | 120 | 10k | 1 | no | $0 |
| pro | 600 | 200k | 10 | yes | $99/mo |
| enterprise | 3k | 2M | 50 | yes | $499/mo |

---

## Endpoints

### Public data

| Method | Path |
|--------|------|
| GET | `/api/v1/oracle` |
| GET | `/api/v1/oracle/health` |
| GET | `/api/v1/oracle/markets` |
| GET | `/api/v1/oracle/prices` |
| GET | `/api/v1/oracle/prices/{market}` |
| GET | `/api/v1/oracle/history/{market}` |
| GET | `/api/v1/oracle/ohlc/{market}` |
| GET | `/api/v1/oracle/attest/{market}` (Pro+) |
| GET | `/api/v1/oracle/me` |
| GET | `/api/v1/oracle/openapi.json` |

### Webhooks

| Method | Path |
|--------|------|
| GET/POST | `/api/v1/oracle/webhooks` |
| DELETE | `/api/v1/oracle/webhooks/{id}` |

Delivery headers: `X-PEPT-Event`, `X-PEPT-Delivery`, `X-PEPT-Signature: sha256=...`

Event: `price.updated` with `{ prices: [{ market, price, unit, asOf, source }] }`.

### Billing

| Method | Path |
|--------|------|
| POST | `/api/v1/oracle/billing/checkout` |
| POST | `/api/v1/oracle/billing/webhook` (Stripe) |

### Admin

| Method | Path |
|--------|------|
| GET/POST | `/api/v1/oracle/admin/keys` |
| PATCH/DELETE | `/api/v1/oracle/admin/keys/{id}` |
| POST | `/api/v1/oracle/admin/fanout` |

Keeper env after push:

```bash
ORACLE_API_FANOUT_URL=https://pept.trade/api/v1/oracle/admin/fanout
ORACLE_ADMIN_SECRET=...
```

---

## Env (Vercel)

See `frontend/.env.example`. Minimum for production B2B:

```
ORACLE_ADMIN_SECRET=
ORACLE_ATTEST_HMAC_SECRET=
ORACLE_API_REQUIRE_KEY=true
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ORACLE_PRO=
STRIPE_PRICE_ORACLE_ENTERPRISE=
```

Without Upstash, keys/webhooks/limits use **in-memory** storage (fine for demos; not multi-instance durable).

---

## Architecture

```
Vendors → GHA scrape (3h) → PeptideOracle (on-chain)
                ↘ price-history.json
                         ↘ REST /api/v1/oracle/*
                         ↘ admin/fanout → customer webhooks
```

On-chain: `0x59d62e2735Bd583F34A8AC2573bA952Df5849449` (testnet 46630)  
`marketKey = keccak256(utf8("SEMA-PERP"))` etc.

---

## Disclaimer

Research peptide pricing infrastructure only. Not medical or investment advice.
