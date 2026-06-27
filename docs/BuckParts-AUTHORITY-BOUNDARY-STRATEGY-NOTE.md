# BuckParts Authority Boundary — Strategy Note

**Status:** Strategic interpretation only — derived from committed docs and current repo state.  
**Governing:** `docs/BuckParts-CONSTITUTION.md`, `docs/ARCHITECTURE.md`, `docs/BuckParts-HQ-HANDOFF.md`  
**Inputs:** Foundation v2 completion, wedge completion design, Foundation v3 distribution design, live repo artifacts  
**Does not authorize:** mutation, deploy, new foundations, product pivot, or external sales claims.

---

## 1. What is PROVEN

**Operating model (Foundation v1 stack — HQ handoff):**

```
Truth → Command Center → Runner → External AI → Validation → Owner Decision Queue → Approved Mutation
```

**Subsystems that exist, are test-covered, and have defined contracts:**

| Subsystem | Contract | Maturity note |
|-----------|----------|---------------|
| Command Center v2 | `command_center_v2` | Read-only steering; **does not** auto-execute missions |
| Runner v1 | `buckparts_runner_v1` | Mission orchestration over existing `report-*.ts` factories; **forbidden** mutation argv at validation |
| Owner Decision Queue v1 | `owner_decision_queue_v1` | Indexes halts; **never** auto-approves |
| Founder Decision Registry v1 | `founder_decision_registry_v1` | Human-recorded rows under `data/owner-decisions/`; sole mutation-intent store for guarded executors |
| Agent Contract v1 | `agent_contract_v1` | Disk manifest/result; `truth_closure_claimed: false` required |
| Operations Metrics v1 | `operations_metrics_v1` | Measurement only |
| Production Mission v1 | `production_mission_v1` | Reference lifecycle; Runner stays dry-run inside mission |
| Coverage Production Sprint v2 | `coverage_production_sprint_v2_v1` | Read-only batch ranking by expected `SAFE_BUYER_PATH_PROVEN` delta |

**Foundation v2 end-to-end loop — proven once (ARCHITECTURE.md, FOUNDATION-V2-COMPLETION.md):**

- Lifecycle run `a6b27301-e040-4405-b613-5adcb6c99bb6`: `lifecycle_complete: true`, census **48 → 49**, **delta +1**, primary slug `edr4rxd1`.
- Guarded CSV write occurred **outside** Runner via manufacturer rescue bridge after founder registry approval — Runner reports remained `mutation_authorized: false`.
- Failed reference run `a9ab9a89…` correctly recorded **delta 0**, `lifecycle_complete: false` — orchestration without customer-visible proven delta.

**Runtime-enforced invariants (ARCHITECTURE.md §3):**

- Runner steps cannot include `--write-csv`, `--apply`, `--mutate`, `--supabase-apply`, `git commit`, or `git push`.
- Owner Decision Queue requires active registry row (`isFounderRegistryRowActiveMutationApproval`) for effective approval projection — queue alone does not authorize CSV write.
- Readiness gate is sole `READY_FOR_APPLY` promotion authority for manufacturer rescue apply.
- Apply-plan `READY_FOR_OWNER_REVIEW` does **not** authorize CSV write without guarded executor + registry.

**Trust and product doctrine (HQ handoff, Constitution via ARCHITECTURE):**

- BuckParts is a **replacement-part truth and safe-buyer-path** system first — evidence, census classification, guarded apply, wrong-part prevention.
- Demand, GSC clicks, and coverage gaps **do not** substitute for fit or listing evidence.
- HyperAgent is a **first-class audit surface** for customer reality and live-surface clarity — not a truth authority that closes loops alone.

**Current repo execution state (re-verify before citing numbers):**

- Foundation v1 stack declared **COMPLETE** at HQ handoff stopping point; Foundation v2 **implemented** with **one** successful production-mission proof.
- Strategic initiatives BP-SI-001 – BP-SI-008 are **PARKED** — none authorize work without explicit founder activation.
- `refrigerator_water` remains the operational first wedge (HQ handoff: no second wedge until stronger first-wedge proof; wedge completion standard design).
- Slug `4396508`: owner-review insert path reaches guarded apply **DRY_RUN_READY**; founder registry row exists but is **inactive** (`deferred` / `none`) until manual activation — gates working as designed.

