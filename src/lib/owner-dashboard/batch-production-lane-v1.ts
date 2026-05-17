/**
 * Batch Production Lane v1 — pure read-only review report builder.
 * PROVEN: no I/O; does not mutate Supabase, retailer_links, evidence JSON, or registry files.
 * Normative: docs/BuckParts-BATCH-PRODUCTION-LANE-V1.md
 */

export const BATCH_PRODUCTION_LANE_CONTRACT_V1 = "batch_production_lane_v1" as const;

export const BATCH_PRODUCTION_REVIEW_REPORT_CONTRACT_V1 =
  "batch_production_review_report_v1" as const;

/** PROVEN: V1 hard cap per docs/BuckParts-BATCH-PRODUCTION-LANE-V1.md */
export const BATCH_PRODUCTION_V1_BATCH_SIZE_CAP = 10;

export const BATCH_PRODUCTION_NO_MUTATION_ATTESTATION_V1 =
  "PROVEN: This report grants no mutation authority. may_mutate is false on every row. " +
  "No Supabase writes, retailer_links mutation, production evidence JSON writes, affiliate URL changes, " +
  "git commits, deploy hooks, or Founder Decision Registry writes are authorized by this artifact. " +
  "layer_6_founder_only_approval remains NOT_PROVEN.";

export type BatchProductionOverallStatusV1 =
  | "OK"
  | "PARTIAL"
  | "STOPPED"
  | "NO_CANDIDATES";

export type BatchProductionBuyerPathSafetyV1 = "safe" | "unsafe" | "unknown";

export type BatchProductionWrongPurchaseRiskV1 = "low" | "medium" | "high" | "unknown";

export type BatchProductionRowClassificationV1 =
  | "ready_for_founder_review"
  | "needs_more_evidence"
  | "blocked_malformed_input"
  | "blocked_registry_scope"
  | "blocked_batch_policy";

export type BatchProductionCandidateKindV1 =
  | "link"
  | "product"
  | "page"
  | "rescue_target"
  | "unknown";

/** Explicit caller-supplied row (read-only upstream signals). */
export type BatchProductionLaneInputRowV1 = {
  row_id: string;
  token?: string | null;
  slug?: string | null;
  url?: string | null;
  source_queue_row_id?: string | null;
  title?: string | null;
  candidate_kind?: BatchProductionCandidateKindV1 | string | null;
  priority?: "high" | "medium" | "low" | string | null;
  read_only_rationale?: string | null;
  /** Upstream signal — builder never promotes `unsafe` or `unknown` to `safe`. */
  buyer_path_safety?: BatchProductionBuyerPathSafetyV1 | string | null;
  wrong_purchase_risk?: BatchProductionWrongPurchaseRiskV1 | string | null;
};

/** CLI / operator stdin row before canonical field names (aliases allowed). */
export type BatchProductionLaneCliInputRowV1 = BatchProductionLaneInputRowV1 & {
  part_token?: string | null;
  candidate_url?: string | null;
  source_reason?: string | null;
};

export type BatchProductionReviewCliInputV1 = {
  rows?: unknown[];
  context?: BatchProductionLaneContextV1;
  generated_at?: string;
};

export type BatchProductionLaneContextV1 = {
  /** When > 0, batch stops (default policy). */
  failure_pattern_unguarded_count?: number;
  failure_pattern_unknown_guardrail_count?: number;
  layer_six_readiness_status?: "blocked" | "needs_review" | "informational_ready" | string;
  /** Queue ids with registry `none` or `rejected` scope — informational block per row. */
  registry_blocked_source_queue_row_ids?: string[];
  runner_overall_status?: string | null;
  require_runner_pass_before_batch?: boolean;
};

export type BatchProductionReviewReportRowV1 = {
  row_id: string;
  token: string | null;
  slug: string | null;
  url: string | null;
  source_queue_row_id: string | null;
  title: string | null;
  candidate_kind: BatchProductionCandidateKindV1;
  classification: BatchProductionRowClassificationV1;
  buyer_path_safety: BatchProductionBuyerPathSafetyV1;
  wrong_purchase_risk: BatchProductionWrongPurchaseRiskV1;
  recommended_next_action: string;
  missing_evidence: string[];
  stop_reason: string | null;
  requires_owner_approval_before_mutation: true;
  may_mutate: false;
};

