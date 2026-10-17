# BuckParts Executive Runtime Reduction Audit v1

**Status:** Read-only audit. Does not mutate, dispatch, assign NBA, or redesign contracts.  
**Authority:** Subordinate to `docs/BuckParts-CONSTITUTION.md`. Does not weaken Outcome Join, OAR, or Evolution Gate.  
**Criterion (only):** *Does this materially help BuckParts run itself better?*  
**HEAD at audit:** `3bec942` (Executive Runtime v0 on this branch). Brain coverage already marks HQ as **DEPRECATED** for NBA (`scripts/lib/buckparts-brain-coverage-manifest-v1.ts`).  
**Not claimed:** Any deletion, merge, or archive in this document is a **recommendation**. Nothing is applied here.

Classifications:

| Label | Meaning |
|-------|---------|
| **KEEP** | Unique runtime capability; removing it would break a concrete behavior that still matters. |
| **MERGE** | Same capability already lives (or should live) in one surviving artifact; stop dual responsibility. |
| **ARCHIVE** | Historical / design / non-steering; keep on disk for audit; stop treating as runtime. |
| **DELETE** | No unique surviving need; only if the capability already exists elsewhere (named). |

Product/wedge factories (fridge apply-plans, manufacturer rescue, AP model-first) are **not** Executive organs. They are classified only when they claim Executive NBA/dispatch/Daily authority.

---

## PROVEN

- Command Center v2 type file names **121** `*_v1` fields (`scripts/lib/buckparts-command-center-v2-types.ts`).
- HQ handoff is **5438** lines. Brain coverage verdict for `hq_handoff_doc`: **DEPRECATED**, `canonical_source=.command_center_v2.canonical_final_operating_decision_v1`.
- Daily Operator **imports and rebuilds** Command Center (`scripts/report-buckparts-daily-operator.ts`).
- Founder digest is brain-coverage **BYPASSING** (standalone markdown of CC).
- Canonical final operating decision is the **sole owner-facing NBA + dispatch binding**; competing candidates and control-graph rollup are demoted `advisory_only`.
- Outcome Join is read-only; `steering_authority=false`; `nba_authority=false`.
- OAR (`data/owner-decisions/*.json`) is the **only** durable mutation-intent store; ODQ projects APPROVED from active OAR and does not replace it.
- Executive Runtime v0 wake succeeded: `cycle_status=OBSERVED_STOP`, `selected_work=null`, `dispatch_invoked=false`; HQ heading commit `9944e32` ≠ git HEAD.
- Three written loops already exist: `AGENTS.md` (agent mutation loop), Runtime Contract §7, Control Loop audit target loop. Control Loop recommended a **new** CC lane (`command_center_control_loop_summary_v1`) that Runtime Contract §0 forbids implementing.

## INFERRED

- Most CC `*_v1` lanes are wedge/product projections, not Executive selectors. They inflate Executive **reading** cost without changing what the company does next.
- Daily Operator + founder digest + owner dashboard + v0 + HQ are five founder-facing “what is going on?” surfaces over one CC build.
- Customer Reality six-pack (`scoreboard`, `steering_comparison`, `closure`, `authority_score`, `history`, `outcomes`) does not replace NBA (`replaces_next_best_action: false` in HQ). It does not currently close the Outcome Join loop.
- Opportunity registries (SEO / revenue / distribution) are planning examples and do not steer.

## UNKNOWN

- Whether Jared actually uses Daily vs Digest vs Dashboard as the daily entry point.
- Whether Runner production-mission cadence is still live vs one-shot Foundation v2 proof.
- Live Outcome Join handoff counts (v0 observed `UNKNOWN`).
- Whether any founder depends on HQ stopping-point prose as the NBA (code does not).

---

## EXECUTIVE SURFACE AREA TODAY

