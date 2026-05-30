# BuckParts Quality Assurance — refrigerator wrong-purchase prevention packet

Generated: 2026-05-30T20:05:03.262Z

Classification: **non-runtime QA draft** — review only; no product data has been changed.

## What this packet is

A BuckParts Quality Assurance review packet. It proposes corrections to existing compatibility_mappings.csv rows that conflict with official manufacturer filter evidence. This is data cleanup to prevent wrong purchases — not a request to add new filter products or buy links.

**What this is not:** This is not new product onboarding, not a buy-link rollout, and not a public-page publish. No customer-facing surface should change from this packet alone.

## Wrong-purchase risk (plain language)

Each model below lists legacy BuckParts compat rows that point at the wrong filter family for that refrigerator. If those rows were surfaced publicly without correction, a shopper could buy a filter that does not match their fridge.

## QA status definitions

- **MAPPING_REVIEW_REQUIRED:** MAPPING_REVIEW_REQUIRED means official manufacturer proof exists for the correct filter token, but current BuckParts mappings still conflict — they include extra wrong-family rows, omit the correct row, or both.
- **PASS / PROVEN (this batch):** PASS and PROVEN remain 0 for this batch because compatibility_mappings.csv has not been reconciled yet. QA approval is required before any CSV apply closes the loop.
- **QA gate role:** Quality Assurance is the gate between committed official evidence and customer-facing confidence. Review this packet first; only after explicit approval should a separate gated apply step touch compatibility_mappings.csv.

## Summary

| Metric | Count |
| --- | ---: |
| Models (MAPPING_REVIEW_REQUIRED) | 20 |
| Planned compat row removals (wrong-family cleanup) | 53 |
| Planned compat row additions (missing correct family) | 10 |
| Planned compat row keeps (already correct) | 16 |
| Models at PASS / PROVEN | 0 |

| Gate | Status |
| --- | --- |
| CSV apply authorized | **NO** |
| QA / founder approval | **REQUIRED (pending)** |
| Supabase update authorized | **NO** |
| Buy-link mutation authorized | **NO** |
| Public page change authorized | **NO** |

Source manifest: `data/fridge/batch-production/model-first-input-v1/fridge-models-batch-v1.json`

## Authorization boundaries (read before approving)

- **Wrong-purchase prevention only: this packet corrects existing compat-risk rows — it does not authorize adding new filter SKUs or retailer buy links.**
- **No buy-link changes are authorized by this packet.**
- **No public page changes are authorized by this packet.**
- **No Supabase changes are authorized by this packet.**
- **No compatibility_mappings.csv apply is authorized until explicit QA/founder approval after review.**
- **Nothing in this packet marks any model PASS or PROVEN — all 20 rows remain MAPPING_REVIEW_REQUIRED until CSV reconciliation is approved and applied in a separate gated step.**

## LG → LT1000P

QA section totals: 6 model(s); 20 wrong-family removal(s); 10 keep(s); 1 missing-row addition(s).

### LFXC22596S (`lg-lfxc22596s`)

- **Official filter (manufacturer evidence):** `LT1000P`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is LT1000P but legacy CSV maps adq36006101, adq74793502, lt1000p, lt1000pc, mdj64844601 — reconcile before any compat or buy-path promotion. Planned QA fix: remove 3 wrong-family row(s), keep 2 correct row(s). CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `lg-lfxc22596s,adq36006101`
- `lg-lfxc22596s,adq74793502`
- `lg-lfxc22596s,mdj64844601`
- **Rows to keep (already match official family):
- `lg-lfxc22596s,lt1000p`
- `lg-lfxc22596s,lt1000pc`
- **Rows to add (missing correct family):
- _(none)_

### LFXS26973S (`lg-lfxs26973s`)

- **Official filter (manufacturer evidence):** `LT1000P`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is LT1000P but legacy CSV maps adq36006101, adq74793502, lt1000p, lt1000pc, lt700p, mdj64844601 — reconcile before any compat or buy-path promotion. Planned QA fix: remove 4 wrong-family row(s), keep 2 correct row(s). CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `lg-lfxs26973s,adq36006101`
- `lg-lfxs26973s,adq74793502`
- `lg-lfxs26973s,lt700p`
- `lg-lfxs26973s,mdj64844601`
- **Rows to keep (already match official family):
- `lg-lfxs26973s,lt1000p`
- `lg-lfxs26973s,lt1000pc`
- **Rows to add (missing correct family):
- _(none)_

