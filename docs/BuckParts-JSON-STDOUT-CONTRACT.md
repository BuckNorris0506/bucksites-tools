# BuckParts JSON stdout contract

## PROVEN

- **`npm run <script>` is for humans.** npm prints lifecycle lines (e.g. script name banner) to stdout **before** the script’s own output. That prefix is **not** valid JSON.
- **`node --import tsx scripts/<file>.ts` is required when stdout must be machine-parseable JSON.** This bypasses the npm wrapper so the process stdout is only what the script prints.
- **`package.json` scripts stay as convenience aliases.** This contract does **not** require removing `npm run buckparts:*`; it requires **not piping npm’s stdout** into `JSON.parse`, `jq`, or similar when the goal is pure JSON.

## INFERRED

- CI and local automation that need JSON should invoke the same entrypoints workflows already use where applicable (e.g. `node --import tsx scripts/buckparts-runner-step.ts`), or write JSON to a **file** inside the step and parse the file — not `npm run … | …`.

## UNKNOWN

- Whether future npm versions change banner shape; treat any non-script prefix as **UNKNOWN** until you inspect the first bytes.

---

## Correct patterns (copy from repo root)

**Command Center JSON (stdout):**

```bash
node --import tsx scripts/report-buckparts-command-center.ts
```

**Operating map JSON (stdout):**

```bash
node --import tsx scripts/report-buckparts-operating-map.ts
```

**Next execution packet (`--json`):**

```bash
node --import tsx scripts/buckparts-next-execution-packet.ts -- --json
```

**Founder Decision Registry read model (stdout):**

```bash
node --import tsx scripts/report-founder-decision-registry.ts
```

**Runner Step v1 (stdout):**

```bash
node --import tsx scripts/buckparts-runner-step.ts
```

---

## Anti-patterns (do not use for JSON.parse)

Do **not** chain **`npm run …`** with a **pipe** into **`jq`**, **`node -e`** / **`--eval`** that calls **`JSON.parse`**, or a redirect that assumes **only** JSON bytes hit the file. The first lines are almost always npm lifecycle text, not `{`.

---

## Enforcement (PROVEN)

- `scripts/json-stdout-contract.test.ts` scans `docs/`, `scripts/`, `src/`, and `.github/` (plus repo-root `README.md` / `AGENTS.md` when present) for high-signal dangerous sequences. Markdown fenced blocks are stripped before matching to avoid false positives from quoted examples in unrelated docs.

---

## Changelog (doc only)

| Date | Change |
|------|--------|
| 2026-05-15 | Initial JSON stdout contract + repo scan test. |
