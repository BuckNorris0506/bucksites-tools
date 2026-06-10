# BuckParts Strategic Initiatives Registry

**Document ID:** BP-STRATEGIC-INITIATIVES-REGISTRY
**Location:** `docs/strategic-initiatives/BP-STRATEGIC-INITIATIVES-REGISTRY.md`
**Status:** Durable registry — preserve across handoffs

---

## Purpose

This registry preserves the long-term strategic capabilities that could fundamentally change what BuckParts becomes.

These are:

- **NOT** roadmap items.
- **NOT** active projects.
- **NOT** implementation tasks.

Nothing in this document authorizes work. No initiative here may be started, scoped, or built without an explicit founder decision to activate it. Until then, every initiative is parked.

Each entry preserves the complete strategic context, rationale, future vision, and activation criteria so that any future agent or operator can pick up the thread without losing the original intent.

### Registry rules

1. Initiatives are identified by a stable ID (`BP-SI-NNN`). IDs are never reused or renumbered.
2. Initiatives are never deleted — if abandoned, mark status `RETIRED` with rationale and keep the entry.
3. This registry does not mutate runtime code, pages, product data, CSVs, Supabase, retailer links, evidence, sitemap, robots, or deployment systems. It is documentation only.
4. Activation of any initiative requires an explicit founder decision (record it in `docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`).

### Status vocabulary

| Status | Meaning |
|--------|---------|
| `PARKED / FUTURE FOUNDATION` | Not active; expected to become a foundational proprietary asset when activated. |
| `PARKED / STRATEGIC` | Not active; strategically significant long-term capability. |
| `PARKED / MOONSHOT` | Not active; high-ambition, high-uncertainty bet. |
| `PARKED / HIGH UPSIDE` | Not active; outsized upside if the enabling technology matures. |
| `RETIRED` | Permanently abandoned; entry retained for history. |

---

## Initiative Index