| Layer | What exists | Count / size (PROVEN) |
|-------|-------------|------------------------|
| Binding | Constitution, AGENTS, Evolution Gate | 3 docs |
| Observe / wake | Command Center, Daily Operator, founder digest, owner dashboard, Runtime v0 | 5 entrypoints |
| World model | `command_center_v2` lanes | **121** `*_v1` fields |
| Select | Canonical decision, issue registry TIER_0, demand-to-coverage, wedge completion director, customer-reality dry-run, HQ NBA prose, FAQ | ≥6 selectors; **one** is authoritative |
| Escalate / approve | ODQ, OAR, decision packets, execution packets, Codex review packets, batch owner packets | multiple packet types; **one** mutation store |
| Execute | CC dispatch runner (allowlist), Runner v1, Agent Contract, guarded `--apply` (outside Executive) | 3 Executive-adjacent + product apply |
| Learn / sense | Outcome Join, Decision/Demand/Coverage siblings, Precedent Clause, learning-outcomes insert plan, failure-pattern registry | Join is the sensory path; others mostly non-consuming |
| History / doctrine | HQ 5438 lines, Control Loop audit, ops-agent workflow (unimplemented), grand audits, identity, strategy notes | large; not runtime |

---

## ARTIFACT REDUCTION TABLE

