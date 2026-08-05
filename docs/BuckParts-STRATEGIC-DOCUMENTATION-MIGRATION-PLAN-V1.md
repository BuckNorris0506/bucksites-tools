# BuckParts Strategic Documentation Migration Plan v1

**Status:** Process plan only — defines how approved external audit deliverables become durable repository documents.  
**Governing:** `docs/BuckParts-CONSTITUTION.md` (Truth Contract; UNKNOWN over invention)  
**Lane purpose:** Convert founder-approved external audit deliverables (HyperAgent reports and other approved audit packets) into citeable repo truth.  
**Does not authorize:** recreating audits, inventing strategy, committing converted docs without review, production mutation, deploy, or Constitution amendment.

**Epistemic note (PROVEN for this plan):** This document is a conversion procedure. It does not assert that Grand Audit Phases 5–8, Identity, Strategy Doctrine, or Execution Playbook contents already exist in-repo.

---

## 0. Lane definition

| Field | Value |
|-------|-------|
| Lane name | Strategic Documentation Migration |
| Input | Manually provided, founder-approved external audit deliverables |
| Output | Durable markdown (and optional JSON sidecar) under `docs/` |
| Non-input | Chat memory, agent transcripts, unapproved drafts, invented conclusions |
| Non-output | New strategic claims beyond the source deliverable |
| Operator rule | Convert and preserve; do not improve, reinterpret, or complete gaps |

**Hard stop:** If a required external deliverable has not been provided and founder-approved for conversion, do **not** create the target document.

---

## 1. Which external audit deliverables become durable repository documents

Only deliverables that meet **all** of the following may enter the lane:

1. Delivered outside the repo (or as an attached packet) as a completed audit report.
2. Explicitly identified by the founder as the source for a named target document below.
3. Founder-approved for conversion (see §7).
4. Contains enough structure to preserve Executive Verdict / conclusions without invention.

### 1.1 Planned conversions (target slots)

| # | External deliverable class | Becomes durable repo document | Target filename |
|---|----------------------------|-------------------------------|-----------------|
| A | Grand Audit Phase 5 strategic conclusions (approved packet) | Phase 5 source artifact | `docs/BuckParts-GRAND-AUDIT-PHASE5-V1.md` |
| B | Grand Audit Phase 6 strategic conclusions (approved packet) | Phase 6 source artifact | `docs/BuckParts-GRAND-AUDIT-PHASE6-V1.md` |
| C | Grand Audit Phase 7 strategic conclusions (approved packet) | Phase 7 source artifact | `docs/BuckParts-GRAND-AUDIT-PHASE7-V1.md` |
| D | Grand Audit Phase 8 company identity audit (approved packet) | Phase 8 source artifact | `docs/BuckParts-GRAND-AUDIT-PHASE8-COMPANY-IDENTITY-V1.md` |
| E | Approved documentation architecture / hierarchy audit (if provided as a separate packet) | Documentation architecture source | `docs/BuckParts-DOCUMENTATION-ARCHITECTURE-V1.md` |
| F | Other founder-named HyperAgent / external strategic audit packets | One source artifact per approved packet | `docs/BuckParts-<PACKET-SLUG>-V1.md` (slug assigned at approval; must be unique and descriptive) |

### 1.2 Governing documents that **cite** sources (not created by blind conversion)

These are **synthesis / governing** documents. They may be authored only **after** the cited source artifacts exist in-repo (or are being committed in the same founder-approved batch with explicit citation).

| Governing / strategic doc | Target filename | May cite |
|---------------------------|-----------------|----------|
| Operating System (owner strategic description) | `docs/BuckParts-OPERATING-SYSTEM-V1.md` | Constitution; Foundation / architecture docs already in-repo; migrated Phase source artifacts when present |
| Identity (apex strategic identity) | `docs/BuckParts-IDENTITY-V1.md` | Constitution; Phase 8 source; Phase 5–7 sources where they support identity; Documentation Architecture |
| Strategy Doctrine | `docs/BuckParts-STRATEGY-DOCTRINE-V1.md` | Constitution; Identity; migrated Phase sources; OS doc |
| Execution Playbook | `docs/BuckParts-EXECUTION-PLAYBOOK-V1.md` | Identity; Strategy Doctrine; OS doc; HQ handoff for operational stopping point |

