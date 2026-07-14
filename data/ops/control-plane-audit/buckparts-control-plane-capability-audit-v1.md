# BuckParts control-plane capability audit v1

**Contract:** `buckparts_control_plane_capability_audit_v1`  
**HEAD / origin/main:** `0fa284f`  
**Mode:** read-only · no new runner · no protected mutations  

## Executive verdict

**Maturity score: 3** — system can classify lane state (in islands), but cannot automatically execute the next safe read-only stage for the live GE MWFP/XWFE product lane.

| Score | Meaning | Status |
|---:|---|---|
| 0–1 | No pieces / isolated scripts only | Exceeded (**234** `buckparts:*` scripts) |
| 2 | CC/ledgers know state | **PROVEN** |
| 3 | Classify lane state | **PROVEN in islands** (CC NBA, manufacturer-rescue stages, batch `exact_command`) |
| 4 | Auto-execute next read-only stage | **NOT PROVEN** for GE fridge-model-pdp |
| 5 | Run until founder hard stop | **PROVEN only inside Runner missions** (not GE PDP sync) |
| 6 | Post-approval guarded writes + closeout + proof + CC/HQ | **NOT PROVEN** as autopilot |

### Why Jared still manually prompts each lane

1. Each GE stage is a separate npm script with **no post-success auto-invoke**.
2. Root `next_best_action` policy optimizes Amazon/affiliate/Waterdrop queues — **not** GE filter PDP Supabase drift.
3. Manufacturer-rescue runner is a **parallel** control plane and was not advanced by the fridge-model-pdp CSV apply.
4. HQ handoff has **no automated writer** (freshness test only).
5. The next GE stage — **Supabase sync owner-review** — **does not exist as an npm script yet**.

---

## A. Inventory (control-plane critical)

| Path | Script | Category | Behavior | Usefulness |
|---|---|---|---|---|
| `scripts/report-buckparts-command-center.ts` + `buckparts-command-center-v2*` | `buckparts:command-center` | State + CC compose + NBA host | Live RO compose | **strong_reuse** |
| `scripts/lib/buckparts-command-center-next-best-action-v1.ts` | (via CC) | Next-stage text | RO policy | **strong** (GE-blind today) |
| `src/lib/owner-dashboard/load-command-center-report.ts` | UI | Visibility | Loader | **strong_reuse** |
| `scripts/lib/buckparts-mcp-control-plane-v1.ts` | `mcp:buckparts-truth` | Projection | RO | **strong_reuse** |
| `scripts/lib/buckparts-runner-v1.ts` | `buckparts:runner` | Orchestrated RO exec + hard stop | Runner artifacts; `HALTED_APPROVAL_REQUIRED` | **strong** (missions ≠ GE PDP) |
| `scripts/buckparts-runner-step.ts` | `buckparts:runner-step` | Single step | Allowlisted npm | **strong_reuse** |
| CC dispatch runner | `buckparts:command-center:run-dispatch` | One allowlisted command | Writes `dispatch-runs`; refuses apply/CSV/push | **strong smallest auto-exec bridge** |
| `buckparts-batch-production-operating-dispatch-v1.ts` | (via CC) | `exact_command` | RO | **strong** (batch, not GE filter) |
| `buckparts-execution-ledger-v1.ts` | `buckparts:execution-ledger` | Ledger index | Writes index JSON only | **strong_reuse** |
| Issue registry + `data/command-center/issues/` | (via CC) | Issue lifecycle | RO loader | **strong_reuse** |
| `fridge-truth-spine-v1.ts` | (via CC) | Fridge state rollup | RO | **strong candidate to surface GE drift** |
| Ship Guard | `buckparts:ship-guard` | Protected + push readiness | RO; never push | **strong_reuse** |
| Credit Control | `buckparts:credit-control` | Deploy/credit | RO (+ ops artifacts) | **strong_reuse** |
| Deploy classifier / `deploy:preflight` | matching scripts | Deploy gates | Enforce / classify | **strong_reuse** |
| Wedge completion director/evaluator | matching scripts | Lane ranking | RO | **strong_reuse** |
| HyperAgent orchestrator v0 + queue/registry | matching scripts | Single-iteration dispatch | Outbox only | **strong_reuse** |
| Mission factory trio | matching scripts | Mission registry | External agent | **strong_reuse** |
| Manufacturer rescue orchestrator/director/runner | matching scripts | Stage board | Drafts; no apply | **strong parallel CP** |
| Manufacturer rescue guarded-apply bridge | matching script | Apply bridge | Flag-gated | **strong_reuse** |
| Universal batch lifecycle + CSV executor | matching scripts | Guarded lifecycle | Default dry-run | **strong_reuse** |
| `fridge-retailer-links-scoped-supabase-parity-core-v1.ts` | via wrappers | Parity/sync pattern | MUTATION gate | **strong for GE Supabase sync** |
| CTA/go + live HTML proof packs | matching scripts | Post-apply / live proof | RO drafts | **strong_reuse** |
| GE MWFP/XWFE stage kit | see §C | Full manual stage kit | Human-invoked | **strong kit / weak wiring** |
| Next-execution-packet / founder-digest | matching scripts | Human prompts | Print | **strong for manual loop** |
| `docs/BuckParts-HQ-HANDOFF.md` | none | HQ | Manual | **narrate_only** |
| `data/control-plane/command-center-control-loop-v1.audit.json` | none | Prior audit | Static | **stale narrative** |
| `AGENTS.md` + Constitution | none | Policy | Binding | **not an executor** |