### LFXS28968S (`lg-lfxs28968s`)

- **Official filter (manufacturer evidence):** `LT1000P`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is LT1000P but legacy CSV maps adq36006101, adq74793502, lt1000p, lt1000pc, lt700p, mdj64844601 — reconcile before any compat or buy-path promotion. Planned QA fix: remove 4 wrong-family row(s), keep 2 correct row(s). CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `lg-lfxs28968s,adq36006101`
- `lg-lfxs28968s,adq74793502`
- `lg-lfxs28968s,lt700p`
- `lg-lfxs28968s,mdj64844601`
- **Rows to keep (already match official family):
- `lg-lfxs28968s,lt1000p`
- `lg-lfxs28968s,lt1000pc`
- **Rows to add (missing correct family):
- _(none)_

### LMXS28626S (`lg-lmxs28626s`)

- **Official filter (manufacturer evidence):** `LT1000P`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is LT1000P but legacy CSV maps adq36006101, adq74793502, lt1000p, lt1000pc, mdj64844601 — reconcile before any compat or buy-path promotion. Planned QA fix: remove 3 wrong-family row(s), keep 2 correct row(s). CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `lg-lmxs28626s,adq36006101`
- `lg-lmxs28626s,adq74793502`
- `lg-lmxs28626s,mdj64844601`
- **Rows to keep (already match official family):
- `lg-lmxs28626s,lt1000p`
- `lg-lmxs28626s,lt1000pc`
- **Rows to add (missing correct family):
- _(none)_

### LRFVS3006S (`lg-lrfvs3006s`)

- **Official filter (manufacturer evidence):** `LT1000P`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is LT1000P but legacy CSV maps adq36006101, adq74793502, lt1000p, lt1000pc, lt700p, mdj64844601 — reconcile before any compat or buy-path promotion. Planned QA fix: remove 4 wrong-family row(s), keep 2 correct row(s). CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `lg-lrfvs3006s,adq36006101`
- `lg-lrfvs3006s,adq74793502`
- `lg-lrfvs3006s,lt700p`
- `lg-lrfvs3006s,mdj64844601`
- **Rows to keep (already match official family):
- `lg-lrfvs3006s,lt1000p`
- `lg-lrfvs3006s,lt1000pc`
- **Rows to add (missing correct family):
- _(none)_

### LRFXS3106S (`lg-lrfxs3106s`)

- **Official filter (manufacturer evidence):** `LT1000P`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is LT1000P but legacy CSV maps lt600p, lt800p — reconcile before any compat or buy-path promotion. Planned QA fix: remove 2 wrong-family row(s), add 1 missing row(s) for LT1000P. CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `lg-lrfxs3106s,lt600p`
- `lg-lrfxs3106s,lt800p`
- **Rows to keep (already match official family):
- _(none)_
- **Rows to add (missing correct family):
- `lg-lrfxs3106s,lt1000p`

## Samsung → HAF-QIN / HAF-CIN

QA section totals: 4 model(s); 8 wrong-family removal(s); 2 keep(s); 3 missing-row addition(s).

### RF28R7201SR (`samsung-rf28r7201sr`)

- **Official filter (manufacturer evidence):** `HAF-QIN`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is HAF-QIN but legacy CSV maps da29-00012b, da29-00020b — reconcile before any compat or buy-path promotion. Planned QA fix: remove 2 wrong-family row(s), add 1 missing row(s) for HAF-QIN. CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `samsung-rf28r7201sr,da29-00012b`
- `samsung-rf28r7201sr,da29-00020b`
- **Rows to keep (already match official family):
- _(none)_
- **Rows to add (missing correct family):
- `samsung-rf28r7201sr,da97-17376b`

### RF28R7351SG (`samsung-rf28r7351sg`)

- **Official filter (manufacturer evidence):** `HAF-QIN`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is HAF-QIN but legacy CSV maps da29-00012b, da29-00020b, da97-17376a, da97-17376b — reconcile before any compat or buy-path promotion. Planned QA fix: remove 2 wrong-family row(s), keep 2 correct row(s). CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `samsung-rf28r7351sg,da29-00012b`
- `samsung-rf28r7351sg,da29-00020b`
- **Rows to keep (already match official family):
- `samsung-rf28r7351sg,da97-17376a`
- `samsung-rf28r7351sg,da97-17376b`
- **Rows to add (missing correct family):
- _(none)_

### RF263BEAESR (`samsung-rf263beaesr`)