**What the asset actually is today:**

A **discipline, design, and reference implementation** — typed contracts, read-only factories, founder-gated mutation executors, evidence artifacts, and architecture docs — embedded in the BuckParts replacement-parts product repo. **Not** a shrink-wrapped platform product.

---

## 2. What is INFERRED

- **“Backend” in a strategic sense** means the Foundation v2 **operating loop pattern** (truth factories → steering → bounded execution → founder approval → guarded mutation), not a multi-tenant control plane sold to third parties.
- Foundation v3 (distribution & demand capture design) would **compose** existing read-only factories — not replace Runner, Production Mission, or Operations Metrics.
- Wedge Completion Standard (design) is the right **internal bar** before promoting another catalog wedge to `LIVE` — but the audit harness composition is not yet a single shipped command.
- Customer Reality / authority-gated steering may eventually **calibrate** Command Center NBA — but factory NBA replacement is explicitly **not** authorized yet (HQ handoff §9).
- Compatibility infrastructure as an “institutional truth layer” is a **direction**, partially reflected in mission factory + evidence lanes — not a finished product (HQ handoff strategic map).
- Throughput improvement from Foundation v2 requires **repeated** production missions and metrics snapshots — the metrics shell exists; trend claims need ≥2 real snapshots (FOUNDATION-V2-COMPLETION.md §4).

---

## 3. What is UNKNOWN

- **External demand** for BuckParts-as-infrastructure (licensing, OEM adoption, enterprise workflow) — **no repo proof**; not measured or claimed here.
- **Repeatability** of Foundation v2 lifecycle at steady cadence — proven **once**; first live audit **failed** until composition fixes.
- **Layer 6 closed-loop autonomy** — `layer_6_founder_only_approval: NOT_PROVEN` (HQ handoff, ARCHITECTURE INV-015).
- **Full wedge completion** for `refrigerator_water` on all four Wedge Completion Standard dimensions — design exists; holistic pass **not** established in a single evaluation run.
- **Distribution → proven-path growth** causality — Foundation v3 design intent; factories largely **partial** or experimental.
- Longitudinal customer outcome proof for authority-gated steering — requires ≥2 snapshots + closure link (HQ handoff §7).
- Live Supabase/runtime state for every slug at review time; production `/go` first-hop without policy — per-slug **UNKNOWN** in apply packets.
- Whether any third party would pay for this codebase pattern independent of BuckParts consumer value.

---

## 4. What HyperAgent correctly warned against overstating

From HQ handoff execution stack and customer-reality doctrine (PROVEN policy):

| Overstatement | Correct boundary |
|---------------|------------------|
| **“Discovery complete” = shipped / closed** | HyperAgent `DISCOVERY_COMPLETE` is **not** customer-visible closure — use `customer_closure_report_v1` proof chain (closeout + census + mission PROMOTED). |
| **Passing build/tests = homeowner clarity** | Customer confusion is a **valid defect** even when code is correct; live-surface audit is first-class. |
| **Orchestration phases = coverage delta** | Failed production mission `a9ab9a89…` proves phases can run with **delta 0** — do not conflate lifecycle recording with proven inventory growth. |
| **Read-only evidence collection = next discovery sprint** | HQ handoff explicitly stops “more read-only HyperAgent chat discovery” when `read_only_evidence_collection_complete`. |
| **VC readiness / second-wedge approval / recall product** | HQ handoff §9: **do not claim** without founder-approved build scope. |
| **Factory NBA = customer truth** | Customer steering may **conflict** with factory NBA; replacement requires longitudinal proof — not UI opinion alone. |
| **Agent dispatch result = truth closure** | Agent Contract requires `truth_closure_claimed: false`; validated dispatch does not close fit or buyer-path truth. |

HyperAgent’s role: **homeowner, trust, UX, and live-surface audit** — complementary to repo-owned validation, not a substitute for founder-gated mutation or census proof.

---

## 5. The strongest truthful claim we can make today