**Scale (PROVEN):** 234 `buckparts:*` scripts · 19 owner-review · 17 guarded-apply · 20 proof · 10 parity · 6 director · 5 runner · 4 orchestrator.

---

## B. Capability matrix (summary)

| Capability | Exists? | Auto today? | Missing wiring | Reuse? |
|---|---|---|---|---|
| State detection | Yes (CC, spines, proofs) | On invoke | GE not first-class lifecycle | Yes |
| Lane selection | Yes (NBA, wedge, rescue) | Recommend only | NBA ignores GE sync | Yes |
| Next-stage decision | Yes (`exact_command`, recommended_next) | No for GE | Text ≠ dispatch | Yes |
| Read-only proof exec | Yes | If invoked | No stage chaining | Yes |
| Owner proof collection | Yes | No | Human screenshots | Yes |
| Owner-review plan gen | Yes (19 scripts) | No | **GE Supabase sync owner-review missing** | Yes |
| Founder approval gen | Yes | No | Never auto-approve | Yes |
| Guarded apply | Yes (17+) | No | Explicit `--write` + approvals | Yes (hard stop before write) |
| Closeout | Yes | On apply success | Not for unread stages | Yes |
| Post-apply proof | Yes | No | Manual re-run | Yes |
| Live proof | Yes | No | Deploy-gated | Yes |
| CC update | Yes (live recompute) | On invoke | Persist archive UNKNOWN | Yes |
| HQ handoff update | Doc + freshness test | **No** | No writer | Not yet |
| Validation gates | Yes | On invoke / runner | Not after every stage | Yes |
| Protected mutation guard | Yes | Fail-closed default | — | Yes |
| Deploy/credit guard | Yes | On invoke | No spend | Yes |
| Commit/push readiness | Ship Guard | On invoke | Never auto-push | Yes |

---

## C. GE MWFP/XWFE lane replay

**Live state at `0fa284f` (PROVEN):** CSV applied · Supabase **DRIFTED** (search placeholders) · CTA/go **PASS 21 / FAIL 7** · pages **not** closed · next safe = **Supabase sync owner-review (not write)**.

| # | Stage | npm | Auto next? |
|---|---|---|---|
| 1 | Owner browser proof collection | `…owner-browser-proof-collection-packet` | No |
| 2 | Owner browser proof result | `…owner-browser-proof-result-packet` | **No ← first chain break** |
| 3 | Apply plan owner-review | `…ge-closable-mwfp-xwfe-apply-plan-owner-review` | No |
| 4 | Founder approval | `…ge-mwfp-xwfe-retailer-links-owner-approval` | No (`apply_authorized=false`) |
| 5 | Guarded CSV apply + closeout | `…guarded-apply -- --write` | No (closeout only with successful write) |
| 6 | Supabase parity proof | `…supabase-parity` → **DRIFTED** | No |
| 7 | CTA/go re-proof | `…cta-go-link-proof-pack` | No |

**First automation break:** after owner browser **result**, Jared must manually start the apply-plan owner-review.

**Current HEAD forward break:** after parity **DRIFTED**, Jared must manually create/run a **Supabase sync owner-review** lane that does not exist yet.