**Rule:** Conversion lane creates **source artifacts** (A–F). Governing docs are a **separate authorship step** and must not invent conclusions absent from sources.

### 1.3 Explicitly out of scope for this lane

- Recreating missing Phase 5–8 audits from chat or memory
- Summarizing agent transcripts as if they were approved packets
- HyperAgent Phase 8A SEO/attribution packs unless the founder **separately** names them for conversion under class F
- Production code, CSVs, Supabase, retailer_links, evidence, deploy config

---

## 2. Exact target filenames

### 2.1 Source artifacts (migration outputs)

```
docs/BuckParts-GRAND-AUDIT-PHASE5-V1.md
docs/BuckParts-GRAND-AUDIT-PHASE6-V1.md
docs/BuckParts-GRAND-AUDIT-PHASE7-V1.md
docs/BuckParts-GRAND-AUDIT-PHASE8-COMPANY-IDENTITY-V1.md
docs/BuckParts-DOCUMENTATION-ARCHITECTURE-V1.md
docs/BuckParts-<PACKET-SLUG>-V1.md
```

Optional companion sidecars (only if the approved packet includes structured machine data the founder wants preserved):

```
docs/strategic-audit-sources/<same-stem>-v1.json
```

### 2.2 Governing / strategic consumers (citation targets; not auto-generated by conversion)

```
docs/BuckParts-OPERATING-SYSTEM-V1.md
docs/BuckParts-IDENTITY-V1.md
docs/BuckParts-STRATEGY-DOCTRINE-V1.md
docs/BuckParts-EXECUTION-PLAYBOOK-V1.md
```

### 2.3 Naming rules

- Use `V1` for first committed conversion of a given packet class.
- Increment to `V2` only via supersession (§5), never by silent overwrite.
- Do not reuse a filename for a different packet.
- `<PACKET-SLUG>` is assigned in the approval record and must be lowercase kebab-case ASCII.

---

## 3. Required metadata for each converted document

Every migrated source artifact MUST open with a metadata block containing at least:

| Field | Required | Meaning |
|-------|----------|---------|
| `Status` | yes | e.g. `Durable source artifact — converted from approved external audit deliverable` |
| `Document class` | yes | `grand_audit_source` \| `documentation_architecture_source` \| `external_audit_source` |
| `Governing` | yes | `docs/BuckParts-CONSTITUTION.md` |
| `Source deliverable title` | yes | Exact title of the external packet |
| `Source deliverable provider` | yes | e.g. HyperAgent, named auditor, founder packet |
| `Source deliverable date` | yes | Date on the approved packet (UNKNOWN if packet lacks it — do not invent) |
| `Conversion date` | yes | Date the repo document was authored |
| `Converted from` | yes | Path or attachment id of the provided packet as recorded at approval |
| `Founder approval record` | yes | Path under `data/owner-decisions/` or explicit approval artifact id |
| `Repo HEAD at conversion` | yes | `git rev-parse HEAD` at conversion time |
| `Epistemic policy` | yes | Statement that PROVEN / INFERRED / UNKNOWN are preserved from source |
| `Does not authorize` | yes | Mutation / deploy / strategy expansion beyond source |
| `Supersedes` | if any | Prior repo doc path + version |
| `Superseded by` | if any | Leave empty until replaced |

Recommended section order for **source** artifacts (adapt only if the approved packet uses a different mandatory structure; do not invent missing sections):

1. Metadata block  
2. Executive Verdict (verbatim from source)  
3. Body sections as in source (methodology, candidates, conclusions, etc.)  
4. Evidence Basis (from source)  
5. Conversion fidelity notes (what was copied vs omitted as non-strategic attachment)  
6. Supersession log  

---