| Artifact | Unique capability? | Already provided by | If removed tomorrow | Reduces founder work? | Improves autonomy? | Historical only? | Duplicated? | Class |
|----------|--------------------|---------------------|---------------------|-----------------------|--------------------|------------------|-------------|-------|
| **Constitution** | Yes — Trust Hierarchy, fail-closed public buy | Nothing else is binding | Agents could ship buy CTAs / invented fit | Yes (forbids bad work) | Yes (fail-closed) | No | No | **KEEP** |
| **AGENTS.md** | Yes — Discover→apply founder gates for coding agents | Runtime Contract is the Executive loop, not the git/apply loop | Agents could `--apply` without OAR | Yes | Yes (no autonomous apply) | No | Partial overlap with Runtime Contract | **KEEP** (agent loop, not Executive loop) |
| **Evolution Gate** | Yes — existence ≠ permission | Constitution states principle; Gate is the packet | New organs would claim NBA by merge | Yes | Yes (blocks accumulation) | No | No | **KEEP** |
| **Outcome Join** (`phase4_outcome_capture_v1`) | Yes — handoff from confident BUY `/go` | No other join of `page_slug`↔`model_slug` | Sensory path gone; false zeros return | Indirect (honest UNKNOWN) | Yes (measure reality) | No | No | **KEEP** |
| **Decision-Capture** | Yes — evidence-entered decision universe | Coverage is supply, not decisions | Outcome Join cannot qualify | Indirect | Yes (join substrate) | No | No | **KEEP** |
| **Demand-Capture** | Demand visibility; UNKNOWN not zero | GSC/search lanes overlap | Demand UNKNOWN would scatter | Weak | Weak | No | Partial vs GSC neurons | **KEEP** (instrumentation sibling; do not give NBA) |
| **Coverage scoreboard** | Supply / safe-path rollup | Census lanes overlap | Coverage NBA candidates lose a rollup | Weak | Weak | No | Partial | **KEEP** as census rollup, not Executive selector |
| **OAR** (`founder_decision_registry_v1`) | Yes — only mutation-intent store | Nothing | Guarded apply cannot authorize | Yes | Yes (human gate) | No | No | **KEEP** |
| **ODQ / ODR** | Yes — pending founder halt index | FAQ lists work but does not halt Runner | Runner/apply halt-to-founder breaks | Yes | Yes | No | FAQ is a cousin, not a substitute | **KEEP** |
| **Canonical final operating decision** | Yes — sole NBA + dispatch bind | Issue registry / demand-to-coverage **feed** it | Dispatch has no lawful command | Yes (one winner) | Yes | No | Competitors exist but are demoted | **KEEP** |
| **CC dispatch runner + allowlist** | Yes — execute READY allowlisted read-only commands | Runner is mission-shaped, not allowlist | `buckparts:command-center:run-dispatch` gone | Yes (when READY) | Yes (bounded) | No | Partial vs Runner | **KEEP** |
| **Command Center builder** | Yes — one machine world model | Daily/digest/v0 **consume** it | All observe paths fail | Yes if it is the only board | Yes | No | Consumers duplicate | **KEEP** (stop adding Executive lanes) |
| **Executive Runtime v0** | Yes — wake without Jared-supplied state (HEAD+HQ+CC refs) | CC does not record git HEAD vs HQ; Daily rebuilds CC | Founder must paste state into prompts again | Yes | Yes (wake) | No | Daily/digest overlap observe | **KEEP** |
| **Executive Runtime Contract** | Sequences existing parts | AGENTS + HQ + Control Loop also narrate loops | v0 loses written stage bounds | Weak | Weak | No | Loop text triplicated | **KEEP** (one Executive loop doc; do not add a fourth) |
| **Precedent Clause** | Drafting closed-OAR text; weights NONE | OAR files are the history | Drafts lose class history text only | Slight | No | No | Already attached to ODR/packets | **KEEP** (code already merged into ODR; not a separate runtime) |
| **Issue registry TIER_0** | Repair steering **into** canonical | Canonical consumes it | Stop-the-line / reaudit NBA lost | Yes | Yes | No | No | **KEEP** (candidate source, not a second NBA) |
| **Agent Contract** | Disk manifest/result; mutation false | Dispatch runner does not do external halt | `EXTERNAL_AGENT_REQUIRED` loop breaks | Yes | Yes | No | No | **KEEP** |
| **Guarded apply executors** | Product mutation after OAR | Not an Executive organ | No CSV/Supabase apply | Yes | Yes (bounded) | No | No | **KEEP** (product, outside Executive dispatch) |
| **Founder Action Queue** | Prioritized founder rows from CC | Canonical `next_best_action` + ODQ pending | Digest/dashboard lose a table; **selection still exists** | No (another list) | No | No | **Yes** vs canonical + ODQ | **MERGE** into canonical winner display + ODQ pending |
| **Founder decision packets** | Human wrap of FAQ row class | FAQ + ODQ + digest | Copy/paste packets vanish; decisions still in OAR/ODQ | Weak | No | No | **Yes** vs ODQ/OAR | **MERGE** into ODQ/OAR (packets remain optional formatter, not a queue) |
| **Founder execution packets / next-execution-packet** | Agent work wrap | Dispatch allowlist + Agent Contract | Extra packet CLIs fail; dispatch/Runner remain | Weak | No | No | **Yes** vs dispatch/Agent Contract | **MERGE** into dispatch + Agent Contract |
| **Daily Operator** | Human daily report; rebuilds CC; adds coverage-opportunity ranking + Top-of-Game | CC + v0 | Cron human report gone; CC still runs | No (second board) | No | No | **Yes** vs CC (PROVEN import) | **MERGE** unique Daily sections into CC; schedule should wake v0/CC not a second world model |
| **Founder digest** | Markdown copy/paste of CC | CC JSON + v0 | Email/Slack paste gone | Yes (one human format) | No | No | Partial vs Daily | **KEEP** as **the** human formatter; do not keep Daily as a peer formatter |
| **Owner dashboard** | Interactive CC display | CC JSON | UI gone; CLI remains | Yes | No | No | Partial vs digest | **KEEP** (display, not a second brain) |
| **HQ Handoff** | Stopping-point prose + 5000+ lines of prior lanes | Canonical NBA; v0 already records HQ≠HEAD | Agents lose a narrative file; **NBA still in CC** | No (stale NBA; brain coverage DEPRECATED) | No | **Mostly yes** | **Yes** vs canonical | **ARCHIVE** historical sections; **KEEP** file as audit log only — never NBA |
| **Competing steering candidates** | Debug list of NBA losers | Same module as canonical | Debugging harder; winner remains | No | No | No | Same file as canonical | **KEEP** (inside canonical module; not a separate organ) |
| **Control-graph rollup NBA** | Advisory NBA | Canonical (explicitly demoted) | Advisory field gone | No | No | No | **Yes** | **MERGE** into competing-candidates / stop exposing a second NBA |
| **Wedge completion director** | Another next-best-action from evaluator | Canonical precedence | Wedge-specific NBA string gone; evaluator can remain | No | No | No | **Yes** if it bypasses canonical | **MERGE** evaluator output **into** canonical candidates; director must not be a second NBA |
| **Customer Reality 6-pack** | Dry-run “were we right?” | Outcome Join is the sensory path | Customer-authority scores gone; Join remains | No | No (does not steer) | Partial | **Yes** vs Outcome Join intent | **ARCHIVE** until Join is routinely PROVEN; do not give NBA |
| **Opportunity registries** (SEO/revenue/distribution) | Example planning lists | Issue registry + demand-to-coverage | Example rows gone | No | No | Yes (starters) | **Yes** vs issue/demand | **ARCHIVE** (HQ: do not wire to NBA) |
| **Truth Integrity Registry lane** | Truth-debt ledger; `steering_override_active: false` | Constitution + browser-truth gates | Ledger gone; buy gates remain | No | No | Partial | Partial | **ARCHIVE** as ledger; do not Executive-steer |
| **Failure-pattern registry** | Digest-only patterns | OAR / learning outcomes | Digest section gone | No | No | Partial | Partial | **ARCHIVE** |
| **Learning-outcomes insert plan** | Owner-review DB insert plan | OAR + guarded writers | LO inserts need another path | Weak | No | No | No | **KEEP** as owner-review writer, not Executive selector |
| **Ops-agent workflow doc** | Unimplemented Mission Control packets | CC + Agent Contract + Cursor | Nothing fails (not implemented) | No | No | Design-only | **Yes** vs Runtime Contract | **ARCHIVE** |
| **Control Loop audit** | 2026-06-23 distance-to-loop; recommends **new** CC lane | Runtime Contract forbids that lane | Audit file gone | No | No | **Yes** | Loop #3 | **ARCHIVE**; **DELETE** the recommendation to add `command_center_control_loop_summary_v1` (capability already: CC rebuild + v0). Do not delete the audit file without ARCHIVE. |
| **Semi-cruise / Layer-6 readiness** | Observational “away” / autonomy labels | Canonical `operator_can_be_away_status`; Layer 6 NOT_PROVEN | Labels gone; gates remain | No | No | Theater | Partial | **ARCHIVE** |
| **Agent control plane** | Permissioned job list | Dispatch allowlist + issue registry | Extra job list gone | No | No | Partial | **Yes** | **MERGE** jobs into dispatch allowlist / issue registry |
| **Runner v1 + production mission** | Mission orchestration; one proven lifecycle | Dispatch for allowlisted reports; guarded apply for mutation | Mission JSON/history gone | Unknown usage | Weak | Production mission **one-shot** (INFERRED) | Partial vs dispatch | **ARCHIVE** production-mission as proof; **KEEP** Runner only if missions still run (UNKNOWN → treat as ARCHIVE until a second live run is PROVEN) |
| **Operations metrics** | Duration/throughput | Runner artifacts | Metrics JSON gone | No | Weak | No | No | **KEEP** as measurement, not selector |
| **Brain coverage manifest** | Map of CC vs bypassing scripts | Operating map | Duplicate/bypass labels gone | Slight | No | No | Partial vs operating map | **MERGE** into operating map or KEEP as CC’s own coverage map — not an Executive organ |
| **Operating map / script classification** | Inventory of scripts | package.json | Human inventory gone | Slight | No | No | Partial | **KEEP** as inventory (not runtime) |
| **JSON stdout contract** | How to parse CLI JSON | Nothing | `npm run \| jq` footguns return | Yes | Yes | No | No | **KEEP** |
| **Authority-boundary strategy note / TO-authority thesis / governed-truth-engine / identity / grand audits / foundation completion / strategic migration** | Narrative | Constitution + ARCHITECTURE + this audit | Strategy reading gone; runtime unchanged | No | No | **Yes** | **Yes** | **ARCHIVE** |
| **Cursor inbox** | Founder/agent inbox | HQ / GitHub | Inbox file gone | Unknown | No | Unknown | Partial | **ARCHIVE** unless actively used (UNKNOWN) |
| **Certainty engine checklist / operator process compression / external quality usefulness** | Extra CC checklists | Ship guard + CC | Checklists gone | Weak | No | Partial | Partial | **ARCHIVE** as CC fields; not Executive selectors |
| **RPWFE / AP demand-selected / manufacturer factory CC lanes** | Product operating projections | Canonical may consume some as candidates | Those wedge reports gone | Product yes | Product yes | No | N/A (product) | **KEEP** as **product lanes**, not Executive surface — do not mint parallel NBA |
| **Decision Priors** (Precedent optional fields) | Labels-only if present | Precedent weights NONE | Labels gone | No | No | Parked / zero authority | Partial | **ARCHIVE** / do not promote (Evolution Gate) |