export type BatchProductionReviewReportV1 = {
  contract: typeof BATCH_PRODUCTION_REVIEW_REPORT_CONTRACT_V1;
  lane_contract: typeof BATCH_PRODUCTION_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  automation_input: false;
  generated_at: string;
  batch_size_cap: typeof BATCH_PRODUCTION_V1_BATCH_SIZE_CAP;
  batch_size: number;
  stopped: boolean;
  stop_reasons: string[];
  overall_status: BatchProductionOverallStatusV1;
  no_mutation_attestation: typeof BATCH_PRODUCTION_NO_MUTATION_ATTESTATION_V1;
  layer_6_founder_only_approval: "NOT_PROVEN";
  candidates: BatchProductionReviewReportRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

const ROW_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

const BUYER_SAFETY: BatchProductionBuyerPathSafetyV1[] = ["safe", "unsafe", "unknown"];
const WRONG_RISK: BatchProductionWrongPurchaseRiskV1[] = ["low", "medium", "high", "unknown"];
const KINDS: BatchProductionCandidateKindV1[] = [
  "link",
  "product",
  "page",
  "rescue_target",
  "unknown",
];

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeOptionalString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function parseBuyerPathSafety(
  v: unknown,
): BatchProductionBuyerPathSafetyV1 | "INVALID" {
  if (v == null || v === "") return "unknown";
  if (typeof v !== "string") return "INVALID";
  const t = v.trim().toLowerCase();
  if (BUYER_SAFETY.includes(t as BatchProductionBuyerPathSafetyV1)) {
    return t as BatchProductionBuyerPathSafetyV1;
  }
  return "INVALID";
}

function parseWrongPurchaseRisk(
  v: unknown,
): BatchProductionWrongPurchaseRiskV1 | "INVALID" {
  if (v == null || v === "") return "unknown";
  if (typeof v !== "string") return "INVALID";
  const t = v.trim().toLowerCase();
  if (WRONG_RISK.includes(t as BatchProductionWrongPurchaseRiskV1)) {
    return t as BatchProductionWrongPurchaseRiskV1;
  }
  return "INVALID";
}

function parseCandidateKind(v: unknown): BatchProductionCandidateKindV1 | "INVALID" {
  if (v == null || v === "") return "unknown";
  if (typeof v !== "string") return "INVALID";
  const t = v.trim().toLowerCase();
  if (KINDS.includes(t as BatchProductionCandidateKindV1)) {
    return t as BatchProductionCandidateKindV1;
  }
  return "INVALID";
}

/**
 * Maps lowest-friction operator stdin keys to canonical builder fields.
 * PROVEN: does not widen mutation authority; read-only alias normalization only.
 */
export function normalizeBatchProductionLaneCliRowV1(row: unknown): unknown {
  if (!row || typeof row !== "object" || Array.isArray(row)) return row;
  const o = row as Record<string, unknown>;
  const out: Record<string, unknown> = { ...o };
  if (out.token == null && out.part_token != null) out.token = out.part_token;
  if (out.url == null && out.candidate_url != null) out.url = out.candidate_url;
  if (out.read_only_rationale == null && out.source_reason != null) {
    out.read_only_rationale = out.source_reason;
  }
  return out;
}

export class BatchProductionReviewCliParseErrorV1 extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchProductionReviewCliParseErrorV1";
  }
}

/**
 * Parse CLI stdin/file JSON: raw row array or `{ rows, context?, generated_at? }`.
 */
export function parseBatchProductionReviewCliInputV1(
  raw: string,
): BatchProductionReviewCliInputV1 {
  const trimmed = raw.trim();
  if (!trimmed) return { rows: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    throw new BatchProductionReviewCliParseErrorV1(
      e instanceof Error ? e.message : "invalid JSON",
    );
  }

  if (Array.isArray(parsed)) {
    return { rows: parsed.map(normalizeBatchProductionLaneCliRowV1) };
  }

  if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    if (!Array.isArray(o.rows)) {
      throw new BatchProductionReviewCliParseErrorV1(
        "wrapper object must include a rows array",
      );
    }
    return {
      rows: o.rows.map(normalizeBatchProductionLaneCliRowV1),
      context: o.context as BatchProductionLaneContextV1 | undefined,
      generated_at: typeof o.generated_at === "string" ? o.generated_at : undefined,
    };
  }

  throw new BatchProductionReviewCliParseErrorV1(
    "stdin JSON must be a candidate row array or { rows, context?, generated_at? }",
  );
}