## 4. How PROVEN / INFERRED / UNKNOWN labels are preserved

| Rule | Requirement |
|------|-------------|
| **No relabeling** | If the source marks a claim `PROVEN`, the repo doc must keep `PROVEN`. Same for `INFERRED` and `UNKNOWN`. |
| **No upgrading** | Conversion must not promote INFERRED → PROVEN or UNKNOWN → INFERRED. |
| **No downgrading for convenience** | Do not weaken PROVEN to avoid conflict; record conflict under Conversion fidelity notes and STOP for founder review if trust-bearing. |
| **Missing labels** | If the source omits a label on a material claim, mark that claim `UNKNOWN` *as to epistemic status in-repo* and quote the source wording — do not invent PROVEN. |
| **Repo-only facts** | Facts about the conversion itself (HEAD, approval path, file paths) may be labeled PROVEN as conversion metadata. |
| **Contradictions with Constitution** | Do not silently rewrite. Record the contradiction; Constitution wins for behavior; founder decides whether the source packet is admissible. |

---

## 5. How superseded conclusions are handled

| Case | Handling |
|------|----------|
| New approved packet replaces an older converted source | Create `V2` (or next version); set `Supersedes` on the new file; add `Superseded by` on the old file; retain the old file in-repo |
| Partial update | Prefer a new version of the whole source artifact; do not surgically edit historical conclusions without a supersession entry |
| Governing doc depends on superseded source | Update citations in Identity / Strategy Doctrine / OS / Playbook in a **separate** reviewed change; do not leave apex docs citing dead authority without noting supersession |
| Retraction | Founder approval required; mark old doc `Status: RETRACTED` with rationale; do not delete history |

**Supersession log (required section on every source artifact):**

| Version | Date | Change | Approved by |
|---------|------|--------|-------------|
| V1 | \<conversion date\> | Initial conversion from approved external deliverable | Founder |

---

## 6. How Operating-System-V1, Identity, Strategy Doctrine, and Execution Playbook will cite these documents

### 6.1 Citation hierarchy

```
Constitution (supreme)
  └─ Documentation Architecture (if converted) — defines doc roles
       └─ Identity V1 — apex answer to “What company is BuckParts building?”
            ├─ Strategy Doctrine V1 — durable strategy rules under Identity
            ├─ Operating System V1 — what the OS has become (architecture/ops identity)
            └─ Execution Playbook V1 — how work is sequenced under Identity + Doctrine
                 └─ HQ Handoff — operational stopping point only (not identity authority)
```

Source artifacts (Phase 5–8, etc.) sit **beside** this hierarchy as **evidence inputs**. They do not outrank Constitution. They do not replace HQ for Monday execution.

### 6.2 Citation rules by consumer

| Consumer | Must cite for identity/strategy claims | Must not treat as |
|----------|----------------------------------------|-------------------|
| `BuckParts-OPERATING-SYSTEM-V1.md` | Migrated Phase sources when describing Grand Audit 5–8 / OS conclusions; existing in-repo Foundation/architecture docs for earlier layers | Identity apex; Monday execution authority |
| `BuckParts-IDENTITY-V1.md` | Phase 8 company-identity source (required); Phase 5–7 sources only where they support identity; Documentation Architecture; Constitution | Marketing; execution backlog |
| `BuckParts-STRATEGY-DOCTRINE-V1.md` | Identity V1; relevant migrated Phase sources; Constitution | Permission to mutate production |
| `BuckParts-EXECUTION-PLAYBOOK-V1.md` | Identity + Strategy Doctrine; OS doc for subsystem map; HQ for current stopping point | Override of Constitution or Identity |

### 6.3 Citation format (required)

When a governing doc relies on a migrated source, use an explicit citation block, for example:

```markdown
**Source:** `docs/BuckParts-GRAND-AUDIT-PHASE8-COMPANY-IDENTITY-V1.md`  
**Claim label in source:** PROVEN | INFERRED | UNKNOWN  
**Quoted/paraphrase policy:** Prefer short quote for identity-critical sentences; paraphrase only when label-preserving.
```