BuckParts has a **repo-proven, founder-gated operating model** for turning replacement-part evidence into **`SAFE_BUYER_PATH_PROVEN` inventory** on the committed catalog: read-only truth factories, Command Center steering, Runner missions that **cannot** mutate production data, explicit owner approval via Founder Decision Registry, and separate guarded apply executors for CSV changes — with **one** documented end-to-end lifecycle that produced a **+1** census delta after human approval and an external guarded write.

The valuable artifact is the **reference implementation of that discipline** inside a live replacement-parts business — not an enterprise platform, workflow engine, or ontology product ready for external licensing.

---

## 6. What would need to become true before this could be sold as infrastructure

This section describes **hypothetical** external-infrastructure maturity — **not** a current roadmap commitment and **not** an implied TAM or buyer list.

| Gate | Why it matters |
|------|----------------|
| **Repeated operating proof** | Multiple independent lifecycles with census deltas, not a single reference run; failed runs understood and prevented by composition, not heroics. |
| **Stable public API surface** | Documented, versioned contracts consumable by a team that does **not** maintain the BuckParts monorepo — today contracts serve **internal** factories and CLI reports. |
| **Tenant / isolation model** | No PROVEN multi-customer data boundary, billing, or SLA story in repo. |
| **Operational ownership** | On-call, migration, backward compatibility, and security review beyond “founder edits JSON + runs npm scripts.” |
| **Wedge completion on first vertical** | Wedge Completion Standard pass for `refrigerator_water` (or explicit founder exception with recorded rationale) before claiming vertical-agnostic platform. |
| **Distribution proof tied to truth** | Foundation v3-style measurement showing discovery work correlates with **proven** paths — not clicks alone. |
| **External paying design partners** | At least one non-BuckParts use case with signed intent — **UNKNOWN today**; repo cannot invent this. |
| **Legal/commercial packaging** | Support terms, liability boundary for wrong-part guidance, IP clarity — outside repo truth. |

Until then, describing BuckParts as **Palantir-, Temporal-, ServiceNow-, or Fortune-500-licensable infrastructure** would overstate maturity. Those comparisons are **explicitly out of scope** for this note.

---

## 7. What this means for the next 30 days

**Preserve the business:** BuckParts remains a **replacement-part truth and coverage** company. Revenue, traffic, and demand are **not** inferred from repo mechanics; the job is more **`SAFE_BUYER_PATH_PROVEN`** rows with evidence-backed buyer paths on `refrigerator_water`, not repositioning as a platform vendor.

**Execute on the proven loop (not new architecture):**

1. **Coverage:** Advance executable `refrigerator_water` batches (e.g. First4 deblocked slugs such as `4396508`) through dry-run → founder activation → precheck → guarded `--write-csv` where gates pass.
2. **Distribution (bounded):** Use **existing** read-only factories (referenceability, demand-to-coverage, page quality, daily operator) to improve discoverability **of already-proven** paths — per Foundation v3 **design**, without new orchestration layers.
3. **Measurement:** Record operations metrics snapshots; re-run census and wedge-completion **read-only** evaluations to track C3 / buyer-path truth — not to claim wedge-complete prematurely.
4. **Defer platform pivot:** Keep BP-SI-001 – BP-SI-008 **PARKED**; do not market “compatibility infrastructure” or “home repair OS” as shipped product.

**Do not do in 30 days (HQ handoff + ARCHITECTURE aligned):**

- Auto-approve registry rows or bypass guarded executors.
- Claim second-wedge `LIVE` promotion without wedge completion pass.
- Treat Command Center NBA or HyperAgent discovery as mutation authority.
- Build Foundation v3 as a parallel stack instead of composing existing factories.

---

## Decision (30 days)

**Continue proving `refrigerator_water` coverage and bounded distribution using the Foundation v2 operating loop — do not pivot** to selling BuckParts as external infrastructure, enterprise workflow software, or a shrink-wrapped platform.

Revisit this boundary only when: (a) repeated lifecycle proofs exist, (b) first-wedge completion criteria are evaluable with repo artifacts, and (c) explicit founder activation opens a strategic initiative or external design partner — none of which are PROVEN today.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-27 | Initial authority boundary strategy note from ARCHITECTURE, HQ handoff, Foundation v2/v3 design, wedge completion design, current repo state. |
