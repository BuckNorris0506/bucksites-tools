/**
 * Failure Pattern Registry v1 — pure types + validation for recurring build/process failure classes.
 * PROVEN: no I/O; does not alter Runner Step, workflows, queues, packets, or mutation gates.
 */

export const FAILURE_PATTERN_REGISTRY_CONTRACT_V1 = "failure_pattern_registry_v1" as const;

export const FAILURE_PATTERN_REGISTRY_READ_MODEL_CONTRACT_V1 =
  "failure_pattern_registry_read_model_v1" as const;

/** Digest / dashboard header hint (single source of truth). */
export const FAILURE_PATTERN_REGISTRY_DIGEST_HINT_V1 =
  "**PROVEN:** Rows are seeded in-repo only where file-backed evidence exists (see `docs/BuckParts-FAILURE-PATTERN-REGISTRY.md`). **PROVEN:** Read model counts are informational — **not** consumed by Runner, Action Queue, Decision Packets, Execution Packets, or mutation gates. **INFERRED:** This registry strengthens Layer 5 visibility; it does **not** expand Layer 6 autonomy.";

/** Plain sentence for React owner dashboard (no markdown emphasis). */
export const FAILURE_PATTERN_REGISTRY_OWNER_DASHBOARD_LINE_V1 =
  "Failure Pattern Registry v1 lists seeded failure classes and guardrail paths for awareness only. Counts are informational — BuckParts does not use this registry to drive Runner, queues, packets, or gates.";

export type FailurePatternRegistryStatusV1 = "observed" | "guarded" | "recurring" | "retired";

export type FailurePatternRegistryProofStatusV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type FailurePatternRegistryRowV1 = {
  failure_id: string;
  title: string;
  status: FailurePatternRegistryStatusV1;
  first_seen_context: string;
  last_seen_at: string;
  observed_examples: string[];
  root_cause: string;
  correct_pattern: string;
  guardrail_paths: string[];
  proof_status: FailurePatternRegistryProofStatusV1;
  remaining_risk: string;
};

export type FailurePatternRegistryReadModelV1 = {
  contract: typeof FAILURE_PATTERN_REGISTRY_READ_MODEL_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  informational_only: true;
  automation_input: false;
  generated_at: string;
  guarded_count: number;
  unguarded_count: number;
  recurring_count: number;
  unknown_guardrail_count: number;
  rows: FailurePatternRegistryRowV1[];
  proven_facts: string[];
};

const FAILURE_ID_RE = /^[a-z][a-z0-9_]*$/;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isIso8601Instant(v: string): boolean {
  const t = Date.parse(v);
  return !Number.isNaN(t);
}