### 6.4 Gate: no citation of absent files

A governing document **must not** cite a Phase 5–8 (or other) source filename until that file exists in the working tree under this plan and has passed §7 approval for commit (or is included in the same approved commit batch).

---

## 7. Required review/approval process before any converted document is committed

### 7.1 Preconditions

1. External deliverable provided manually to the operator.
2. Founder names the target filename from §2 (or assigns `<PACKET-SLUG>`).
3. Working tree otherwise clean for this lane (no unrelated dirty work mixed in).

### 7.2 Conversion steps (operator)

1. Copy conclusions into the target markdown **without strategic improvement**.
2. Fill metadata (§3).
3. Preserve epistemic labels (§4).
4. Add conversion fidelity notes (attachments omitted, formatting-only changes).
5. Run `git diff --check` on the new/changed docs.
6. Stop for founder review — **do not commit yet**.

### 7.3 Founder review checklist (required)

| Check | Pass criteria |
|-------|---------------|
| Fidelity | Material conclusions match the approved packet |
| Labels | PROVEN / INFERRED / UNKNOWN preserved |
| No invention | No new strategy, probabilities, or identity claims beyond source |
| Filename | Matches this plan |
| Citations | No governing doc cites absent sources |
| Scope | Docs-only; no production code / data mutation |
| Approval artifact | Founder records approval for **this exact file content** |

### 7.4 Approval artifact

Before commit, create or update a founder approval record under:

```
data/owner-decisions/<yyyy-mm-dd>-strategic-documentation-migration-<slug>-owner-approval-v1.json
```

Minimum fields:

- `contract`: `buckparts_strategic_documentation_migration_approval_v1`
- `target_rel_path`: e.g. `docs/BuckParts-GRAND-AUDIT-PHASE8-COMPANY-IDENTITY-V1.md`
- `source_deliverable_title`
- `decision_status`: `approved_for_commit` (or `rejected`)
- `content_fingerprint`: sha256 of the staged markdown body
- `approved_by` / `approved_at`
- `notes`

**Presence of an approval file does not auto-commit.** Founder must explicitly authorize the commit step in-session.

### 7.5 Commit rules

- Commit **only** when Jared explicitly asks.
- Prefer one lane / one source artifact per commit (or one approved batch with listed paths).
- Commit message should name the conversion, e.g. `Add Grand Audit Phase 8 company identity source`.
- Do not push unless explicitly asked.
- After commit (when asked), update HQ handoff only if founder requests operational stopping-point impact — identity sources are not automatic HQ rewrites.

### 7.6 Rejection / gap handling

If the packet is incomplete relative to the sections a later Identity doc will need:

- Still convert what exists **if** founder approves partial conversion, and mark gaps `UNKNOWN` in conversion fidelity notes — **or**
- Do not create the file (preferred when the packet cannot support a faithful source artifact).

Never fill gaps from chat history.

---

## 8. Suggested conversion order (process only)

Order is operational hygiene, not a claim that packets exist:

1. Documentation Architecture source (E), if provided — clarifies roles before apex authorship.  
2. Phase 5 → 6 → 7 source artifacts (A–C), as packets arrive.  
3. Phase 8 company identity source (D).  
4. Identity V1 governing doc (separate authorship).  
5. Strategy Doctrine V1 / OS V1 revision / Execution Playbook V1 as needed, citing committed sources.  

Skip any step whose packet has not been provided.

---

## 9. Success criteria for this plan

This plan is usable when:

- Operators know exact filenames and metadata.  
- No converted doc can be committed without founder approval + fingerprint.  
- Governing docs have a citation hierarchy that forbids citing absent Phase sources.  
- Epistemic labels cannot be silently altered during conversion.

---

## 10. Supersession log (this plan)

| Version | Date | Change | Approved by |
|---------|------|--------|-------------|
| V1 | 2026-08-05 | Initial Strategic Documentation Migration Plan — process only; no audit recreation | Pending founder review |