**CC surface:** founder decision file exists; queue id is a string only; **no** dedicated CC issue; HQ stopping point does **not** yet feature this lane; Ship Guard has closeout allowance module.

---

## D. Maturity score evidence

- **≥2 PROVEN:** Command Center, execution ledger, issue registry, credit-control ops.
- **≥3 PROVEN (islands):** manufacturer-rescue stages; batch `exact_command`; wedge director; CC NBA.
- **≠4 for GE:** discrete human npm invokes; parity does not spawn sync owner-review.
- **Runner = local 5:** halts at `FOUNDER_APPROVAL_REQUIRED` / `HALTED_APPROVAL_REQUIRED` — missions do not cover GE retailer_links sync.
- **≠6:** AGENTS forbids autonomous apply; HQ not auto-updated.

---

## E. Smallest path to operational “next safe step”

**Goal:** From DRIFTED, generate the next **read-only** Supabase sync **owner-review** and hard-stop before write.

1. **Extend**
   - `fridge-truth-spine-v1.ts` — surface GE parity DRIFTED from existing artifact
   - Batch operating dispatch **or** thin next-stage classifier → emit `exact_command`
   - Reuse `fridge-retailer-links-scoped-supabase-parity-core-v1.ts`
   - Clone pattern from EDR4 / GE apply-plan **owner-review** (not apply)
2. **New (unavoidable)**
   - `buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review-v1` lib + report + test + drafts
3. **Owner-facing command**
   - `npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review -- --write-artifacts`
4. **Optional auto bridge**
   - Put that command on a READY CC dispatch → `npm run buckparts:command-center:run-dispatch`
5. **Hard stop**
   - Refuse `--write` / `BUCKPARTS_IO_CAPABILITY=MUTATION` / Supabase apply in this stage
6. **Current-state behavior**
   - Plan updates for exactly `smartwater-mwfp` + `xwfe` to official GE PDP URLs + `direct_buyable`
   - Recommend separate founder approval packet; **do not** claim 4 pages closed

---

## F. What NOT to build

- Greenfield Runner/OS reimplementing Command Center
- Second NBA engine
- Second retailer_links parity core
- Autonomous apply loop (violates AGENTS/Constitution)
- Cloned manufacturer-rescue board for this GE lane
- HQ rewrite bot without a deliberate contract
- New Ship Guard / Credit Control systems

---

## Answers (short)

1. **Exist:** CC, runner, dispatch, ledgers, registries, directors, factories, orchestrators, guarded-apply kit, proof/parity packs — see inventory.  
2. **Do:** mostly compute/report; some execute allowlisted RO steps; mutate only with flags+approvals.  
3. **Read state:** CC, spines, proofs, parity, credit, ship-guard.  
4. **Choose next:** NBA, directors, dispatch `exact_command`, lane `recommended_next_action`.  
5. **Auto-exec:** runner + dispatch (+ external HyperAgent) — **not** protected product writes.  
6. **Narrate:** digests, packets, HQ, static audits.  
7. **Write artifacts:** drafts, runner/dispatch runs, ledger index, ops credit.  
8. **Mutate protected:** guarded-apply / lifecycle / scoped Supabase write — founder + IO + ship-guard.  
9. **Stop at founder:** runner halt, approval `apply_authorized=false`, AGENTS.  
10. **Validation:** ship-guard, credit, security, deploy preflight, tests.  
11. **CC/ledger:** CC recompute on invoke; ledger via script; HQ manual.  
12. **Duplicates:** rescue vs fridge-model-pdp GE; Batch A vs scoped core; stale control-loop audit.  
13. **Reuse:** CC+dispatch, scoped parity core, ship/credit guards, GE stage kit, runner halt pattern.  
14. **Missing:** GE stage registry, auto exact_command, sync owner-review script, CC drift field, HQ update contract.  
15. **Manual why:** § executive verdict.

---

## UNKNOWN gaps

- CI cron continuous runner/dispatch schedules  
- Routine writer of `data/reports/buckparts-command-center.json`  
- Line-audit of all 234 scripts (subset audited)  
- `bad-mapping-correction-batch-runner` mutation flags  

## Not claimed

- Conversion/revenue impact  
- That the 4 GE pages are closed  
- That a new runner was implemented (it was not)