export function validateFailurePatternRegistryRowV1(
  row: unknown,
): { ok: true; row: FailurePatternRegistryRowV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return { ok: false, errors: ["row must be a non-null object"] };
  }
  const o = row as Record<string, unknown>;

  const failure_id = o.failure_id;
  if (!isNonEmptyString(failure_id) || !FAILURE_ID_RE.test(failure_id.trim())) {
    errors.push("failure_id must be non-empty snake_case (^[a-z][a-z0-9_]*$).");
  }

  if (!isNonEmptyString(o.title)) errors.push("title must be a non-empty string.");
  const status = o.status;
  const statuses: FailurePatternRegistryStatusV1[] = ["observed", "guarded", "recurring", "retired"];
  if (!statuses.includes(status as FailurePatternRegistryStatusV1)) {
    errors.push(`status must be one of: ${statuses.join(", ")}.`);
  }

  if (!isNonEmptyString(o.first_seen_context)) errors.push("first_seen_context must be a non-empty string.");
  const last_seen_at = o.last_seen_at;
  if (!isNonEmptyString(last_seen_at) || !isIso8601Instant(last_seen_at.trim())) {
    errors.push("last_seen_at must be a non-empty ISO 8601–parseable string.");
  }

  const ex = o.observed_examples;
  if (!Array.isArray(ex) || ex.length === 0 || !ex.every((x) => isNonEmptyString(x))) {
    errors.push("observed_examples must be a non-empty array of non-empty strings.");
  }

  if (!isNonEmptyString(o.root_cause)) errors.push("root_cause must be a non-empty string.");
  if (!isNonEmptyString(o.correct_pattern)) errors.push("correct_pattern must be a non-empty string.");

  const paths = o.guardrail_paths;
  if (!Array.isArray(paths) || !paths.every((p) => isNonEmptyString(p))) {
    errors.push("guardrail_paths must be an array of non-empty strings.");
  }

  const proof = o.proof_status;
  const proofs: FailurePatternRegistryProofStatusV1[] = ["PROVEN", "INFERRED", "UNKNOWN"];
  if (!proofs.includes(proof as FailurePatternRegistryProofStatusV1)) {
    errors.push(`proof_status must be one of: ${proofs.join(", ")}.`);
  }

  if (!isNonEmptyString(o.remaining_risk)) errors.push("remaining_risk must be a non-empty string.");

  const pathList = Array.isArray(paths) ? paths.filter((p): p is string => isNonEmptyString(p)) : [];

  const statusOk = statuses.includes(status as FailurePatternRegistryStatusV1);
  const proofOk = proofs.includes(proof as FailurePatternRegistryProofStatusV1);

  if (
    errors.length === 0 &&
    statusOk &&
    proofOk &&
    (status as FailurePatternRegistryStatusV1) === "guarded" &&
    (proof as FailurePatternRegistryProofStatusV1) === "PROVEN" &&
    pathList.length === 0
  ) {
    errors.push("guarded + proof_status PROVEN requires at least one guardrail_paths entry.");
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    row: {
      failure_id: (failure_id as string).trim(),
      title: (o.title as string).trim(),
      status: status as FailurePatternRegistryStatusV1,
      first_seen_context: (o.first_seen_context as string).trim(),
      last_seen_at: (last_seen_at as string).trim(),
      observed_examples: (ex as string[]).map((s) => s.trim()),
      root_cause: (o.root_cause as string).trim(),
      correct_pattern: (o.correct_pattern as string).trim(),
      guardrail_paths: pathList.map((s) => s.trim()),
      proof_status: proof as FailurePatternRegistryProofStatusV1,
      remaining_risk: (o.remaining_risk as string).trim(),
    },
  };
}

/**
 * PROVEN: Seeded read-only rows — each must align with cited guardrail_paths in-repo.
 * INFERRED: Narrative root_cause lines for workflow rows reflect historical CI friction, not a captured log line.
 */
