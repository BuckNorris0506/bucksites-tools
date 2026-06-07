# Page 1 draft — Samsung RF28R7351SR → HAF-QIN/EXP / DA97-17376B

**Classification:** non-runtime owner-review draft — no compatibility apply, no buy links, no public publish from this file alone.

**Target route (when reconciled):** `/fridge/samsung-rf28r7351sr`

**Draft status:** Step 2a complete in repo — `data/compatibility_mappings.csv` reconciled to `da97-17376b`; quarantine + `seed:import` + live proof remain pending before publication.

**Evidence fixture:** `data/manual-evidence/refrigerator/samsung-rf28r7351sr.json`

---

## SEO (draft — matches existing fridge metadata pattern)

| Field | Draft value |
| --- | --- |
| **H1** | RF28R7351SR water filter |
| **Meta title** | RF28R7351SR water filter · BuckParts |
| **Meta description** | Compatible water filters and replacement schedule for Samsung model RF28R7351SR. |

---

## Intro

If you own a **Samsung RF28R7351SR** French-door refrigerator, use the **full model code on your rating plate** and the **numbers printed on your old water filter** before you order a replacement. BuckParts may list part numbers and source-backed notes to narrow your search — **not a fit guarantee**. Trim codes and finish letters (for example stainless vs black stainless) can differ; always compare what you see on the appliance and the old cartridge.

---

## Correct filter (source-backed)

For the **RF28R7351SR** model line, Samsung documentation in repo ties this family to the **HAF-QIN** filter line:

| What to look for | Detail |
| --- | --- |
| **Consumer / marketing name** | **HAF-QIN** or **HAF-QIN/EXP** (Samsung accessory naming) |
| **OEM cartridge number** | **DA97-17376B** |
| **BuckParts filter slug (when mapped)** | `da97-17376b` → `/filter/da97-17376b` |

**PROVEN repo sources:** `data/filters.csv` (da97-17376b), `scripts/lib/refrigerator-model-first-samsung-marketing-token-cross-reference-v1.ts` (HAF-QIN family), `data/manual-evidence/refrigerator/samsung-rf28r7351sr.json` (Samsung RF28R7351SR spec sheet + Water Filter Finder + HAF-QIN accessory page).

---

## HAF-QIN vs HAF-CIN — do not mix families

Samsung maintains **separate** refrigerator water filter families. For this model line the documented family is **HAF-QIN**, not **HAF-CIN**:

| Family | Typical marketing name | OEM in BuckParts catalog | Fits RF28R7351SR? |
| --- | --- | --- | --- |
| **HAF-QIN** | HAF-QIN / HAF-QIN/EXP | DA97-17376B (`da97-17376b`) | **Yes — per manufacturer evidence in repo** |
| **HAF-CIN** | HAF-CIN / HAF-CIN/EXP | DA29-00020B (`da29-00020b`) | **No — different Samsung family; wrong-family risk** |

**Cautious wrong-family note:** Installing a **HAF-CIN (DA29-00020B)** cartridge where **HAF-QIN** is required may not seat correctly and **can risk damage** to the filter housing or water path. Compare the label on your old filter before buying.

**PROVEN:** Samsung cross-reference module. Repo CSV reconciled (Step 2a): `samsung-rf28r7351sr` → `da97-17376b` only. Supabase parity and live page proof still pending.

---

## Verify before buying

1. Read the **full model number** on the refrigerator rating plate (include suffix letters if present).
2. Read the **filter marketing name** and **OEM-style number** molded or printed on the old cartridge.
3. Confirm they match **HAF-QIN / DA97-17376B** — not HAF-CIN.
4. Check your **downloaded user manual** if anything looks ambiguous.

BuckParts does not replace reading your label, manual, or the retailer product page you ultimately open.

---

## Replacement timing

Samsung support guidance in repo recommends replacing approximately **every six months** or when the **water filter indicator** prompts. BuckParts stores a **6-month** interval on filter row `da97-17376b` in `data/filters.csv`.

---

## Install and reset (general — not model-exact compartment location)

Per Samsung support article **ANS10005090** (Tier 1 source in evidence bundle):

1. Turn off the water supply if your manual instructs you to.
2. Rotate the old filter **counterclockwise** to unlock and remove.
3. Install the new filter **clockwise** until it locks.
4. Flush several gallons of water through the dispenser.
5. **Reset the water filter indicator** on the control panel (see Samsung reset help for your UI).

**Filter housing location:** Samsung notes vary by French-door layout — **consult your user manual** for the exact compartment; this draft does not state a precise internal location for RF28R7351SR.

---

## Variant note (INFERRED — not verified in repo)

Some retail listings show suffix variants (for example finish or package codes). **INFERRED:** finish letters after the base model may differ without changing the HAF-QIN cartridge family, but BuckParts has **not** verified every suffix in repo. Confirm on your rating plate and old filter label.

**UNKNOWN in repo:** RF28R7351DT/AA-specific proof — omit dedicated DT copy until owner-verified.

---

## RFID / genuine-filter note (cautious only)

Samsung support recommends **genuine Samsung water filters** for refrigerators that expect Samsung cartridges. BuckParts does **not** claim that every Samsung model uses an RFID or chip gate — confirm with your manual and the cartridge you remove.

---

## FAQ (evidence-backed only)

### What filter does the RF28R7351SR use?

**HAF-QIN / HAF-QIN/EXP** line; OEM cartridge **DA97-17376B** per Samsung spec sheet and Water Filter Finder sources in `samsung-rf28r7351sr.json`.

### Can I use HAF-CIN instead?

**No for this model line** — HAF-CIN is a different Samsung family (DA29-00020B). Wrong-family cartridges may not fit and **can risk damage** to the housing or water path.

### Does this draft add buying options?

**No.** Step 1 is copy + evidence + quarantine only. No retailer links, no outbound purchase URLs, no purchase CTAs.

---

## Gates (explicit)

| Gate | Status |
| --- | --- |
| `compatibility_mappings.csv` repo reconcile (Step 2a) | **YES** — `da97-17376b` only |
| `seed:import` / Supabase parity | **NO** — pending owner Step 2b |
| `retailer_links.csv` mutation | **NO** |
| Buy / outbound purchase links | **NO** |
| Public publish readiness | **NO** — quarantine active on live slug |

---

## Quarantine (live)

Until compatibility is reconciled, `samsung-rf28r7351sr` is listed in `src/lib/fridge/fridge-model-review-overrides.ts` so the live `/fridge/samsung-rf28r7351sr` page does not present wrong-family mapped filters as normal guidance.
