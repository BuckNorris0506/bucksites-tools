# `shark-carbon-foam` — Hard Reject & OEM Re-Home (Owner Review)

**Contract:** `ap_apply_plan_shark_carbon_foam_hard_reject_rehome_v1`  
**Mode:** Owner-review apply plan only — **no CSV apply, no Supabase mutations**

---

## Hard reject verdict

`shark-carbon-foam` / `SHARK-CARBON-FOAM` is **not a real discrete Shark part**.

| Evidence | Finding |
|----------|---------|
| batch-v2 / batch-v3 | Search → homepage; **NO_SAFE_PATH** |
| model-first | SHARK-CARBON-FOAM token **not found** on official pages |
| Official replacement | Integrated **complete-kit** cartridges (HE1FKBAS, HE2FKBAS, …) — carbon layer built in |

**HyperAgent note:** No committed `ap-hyperagent-chat-discovery-shark-carbon-foam` fixture; verdict from repo artifacts + model-first contract.

---

## 21 affected model slugs

`shark-hp100`, `shark-hp105`, `shark-hp102`, `shark-hp102pet`, `shark-hp102petnc`, `shark-hp130`, `shark-hp135`, `shark-hp132`, `shark-hp141`, `shark-hp201`, `shark-hp202`, `shark-hp232`, `shark-hp200`, `shark-hp230`, `shark-hp231`, `shark-hp401`, `shark-hp402`, `shark-hp452`, `shark-hp462`, `shark-hp602`, `shark-hp652`

---

## OEM kit family groups

| Family | Models | Destination slug | Slug status |
|--------|--------|------------------|-------------|
| **HE1FKBAS** | 9 (HP1xx) | `shark-hepa-he1fkbas` | **must_create** |
| **HE2FKBAS** | 6 (HP2xx) | `shark-hepa-he2fkbas` | **must_create** |
| **HE4FKBAS** | 4 (HP401–462) | `shark-hepa-he4fkbas` | **must_create** |
| **HE6FKBAS / HE6FKPRO** | 2 (HP602, HP652) | `shark-hepa-he6fkpro` | **must_create** |
| HE15FKPET | 0 | `shark-hepa-he15fkp` | **exists** (NeverChange; not in this 21) |
| HE3FKPET | 0 | `shark-hepa-he3fkp` | **exists** (NeverChange; not in this 21) |

Legacy marketing slugs `shark-hepa-hp100` / `hp200` / `hp400` **exist** — deprecate after OEM migration.

---

## Re-home rows (confidence)

| Model | OEM kit | Destination | Confidence |
|-------|---------|-------------|------------|
| shark-hp100, hp105, hp102, hp130, hp135, hp132 | HE1FKBAS | shark-hepa-he1fkbas | **PROVEN** |
| shark-hp102pet, hp102petnc | HE1FKBAS | shark-hepa-he1fkbas | INFERRED |
| shark-hp141 | HE1FKBAS | shark-hepa-he1fkbas | **UNKNOWN** |
| shark-hp200, hp230, hp231 | HE2FKBAS | shark-hepa-he2fkbas | **PROVEN** |
| shark-hp201, hp202, hp232 | HE2FKBAS | shark-hepa-he2fkbas | INFERRED |
| shark-hp401, hp402, hp452, hp462 | HE4FKBAS | shark-hepa-he4fkbas | INFERRED |
| shark-hp602, hp652 | HE6FKPRO | shark-hepa-he6fkpro | **UNKNOWN** |

**Counts:** PROVEN 8 · INFERRED 9 · UNKNOWN 4

---

## Exact proposed CSV mutations

### `filters.csv`

**Delete:**

```csv
shark,shark-carbon-foam,SHARK-CARBON-FOAM,Carbon / foam secondary cartridge,3,Paired with HP series
```

**Add:**

```csv
shark,shark-hepa-he1fkbas,HE1FKBAS,Shark Anti-Allergen HEPA complete kit (HE1FKBAS),6,Official integrated 3-in-1 complete kit; replaces invalid shark-carbon-foam. HP1xx family.
shark,shark-hepa-he2fkbas,HE2FKBAS,Shark HEPA complete kit (HE2FKBAS),6,Official complete kit for HP2xx family.
shark,shark-hepa-he4fkbas,HE4FKBAS,Shark HEPA complete kit (HE4FKBAS),6,HP401–462 family; INFERRED — PDP proof required.
shark,shark-hepa-he6fkpro,HE6FKPRO,Shark HEPA complete kit (HE6FKPRO),6,HP602/652 family; UNKNOWN vs HE4 — PDP proof required.
```

### `filter_aliases.csv` — add

```csv
shark-hepa-he1fkbas,HE1FKBAS
shark-hepa-he1fkbas,Shark HP100 Series filter
shark-hepa-he2fkbas,HE2FKBAS
shark-hepa-he4fkbas,HE4FKBAS
shark-hepa-he6fkpro,HE6FKPRO
shark-hepa-he6fkpro,HE6FKBAS
```

### `retailer_links.csv`

**Delete** `shark-carbon-foam` search-placeholder row.

**Add** (HE1FKBAS only — others deferred until PDP proof):

```csv
shark-hepa-he1fkbas,Shark — official replacement filter (product page),https://www.sharkclean.com/products/shark-air-purifier-anti-allergen-filter-with-true-hepa-zidHE1FKBAS,true,shark-official,shark,https://www.sharkclean.com/products/shark-air-purifier-anti-allergen-filter-with-true-hepa-zidHE1FKBAS,likely_valid,"Hard-reject shark-carbon-foam re-home; official HE1FKBAS complete kit PDP. SHARK-CARBON-FOAM not on PDP. Live re-proof required before direct_buyable.",2026-05-24T05:39:50.321Z
```

### `compatibility_mappings.csv`

**Delete 21 rows:** all `*,shark-carbon-foam,true`

**Add 21 rows** to OEM slugs (see JSON packet for full list with confidence).

**Owner option:** also delete duplicate `*,shark-hepa-hp100|hp200|hp400,true` rows after OEM migration to avoid dual compat.

---

## Projected impact

| Metric | Value |
|--------|------:|
| Wrong-family edges removed | **21** |
| Safe-edge gain (PROVEN destinations only) | **+0** |
| Re-home confidence | PROVEN 8 / INFERRED 9 / UNKNOWN 4 |

No committed `direct_buyable` Shark OEM kit primary exists today. Primary win is **wrong-family-risk reduction**, not immediate safe-edge gain.

---

## Validation (post-apply)

```bash
npm run lint
npm run build
npx tsx scripts/report-air-purifier-weak-buyer-path-audit-v1.ts
npm run buckparts:guardrails:air-purifier
```

---

## PROVEN / INFERRED / UNKNOWN

**PROVEN:** SHARK-CARBON-FOAM invalid; 21 wrong edges; HE1FKBAS PDP + HP1xx compat; HE2FKBAS for HP200/230/231; batch NO_SAFE_PATH.

**INFERRED:** HP2xx/4xx family bucket assignments; deprecate marketing slugs after migration.

**UNKNOWN:** HE2/HE4/HE6 official PDP URLs; HP141/602/652 kits; HyperAgent fixture in repo; live HE1FKBAS stock state.

**Do not apply without explicit owner approval.**