export function validateBatchProductionLaneInputRowV1(
  row: unknown,
): { ok: true; row: BatchProductionLaneInputRowV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const normalized = normalizeBatchProductionLaneCliRowV1(row);
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) {
    return { ok: false, errors: ["row must be a non-null object"] };
  }
  const o = normalized as Record<string, unknown>;

  if (!isNonEmptyString(o.row_id) || !ROW_ID_RE.test(o.row_id.trim())) {
    errors.push("row_id must be a non-empty stable id (^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$).");
  }

  const buyer = parseBuyerPathSafety(o.buyer_path_safety);
  if (buyer === "INVALID") {
    errors.push("buyer_path_safety must be safe, unsafe, unknown, or omitted.");
  }

  const risk = parseWrongPurchaseRisk(o.wrong_purchase_risk);
  if (risk === "INVALID") {
    errors.push("wrong_purchase_risk must be low, medium, high, unknown, or omitted.");
  }

  const kind = parseCandidateKind(o.candidate_kind);
  if (kind === "INVALID") {
    errors.push("candidate_kind must be link, product, page, rescue_target, unknown, or omitted.");
  }

  const priority = o.priority;
  if (
    priority != null &&
    priority !== "" &&
    !["high", "medium", "low"].includes(String(priority).trim().toLowerCase())
  ) {
    errors.push("priority must be high, medium, low, or omitted.");
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    row: {
      row_id: (o.row_id as string).trim(),
      token: normalizeOptionalString(o.token),
      slug: normalizeOptionalString(o.slug),
      url: normalizeOptionalString(o.url),
      source_queue_row_id: normalizeOptionalString(o.source_queue_row_id),
      title: normalizeOptionalString(o.title),
      candidate_kind: kind === "INVALID" ? "unknown" : kind,
      priority: normalizeOptionalString(o.priority) as BatchProductionLaneInputRowV1["priority"],
      read_only_rationale: normalizeOptionalString(o.read_only_rationale),
      buyer_path_safety: buyer === "INVALID" ? undefined : buyer,
      wrong_purchase_risk: risk === "INVALID" ? undefined : risk,
    },
  };
}

function deriveBuyerPathSafety(
  input: BatchProductionLaneInputRowV1,
): BatchProductionBuyerPathSafetyV1 {
  const signal = parseBuyerPathSafety(input.buyer_path_safety);
  if (signal === "INVALID") return "unknown";
  if (signal === "unsafe" || signal === "unknown") return signal;

  const kind = parseCandidateKind(input.candidate_kind);
  const needsLocator = kind === "link" || kind === "product" || kind === "page";
  if (needsLocator && !input.url && !input.slug && !input.token) {
    return "unknown";
  }
  return "safe";
}

function deriveWrongPurchaseRisk(
  input: BatchProductionLaneInputRowV1,
  buyer: BatchProductionBuyerPathSafetyV1,
): BatchProductionWrongPurchaseRiskV1 {
  const parsed = parseWrongPurchaseRisk(input.wrong_purchase_risk);
  if (parsed !== "INVALID" && parsed !== "unknown") return parsed;
  if (buyer === "unsafe") return "high";
  if (buyer === "unknown") return "unknown";
  return parsed === "INVALID" ? "unknown" : parsed;
}

/** PROVEN: stable missing_evidence labels for unknown buyer path (founder review artifact). */
export const BATCH_MISSING_EVIDENCE_UNKNOWN_BUYER_PATH_V1 = [
  "exact-token retailer PDP proof not provided",
  "buyability proof not provided",
  "safe buyer path not proven",
] as const;

export const BATCH_MISSING_EVIDENCE_AMAZON_SELF_PREFIX_V1 =
  "self-prefix Amazon evidence JSON missing";

function pushUnique(missing: string[], item: string): void {
  if (!missing.includes(item)) missing.push(item);
}

/** INFERRED: detect operator notes that Amazon self-prefix evidence is absent. */
export function rationaleMentionsMissingAmazonEvidenceV1(
  readOnlyRationale: string | null | undefined,
): boolean {
  if (!readOnlyRationale) return false;
  const t = readOnlyRationale.toLowerCase();
  return (
    /no\s+amazon[\s/-]/.test(t) ||
    /missing\s+amazon/.test(t) ||
    /no\s+data\/evidence\/amazon/.test(t) ||
    /amazon-[a-z0-9-]+-\*/.test(t) ||
    /no\s+amazon-[a-z0-9-]+-/.test(t)
  );
}

