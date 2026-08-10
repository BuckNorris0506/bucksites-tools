/**
 * Decision Priors Framework v1 — read-only labels for candidate executive decisions.
 *
 * Reuses existing Owner Approval Records (OAR = founder_decision_registry / owner-approval
 * JSON under data/owner-decisions/) and Owner Decision Requests (ODR =
 * owner_decision_request_v1). Labels only: no scoring, weighting, or behavior change.
 * Never grants NBA / Dispatch / Daily Operator / Command Center authority.
 */

export const DECISION_PRIORS_FRAMEWORK_CONTRACT_V1 = "decision_priors_framework_v1" as const;

export const DECISION_PRIORS_FRAMEWORK_SOURCE_COMMAND_V1 =
  "npm run buckparts:decision-priors-framework" as const;

/** Closed catalog — labels only in v1 (no scores / weights). */
export const DECISION_PRIOR_IDS_V1 = [
  "harm_reduction_over_coverage",
  "fail_closed_on_unknown",
  "no_autonomous_apply",
  "no_buy_cta_without_proof",
  "read_only_packet_before_mutation",
  "single_lane_no_mixed_dirty_tree",
  "founder_authority_required",
  "no_invented_facts",
] as const;

export type DecisionPriorIdV1 = (typeof DECISION_PRIOR_IDS_V1)[number];

const DECISION_PRIOR_ID_SET = new Set<string>(DECISION_PRIOR_IDS_V1);

export type FounderDisagreementStatusV1 = "rejected" | "deferred" | "needs_more_evidence";

/** Candidate executive decision substrate (ODR-shaped; optional priors). */
export type CandidateExecutiveDecisionV1 = {
  decision_request_id: string;
  recommended_option: string;
  decision_type?: string;
  source_system?: string;
  source_artifact_path?: string;
  target_slugs?: readonly string[];
  /** Optional label-only priors that influenced the Executive recommendation. */
  decision_priors?: readonly DecisionPriorIdV1[];
};

/** Owner Approval Record (OAR) substrate — founder registry row fields used for disagreement. */
export type OwnerApprovalRecordSubstrateV1 = {
  decision_id: string;
  decision_status: string;
  source_queue_row_id?: string;
  source_decision_packet_id?: string;
  owner_note?: string;
  allowed_next_scope?: string;
  /**
   * Priors that influenced the Executive recommendation at disagreement time.
   * Retained on the OAR so founder disagreement history keeps Executive rationale labels.
   */
  executive_recommendation_decision_priors?: readonly DecisionPriorIdV1[];
};

export type TaggedCandidateExecutiveDecisionV1 = CandidateExecutiveDecisionV1 & {
  decision_priors: readonly DecisionPriorIdV1[];
  decision_priors_are_labels_only: true;
  scoring: false;
  weighting: false;
  behavior_change: false;
};

export type FounderDisagreementRecordV1 = {
  contract: "founder_disagreement_record_v1";
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  steering_authority: false;
  nba_authority: false;
  dispatch_authority: false;
  daily_operator_authority: false;
  disagreement_record_id: string;
  oar_decision_id: string;
  founder_decision_status: FounderDisagreementStatusV1;
  executive_recommended_option: string | null;
  candidate_decision_request_id: string | null;
  /** Priors that influenced the Executive recommendation (labels only). */
  decision_priors: readonly DecisionPriorIdV1[];
  decision_priors_are_labels_only: true;
  scoring: false;
  weighting: false;
  behavior_change: false;
  source_paths: string[];
  notes: string[];
};

export type DecisionPriorsFrameworkProjectionV1 = {
  contract: typeof DECISION_PRIORS_FRAMEWORK_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  steering_authority: false;
  nba_authority: false;
  dispatch_authority: false;
  daily_operator_authority: false;
  command_center_authority: false;
  source_command: typeof DECISION_PRIORS_FRAMEWORK_SOURCE_COMMAND_V1;
  generated_at: string;
  catalog: readonly DecisionPriorIdV1[];
  labels_only: true;
  scoring: false;
  weighting: false;
  behavior_change: false;
  tagged_candidate_count: number;
  tagged_candidates: TaggedCandidateExecutiveDecisionV1[];
  disagreement_record_count: number;
  disagreement_records: FounderDisagreementRecordV1[];
  oar_reuse: "founder_decision_registry_v1_owner_approval_records";
  odr_reuse: "owner_decision_request_v1";
  new_store_created: false;
  proven_facts: string[];
  unknown_facts: string[];
};

export function isDecisionPriorIdV1(value: unknown): value is DecisionPriorIdV1 {
  return typeof value === "string" && DECISION_PRIOR_ID_SET.has(value);
}