- **Official filter (manufacturer evidence):** `HAF-CIN`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is HAF-CIN but legacy CSV maps da97-17376a, da97-17376b — reconcile before any compat or buy-path promotion. Planned QA fix: remove 2 wrong-family row(s), add 1 missing row(s) for HAF-CIN. CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `samsung-rf263beaesr,da97-17376a`
- `samsung-rf263beaesr,da97-17376b`
- **Rows to keep (already match official family):
- _(none)_
- **Rows to add (missing correct family):
- `samsung-rf263beaesr,da29-00020b`

### RF28NHEDBSR (`samsung-rf28nhedbsr`)

- **Official filter (manufacturer evidence):** `HAF-CIN`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is HAF-CIN but legacy CSV maps da29-10105j, da97-19467c — reconcile before any compat or buy-path promotion. Planned QA fix: remove 2 wrong-family row(s), add 1 missing row(s) for HAF-CIN. CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `samsung-rf28nhedbsr,da29-10105j`
- `samsung-rf28nhedbsr,da97-19467c`
- **Rows to keep (already match official family):
- _(none)_
- **Rows to add (missing correct family):
- `samsung-rf28nhedbsr,da29-00020b`

## GE → RPWFE

QA section totals: 3 model(s); 4 wrong-family removal(s); 2 keep(s); 1 missing-row addition(s).

### GFE28GMKES (`ge-gfe28gmkes`)

- **Official filter (manufacturer evidence):** `RPWFE`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is RPWFE but legacy CSV maps mswf, rpwfe — reconcile before any compat or buy-path promotion. Planned QA fix: remove 1 wrong-family row(s), keep 1 correct row(s). CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `ge-gfe28gmkes,mswf`
- **Rows to keep (already match official family):
- `ge-gfe28gmkes,rpwfe`
- **Rows to add (missing correct family):
- _(none)_

### GFE28GSKSS (`ge-gfe28gskss`)

- **Official filter (manufacturer evidence):** `RPWFE`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is RPWFE but legacy CSV maps mswf, mwf — reconcile before any compat or buy-path promotion. Planned QA fix: remove 2 wrong-family row(s), add 1 missing row(s) for RPWFE. CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `ge-gfe28gskss,mswf`
- `ge-gfe28gskss,mwf`
- **Rows to keep (already match official family):
- _(none)_
- **Rows to add (missing correct family):
- `ge-gfe28gskss,rpwfe`

### GFE28GYNFS (`ge-gfe28gynfs`)

- **Official filter (manufacturer evidence):** `RPWFE`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is RPWFE but legacy CSV maps rpwfe, xwfe — reconcile before any compat or buy-path promotion. Planned QA fix: remove 1 wrong-family row(s), keep 1 correct row(s). CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `ge-gfe28gynfs,xwfe`
- **Rows to keep (already match official family):
- `ge-gfe28gynfs,rpwfe`
- **Rows to add (missing correct family):
- _(none)_

## Whirlpool → EDR1RXD1 / EDR2RXD1 / EDR4RXD1

QA section totals: 4 model(s); 13 wrong-family removal(s); 0 keep(s); 4 missing-row addition(s).

### WRS325SDHZ (`whirlpool-wrs325sdhz`)

- **Official filter (manufacturer evidence):** `EDR1RXD1`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is EDR1RXD1 but legacy CSV maps edr3rxd1 — reconcile before any compat or buy-path promotion. Planned QA fix: remove 1 wrong-family row(s), add 1 missing row(s) for EDR1RXD1. CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `whirlpool-wrs325sdhz,edr3rxd1`
- **Rows to keep (already match official family):
- _(none)_
- **Rows to add (missing correct family):
- `whirlpool-wrs325sdhz,edr1rxd1`

### WRX986SIHZ (`whirlpool-wrx986sihz`)

- **Official filter (manufacturer evidence):** `EDR2RXD1`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is EDR2RXD1 but legacy CSV maps edr4rxd1, ukf8001 — reconcile before any compat or buy-path promotion. Planned QA fix: remove 2 wrong-family row(s), add 1 missing row(s) for EDR2RXD1. CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `whirlpool-wrx986sihz,edr4rxd1`
- `whirlpool-wrx986sihz,ukf8001`
- **Rows to keep (already match official family):
- _(none)_
- **Rows to add (missing correct family):
- `whirlpool-wrx986sihz,edr2rxd1`

### WRF540CWHZ (`whirlpool-wrf540cwhz`)

