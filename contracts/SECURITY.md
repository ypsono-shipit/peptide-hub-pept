# PEPT vault & perps — owner-resistant design

## Goal

A single EOA (including the deployer) should not be able to:

1. Empty the PLP vault via admin knobs  
2. Instantly set arbitrary oracle marks and extract LP capital  

## What the contracts enforce (after this hardening)

| Control | Behavior |
|---------|----------|
| `PLP.setMinter` | **One-shot** — cannot remint as owner later |
| `PerpsLiquidityPool.setEngine` | **One-shot** — cannot re-point `coverProfit` |
| `PerpsEngine.setLiquidityPool` | **One-shot** |
| `coverProfit` | Engine-only + **max 5% of vault AUM per payout** (configurable then lockable) |
| `forcePushPrice` | **Removed** — no circuit-breaker bypass |
| `pushPrice` | Only **authorized pushers**; ≤30% move per push; min 5m interval |
| `lockPushers` + `renounceOwnership` | After setup, **no one** can change pusher set or ownership knobs |

## Mainnet / production setup checklist

```text
1. Deploy PLP, Pool, Engine, Oracle
2. setMinter(pool) / setEngine(engine) / setLiquidityPool(pool)  # auto-locks
3. oracle.setPusher(multisigOrKeeper, true)
4. oracle.setPusher(deployer, false)   # optional: drop deployer as pusher
5. oracle.lockPushers()
6. pool.lockParams()                   # freeze util / reserve / profit cap
7. oracle.renounceOwnership()
8. plp.renounceOwnership()
9. pool.renounceOwnership()
10. engine.renounceOwnership()         # after markets configured
```

## Residual risks (honest)

- **If a pusher key is compromised**, they can still move price ≤30% every 5 minutes and trade against the vault (capped per close by profit cap). Mitigate with multi-sig / multi-keeper ops and monitoring.
- **True multi-reporter median** (N-of-M independent feeds) is not implemented yet — next step for production.
- **Treasury.withdraw** remains owner-governed (marketplace proceeds, etc.) — use a multisig; not the PLP vault path.
- **Already-deployed testnet contracts** are the old bytecode until you redeploy.

## Not achievable with pure smart contracts alone

Fully trustless peptide $/mg marks need either Chainlink-style external networks or multi-party reporting. This design removes *unilateral owner kill-switches* and *instant vault rewiring*.