export function isFounderDisagreementStatusV1(
  status: unknown,
): status is FounderDisagreementStatusV1 {
  return status === "rejected" || status === "deferred" || status === "needs_more_evidence";
}

/**
 * Validate and normalize decision_priors (dedupe + stable catalog order).
 * Fail closed on unknown labels. Empty list is valid.
 */
export function validateDecisionPriorsV1(
  input: unknown,
): { ok: true; decision_priors: DecisionPriorIdV1[] } | { ok: false; errors: string[] } {
  if (input === undefined || input === null) {
    return { ok: true, decision_priors: [] };
  }
  if (!Array.isArray(input)) {
    return { ok: false, errors: ["decision_priors must be an array of catalog labels"] };
  }
  const errors: string[] = [];
  const seen = new Set<DecisionPriorIdV1>();
  for (const item of input) {
    if (!isDecisionPriorIdV1(item)) {
      errors.push(`unknown decision_prior label (fail closed): ${JSON.stringify(item)}`);
      continue;
    }
    seen.add(item);
  }
  if (errors.length > 0) return { ok: false, errors };
  const decision_priors = DECISION_PRIOR_IDS_V1.filter((id) => seen.has(id));
  return { ok: true, decision_priors };
}

/** Tag a candidate executive decision with one or more decision_priors (labels only). */
export function tagCandidateExecutiveDecisionWithDecisionPriorsV1(args: {
  candidate: CandidateExecutiveDecisionV1;
  decision_priors: readonly unknown[];
}):
  | { ok: true; tagged: TaggedCandidateExecutiveDecisionV1 }
  | { ok: false; errors: string[] } {
  const validated = validateDecisionPriorsV1(args.decision_priors);
  if (!validated.ok) return validated;
  if (!args.candidate.decision_request_id?.trim()) {
    return { ok: false, errors: ["candidate.decision_request_id must be a non-empty string"] };
  }
  if (!args.candidate.recommended_option?.trim()) {
    return { ok: false, errors: ["candidate.recommended_option must be a non-empty string"] };
  }
  const tagged: TaggedCandidateExecutiveDecisionV1 = {
    ...args.candidate,
    decision_request_id: args.candidate.decision_request_id.trim(),
    recommended_option: args.candidate.recommended_option.trim(),
    decision_priors: validated.decision_priors,
    decision_priors_are_labels_only: true,
    scoring: false,
    weighting: false,
    behavior_change: false,
  };
  return { ok: true, tagged };
}

/**
 * Build a founder disagreement record that retains which priors influenced
 * the Executive recommendation. Read-only projection — does not write stores.
 */
export function buildFounderDisagreementRecordV1(args: {
  oar: OwnerApprovalRecordSubstrateV1;
  executive_recommended_option?: string | null;
  candidate_decision_request_id?: string | null;
  /** Prefer OAR-retained priors; fall back to explicit list / ODR tags. */
  decision_priors?: readonly unknown[];
  source_paths?: readonly string[];
  notes?: readonly string[];
}):
  | { ok: true; record: FounderDisagreementRecordV1 }
  | { ok: false; errors: string[] } {
  if (!args.oar.decision_id?.trim()) {
    return { ok: false, errors: ["oar.decision_id must be a non-empty string"] };
  }
  if (!isFounderDisagreementStatusV1(args.oar.decision_status)) {
    return {
      ok: false,
      errors: [
        `founder disagreement requires decision_status rejected|deferred|needs_more_evidence (got ${JSON.stringify(args.oar.decision_status)})`,
      ],
    };
  }

  const priorSource =
    args.decision_priors ??
    args.oar.executive_recommendation_decision_priors ??
    [];
  const validated = validateDecisionPriorsV1(priorSource);
  if (!validated.ok) return validated;

  const oarId = args.oar.decision_id.trim();
  const candidateId = args.candidate_decision_request_id?.trim() || null;
  const record: FounderDisagreementRecordV1 = {
    contract: "founder_disagreement_record_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    steering_authority: false,
    nba_authority: false,
    dispatch_authority: false,
    daily_operator_authority: false,
    disagreement_record_id: `founder_disagreement_v1:${oarId}`,
    oar_decision_id: oarId,
    founder_decision_status: args.oar.decision_status,
    executive_recommended_option: args.executive_recommended_option?.trim() || null,
    candidate_decision_request_id: candidateId,
    decision_priors: validated.decision_priors,
    decision_priors_are_labels_only: true,
    scoring: false,
    weighting: false,
    behavior_change: false,
    source_paths: [...(args.source_paths ?? [])],
    notes: [
      "PROVEN: disagreement record is a read-only projection over existing OAR / ODR artifacts.",
      "PROVEN: decision_priors are labels only — no scoring, weighting, or behavior change in v1.",
      ...(args.notes ?? []),
    ],
  };
  return { ok: true, record };
}