- **Official filter (manufacturer evidence):** `EDR4RXD1`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is EDR4RXD1 but legacy CSV maps 4396841, 4396842, w10413645a — reconcile before any compat or buy-path promotion. Planned QA fix: remove 3 wrong-family row(s), add 1 missing row(s) for EDR4RXD1. CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `whirlpool-wrf540cwhz,4396841`
- `whirlpool-wrf540cwhz,4396842`
- `whirlpool-wrf540cwhz,w10413645a`
- **Rows to keep (already match official family):
- _(none)_
- **Rows to add (missing correct family):
- `whirlpool-wrf540cwhz,edr4rxd1`

### WRX735SDHZ (`whirlpool-wrx735sdhz`)

- **Official filter (manufacturer evidence):** `EDR4RXD1`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is EDR4RXD1 but legacy CSV maps 4396395, 4396508, 4396710, 46-9002, 8171413, edr1rxd1, edr2rxd1 — reconcile before any compat or buy-path promotion. Planned QA fix: remove 7 wrong-family row(s), add 1 missing row(s) for EDR4RXD1. CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `whirlpool-wrx735sdhz,4396395`
- `whirlpool-wrx735sdhz,4396508`
- `whirlpool-wrx735sdhz,4396710`
- `whirlpool-wrx735sdhz,46-9002`
- `whirlpool-wrx735sdhz,8171413`
- `whirlpool-wrx735sdhz,edr1rxd1`
- `whirlpool-wrx735sdhz,edr2rxd1`
- **Rows to keep (already match official family):
- _(none)_
- **Rows to add (missing correct family):
- `whirlpool-wrx735sdhz,edr4rxd1`

## Frigidaire → EPTWFU01 / ULTRAWF

QA section totals: 3 model(s); 8 wrong-family removal(s); 2 keep(s); 1 missing-row addition(s).

### FGHB2868PF (`frigidaire-fghb2868pf`)

- **Official filter (manufacturer evidence):** `EPTWFU01`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is EPTWFU01 but legacy CSV maps frig-242017801, frig-242086201, purepour, ultrawf, wf3cb, wfcb — reconcile before any compat or buy-path promotion. Planned QA fix: remove 6 wrong-family row(s), add 1 missing row(s) for EPTWFU01. CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `frigidaire-fghb2868pf,frig-242017801`
- `frigidaire-fghb2868pf,frig-242086201`
- `frigidaire-fghb2868pf,purepour`
- `frigidaire-fghb2868pf,ultrawf`
- `frigidaire-fghb2868pf,wf3cb`
- `frigidaire-fghb2868pf,wfcb`
- **Rows to keep (already match official family):
- _(none)_
- **Rows to add (missing correct family):
- `frigidaire-fghb2868pf,eptwfu01`

### FGSC2335TF (`frigidaire-fgsc2335tf`)

- **Official filter (manufacturer evidence):** `EPTWFU01`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is EPTWFU01 but legacy CSV maps eptwfu01, frig-242294502 — reconcile before any compat or buy-path promotion. Planned QA fix: remove 1 wrong-family row(s), keep 1 correct row(s). CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `frigidaire-fgsc2335tf,frig-242294502`
- **Rows to keep (already match official family):
- `frigidaire-fgsc2335tf,eptwfu01`
- **Rows to add (missing correct family):
- _(none)_

### FFHB2740PS (`frigidaire-ffhb2740ps`)

- **Official filter (manufacturer evidence):** `ULTRAWF`
- **QA status:** `MAPPING_REVIEW_REQUIRED` — not PASS / not PROVEN until CSV is reconciled
- **Wrong-purchase risk / why not PASS yet:** Wrong-purchase risk: Owner mapping review: official manufacturer filter is ULTRAWF but legacy CSV maps frig-242086201, ultrawf — reconcile before any compat or buy-path promotion. Planned QA fix: remove 1 wrong-family row(s), keep 1 correct row(s). CSV not reconciled yet — not PASS/PROVEN.
- **Rows to remove (wrong-family / compat-risk cleanup):
- `frigidaire-ffhb2740ps,frig-242086201`
- **Rows to keep (already match official family):
- `frigidaire-ffhb2740ps,ultrawf`
- **Rows to add (missing correct family):
- _(none)_

## QA approval decision (do not apply from this file)

After QA review, record explicit approval in a separate gated apply step. This packet documents wrong-purchase risks and proposed compat corrections only — it does not execute CSV writes, buy-link changes, or public page updates.