**DELETE (only where survivor is named):**

| Delete recommendation | Survivor |
|-----------------------|----------|
| Do **not** implement `command_center_control_loop_summary_v1` | Command Center rebuild + Runtime v0 already observe→emit |
| Stop emitting a **second** owner-facing NBA from control-graph rollup / wedge director / customer dry-run | `canonical_final_operating_decision_v1` |
| Stop using HQ stopping-point as operational NBA | Canonical + v0 HEAD/HQ compare |
| Stop Daily Operator as a second world-model build | CC + v0; move any unique Daily ranking into CC then drop the second builder |

No Constitution, Outcome Join, OAR, ODQ, canonical decision, dispatch allowlist, AGENTS, or Evolution Gate is recommended for deletion.

---

## EXECUTIVE RUNTIME AFTER REDUCTION

One loop. Existing artifacts only.

```
WAKE     Runtime v0
OBSERVE  Command Center (includes Outcome Join, Decision/Demand/Coverage)
SELECT   canonical_final_operating_decision_v1
           ← candidates: issue registry, demand-to-coverage, product-lane READY states
ESCALATE ODQ → founder
APPROVE  OAR
EXECUTE  allowlisted dispatch (read-only) OR AGENTS + guarded apply (mutation)
LEARN    Outcome Join (non-steering) + closed OARs (Precedent text on drafts)
GATE     Evolution Gate before any new permission
BIND     Constitution
```

