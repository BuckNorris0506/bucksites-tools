# BuckParts Product Addition — Model-First Contract

**Status:** **PROVEN** normative contract for all future BuckParts product addition.  
**Scope:** New catalog rows, compatibility mappings, retailer links, buy paths, and public surfaces — every wedge.

**Not covered here:** Legacy inventory triage, historical batch artifacts, or founder-approved exceptions documented in the decision registry.

---

## Required workflow

Every **new** product addition must start from the **owned appliance model** (official model/support/manual page), not from an invented internal filter/part slug.

**Required chain:**

1. **Appliance model** — official model/support/manual evidence for the unit the homeowner owns.
2. **Official replacement part / filter / bag** — manufacturer token or product name on official pages.
3. **Group by official replacement** — catalog identity and compat rows keyed to that official token/name (internal slugs are secondary labels only).
4. **Safe buy path** — read-only browser proof first; exact token on official PDP where required; mapping review when anchor slug ≠ official token.

**Steering (read-only, air purifier):**

- `npx tsx scripts/report-ap-model-first-evidence-queue-v1.ts`
- `npx tsx scripts/report-air-purifier-model-first-evidence-v1.ts --anchor-filter-slug <slug>` (no `--write` without founder approval)

Committed evidence artifacts: `data/air-purifier/batch-production/agent-results-model-first-v1/`.

---

## Deprecated for new product addition

Do **not** use as the primary workflow for new products:

**Internal BuckParts filter/part slug → OEM search or buy URL → infer fit from CSV compat alone.**

This filter-first / slug-first path caused mapping-review failures when internal labels did not match manufacturer naming.

---

## Mapping-review examples (PROVEN)

| BuckParts anchor | Official manufacturer naming (not anchor token) |
|------------------|--------------------------------------------------|
| `shark-carbon-foam` | Shark HE1FKBAS / HE1FKPET — not SHARK-CARBON-FOAM |
| `levoit-rf-rar029` | Levoit Core 300-P-RF / Core 300-RF — not RAR029 |
| `rabbit-carbon-minusa2` | Rabbit Air MinusA2 Charcoal-Based Activated Carbon Filter — not RABBIT-CARBON-MA2 |

---

## Hard gates

Until the **official replacement token or name** is proven on manufacturer pages (and mapping review is cleared where required):

- No **CSV** apply
- No **retailer_links** mutation
- No **buy-link** promotion
- No **public page** change that implies a safe direct-buy path

Production gates remain: `src/lib/retailers/launch-buy-links.ts`, `src/lib/retailers/go-redirect-gate.ts`.

---

## Legacy filter-first artifacts

Old filter-first batch lane docs, agent packets (`ap-oem-search-placeholder-v1`, etc.), and committed `agent-results*` JSON may remain **only** as:

- **Historical evidence**, or
- **Legacy read-only triage**

They are **not** the default playbook for new product addition unless Jared explicitly approves an exception.

See deprecation banners on:

- `docs/AIR-PURIFIER-BATCH-PRODUCTION-LANE-V1.md`
- `docs/AIR-PURIFIER-AGENT-PACKETS-V1.md`
- `docs/AIR-PURIFIER-AGENT-RESULTS-AGGREGATOR-V1.md`

---

## Navigation

- **Truth map index:** `docs/BuckParts-TRUTH-MAP.md` (Policy Truth)
- **HQ handoff:** `docs/BuckParts-HQ-HANDOFF.md` — migration/context only; **not** this contract
