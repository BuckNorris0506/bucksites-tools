# Contributor and coding-agent guidance

Follow [the BuckParts Constitution](docs/BuckParts-CONSTITUTION.md).
This file does not authorize production changes.

## Working loop

1. Inspect git status, HEAD, relevant source, evidence, and tests before editing.
   Prefer UNKNOWN over unsupported claims.
2. Make the smallest bounded change. Keep unrelated work out of the diff.
3. Use existing read-only review and dry-run tooling before catalog mutations.
   Check blocked reasons and preserve fail-closed defaults.
4. Production compatibility mappings, retailer links, public buying paths,
   Supabase catalog changes, routes, sitemap, robots, and trust-copy changes
   require explicit human authorization for the exact scope. Preserve existing
   approval artifacts and guarded executors. An approval file or a successful
   dry-run alone does not authorize apply.
5. Run relevant tests with
   `BUCKPARTS_TEST_FILES='<relevant-test-paths>' bash scripts/npm-test-v1.sh`.
   Run `npm run build` when application or runtime files change. Inspect the
   final diff and git status before reporting completion.
6. Commit or push only when explicitly requested. Report exact validation
   results and limitations; passing tests do not prove traffic or revenue.

## Evidence and safety

- Never invent compatibility, prices, reviews, ratings, offers, or verification.
- Live buying paths require the existing evidence, freshness, and trust gates.
  Unknown, expired, or degraded evidence must continue to fail closed.
- Do not add Product `offers`, `review`, or `aggregateRating` without truthful,
  bound evidence. Suppress incomplete schema rather than fabricate fields.
- Do not weaken tests or guards to hide blocked results or state mismatches.
- Keep credentials and personal operating instructions out of tracked files.
- Separate discovery candidates, validated evidence, and publication authority.
