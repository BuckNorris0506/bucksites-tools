# Visual Fit Check / AR Fit Check — Future Trust Layer

**Status:** PARKED — docs-only strategy note. No current Command Center steering. No implementation authorized.  
**Saved:** 2026-06-12  
**Owner:** Jared Buckman  

**Related (also PARKED; do not treat as active work):** `docs/strategic-initiatives/BP-STRATEGIC-INITIATIVES-REGISTRY.md` — BP-SI-003 (Visual Home Repair AI), BP-SI-007 (BuckParts Scanner). This note narrows the idea to **fit verification** as a trust layer beyond text compatibility — not general repair diagnosis or zero-typing lookup alone.

**Truth source:** Repo contracts and positioning docs below — **not** `docs/BuckParts-HQ-HANDOFF.md` as execution authority.

---

## 1. Why it aligns with BuckParts

BuckParts exists to reduce **wrong-part risk** through evidence-first replacement intelligence (`docs/grants/BuckParts-GRANT-APPLICATION-PACKET-v1.md`, public `/wrong-part-prevention`). Fit lookup for home consumables is the mental model BuckParts is building (`docs/marketing/BuckParts-Fit-Lookup-Positioning-Idea.md`).

A **Visual Fit Check** (photo-based) or **AR Fit Check** (camera-overlay) would extend that model from **text and listing evidence** to **physical verification**:

| Alignment | What it would add |
|-----------|-------------------|
| **Wrong-purchase prevention** | Let homeowners confirm the candidate part matches what they have before buying — same core job as fit lookup, with a visual proof path. |
| **Old filter / model sticker / install-slot verification** | Capture the installed filter frame, cartridge label, or model sticker and compare shape, dimensions, or part-number text against the mapped replacement — reducing alias and “compatible” listing confusion. |
| **Trust layer beyond text compatibility** | Text mappings and retailer listing checks can be right on paper and still wrong in the slot. Visual confirmation is an additional honesty layer — not a substitute for repo validation, but a buyer-side uncertainty reducer when evidence is `PARTIAL` or the homeowner does not trust numbers alone. |

This stays consistent with BuckParts customer UX doctrine: confidence and uncertainty before the main action; no-buy is a trust feature (`docs/BuckParts-CUSTOMER-UX-DOCTRINE.md`).

---

## 2. Why it is NOT current priority

**PROVEN operating bottleneck:** The active loop is **discovery → validation → apply → live safe buyer path** — HyperAgent and external discovery feed structured ingest; **only repo validation** may close tasks or classify apply-eligible states (`docs/BuckParts-OPS-AGENT-WORKFLOW-V1.md`). Air purifier wedge work is explicitly in **validation-ready discovery output** and owner-review / apply planning lanes (`docs/air-purifier/AP-HYPERAGENT-DISCOVERY-VALIDATION-OUTPUT-v1.md`, `docs/AIR-PURIFIER-APPLY-PLANNER-V1.md`, `docs/AIR-PURIFIER-APPLY-EXECUTOR-V1.md`).

Until that loop is repeatable and throughput is healthy, visual/AR fit tooling would **compete for founder and agent attention** without fixing the constraint that blocks more SKUs from reaching safe buyer paths.

| Reason | Detail |
|--------|--------|
| **Validation/apply throughput** | Coverage and safe-link apply — not buyer-side camera UX — is what limits published fit answers today. |
| **AR complexity** | AR fit check adds computer vision, device calibration, real-world lighting variance, cross-device UX, and **liability** if the overlay implies “fits” without BuckParts-grade evidence. |
| **Photo-first is safer** | A static photo upload with human-readable comparison (“does this label match?” / “similar frame shape?”) may deliver most trust benefit with lower engineering and trust-contract risk than live AR before the core truth engine is mature. |

**INFERRED:** Grant and ops docs frame impact as wrong-part prevention and verification discipline — not AR novelty (`docs/grants/BuckParts-Grant-Do-Not-Claim-v1.md`).

---

## 3. Possible future use cases

Illustrative only — **not** scoped, prioritized, or authorized:

| Category | Visual fit signal |
|----------|-------------------|
| **Refrigerator cartridge** | Label text, cartridge shape, twist-lock vs push-in silhouette |
| **Air purifier filter frame** | HEPA/carbon frame dimensions, tab placement, model sticker on unit |
| **Whole-house water cartridge** | Housing collar, length, cap style, printed model on cartridge |
| **Vacuum bag collar / port shape** | Bag neck, dock port geometry, model plate on body |
| **Model sticker capture** | OCR or human review of appliance rating plate → cross-check mapped model |

All would need the same restraint as typed lookup: honest uncertainty, no “guaranteed fit” without evidence (`docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md`).

---

## 4. Gate before active work

Do **not** start design, prototyping, or Command Center lane work until **all** gates below are satisfied:

1. **Prove the repeated safe loop** — Discovery → validation → apply → live safe buyer path is demonstrated repeatedly for at least one wedge (e.g. air purifier batch production) without bypassing repo truth gates (`docs/BuckParts-OPS-AGENT-WORKFLOW-V1.md`).
2. **Prove user demand** — Homeowners (or support signals) explicitly ask for **visual** verification — not assumed from tire-fit analogies alone (`docs/marketing/BuckParts-Fit-Lookup-Positioning-Idea.md`).
3. **Prove photo-first value** — A minimal photo-upload flow (even manual / owner-review) reduces purchase uncertainty **before** investing in AR overlay, calibration, or on-device models.

Activation additionally requires an explicit founder decision recorded per `docs/BuckParts-FOUNDER-DECISION-REGISTRY.md` — same bar as `docs/strategic-initiatives/BP-STRATEGIC-INITIATIVES-REGISTRY.md`.

---

## 5. Status

| Field | Value |
|-------|--------|
| **Status** | **PARKED** |
| **Command Center steering** | **None** — this document does not add lanes, `next_best_action`, or task packets. |
| **Implementation** | **Not authorized** — no app, scripts, data, tests, Supabase, retailer_links, or deploy changes. |
| **Mutation authorization** | **None** |

---

## Truth guard

- This note captures a **future trust-layer idea** only; it does not change current execution priority toward AP validation/apply throughput or batch production lanes.
- Do not cite this document in customer-facing copy, grants, or public “we offer AR fit check” claims.
- Adjacent parked initiatives (BP-SI-003, BP-SI-007) remain separate registry entries; merging scope requires founder activation — not this note alone.