export const FAILURE_PATTERN_REGISTRY_SEEDED_ROWS_V1: readonly FailurePatternRegistryRowV1[] = [
  {
    failure_id: "npm_run_json_stdout_parse",
    title: "Piping npm lifecycle stdout into JSON.parse for BuckParts JSON scripts",
    status: "guarded",
    first_seen_context:
      "PROVEN: Recurring class documented in `docs/BuckParts-JSON-STDOUT-CONTRACT.md` — npm prints lifecycle lines before script JSON.",
    last_seen_at: "2026-05-15T00:00:00.000Z",
    observed_examples: [
      "PROVEN: `docs/BuckParts-JSON-STDOUT-CONTRACT.md` states npm stdout is not pure JSON for `npm run` + JSON consumers.",
      "PROVEN: `scripts/json-stdout-contract.test.ts` scans repo sources for dangerous `npm run` + `JSON.parse` / `jq` patterns.",
    ],
    root_cause:
      "PROVEN: npm emits script banner / lifecycle text on stdout before the Node script’s own output, so the byte stream is not valid JSON at offset 0.",
    correct_pattern:
      "PROVEN: Invoke `node --import tsx scripts/<json-producing-script>.ts` (or write JSON to a file and parse the file) per `docs/BuckParts-JSON-STDOUT-CONTRACT.md`.",
    guardrail_paths: ["docs/BuckParts-JSON-STDOUT-CONTRACT.md", "scripts/json-stdout-contract.test.ts"],
    proof_status: "PROVEN",
    remaining_risk:
      "UNKNOWN: Future npm versions could change banner shape; always inspect leading bytes when a new npm major lands.",
  },
  {
    failure_id: "github_workflow_inline_heredoc_node",
    title: "GitHub Actions workflow YAML using inline `<<'NODE'` heredocs for embedded TypeScript",
    status: "guarded",
    first_seen_context:
      "PROVEN: Repo workflow contract tests forbid `<<'NODE'` in Runner Step and Founder Digest workflows (see cited tests).",
    last_seen_at: "2026-05-08T00:00:00.000Z",
    observed_examples: [
      "PROVEN: `scripts/buckparts-runner-step-workflow.test.ts` — `assert.doesNotMatch(yaml, /<<'NODE'/)` on `.github/workflows/buckparts-runner-step.yml`.",
      "PROVEN: `scripts/buckparts-founder-digest-workflow.test.ts` — same assertion on `.github/workflows/buckparts-founder-digest.yml`.",
      "PROVEN: Both workflows run `node --import tsx scripts/buckparts-runner-step.ts` and append-summary scripts instead of inline heredoc Node blocks.",
    ],
    root_cause:
      "INFERRED: Inline heredoc-wrapped Node in YAML complicated `tsx` import paths and step summaries compared to dedicated `scripts/*.ts` entrypoints.",
    correct_pattern:
      "PROVEN: Keep TypeScript in `scripts/*.ts` and invoke with `node --import tsx scripts/...` from workflow `run:` steps (see `scripts/buckparts-runner-step-append-github-step-summary.ts` file header).",
    guardrail_paths: [
      ".github/workflows/buckparts-runner-step.yml",
      ".github/workflows/buckparts-founder-digest.yml",
      "scripts/buckparts-runner-step-workflow.test.ts",
      "scripts/buckparts-founder-digest-workflow.test.ts",
      "scripts/buckparts-runner-step-append-github-step-summary.ts",
    ],
    proof_status: "PROVEN",
    remaining_risk:
      "UNKNOWN: A future workflow author could bypass tests or add a new workflow file without the heredoc guard unless the json-stdout / workflow test suite is extended.",
  },
  {
    failure_id: "github_actions_major_action_pins",
    title: "Drift to deprecated GitHub Actions majors or Node pin mismatch in BuckParts workflows",
    status: "guarded",
    first_seen_context:
      "PROVEN: Workflow contract tests pin `actions/checkout@v6`, `actions/setup-node@v6`, `actions/upload-artifact@v7`, and `node-version: \"24\"` for Runner Step and Founder Digest workflows.",
    last_seen_at: "2026-05-08T00:00:00.000Z",
    observed_examples: [
      "PROVEN: `scripts/buckparts-runner-step-workflow.test.ts` asserts v6/v7 action majors and `node-version: \"24\"` and rejects `@v4` patterns.",
      "PROVEN: `scripts/buckparts-founder-digest-workflow.test.ts` mirrors the same action major and Node version assertions.",
      "PROVEN: Both tests reject `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` in workflow YAML.",
    ],
    root_cause:
      "INFERRED: Older action majors and Node pin hacks produced CI noise or deprecation warnings that distracted from Runner JSON and digest reliability.",
    correct_pattern:
      "PROVEN: Match workflow YAML to the assertions in the cited `*.test.ts` files when upgrading Actions or Node.",
    guardrail_paths: [
      ".github/workflows/buckparts-runner-step.yml",
      ".github/workflows/buckparts-founder-digest.yml",
      "scripts/buckparts-runner-step-workflow.test.ts",
      "scripts/buckparts-founder-digest-workflow.test.ts",
    ],
    proof_status: "PROVEN",
    remaining_risk:
      "UNKNOWN: Other workflows under `.github/workflows/` may not be covered until similar contract tests are added.",
  },
];

function assertSeededRowsValid(): void {
  const seen = new Set<string>();
  for (const r of FAILURE_PATTERN_REGISTRY_SEEDED_ROWS_V1) {
    const v = validateFailurePatternRegistryRowV1(r);
    if (!v.ok) {
      throw new Error(`Seeded failure pattern invalid (${r.failure_id}): ${v.errors.join("; ")}`);
    }
    if (seen.has(v.row.failure_id)) {
      throw new Error(`Duplicate failure_id in seed: ${v.row.failure_id}`);
    }
    seen.add(v.row.failure_id);
  }
}

