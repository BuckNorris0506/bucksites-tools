# Owner browser proof refresh director v1

Generated: 2026-06-28T16:13:06.949Z

## Summary

- Artifacts discovered: **24**
- Inventory slugs: **29**
- Refresh queue: **24** slugs
- Owner sessions: **9**
- Total expected SAFE_BUYER_PATH_PROVEN delta (all sessions): **+12**
- Freshness policy: **14** days (expiring-soon window: **3** days)

### Freshness summary

| FRESH | EXPIRING_SOON | STALE | MISSING |
| ---: | ---: | ---: | ---: |
| 1 | 0 | 10 | 18 |

## Owner refresh sessions

### HyperAgent evidence pair refresh (`session_1_hyperagent_evidence_pair`)

- Slugs: **edr3rxd1, ultrawf**
- Expected delta: **+2**
- HyperAgent evidence production director smallest executable batch — PASS proof exists but stale; refresh unlocks committed-evidence lane.
- Owner action: Owner browser visual inspection — reconfirm PASS_BROWSER_PROOF URLs; record new checked_at in result artifact intake (no auto-pass).

### Frigidaire PASS-proof refresh cluster (`session_2_frigidaire_pass_proof_cluster`)

- Slugs: **wfcb, wf3cb, eptwfu01**
- Expected delta: **+3**
- Three Frigidaire slugs with PASS owner-browser-proof result artifacts on disk — batch refresh before evidence commit.
- Owner action: Owner browser visual inspection — reconfirm PASS_BROWSER_PROOF URLs; record new checked_at in result artifact intake (no auto-pass).

### everydrop_whirlpool refresh batch 1 (`session_3_everydrop-whirlpool`)

- Slugs: **4396395, 4396842, w10413645a**
- Expected delta: **+2**
- Remaining everydrop_whirlpool slugs grouped to minimize owner session count (max 4 slugs).
- Owner action: Owner browser proof session — refresh stale/missing proof before evidence commit or apply-plan work.

### frigidaire refresh batch 1 (`session_4_frigidaire`)

- Slugs: **fppwfu01, frig-242086201, wf2cb, frig-242017801**
- Expected delta: **+1**
- Remaining frigidaire slugs grouped to minimize owner session count (max 4 slugs).
- Owner action: Owner browser proof session — refresh stale/missing proof before evidence commit or apply-plan work.

### frigidaire refresh batch 2 (`session_5_frigidaire`)

- Slugs: **purepour, frig-242294502**
- Expected delta: **+0**
- Remaining frigidaire slugs grouped to minimize owner session count (max 4 slugs).
- Owner action: Owner browser proof session — refresh stale/missing proof before evidence commit or apply-plan work.

### ge_appliance_parts refresh batch 1 (`session_6_ge-appliance-parts`)

- Slugs: **gswf2, opfg3f, pfmwf, xwfe**
- Expected delta: **+3**
- Remaining ge_appliance_parts slugs grouped to minimize owner session count (max 4 slugs).
- Owner action: Owner browser proof session — refresh stale/missing proof before evidence commit or apply-plan work.

### ge_appliance_parts refresh batch 2 (`session_7_ge-appliance-parts`)

- Slugs: **smartwater-mwfp, gswf, xwf, mswf**
- Expected delta: **+0**
- Remaining ge_appliance_parts slugs grouped to minimize owner session count (max 4 slugs).
- Owner action: Owner browser proof session — refresh stale/missing proof before evidence commit or apply-plan work.

### ge_appliance_parts refresh batch 3 (`session_8_ge-appliance-parts`)

- Slugs: **mwf**
- Expected delta: **+1**
- Remaining ge_appliance_parts slugs grouped to minimize owner session count (max 4 slugs).
- Owner action: Owner browser proof session — refresh stale/missing proof before evidence commit or apply-plan work.

### unknown refresh batch 1 (`session_9_unknown`)

- Slugs: **da97-17376a**
- Expected delta: **+0**
- Remaining unknown slugs grouped to minimize owner session count (max 4 slugs).
- Owner action: Owner browser proof session — refresh stale/missing proof before evidence commit or apply-plan work.

## Ranked refresh queue (top 20)

| Rank | Slug | Freshness | Δ | Gap | Priority | Wedge |
| ---: | --- | --- | ---: | ---: | ---: | --- |
| 1 | ultrawf | STALE | 1 | 4 | 355 | refrigerator_water |
| 2 | edr3rxd1 | STALE | 1 | 4 | 354 | refrigerator_water |
| 3 | eptwfu01 | STALE | 1 | 4 | 342 | refrigerator_water |
| 4 | wf3cb | STALE | 1 | 4 | 325 | refrigerator_water |
| 5 | wfcb | STALE | 1 | 4 | 313 | refrigerator_water |
| 6 | fppwfu01 | MISSING | 1 | 6 | 307 | refrigerator_water |
| 7 | gswf2 | MISSING | 1 | 6 | 268 | refrigerator_water |
| 8 | frig-242086201 | MISSING | 0 | 99 | 265 | refrigerator_water |
| 9 | opfg3f | MISSING | 1 | 6 | 263 | refrigerator_water |
| 10 | wf2cb | MISSING | 0 | 99 | 247 | refrigerator_water |
| 11 | frig-242017801 | MISSING | 0 | 99 | 243 | refrigerator_water |
| 12 | purepour | MISSING | 0 | 99 | 239 | refrigerator_water |
| 13 | pfmwf | MISSING | 1 | 6 | 237 | refrigerator_water |
| 14 | xwfe | MISSING | 0 | 99 | 237 | refrigerator_water |
| 15 | frig-242294502 | MISSING | 0 | 6 | 234 | refrigerator_water |
| 16 | smartwater-mwfp | MISSING | 0 | 99 | 228 | refrigerator_water |
| 17 | gswf | STALE | 0 | 99 | 223 | refrigerator_water |
| 18 | xwf | MISSING | 0 | 99 | 215 | refrigerator_water |
| 19 | 4396395 | MISSING | 1 | 6 | 214 | refrigerator_water |
| 20 | 4396842 | STALE | 1 | 6 | 208 | refrigerator_water |

## Recommended commands

- `npm run buckparts:owner-browser-proof-refresh-director`
- `node --import tsx scripts/report-fridge-safe-link-owner-browser-proof-session-v1.ts`
- `npm run buckparts:fridge-safe-link-batch-factory`
- `npm run buckparts:manufacturer-safe-link-rescue-readiness-gate`

