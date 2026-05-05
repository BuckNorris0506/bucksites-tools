# Fridge Model Filter Mapping Discrepancies

## lg-lrfxs3106s / LRFXS3106S

- Status: `OWNER_REVIEW_REQUIRED`
- Repo mapped filters: `lt600p`, `lt800p` (`PROVEN_REPO`, `PROVEN_LIVE_DB`)
- Official LG product/spec reported filter: `LT1000P` (`PROVEN_OFFICIAL_LG`)

### Owner-Review Evidence Matrix

| Evidence item | Value / finding | Classification | Proof source |
| --- | --- | --- | --- |
| Repo compatibility rows for `lg-lrfxs3106s` | `lg-lrfxs3106s,lt800p` and `lg-lrfxs3106s,lt600p` | `PROVEN_REPO` | `data/compatibility_mappings.csv` |
| Live read-only model mapping (`getFridgeBySlug`) | `slug=lg-lrfxs3106s`, `brand=LG`, `model_number=LRFXS3106S`, mapped filters `lt600p`, `lt800p` | `PROVEN_LIVE_DB` | read-only loader check via `getFridgeBySlug("lg-lrfxs3106s")` |
| Live read-only safe CTA count | `safe_cta_count=2` (1 retailer link on `lt600p`, 1 on `lt800p`) | `PROVEN_LIVE_DB` | read-only loader check via `getFridgeBySlug("lg-lrfxs3106s")` |
| Repo filter fact: `lt600p` | row exists: `lg,lt600p,LT600P,...` | `PROVEN_REPO` | `data/filters.csv` |
| Repo filter fact: `lt800p` | row exists: `lg,lt800p,LT800P,...` | `PROVEN_REPO` | `data/filters.csv` |
| Repo filter fact: `lt1000p` | row exists: `lg,lt1000p,LT1000P,...` | `PROVEN_REPO` | `data/filters.csv` |
| Official LG product page claim | LRFXS3106S specs show `Water Filter: LT1000P` | `PROVEN_OFFICIAL_LG` | https://www.lg.com/us/refrigerators/lg-lrfxs3106s-french-door-refrigerator |
| Official LG spec-sheet claim | Builder spec sheet shows `Water Filter LT1000P` and `Replacement Water Filter LT1000P` | `PROVEN_OFFICIAL_LG` | https://www.lg.com/us/business/download/resources/CT00021979/LRFXS3106S_LG_Pro_Builder_Spec_Sheet[20240531_231917].pdf |
| LG support-page model-variant evidence | LRFXS3106S.ASTCNA0 support page exists and proves model context | `PROVEN_OFFICIAL_LG` | https://www.lg.com/us/support/product/lg-LRFXS3106S.ASTCNA0 |
| LG support-page explicit filter mapping | No explicit `LT1000P` statement observed on support landing page itself in this pass | `UNKNOWN` | same support page above |
| Official LG owner manual PDF (discoverable + extractable) | No official LG owner-manual PDF with extractable LRFXS3106S filter mapping text was proven in this pass | `UNKNOWN` | official LG support/manual discovery pass (US + CA support surfaces) |

### Sources used

- Repo compatibility rows: `data/compatibility_mappings.csv`
- Repo filter catalog rows: `data/filters.csv`
- Repo identity/mapping check via read-only `getFridgeBySlug("lg-lrfxs3106s")`
- Official LG product page: https://www.lg.com/us/refrigerators/lg-lrfxs3106s-french-door-refrigerator
- Official LG builder spec sheet: https://www.lg.com/us/business/download/resources/CT00021979/LRFXS3106S_LG_Pro_Builder_Spec_Sheet[20240531_231917].pdf
- Official LG model support page: https://www.lg.com/us/support/product/lg-LRFXS3106S.ASTCNA0
- Official LG Canada model support page (manual surface checked): https://www.lg.com/ca_en/support/product-support/cs-LRFXS3106S.ASTCNA0/

### Conflict Assessment

- Repo/live mapping currently routes `lg-lrfxs3106s` to `lt600p` and `lt800p`.
- Official LG product/spec sources for `LRFXS3106S` report `LT1000P`.
- This is a material compatibility conflict and blocks model-specific manual-evidence fixture work.
- Because official and repo mappings diverge, strong fit claims are not safe until owner reconciliation.

### Owner Decision Options

- Option A: keep current repo mapping and explicitly mark official conflict unresolved.
- Option B: update compatibility mapping to `LT1000P` family after owner/source review.
- Option C: keep page generic (no model-specific manual callout) until a model-specific owner manual resolves the conflict.
- Option D: quarantine the model from strong fit/buy guidance until reconciled.

### Recommended Safe Path (No Data Mutation)

- Prefer Option D + Option C immediately:
  - keep `OWNER_REVIEW_REQUIRED`,
  - keep model generic (no manual-evidence fixture),
  - avoid stronger model-specific fit/buy messaging until reconciliation.
- Then perform owner-led source adjudication to choose between Option A or B.

### Owner Review Rule

- Do not create manual evidence for `lg-lrfxs3106s` until this mapping discrepancy is reconciled.
- Do not promote model-specific buy guidance for `lg-lrfxs3106s` until mapping is reconciled.
- Do not change repo or DB mappings in this task.