| ID | Initiative | Status |
|----|------------|--------|
| [BP-SI-001](#bp-si-001--buckresearch-agent) | BuckResearch Agent | PARKED / FUTURE FOUNDATION |
| [BP-SI-002](#bp-si-002--appliance-failure-database) | Appliance Failure Database | PARKED / STRATEGIC |
| [BP-SI-003](#bp-si-003--visual-home-repair-ai) | Visual Home Repair AI | PARKED / STRATEGIC |
| [BP-SI-004](#bp-si-004--digital-twin-of-the-home) | Digital Twin of the Home | PARKED / STRATEGIC |
| [BP-SI-005](#bp-si-005--homeowner-memory-system) | Homeowner Memory System | PARKED / STRATEGIC |
| [BP-SI-006](#bp-si-006--failure-prediction-network) | Failure Prediction Network | PARKED / MOONSHOT |
| [BP-SI-007](#bp-si-007--buckparts-scanner) | BuckParts Scanner | PARKED / HIGH UPSIDE |
| [BP-SI-008](#bp-si-008--home-repair-operating-system) | Home Repair Operating System | PARKED / MOONSHOT (capstone) |

---

## BP-SI-001 — BuckResearch Agent

**Status:** PARKED / FUTURE FOUNDATION

### Current State

BuckParts currently depends heavily on HyperAgent and external discovery systems to find compatibility evidence.

### Vision

Build a BuckParts-specific research and evidence-discovery agent capable of executing Mission Factory discovery missions using BuckParts trust standards.

### Capabilities

- OEM evidence discovery
- Parts-diagram analysis
- Compatibility contradiction detection
- Wrong-part detection
- Confidence scoring
- Evidence packet generation
- Mission Factory execution

### Why It Matters

BuckParts' long-term moat is discovering trustworthy compatibility truth faster than competitors.

HyperAgent is a tool.
BuckResearch would be a proprietary asset.

### Future Outcome

BuckParts owns its discovery engine rather than renting it.

### Activation Criteria

- Explicit founder decision to activate.
- Mission Factory discovery mission patterns are stable and well-characterized enough to encode into an in-house agent.
- The cost, rate limits, or capability ceiling of rented discovery (HyperAgent / external systems) demonstrably constrains BuckParts' evidence throughput or trust standards.
- BuckParts trust standards (confidence scoring, evidence packet contracts, contradiction detection) are codified well enough to serve as the agent's specification.

---

## BP-SI-002 — Appliance Failure Database

**Status:** PARKED / STRATEGIC

### Vision

Build the world's most trustworthy appliance failure database.

Track:

- appliance lifespan
- common failures
- first symptoms
- repair cost
- replacement cost
- failure frequency

### Future Outcome

BuckParts predicts failures before they happen.

Example:

> "Your refrigerator is entering a high-risk failure window. Here are the first warning signs."

BuckParts becomes a prediction platform rather than a parts lookup platform.

### Activation Criteria

- Explicit founder decision to activate.
- BuckParts has a reliable, trusted appliance/model identity layer to attach failure data to.
- A credible sourcing strategy exists for failure data that meets BuckParts trust standards (no low-confidence scraped noise presented as truth).
- The compatibility truth engine is mature enough that failure intelligence extends — rather than dilutes — the trust brand.

---

## BP-SI-003 — Visual Home Repair AI

**Status:** PARKED / STRATEGIC

### Vision

Users upload:

- appliance labels
- broken parts
- filters
- leaks
- photos
- videos

BuckParts identifies likely issues and recommends next actions.

Example:

> "This appears to be a failed drain pump."
>
> "Don't buy anything yet."

### Future Outcome

BuckParts becomes the doctor for broken stuff.

### Activation Criteria

- Explicit founder decision to activate.
- Vision-model accuracy on appliance/part identification is good enough to meet BuckParts wrong-part-prevention standards (a wrong visual diagnosis is worse than no diagnosis).
- Diagnosis outputs can carry honest confidence scoring and "don't buy anything yet" guardrails consistent with the Customer UX Doctrine.
- A clear handoff path exists from visual diagnosis into validated compatibility answers.

---

## BP-SI-004 — Digital Twin of the Home

**Status:** PARKED / STRATEGIC

### Vision

BuckParts maintains a living model of a homeowner's house.

Track:

- refrigerators
- HVAC systems
- water filters
- vacuums
- air purifiers
- maintenance schedules

### Future Outcome

BuckParts becomes proactive.

Instead of:

> "What filter do I need?"

BuckParts says:

> "Your filter expires in 18 days."

### Activation Criteria

- Explicit founder decision to activate.
- User accounts / persistent homeowner identity exist (prerequisite shared with BP-SI-005).
- Maintenance-interval truth (e.g., filter replacement cadence) is available at BuckParts trust standards for the tracked appliance categories.
- Proactive notifications have a delivery channel users have opted into.

---

## BP-SI-005 — Homeowner Memory System

**Status:** PARKED / STRATEGIC

### Vision

BuckParts stores:

- manuals
- receipts
- model numbers
- installed parts
- maintenance history
- repair history

### Future Outcome

BuckParts remembers everything homeowners forget.

Years later:

> "What refrigerator filter do I use?"

BuckParts already knows.

### Activation Criteria

- Explicit founder decision to activate.
- User accounts and durable, private per-homeowner storage exist.
- Data privacy, retention, and export posture is defined (homeowner memory is personal data, not catalog data).
- Stored memory can be joined against the compatibility truth engine so recalled model numbers resolve to validated answers.

---

## BP-SI-006 — Failure Prediction Network

**Status:** PARKED / MOONSHOT

### Vision

Aggregate:

- repair reports
- Reddit discussions
- forums
- service bulletins
- warranty complaints
- repair videos

### Future Outcome

BuckParts becomes a Consumer Reports-style repairability and failure prediction platform.

Not:

> "What fits?"

But:

> "What is most likely to fail?"

### Activation Criteria

- Explicit founder decision to activate.
- BP-SI-002 (Appliance Failure Database) provides the structured backbone this network aggregates into.
- A discovery/aggregation engine exists that can ingest unstructured community and OEM sources at scale (natural fit with BP-SI-001 BuckResearch Agent).
- Methodology for separating signal from anecdote is defined — predictions must be defensible at Consumer Reports-level credibility, not vibes.

---

## BP-SI-007 — BuckParts Scanner

**Status:** PARKED / HIGH UPSIDE

### Vision

Point a phone camera at:

- appliance labels
- installed filters
- refrigerators
- vacuums
- air purifiers

BuckParts identifies:

- model
- installed part
- replacement part
- confidence score
- supporting evidence

### Future Outcome

Zero-typing home repair assistance.

### Activation Criteria

- Explicit founder decision to activate.
- On-device or hosted vision recognition reaches accuracy that supports honest confidence scores on model/part identification.
- Every scanner answer can be backed by the same evidence and confidence standards as typed lookups — the scanner is an input method, not a trust shortcut.
- The model → installed part → replacement part resolution path is fully served by the existing compatibility truth engine.

---

## BP-SI-008 — Home Repair Operating System

**Status:** PARKED / MOONSHOT (capstone — composes BP-SI-001 through BP-SI-007)

### Vision

Combine:

- BuckResearch Agent (BP-SI-001)
- Visual Home Repair AI (BP-SI-003)
- Digital Twin (BP-SI-004)
- Homeowner Memory System (BP-SI-005)
- Appliance Failure Database (BP-SI-002)
- Failure Prediction Network (BP-SI-006)
- BuckParts Scanner (BP-SI-007)

### Future Outcome

BuckParts no longer competes primarily with parts sites.

BuckParts becomes:

> "The Operating System For Home Maintenance."

### Activation Criteria

- Explicit founder decision to activate.
- This is a capstone initiative: it activates only after multiple constituent initiatives (BP-SI-001 – BP-SI-007) are live and proven individually.
- The composition creates emergent value beyond the sum of the parts (shared identity, shared evidence, shared homeowner context).

---

## Why These Matter

BuckParts today is building the **truth engine** underneath these future capabilities:

- compatibility validation
- wrong-part prevention
- evidence systems
- trust systems
- Mission Factory
- repair validation

Every initiative in this registry assumes that foundation. A failure database without trustworthy evidence standards is noise. A scanner without compatibility validation is a wrong-part machine. A home operating system without trust systems is a liability.

These initiatives represent **possible long-term destinations** built on top of that foundation. The current work — validating compatibility, preventing wrong parts, building evidence and trust systems, running the Mission Factory, validating repairs — is not a detour from these visions. It is the prerequisite for all of them.

None of these initiatives are active. The active work remains whatever the HQ handoff (`docs/BuckParts-HQ-HANDOFF.md`) says it is.
