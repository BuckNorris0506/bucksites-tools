# BuckParts Agent Loop Contract

**Status:** Repo-level agent operating contract (execution loop only).  
**Authority:** Subordinate to `docs/BuckParts-CONSTITUTION.md`. Current lane/stopping point lives in `docs/BuckParts-HQ-HANDOFF.md` — do not treat memory or chat history as HEAD/truth.  
**Scope:** How agents may discover, plan, mutate, validate, and hand off. Does not authorize work, buy CTAs, or apply by itself.

---

## Loop (mandatory order)

1. **Discover** — Inspect repo truth only (`git status`, HEAD, relevant `data/**`, scripts, tests, HQ stopping point). Prefer UNKNOWN over invention.
2. **Plan** — Name exact scope, files, mutation surface, and non-goals. One lane at a time. No mixed dirty trees.
3. **Dry-run / read-only packet** — Prefer owner-review or guarded dry-run artifacts before any mutation (`data_mutation=false`). Write drafts under allowed paths only.
4. **Verify** — Confirm dry-run/packet matches plan counts, exclusions, and fail-closed gates. Re-read blocked_reasons; do not hide them.
5. **Founder gate** — Compatibility CSV, retailer_links / public buy path, Supabase, routes, sitemap/robots, and buy CTA require explicit founder approval artifact + scoped authorization. No autonomous apply.
6. **Apply only if approved** — Run the lane’s guarded executor with explicit `--apply` (or equivalent) only after a valid owner-approval row for that exact plan. Default remains dry-run.
7. **Validate** — Run the lane’s tests, `npm run build` when product/runtime touched, and `git status --short`. Confirm CSV/DB/UI unchanged unless that mutation was authorized.
8. **Commit** — Only when Jared asks. Clean, single-lane diff. Include tests/build proof in the session. Do not commit secrets.
9. **Handoff** — After commit (when asked), update `docs/BuckParts-HQ-HANDOFF.md` stopping point / prior lane with HEAD, commands, and what is **not** claimed.

Skip apply/commit/handoff when the task is read-only. Never skip Discover → Plan for mutation work.

---

## Standing rules

- **Repo truth over memory** — Re-check files, HEAD, and artifacts; do not rely on prior chat claims.
- **No invented facts** — No fake fit, prices, reviews, ratings, offers, proof, or buy eligibility.
- **No mixed dirty trees** — Do not pile unrelated lanes into one working tree or one commit.
- **Read-only packet before mutation** — Owner-review / apply-plan / dry-run first; mutation second.
- **No autonomous apply** — Presence of an approval file does not mean “run `--apply` now.” Founder must explicitly authorize the apply step for that session/scope.
- **No buy CTA without proof** — Live buy paths require `direct_buyable` (or lane-equivalent) + freshness/gate policy; fail closed otherwise.
- **Founder approval required** for:
  - `data/compatibility_mappings.csv` (and equivalent Supabase compat mutation)
  - `data/retailer_links.csv` / public buy CTA / Verified Link promotion
  - Supabase mutation affecting public catalog or buy paths
  - Public route, sitemap, robots, or trust-copy changes that change homeowner buy guidance
- **No invented Product structured data** — Do not add Product `offers`, `review`, or `aggregateRating` without truthful bound evidence. Prefer suppressing incomplete Product schema over fabricating commerce/review fields.
- **Tests / build / status before commit** — At minimum: relevant `BUCKPARTS_TEST_FILES=… bash scripts/npm-test-v1.sh`, `npm run build` when warranted, `git status --short`.
- **HQ handoff after commit** — Record stopping point; state Not claimed (no traffic/revenue/autonomous-apply claims unless proven).
- **Constitution wins** on trust conflicts — harm reduction > coverage/speed/revenue (§4 Trust Hierarchy).

---

## Guarded-lane pattern (canonical)

Owner-review packet → apply-plan packet → guarded `--dry-run` → founder `data/owner-decisions/*-owner-approval-v1.json` → explicit `--apply` → validate → commit → HQ handoff.

Examples (scripts, not auto-run):  
`buckparts:*-owner-review`, `buckparts:*-apply-plan-owner-review`, `buckparts:*-guarded-apply`, `buckparts:samsung-pass-repair-guarded-apply`, `buckparts:gswf-wrong-part-repair-guarded-apply`, manufacturer-rescue / fridge-safe-link bridges.

---

## Do not

- Mutate production buy surfaces “to be helpful”
- Run `--apply` because dry-run was `DRY_RUN_READY`
- Soften fail-closed tests to hide post-apply `BLOCKED` / `before_mappings` mismatches
- Invent Product `offers` / `review` / `aggregateRating` without truthful bound evidence
- Push unless Jared explicitly asks

---

## Minimal validation (any mutation lane)

```bash
git status --short
git rev-parse --short HEAD
# lane-specific dry-run / tests, then:
BUCKPARTS_TEST_FILES='<lane-test>' bash scripts/npm-test-v1.sh
npm run build
git status --short
```

After creating or editing this contract:

```bash
test -f AGENTS.md && wc -l AGENTS.md
grep -n "Discover\|Founder gate\|No autonomous apply\|HQ handoff\|Product" AGENTS.md
```