**Stop being Executive:** Daily as second board; HQ as NBA; FAQ as second selector; packet zoo as queues; customer-reality 6-pack; opportunity registries; unimplemented ops-agent; control-loop new lane; Layer-6/semi-cruise theater.

**Remain as product, not Executive:** fridge/AP/WHW/manufacturer factory lanes, guarded apply, browser proof.

---

## WHAT THE EXECUTIVE WOULD DO BETTER

- One wake (v0) reconstructs state without a founder-written brief.
- One board (CC) and one NBA (canonical). Dispatch cannot shop for a friendlier lane.
- Founder work concentrates on ODQ/OAR, not reconciling HQ vs Daily vs digest vs FAQ vs control-graph.
- Outcome Join stays the sensory path; it does not get buried under six non-steering customer-authority scores.
- Surface area stops growing: Evolution Gate + this table are the default **no** to new organs.

---

## WHAT CAPABILITY WOULD BE LOST (if any)

| If recommendation applied | Lost | Not lost |
|---------------------------|------|----------|
| MERGE Daily into CC/v0 | A second JSON shape and a second CC rebuild | Observe, Top-of-Game **if** those fields are moved into CC first |
| ARCHIVE HQ historical NBA | Agents treating HQ as HEAD | Audit history of past lanes; canonical NBA |
| MERGE FAQ into canonical+ODQ | A 3–7 row digest table unless digest still prints canonical+pending ODR | Lawful selection |
| ARCHIVE Customer Reality 6-pack | Dry-run customer-vs-factory comparison UI | Outcome Join; factory NBA |
| ARCHIVE opportunity registries | Example SEO/revenue/distribution lists | Issue registry + demand-to-coverage |
| ARCHIVE Runner/production-mission | One-shot lifecycle souvenir (if unused) | Dispatch + guarded apply |
| Never build control-loop CC lane | A sixth observe rollup | v0 + CC |

**Not lost (forbidden to lose):** Constitution, authority separation (OAR ≠ ODQ ≠ dispatch), auditability (OAR/ODQ/dispatch artifacts), Outcome Join.

---

## SMALLEST NEXT IMPLEMENTATION

Do **not** implement Runtime Contract stages 4.2–4.9.  
Do **not** add Command Center lanes.  
Do **not** wire Outcome Join to NBA.

**Smallest merge that improves self-running (existing code only):**

1. Treat `canonical_final_operating_decision_v1` as the only owner-facing NBA (already true in code; stop documenting HQ/Daily/control-graph as peers).
2. Point any scheduled “what is the company doing?” job at **existing** `node --import tsx scripts/run-buckparts-executive-runtime-wake-observe-v0.ts` (and/or CC), not a second world-model builder.
3. Before deleting Daily Operator, **move** any unique Daily fields (`next_coverage_opportunities`, Top-of-Game statuses) into the existing CC report — then Daily is a formatter, not a board.

That is a reduction of dual observe responsibility. It is not a new organ.

---

## Validation (this audit)

```bash
test -f docs/BuckParts-EXECUTIVE-RUNTIME-REDUCTION-AUDIT-V1.md
grep -n "ARTIFACT REDUCTION TABLE" docs/BuckParts-EXECUTIVE-RUNTIME-REDUCTION-AUDIT-V1.md
grep -n "SMALLEST NEXT IMPLEMENTATION" docs/BuckParts-EXECUTIVE-RUNTIME-REDUCTION-AUDIT-V1.md
grep -n "KEEP" docs/BuckParts-EXECUTIVE-RUNTIME-REDUCTION-AUDIT-V1.md | head
```