assertSeededRowsValid();

function unknownGuardrailCountForRow(row: FailurePatternRegistryRowV1): number {
  if (row.proof_status === "UNKNOWN") return 1;
  if (row.guardrail_paths.length === 0 && row.status !== "retired") return 1;
  return 0;
}

/**
 * PROVEN: pure aggregation — validates unknown-shaped rows; invalid rows are omitted from `rows` but noted in `proven_facts`.
 */
export function buildFailurePatternRegistryReadModelV1(
  rows: readonly unknown[],
  options: { generated_at: string },
): FailurePatternRegistryReadModelV1 {
  const generated_at = options.generated_at;
  const proven_facts: string[] = [];
  const validated: FailurePatternRegistryRowV1[] = [];
  const ids = new Set<string>();

  for (const raw of rows) {
    const v = validateFailurePatternRegistryRowV1(raw);
    if (!v.ok) {
      proven_facts.push(`PROVEN: Input row failed validation — ${v.errors.join("; ")}.`);
      continue;
    }
    if (ids.has(v.row.failure_id)) {
      proven_facts.push(`PROVEN: Duplicate failure_id omitted from read model: ${v.row.failure_id}.`);
      continue;
    }
    ids.add(v.row.failure_id);
    validated.push(v.row);
  }

  let guarded_count = 0;
  let unguarded_count = 0;
  let recurring_count = 0;
  let unknown_guardrail_count = 0;

  for (const row of validated) {
    if (row.status === "guarded") guarded_count++;
    else if (row.status === "observed") unguarded_count++;
    else if (row.status === "recurring") recurring_count++;
    unknown_guardrail_count += unknownGuardrailCountForRow(row);
  }

  proven_facts.push(
    `PROVEN: Read model built from ${validated.length} validated row(s); contract ${FAILURE_PATTERN_REGISTRY_READ_MODEL_CONTRACT_V1}.`,
  );
  proven_facts.push(
    "PROVEN: Seeded catalog lives in `src/lib/owner-dashboard/failure-pattern-registry-v1.ts` — not loaded from external data stores.",
  );

  return {
    contract: FAILURE_PATTERN_REGISTRY_READ_MODEL_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    informational_only: true,
    automation_input: false,
    generated_at,
    guarded_count,
    unguarded_count,
    recurring_count,
    unknown_guardrail_count,
    rows: validated,
    proven_facts,
  };
}

export function buildFailurePatternRegistryReadModelFromSeededV1(
  generated_at: string,
): FailurePatternRegistryReadModelV1 {
  return buildFailurePatternRegistryReadModelV1(FAILURE_PATTERN_REGISTRY_SEEDED_ROWS_V1, { generated_at });
}

/** Informational one-liner for digest / dashboards (does not drive automation). */
export function formatFailurePatternRegistryInformationalLineV1(m: FailurePatternRegistryReadModelV1): string {
  return `Failure Pattern Registry: ${m.guarded_count} guarded, ${m.unguarded_count} unguarded; informational only. (recurring: ${m.recurring_count}; unknown_guardrail: ${m.unknown_guardrail_count})`;
}

export function formatFailurePatternRegistryDigestMarkdownV1(m: FailurePatternRegistryReadModelV1): string {
  const lines = [
    `**PROVEN:** Contract \`${m.contract}\` · read_only=\`${String(m.read_only)}\` · data_mutation=\`${String(m.data_mutation)}\` · informational_only=\`${String(m.informational_only)}\` · automation_input=\`${String(m.automation_input)}\`.`,
    `**PROVEN:** ${formatFailurePatternRegistryInformationalLineV1(m)}`,
    "",
    "**PROVEN:** Seeded `failure_id` values:",
    ...m.rows.map((r) => `- \`${r.failure_id}\` — status=\`${r.status}\` · proof_status=\`${r.proof_status}\``),
    "",
    "**Facts (trimmed):**",
    ...m.proven_facts.slice(-6).map((f) => `- ${f}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}