/**
 * Build `missing_evidence[]` for a validated input row.
 * PROVEN: unknown buyer_path_safety always lists PDP/buyability/safe-path gaps (not satisfied by read_only_rationale alone).
 */
export function buildBatchProductionMissingEvidenceV1(
  input: BatchProductionLaneInputRowV1,
  buyer: BatchProductionBuyerPathSafetyV1,
): string[] {
  const missing: string[] = [];

  if (!input.read_only_rationale) {
    pushUnique(missing, "read_only_rationale");
  }

  if (buyer === "unknown") {
    for (const item of BATCH_MISSING_EVIDENCE_UNKNOWN_BUYER_PATH_V1) {
      pushUnique(missing, item);
    }
    if (!input.url && !input.slug && !input.token) {
      pushUnique(missing, "buyer_path_locator (url, slug, or token)");
    }
  }

  if (buyer === "unsafe") {
    pushUnique(missing, "buyer_path_safety_confirmation");
  }

  const kind = parseCandidateKind(input.candidate_kind);
  if (kind === "rescue_target" && rationaleMentionsMissingAmazonEvidenceV1(input.read_only_rationale)) {
    pushUnique(missing, BATCH_MISSING_EVIDENCE_AMAZON_SELF_PREFIX_V1);
  }

  return missing;
}

function classifyRow(
  input: BatchProductionLaneInputRowV1,
  buyer: BatchProductionBuyerPathSafetyV1,
  risk: BatchProductionWrongPurchaseRiskV1,
  registryBlocked: boolean,
  batchPolicyBlocked: boolean,
): {
  classification: BatchProductionRowClassificationV1;
  stop_reason: string | null;
  recommended_next_action: string;
} {
  if (batchPolicyBlocked) {
    return {
      classification: "blocked_batch_policy",
      stop_reason: "batch_policy_stop",
      recommended_next_action:
        "Do not apply. Resolve batch-level stop_reasons before reviewing individual candidates.",
    };
  }
  if (registryBlocked) {
    return {
      classification: "blocked_registry_scope",
      stop_reason: "registry_blocked_source_queue_row_id",
      recommended_next_action:
        "Founder review only. Registry row blocks this queue id (none/rejected scope). Record a new owner decision if scope should change.",
    };
  }
  if (buyer === "unsafe" || buyer === "unknown") {
    return {
      classification: "needs_more_evidence",
      stop_reason: buyer === "unsafe" ? "buyer_path_unsafe" : "buyer_path_unknown",
      recommended_next_action:
        "Read-only investigation only. Gather missing evidence; do not treat as safe for buyer paths. Owner mutation requires separate owner_mutation_approved registry row.",
    };
  }
  if (risk === "high" || risk === "unknown") {
    return {
      classification: "needs_more_evidence",
      stop_reason: risk === "high" ? "wrong_purchase_risk_high" : "wrong_purchase_risk_unknown",
      recommended_next_action:
        "Founder review required before any apply step. Resolve wrong-purchase risk signals read-only first.",
    };
  }
  return {
    classification: "ready_for_founder_review",
    stop_reason: null,
    recommended_next_action:
      "Founder review batch row. No auto-apply. Mutation still requires explicit owner_mutation_approved registry row.",
  };
}

function buildBlockedMalformedRow(
  rowId: string,
  errors: string[],
): BatchProductionReviewReportRowV1 {
  return {
    row_id: rowId || "malformed_row",
    token: null,
    slug: null,
    url: null,
    source_queue_row_id: null,
    title: null,
    candidate_kind: "unknown",
    classification: "blocked_malformed_input",
    buyer_path_safety: "unknown",
    wrong_purchase_risk: "unknown",
    recommended_next_action:
      "Fix input row and re-run report. This row was not promoted to safe or mutation-eligible state.",
    missing_evidence: ["valid_input_row"],
    stop_reason: `malformed_input: ${errors.join("; ")}`,
    requires_owner_approval_before_mutation: true,
    may_mutate: false,
  };
}

export type BuildBatchProductionReviewReportOptionsV1 = {
  rows: unknown[];
  generated_at?: string;
  context?: BatchProductionLaneContextV1;
};

