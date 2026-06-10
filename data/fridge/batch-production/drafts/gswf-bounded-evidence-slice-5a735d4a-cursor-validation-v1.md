# GSWF bounded evidence slice 5a735d4a — Cursor validation v1

**Executive verdict:** `VALIDATION_PARTIAL`

Ingest packet contract **passes** (`contract=buckparts_hyperagent_ingest_packet_v1`, `discovery_status=DISCOVERY_COMPLETE`, 17 rows). All **17/17** slugs are mapped to `gswf` in committed `data/compatibility_mappings.csv`. HyperAgent discovery reports **100% wrong-part** vs GSWF (RPWFE / MWF / XWFE / no-filter). Repo audit still classifies all 17 as `LIKELY_CORRECT_NEEDS_EVIDENCE`. **No compat mutation, no apply plan, no truth closure.**

| Field | Value |
|-------|-------|
| `validation_status` | **VALIDATION_PARTIAL** |
| `mission_factory_id` | **MF-2026-0003** |
| pass / partial / fail | **13 / 3 / 1** |
| `repo_truth_closure_authorized` | **false** |
| `apply_plan_authorized` | **false** |

**Artifacts:**
- Ingest: `data/fridge/batch-production/drafts/gswf-bounded-evidence-slice-5a735d4a-hyperagent-ingest-packet-v1.json`
- Validation: `data/fridge/batch-production/drafts/gswf-bounded-evidence-slice-5a735d4a-cursor-validation-v1.json`

---

## 1. Are all 17 mapped to gswf in repo?

**Yes — PROVEN.** Every slug in the mission batch has at least one `compatibility_mappings.csv` row with `filter_slug=gswf` (most also co-map `gswf2`; some add `xwf` or `smartwater-mwfp`).

---

## 2. Exact OEM proven vs inferred

| Category | Count | Slugs |
|----------|-------|-------|
| **PROVEN OEM wrong-part** | **13** | CWE23, GFE24, GFE27, GFE28GMK/GSK/HSK, GNE25/27, GSE25, GYE22, PFE28KM/KYN, PVD28 |
| **Platform-inferred (PARTIAL)** | **3** | `ge-gfe28hmkww`, `ge-gsc25frshss`, `ge-gse26gshess` |
| **PROVEN no filter (FAIL)** | **1** | `ge-gte18gsnrss` |

---

## 3. Owner-review repair candidates

**13 rows** classified `VALIDATION_PASS_READY_FOR_OWNER_REVIEW` — surgical removal of `gswf`/`gswf2` co-maps and remap to documented actual filter family (RPWFE, XWFE/MWF, etc.). **Repair-review summary only; no apply plan.**

---

## 4. Browser proof required

**3 rows:** `ge-gfe28hmkww` (OEM-adjacent/sibling platform), `ge-gsc25frshss` (inferred MWF from GSS25 platform), `ge-gse26gshess` (inferred MWF from GSE25 successor).

---

## 5. No-filter / catalog suppression

**1 row:** `ge-gte18gsnrss` — GE OEM confirms **no water dispenser**; all filter mappings including `gswf` are invalid. Classified `VALIDATION_FAIL`.

---

## 6. Learned failure guard candidates (GE architecture)

1. **GSWF cylindrical housing incompatible** with RPWFE RFID French-door / Profile lines (GFE28, PFE28, GYE22, CWE23).
2. **GSWF incompatible with MWF/XWFE push-in housing** on GNE/GSE prefixes.
3. **Prefix routing guards:** GFE28/PFE28 → RPWFE; PVD28/GFE24 → XWFE; GNE/GSE → MWF/XWFE.
4. **No-dispenser top-freezer guard:** suppress all filter rows when OEM confirms no filtration hardware.
5. **GSWF legacy/discontinued family guard:** GE lists GSWF clearance-only; buying guide limits GSWF to UNC15N/UCC15N — do not scale contaminated family without rebuild.

---

## Mission Factory registry

If ingest contract checks pass, **MF-2026-0003** transitions `DISPATCHED` → `DISCOVERY_COMPLETE` (registry only). Next state after Cursor validation is **not** auto-advanced to `INGEST_COMMITTED` or `CURSOR_VALIDATED` in this pass.

**Smallest next action:** Owner reviews the 13 PASS repair candidates and decides whether to open a `filter::ge::gswf` family reconciliation owner packet at **CRITICAL** severity before any compat apply plan.