/**
 * Attach / retain executive recommendation priors on an OAR substrate (pure; no disk write).
 */
export function retainExecutiveRecommendationDecisionPriorsOnOarV1(args: {
  oar: OwnerApprovalRecordSubstrateV1;
  decision_priors: readonly unknown[];
}):
  | { ok: true; oar: OwnerApprovalRecordSubstrateV1 }
  | { ok: false; errors: string[] } {
  const validated = validateDecisionPriorsV1(args.decision_priors);
  if (!validated.ok) return validated;
  return {
    ok: true,
    oar: {
      ...args.oar,
      executive_recommendation_decision_priors: validated.decision_priors,
    },
  };
}

function matchCandidateForOar(
  oar: OwnerApprovalRecordSubstrateV1,
  candidates: readonly CandidateExecutiveDecisionV1[],
): CandidateExecutiveDecisionV1 | null {
  const packet = (oar.source_decision_packet_id ?? "").trim();
  const queue = (oar.source_queue_row_id ?? "").trim();
  for (const c of candidates) {
    const id = c.decision_request_id.trim();
    if (!id) continue;
    if (packet === `owner_decision_request_v1:${id}` || packet === id) return c;
    if (queue === id) return c;
  }
  return null;
}

/**
 * Read-only projection: tag candidates that already carry priors; emit disagreement
 * records for OAR rows with disagreement statuses, retaining Executive priors.
 */
export function buildDecisionPriorsFrameworkProjectionV1(args: {
  candidates?: readonly CandidateExecutiveDecisionV1[];
  oar_rows?: readonly OwnerApprovalRecordSubstrateV1[];
  now?: () => Date;
}): DecisionPriorsFrameworkProjectionV1 {
  const now = args.now ?? (() => new Date());
  const candidates = args.candidates ?? [];
  const oarRows = args.oar_rows ?? [];

  const tagged_candidates: TaggedCandidateExecutiveDecisionV1[] = [];
  for (const candidate of candidates) {
    const priors = candidate.decision_priors ?? [];
    if (priors.length === 0) continue;
    const tagged = tagCandidateExecutiveDecisionWithDecisionPriorsV1({
      candidate,
      decision_priors: priors,
    });
    if (tagged.ok) tagged_candidates.push(tagged.tagged);
  }

  const disagreement_records: FounderDisagreementRecordV1[] = [];
  for (const oar of oarRows) {
    if (!isFounderDisagreementStatusV1(oar.decision_status)) continue;
    const matched = matchCandidateForOar(oar, candidates);
    const priorSource =
      oar.executive_recommendation_decision_priors ?? matched?.decision_priors ?? [];
    const built = buildFounderDisagreementRecordV1({
      oar,
      executive_recommended_option: matched?.recommended_option ?? null,
      candidate_decision_request_id: matched?.decision_request_id ?? null,
      decision_priors: priorSource,
      source_paths: [
        "data/owner-decisions (founder_decision_registry_v1 OAR)",
        ...(matched ? ["data/owner-decisions/queue/requests (owner_decision_request_v1)"] : []),
      ],
    });
    if (built.ok) disagreement_records.push(built.record);
  }

  return {
    contract: DECISION_PRIORS_FRAMEWORK_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    steering_authority: false,
    nba_authority: false,
    dispatch_authority: false,
    daily_operator_authority: false,
    command_center_authority: false,
    source_command: DECISION_PRIORS_FRAMEWORK_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    catalog: DECISION_PRIOR_IDS_V1,
    labels_only: true,
    scoring: false,
    weighting: false,
    behavior_change: false,
    tagged_candidate_count: tagged_candidates.length,
    tagged_candidates,
    disagreement_record_count: disagreement_records.length,
    disagreement_records,
    oar_reuse: "founder_decision_registry_v1_owner_approval_records",
    odr_reuse: "owner_decision_request_v1",
    new_store_created: false,
    proven_facts: [
      "PROVEN: decision_priors_framework_v1 is read-only labels over existing OAR (founder_decision_registry) and ODR (owner_decision_request_v1).",
      "PROVEN: decision_priors are labels only — scoring=false, weighting=false, behavior_change=false.",
      "PROVEN: founder disagreement records retain executive_recommendation_decision_priors / decision_priors without granting authority.",
      "PROVEN: nba_authority=false, dispatch_authority=false, daily_operator_authority=false, command_center_authority=false, steering_authority=false.",
      "PROVEN: no new durable store was created for Decision Priors v1.",
    ],
    unknown_facts:
      candidates.length === 0 && oarRows.length === 0
        ? [
            "UNKNOWN: no ODR candidates or OAR rows were supplied to this projection (framework still valid).",
          ]
        : [],
  };
}