/**
 * Pure builder: explicit input rows → `batch_production_review_report_v1`.
 * PROVEN: never sets may_mutate true; layer_6_founder_only_approval stays NOT_PROVEN.
 */
export function buildBatchProductionReviewReportV1(
  options: BuildBatchProductionReviewReportOptionsV1,
): BatchProductionReviewReportV1 {
  const generated_at = options.generated_at ?? new Date().toISOString();
  const ctx = options.context ?? {};
  const stop_reasons: string[] = [];
  const proven_facts: string[] = [
    "PROVEN: batch_production_review_report_v1 is read-only with data_mutation false and automation_input false.",
    "PROVEN: Every emitted row has may_mutate false and requires_owner_approval_before_mutation true.",
    "PROVEN: layer_6_founder_only_approval is NOT_PROVEN on this report.",
  ];
  const unknown_facts: string[] = [
    "UNKNOWN: Whether founder will approve any row for mutation (separate registry row required).",
  ];

  const rawRows = Array.isArray(options.rows) ? options.rows : [];
  if (!Array.isArray(options.rows)) {
    stop_reasons.push("INPUT_ROWS_NOT_ARRAY");
  }

  if (rawRows.length === 0) {
    stop_reasons.push("EMPTY_INPUT");
    return {
      contract: BATCH_PRODUCTION_REVIEW_REPORT_CONTRACT_V1,
      lane_contract: BATCH_PRODUCTION_LANE_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      automation_input: false,
      generated_at,
      batch_size_cap: BATCH_PRODUCTION_V1_BATCH_SIZE_CAP,
      batch_size: 0,
      stopped: true,
      stop_reasons,
      overall_status: "NO_CANDIDATES",
      no_mutation_attestation: BATCH_PRODUCTION_NO_MUTATION_ATTESTATION_V1,
      layer_6_founder_only_approval: "NOT_PROVEN",
      candidates: [],
      proven_facts: [
        ...proven_facts,
        "PROVEN: Empty input yields NO_CANDIDATES with zero candidates.",
      ],
      unknown_facts,
    };
  }

  if (rawRows.length > BATCH_PRODUCTION_V1_BATCH_SIZE_CAP) {
    stop_reasons.push(
      `BATCH_SIZE_EXCEEDS_CAP: input_rows=${rawRows.length} cap=${BATCH_PRODUCTION_V1_BATCH_SIZE_CAP}`,
    );
    return {
      contract: BATCH_PRODUCTION_REVIEW_REPORT_CONTRACT_V1,
      lane_contract: BATCH_PRODUCTION_LANE_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      automation_input: false,
      generated_at,
      batch_size_cap: BATCH_PRODUCTION_V1_BATCH_SIZE_CAP,
      batch_size: 0,
      stopped: true,
      stop_reasons,
      overall_status: "STOPPED",
      no_mutation_attestation: BATCH_PRODUCTION_NO_MUTATION_ATTESTATION_V1,
      layer_6_founder_only_approval: "NOT_PROVEN",
      candidates: [],
      proven_facts: [
        ...proven_facts,
        "PROVEN: More than 10 input rows stops the batch with zero emitted candidates.",
      ],
      unknown_facts,
    };
  }

  const unguarded = ctx.failure_pattern_unguarded_count ?? 0;
  if (unguarded > 0) {
    stop_reasons.push(`FAILURE_PATTERN_UNGUARDED_COUNT: ${unguarded}`);
  }
  const unknownGuard = ctx.failure_pattern_unknown_guardrail_count ?? 0;
  if (unknownGuard > 0) {
    stop_reasons.push(`FAILURE_PATTERN_UNKNOWN_GUARDRAIL_COUNT: ${unknownGuard}`);
  }
  if (ctx.layer_six_readiness_status === "blocked") {
    stop_reasons.push("LAYER_SIX_READINESS_BLOCKED");
  }
  const requireRunner = ctx.require_runner_pass_before_batch !== false;
  if (
    requireRunner &&
    ctx.runner_overall_status != null &&
    ctx.runner_overall_status !== "" &&
    ctx.runner_overall_status !== "PASS"
  ) {
    stop_reasons.push(`RUNNER_STEP_NOT_PASS: ${ctx.runner_overall_status}`);
  }

  const batchPolicyBlocked = stop_reasons.length > 0;
  const registryBlockedIds = new Set(
    (ctx.registry_blocked_source_queue_row_ids ?? []).map((s) => s.trim()),
  );

  const candidates: BatchProductionReviewReportRowV1[] = [];
  const seenRowIds = new Set<string>();

  for (const raw of rawRows.slice(0, BATCH_PRODUCTION_V1_BATCH_SIZE_CAP)) {
    const validated = validateBatchProductionLaneInputRowV1(raw);
    if (!validated.ok) {
      const fallbackId =
        raw && typeof raw === "object" && !Array.isArray(raw) && isNonEmptyString((raw as { row_id?: string }).row_id)
          ? String((raw as { row_id: string }).row_id).trim()
          : `malformed_${candidates.length + 1}`;
      candidates.push(buildBlockedMalformedRow(fallbackId, validated.errors));
      continue;
    }

    const input = validated.row;
    if (seenRowIds.has(input.row_id)) {
      candidates.push(
        buildBlockedMalformedRow(input.row_id, [`duplicate row_id: ${input.row_id}`]),
      );
      continue;
    }
    seenRowIds.add(input.row_id);

    const buyer = deriveBuyerPathSafety(input);
    const risk = deriveWrongPurchaseRisk(input, buyer);
    const registryBlocked =
      input.source_queue_row_id != null &&
      registryBlockedIds.has(input.source_queue_row_id);

    const { classification, stop_reason, recommended_next_action } = classifyRow(
      input,
      buyer,
      risk,
      registryBlocked,
      batchPolicyBlocked,
    );

    const kind = parseCandidateKind(input.candidate_kind);
    candidates.push({
      row_id: input.row_id,
      token: input.token ?? null,
      slug: input.slug ?? null,
      url: input.url ?? null,
      source_queue_row_id: input.source_queue_row_id ?? null,
      title: input.title ?? null,
      candidate_kind: kind === "INVALID" ? "unknown" : kind,
      classification,
      buyer_path_safety: buyer,
      wrong_purchase_risk: risk,
      recommended_next_action,
      missing_evidence: buildBatchProductionMissingEvidenceV1(input, buyer),
      stop_reason,
      requires_owner_approval_before_mutation: true,
      may_mutate: false,
    });
  }

  const anyMalformed = candidates.some((c) => c.classification === "blocked_malformed_input");
  const anyNeedsEvidence = candidates.some((c) => c.classification === "needs_more_evidence");
  const allReady = candidates.every((c) => c.classification === "ready_for_founder_review");

  let overall_status: BatchProductionOverallStatusV1 = "OK";
  if (batchPolicyBlocked) {
    overall_status = "STOPPED";
  } else if (anyMalformed) {
    overall_status = "PARTIAL";
    stop_reasons.push("CONTAINS_MALFORMED_INPUT_ROWS");
  } else if (anyNeedsEvidence) {
    overall_status = "PARTIAL";
  } else if (!allReady) {
    overall_status = "PARTIAL";
  }

  const stopped = batchPolicyBlocked || overall_status === "STOPPED";

  proven_facts.push(
    `PROVEN: Emitted ${candidates.length} candidate row(s) with batch_size_cap=${BATCH_PRODUCTION_V1_BATCH_SIZE_CAP}.`,
  );
  if (candidates.every((c) => c.may_mutate === false)) {
    proven_facts.push("PROVEN: All emitted rows have may_mutate false.");
  }

  return {
    contract: BATCH_PRODUCTION_REVIEW_REPORT_CONTRACT_V1,
    lane_contract: BATCH_PRODUCTION_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    automation_input: false,
    generated_at,
    batch_size_cap: BATCH_PRODUCTION_V1_BATCH_SIZE_CAP,
    batch_size: candidates.length,
    stopped,
    stop_reasons,
    overall_status,
    no_mutation_attestation: BATCH_PRODUCTION_NO_MUTATION_ATTESTATION_V1,
    layer_6_founder_only_approval: "NOT_PROVEN",
    candidates,
    proven_facts,
    unknown_facts,
  };
}

/** PROVEN: report never grants mutating repo authority. */
export function batchProductionReviewReportGrantsMutationAuthority(
  report: BatchProductionReviewReportV1,
): boolean {
  if (report.layer_6_founder_only_approval !== "NOT_PROVEN") return true;
  if (report.data_mutation !== false) return true;
  if (report.read_only !== true) return true;
  if (report.automation_input !== false) return true;
  return report.candidates.some((c) => c.may_mutate !== false);
}
