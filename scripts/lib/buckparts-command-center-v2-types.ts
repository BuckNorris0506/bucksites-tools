/** Command Center v2 — owner/operator decision surface (read-only reports). */

import type { OwnerIntegritySentinelV1 } from "../../src/lib/owner-dashboard/owner-integrity-sentinel-v1";
import type { OwnerQuarantinedFridgeModelsV1 } from "../../src/lib/owner-dashboard/owner-quarantined-fridge-models-v1";
import type { DailyOperatorSummaryV1 } from "./buckparts-daily-operator-summary-v1";
import type { DemandWorkQueueSummaryV1 } from "./buckparts-demand-work-queue-summary-v1";
import type { LargeBatchCoverageFactorySummaryV1 } from "./buckparts-large-batch-coverage-factory-summary-v1";
import type { FounderDecisionRegistrySummaryV1 } from "./buckparts-founder-decision-registry-summary-v1";
import type { NextExecutionPacketSummaryV1 } from "./buckparts-next-execution-packet-summary-v1";
import type { OperatingMapSummaryV1 } from "./buckparts-operating-map-summary-v1";
import type { ApBatchV3RunInstantiationV1 } from "./ap-batch-v3-run-instantiation-v1";
import type { AirPurifierModelFirstProductionLaneReportV1 } from "./air-purifier-model-first-production-lane-v1";
import type { ApModelFirstEvidenceQueueReportV1 } from "./ap-model-first-evidence-queue-v1";
import type { AirPurifierWeakBuyerPathAuditReportV1 } from "./air-purifier-weak-buyer-path-audit-v1";
import type { BatchProductionOperatingChecklistV1 } from "./buckparts-batch-production-operating-checklist-v1";
import type { BatchProductionOperatingDispatchV1 } from "./buckparts-batch-production-operating-dispatch-v1";
import type { SystemContractAuditSummaryV1 } from "./buckparts-system-contract-audit-summary-v1";
import type { PagePublishabilityTruthSummaryV1 } from "./buckparts-page-publishability-truth-v1";
import type { AirPurifierTruthSpineV1 } from "./air-purifier-truth-spine-v1";
import type { FridgeTruthSpineV1 } from "./fridge-truth-spine-v1";
import type { WholeHouseWaterBatchProductionDirectorV1 } from "./whole-house-water-batch-production-director-v1";
import type { WedgeTruthSpineCoverageMatrixV1 } from "./wedge-truth-spine-coverage-matrix-v1";
import type { OwnerVerticalLaunchPolicyV1 } from "../../src/lib/owner-dashboard/owner-vertical-launch-policy-v1";
import type { SemiCruiseStatusSummaryV1 } from "../../src/lib/owner-dashboard/semi-cruise-status-summary-v1";
import type { CustomerLanguageAndWaterdropResearchLaneV1 } from "../../src/lib/owner-dashboard/customer-language-and-waterdrop-research-lane-v1";
import type { LearningOutcomeInsertInput } from "./learning-outcomes-writer";
import type { DemandToCoverageNextLaneReportV1 } from "./demand-to-coverage-next-lane-v1";
import type { BuckpartsMarketingIntelligenceEngineV1 } from "./buckparts-marketing-intelligence-engine-v1";
import type { BuckpartsAgentControlPlaneV1 } from "./buckparts-agent-control-plane-v1";

export type TokenControlStatus =
  | "LIVE_OUTCOME_RECORDED"
  | "UNKNOWN_EVIDENCE_RECORDED"
  | "FROZEN_OPERATOR_HOLD"
  | "OPERATOR_DECISION_REQUIRED";

export type AmazonRescueTokenControlEntry = {
  token: string;
  status: TokenControlStatus;
  reason: string;
  next_action: string;
  can_agent_advance: boolean;
  evidence_file?: string;
  updated_at?: string;
  notes?: string;
};

export type AmazonRescueTokenControlsFile = {
  schema_version: string;
  registry_name?: string;
  description?: string;
  entries: AmazonRescueTokenControlEntry[];
};

export type DecisionLaneStatus = "OK" | "ATTENTION" | "BLOCKED" | "PLACEHOLDER" | "UNKNOWN";
export type RecommendationActionType = "OWNER_ACTION" | "AGENT_ACTION" | "BLOCKER" | "WARNING";
export type RecommendationAuthorityLevel = "BRIGHT" | "SCOPED_PARTIAL" | "DARK" | "UNKNOWN";

export type RecommendationAuthorityRecord = {
  source: string;
  proposed_action: string;
  action_type: RecommendationActionType;
  authority_level: RecommendationAuthorityLevel;
  authority_scope: string;
  allowed_as_recommendation: boolean;
  reason: string;
};

export type DecisionLane = {
  status: DecisionLaneStatus;
  count?: number;
  top_items?: string[];
  blocker?: string | null;
  next_agent_action: string;
  next_owner_action: string;
  do_not_touch?: string[];
};

export type AmazonRescueLane = DecisionLane & {
  registry_path: string;
  registry_load_error: string | null;
  registry_entry_count: number;
  fresh_search_top_tokens: string[];
  human_browser_required_tokens: string[];
  asin_collision_policy_review_tokens: string[];
  frozen_operator_hold_tokens: string[];
  live_outcome_recorded_tokens: string[];
  operator_decision_required_tokens: string[];
  next_allowed_agent_token: string | null;
};

export type EvidenceRollup = {
  live_outcome_count: number;
  unknown_outcome_count: number;
  fail_hold_outcome_count: number;
  unclassified_json_count: number;
  recent_evidence_filenames: string[];
};

/** Read-only inventory over local evidence artifacts — not catalog-wide model coverage. */
export type EvidenceDataEvidenceBodyMappingV1 = {
  parsed_ok_count: number;
  parse_error_count: number;
  /** JSON object parsed and at least one rollup key (`scope`, `token`, `filter_slug`) is a non-empty string. */
  mapped_count: number;
  /** Parsed JSON object but no non-empty `scope` / `token` / `filter_slug` for rollup (may still carry other safe keys). */
  unmapped_count: number;
  by_scope: Record<string, number>;
  by_filter_slug: Record<string, number>;
  by_token: Record<string, number>;
};

export type EvidenceDataEvidenceInventorySliceV1 = {
  directory_relative_path: "data/evidence";
  total_json_files: number;
  /** Substrings in filenames only — not JSON `verdict` / outcome fields. */
  filename_outcome_buckets: {
    live_outcome_by_filename_substring: number;
    unknown_outcome_by_filename_substring: number;
    fail_hold_outcome_by_filename_substring: number;
    other_json_not_matching_filename_patterns: number;
  };
  recent_filenames: string[];
  recent_ordering: "lexicographic_by_filename";
  proven_facts: string[];
  unknown_facts: string[];
  body_mapping: EvidenceDataEvidenceBodyMappingV1;
};

export type RefrigeratorManualEvidenceInventorySliceV1 = {
  inventory_contract: "refrigerator_manual_evidence_files_v1";
  directory_relative_path: "data/manual-evidence/refrigerator";
  valid_record_count: number;
  invalid_or_unreadable_count: number;
  /** Slugs from records passing `validateRefrigeratorManualEvidencePublicReady` only. */
  validated_model_slugs: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type FridgeFormFactorEvidenceInventorySliceV1 = {
  inventory_contract: "fridge_form_factor_evidence_files_v1";
  directory_relative_path: "data/fridge-form-factor-evidence";
  valid_record_count: number;
  invalid_or_unreadable_count: number;
  validated_model_slugs: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type EvidenceInventoryV1 = {
  contract: "evidence_inventory_v1";
  proven_facts: string[];
  unknown_facts: string[];
  data_evidence: EvidenceDataEvidenceInventorySliceV1;
  refrigerator_manual_evidence: RefrigeratorManualEvidenceInventorySliceV1;
  fridge_form_factor_evidence: FridgeFormFactorEvidenceInventorySliceV1;
};

/** Outbound click visibility from `public.click_events` (read-only aggregates; not revenue). */
export type ClickWedgeBreakdown30d = {
  refrigerator_water: number | "UNKNOWN";
  air_purifier: number | "UNKNOWN";
  whole_house_water: number | "UNKNOWN";
  vacuum: number | "UNKNOWN";
  humidifier: number | "UNKNOWN";
  appliance_air: number | "UNKNOWN";
  other_or_legacy: number | "UNKNOWN";
};

/** Conservative UA bucket for click-quality (not buyer proof). */
export type ClickUserAgentCategory =
  | "INTERNAL_AUDIT"
  | "KNOWN_BOT"
  | "SCRIPTED_CLIENT"
  | "UNKNOWN"
  | "HUMAN_LIKELY";

export type ClickFreshnessStatus = "OK" | "STALE" | "NO_RECENT_EVENTS" | "UNKNOWN";

export type ClickVisibilitySnapshot = {
  runtime_status: "OK" | "UNKNOWN_DB_UNAVAILABLE" | "UNKNOWN_SCHEMA";
  generated_at: string;
  window_days: { short: 7; long: 30 };
  /** Raw `click_events` counts (same as head-count queries on `created_at`). */
  last_7_days_clicks: number | "UNKNOWN";
  last_30_days_clicks: number | "UNKNOWN";
  /** Explicit raw aliases (same values as `last_*` when runtime is OK). */
  raw_last_7_days_clicks: number | "UNKNOWN";
  raw_last_30_days_clicks: number | "UNKNOWN";
  /** Rows classified `HUMAN_LIKELY` (conservative browser-like UA, not bot/audit/script). */
  human_likely_last_7_days_clicks: number | "UNKNOWN";
  human_likely_last_30_days_clicks: number | "UNKNOWN";
  /** All non–`HUMAN_LIKELY` rows in the 30d window (includes `UNKNOWN` missing UA). */
  excluded_last_30_days_clicks: number | "UNKNOWN";
  /** Counts in the 30d window for each non–human-likely bucket (excludes `HUMAN_LIKELY`). */
  excluded_by_category_30d: Partial<Record<Exclude<ClickUserAgentCategory, "HUMAN_LIKELY">, number>> | "UNKNOWN";
  /** Top normalized user-agent strings in the 30d window (raw attribution). */
  top_user_agent_families_30d?: Array<{ user_agent: string; clicks: number; category: ClickUserAgentCategory }>;
  newest_click_at: string | "UNKNOWN";
  oldest_click_at_in_30d_window: string | "UNKNOWN";
  click_freshness_status: ClickFreshnessStatus;
  click_freshness_reason: string;
  /** Raw outbound clicks are not revenue; human-likely is a conservative filter, not buyer intent proof. */
  click_quality_notes?: string;
  clicks_by_wedge_30d: ClickWedgeBreakdown30d;
  top_retailer_slugs_30d?: Array<{ retailer_slug: string; clicks: number }>;
  top_page_attribution_30d?: Array<{ page_type: string | null; page_slug: string | null; clicks: number }>;
  top_wedge_link_ids_30d?: Array<{ wedge: string; link_id: string; clicks: number }>;
  commission_or_revenue: "NOT_CONNECTED";
  commission_or_revenue_notes: string;
  aggregation_notes?: string[];
};

/** v2 revenue card: operational click visibility; commission remains `NOT_CONNECTED` in-repo. */
export type RevenueSnapshotLane = DecisionLane & {
  click_visibility?: ClickVisibilitySnapshot;
};

export type LiveSiteSmokeRouteResultV1 = {
  path: string;
  status_code: number | "UNKNOWN";
  ok: boolean;
  latency_ms: number | "UNKNOWN";
  marker_found: boolean | "UNKNOWN";
};

export type LiveSiteMonitorDeploySyncStatusV1 =
  | "MATCHES_ORIGIN_MAIN"
  | "DEPLOYED_COMMIT_DIFFERS"
  | "UNKNOWN_DEPLOY_COMMIT";

/** Produced by `npm run buckparts:live-site-smoke` — HTTP smoke only; no Netlify API. */
export type LiveSiteMonitorV1 = {
  contract: "live_site_monitor_v1";
  checked_at: string;
  source: string;
  /** Primary checked target. Prefer LIVE_SITE_SMOKE_TARGET_URL / BUCKPARTS_PUBLIC_SITE_URL; legacy fallback is NEXT_PUBLIC_SITE_URL. */
  primary_target_base_url: string;
  target_source: "LIVE_SITE_SMOKE_TARGET_URL" | "BUCKPARTS_PUBLIC_SITE_URL" | "NEXT_PUBLIC_SITE_URL" | "UNKNOWN";
  custom_domain_base_url: string | "UNKNOWN";
  custom_domain_checked: boolean;
  netlify_fallback_base_url: string | "UNKNOWN";
  netlify_domain_checked: boolean | "UNKNOWN";
  /** Backward-compatible alias for primary_target_base_url. */
  target_base_url: string;
  runtime_status: "OK" | "UNKNOWN_CONFIG" | "ATTENTION";
  routes: LiveSiteSmokeRouteResultV1[];
  local_head_commit: string | "UNKNOWN";
  origin_main_commit: string | "UNKNOWN";
  deployed_commit: string | "UNKNOWN";
  deploy_sync_status: LiveSiteMonitorDeploySyncStatusV1;
  proven_facts: string[];
  unknown_facts: string[];
};

/** Read-only Demand→Coverage slice over `public.search_gaps` (Command Center v2). */
export type DemandToCoverageRuntimeStatus = "OK" | "UNKNOWN_DB_UNAVAILABLE" | "UNKNOWN_QUERY_ERROR";

/** v1 does not prove catalog coverage; `SCOPED_PARTIAL` reserved for future narrow existence proofs only. */
export type DemandToCoverageCoverageState = "UNKNOWN" | "SCOPED_PARTIAL";

export type DemandToCoverageEvidenceGapKind =
  | "ZERO_RESULT_GAP"
  | "ENTITY_TYPE_UNKNOWN"
  | "COVERAGE_UNKNOWN"
  | "VERIFICATION_REQUIRED"
  | "UNKNOWN";

export type DemandToCoverageVerificationRecommendation =
  | "RESEARCH_CANDIDATE_ENTITY"
  | "VERIFY_COMPATIBILITY_EVIDENCE"
  | "CHECK_RETAILER_EVIDENCE"
  | "OWNER_REVIEW_REQUIRED"
  | "UNKNOWN";

/** Proven demand fields from `search_gaps` DDL (migration `20260410170000_search_intelligence.sql`). */
export type DemandToCoverageSearchGapDemandV1 = {
  search_gap_id: string;
  catalog: string;
  normalized_query: string;
  sample_raw_query: string;
  search_count: number;
  zero_result_count: number;
  last_seen_at: string;
  status: string;
  likely_entity_type: string;
};

export type DemandToCoverageBoundedRowV1 = {
  demand: DemandToCoverageSearchGapDemandV1;
  /** Catalog-wide coverage is not proven from this slice; v1 defaults conservative. */
  coverage_state: DemandToCoverageCoverageState;
  evidence_gap_kind: DemandToCoverageEvidenceGapKind;
  recommended_verification: DemandToCoverageVerificationRecommendation;
  unknown_facts: string[];
  /** Agent-safe read-only paths vs owner gates for mutations / public surface. */
  authority: RecommendationAuthorityRecord[];
};

export type DemandToCoverageEngineV1 = {
  contract: "demand_to_coverage_engine_v1";
  runtime_status: DemandToCoverageRuntimeStatus;
  bounded_row_cap: 20;
  rows: DemandToCoverageBoundedRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type LearningOutcomesReadModelRuntimeStatus = "OK" | "UNKNOWN_DB_UNAVAILABLE" | "UNKNOWN_QUERY_ERROR";

export type LearningOutcomesByOutcomeV1 = {
  pass: number;
  fail: number;
  blocked: number;
  unknown: number;
};

export type LearningOutcomesByConfidenceV1 = {
  exact: number;
  likely: number;
  uncertain: number;
  /** Rows where `confidence` is null (allowed by DDL). */
  unset: number;
};

export type LearningOutcomesByCtaStatusV1 = {
  live: number;
  not_live: number;
  blocked: number;
  /** Rows where `cta_status` is null (allowed by DDL). */
  unset: number;
};

/** Latest rows: proven columns only; excludes evidence JSON, URLs, free-text reason fields, clicks, conversions. */
export type LearningOutcomesLatestRowV1 = {
  id: string;
  slug: string;
  outcome: string;
  confidence: string | null;
  cta_status: string | null;
  date_checked: string;
  created_at: string;
  retailer: string | null;
  index_status: string | null;
  part_number: string | null;
  model_number: string | null;
};

export type LearningOutcomesReadModelV1 = {
  contract: "learning_outcomes_read_model_v1";
  runtime_status: LearningOutcomesReadModelRuntimeStatus;
  /** Head count on `public.learning_outcomes`; UNKNOWN when query fails. */
  total_outcomes: number | "UNKNOWN";
  /** Count of rows with `date_checked` in the last `recent_window_days` days (operator window). */
  recent_outcomes: number | "UNKNOWN";
  recent_window_days: 30;
  by_outcome: LearningOutcomesByOutcomeV1 | "UNKNOWN";
  by_confidence: LearningOutcomesByConfidenceV1 | "UNKNOWN";
  by_cta_status: LearningOutcomesByCtaStatusV1 | "UNKNOWN";
  /** Newest by `date_checked` desc, capped (no large payloads). */
  latest_outcomes: LearningOutcomesLatestRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

/** Proposed row fields aligned with `public.learning_outcomes` DDL; evidence is a bounded stub only (not full file). */
export type ProposedLearningOutcomeRowV1 = {
  slug: string;
  part_number: string | null;
  model_number: string | null;
  candidate_url: string | null;
  retailer: string | null;
  outcome: "pass" | "fail" | "blocked" | "unknown";
  reason: string;
  reason_detail: string | null;
  confidence: "exact" | "likely" | "uncertain" | null;
  cta_status: "live" | "not_live" | "blocked" | null;
  index_status: string | null;
  date_checked: string;
  next_action: string | null;
  evidence_jsonb_stub: Record<string, unknown>;
};

export type EvidenceToLoImportCandidateV1 = {
  source_file: string;
  proposed_learning_outcome: ProposedLearningOutcomeRowV1;
  mapping_basis: string[];
  missing_or_unknown_fields: string[];
  owner_approval_required: true;
};

export type EvidenceToLoRejectedSampleV1 = {
  source_file: string;
  reject_reason: string;
};

export type EvidenceToLearningOutcomesCandidateImportV1 = {
  contract: "evidence_to_learning_outcomes_candidate_import_v1";
  runtime_status: "OK" | "UNKNOWN_IO_ERROR";
  scanned_file_count: number;
  parseable_file_count: number;
  candidate_count: number;
  rejected_count: number;
  candidates: EvidenceToLoImportCandidateV1[];
  /**
   * Every discovered candidate before display capping (same cardinality as candidate_count when built by
   * buildEvidenceToLearningOutcomesCandidateImportV1). Omitted from JSON stdout in report-buckparts-command-center
   * to keep artifacts bounded; insert plan uses this when present.
   */
  candidates_evaluated_uncapped_v1?: EvidenceToLoImportCandidateV1[];
  rejected_samples: EvidenceToLoRejectedSampleV1[];
  proven_facts: string[];
  unknown_facts: string[];
  owner_approval_required: true;
  data_mutation: false;
};

export type LearningOutcomesInsertPlanBatchRowV1 = {
  source_file: string;
  disposition: "writer_ready" | "owner_review_required" | "blocked_from_writer_batch";
  proposed_learning_outcome: ProposedLearningOutcomeRowV1;
  reasons: string[];
  proposed_owner_actions: string[];
};

export type LearningOutcomesInsertPlanReviewOrBlockedRowV1 = {
  source_file: string;
  disposition: "owner_review_required" | "blocked_from_writer_batch";
  reasons: string[];
  proposed_owner_actions: string[];
};

export type LearningOutcomesInsertPlanV1 = {
  contract: "learning_outcomes_insert_plan_v1";
  runtime_status: "OK" | "UNKNOWN_INPUT";
  source_candidate_count: number;
  writer_ready_count: number;
  owner_review_required_count: number;
  blocked_count: number;
  proposed_first_batch: LearningOutcomesInsertPlanBatchRowV1[];
  blocked_or_needs_owner_review: LearningOutcomesInsertPlanReviewOrBlockedRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
  owner_approval_required: true;
  data_mutation: false;
};

export type LearningOutcomesWriterReadyBatchReviewRowV1 = {
  source_file: string;
  /** Exact `LearningOutcomeInsertInput` shape for insertLearningOutcome — not executed by this report. */
  proposed_insert_payload: LearningOutcomeInsertInput;
  validation_basis: string[];
  owner_approval_required: true;
  approval_status: "PENDING_OWNER_REVIEW";
};

export type LearningOutcomesWriterReadyBatchReviewV1 = {
  contract: "learning_outcomes_writer_ready_batch_review_v1";
  runtime_status: "OK" | "UNKNOWN_INPUT";
  source_writer_ready_count: number;
  reviewed_row_count: number;
  rows: LearningOutcomesWriterReadyBatchReviewRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
  owner_approval_required: true;
  data_mutation: false;
};

export type LearningOutcomesOwnerConfidenceAssignmentPlanRowV1 = {
  source_file: string;
  proposed_learning_outcome: ProposedLearningOutcomeRowV1;
  missing_field: "confidence";
  allowed_confidence_values: readonly ["exact", "likely", "uncertain"];
  recommended_owner_question: string;
  blocked_until_owner_sets_confidence: true;
  owner_approval_required: true;
  /** True when a valid registry row targets this source_file + slug/token even if confidence is still null on the candidate (e.g. path mismatch). */
  matching_owner_confidence_registry_entry: boolean;
};

export type LearningOutcomesOwnerConfidenceAssignmentPlanV1 = {
  contract: "learning_outcomes_owner_confidence_assignment_plan_v1";
  runtime_status: "OK" | "UNKNOWN_INPUT";
  source_candidate_count: number;
  assignment_candidate_count: number;
  rows: LearningOutcomesOwnerConfidenceAssignmentPlanRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
  owner_approval_required: true;
  data_mutation: false;
};

export type LearningOutcomesConfidenceApprovalEntryV1 = {
  source_file: string;
  slug: string;
  confidence: "exact" | "likely" | "uncertain";
  approved_by_owner: true;
  approval_reason: string;
};

export type LearningOutcomesConfidenceApprovalRegistryV1 = {
  contract: "learning_outcomes_confidence_approval_registry_v1";
  runtime_status: "OK" | "MISSING_FILE" | "INVALID_JSON" | "INVALID_SCHEMA" | "UNKNOWN_INPUT";
  registry_path: string;
  valid_approval_count: number;
  invalid_approval_count: number;
  applied_approval_count: number;
  unapplied_approval_count: number;
  proven_facts: string[];
  unknown_facts: string[];
  owner_approval_required: true;
  data_mutation: false;
};

/** Result of read-only `loadLearningOutcomesConfidenceApprovalsRegistry` (not a Command Center block). */
export type LearningOutcomesConfidenceApprovalsLoadedV1 = {
  registry_relative_path: string;
  runtime_status: "OK" | "MISSING_FILE" | "INVALID_JSON" | "INVALID_SCHEMA";
  valid_approvals: LearningOutcomesConfidenceApprovalEntryV1[];
  invalid_entries: Array<{ index: number; reasons: string[] }>;
  proven_facts: string[];
  unknown_facts: string[];
};

export type PublicTrustUnificationBackendContractRuntimeV1 = "OK" | "UNKNOWN_INPUT" | "BLOCKED";

export type PublicTrustCoverageStatusV1 = "PROVEN" | "PARTIAL" | "UNKNOWN" | "BLOCKED";

export type PublicTrustEvaluatedSurfaceV1 = {
  surface_id: string;
  what_was_found: string;
  confidence_state: "PROVEN" | "PARTIAL" | "UNKNOWN";
  evidence_basis: string;
  compare_before_buying_guidance: string;
  safe_buy_cta_state: string;
  uncertainty_or_no_buy_fallback: string;
  next_action: string;
  provenance_source_fields_available: string;
};

/** Read-only repo file-presence contract for public trust signal wiring — not live PDP or commission proof. */
export type PublicTrustUnificationBackendContractV1 = {
  contract: "public_trust_unification_backend_contract_v1";
  runtime_status: PublicTrustUnificationBackendContractRuntimeV1;
  page_contracts_evaluated_count: number;
  proven_signal_count: number;
  missing_signal_count: number;
  coverage_status: PublicTrustCoverageStatusV1;
  required_signals: string[];
  evaluated_surfaces: PublicTrustEvaluatedSurfaceV1[];
  proven_facts: string[];
  unknown_facts: string[];
  owner_approval_required: false;
  data_mutation: false;
  read_only: true;
};

export type RevenueTruthLedgerContractRuntimeV1 =
  | "OK"
  | "MISSING_FILE"
  | "INVALID_JSON"
  | "INVALID_SCHEMA"
  | "IO_ERROR"
  | "PARTIAL_VALIDATION"
  | "UNKNOWN_INPUT";

export type RevenueTruthLedgerCoverageStatusV1 = "PROVEN" | "PARTIAL" | "UNKNOWN" | "BLOCKED";

/** Read-only commission ledger input from `data/ops/revenue-ledger-v1.json` — not click-derived revenue. */
export type RevenueTruthLedgerContractV1 = {
  contract: "revenue_truth_ledger_contract_v1";
  runtime_status: RevenueTruthLedgerContractRuntimeV1;
  ledger_file_relative_path: string;
  ledger_inner_contract: string | null;
  coverage_status: RevenueTruthLedgerCoverageStatusV1;
  valid_entry_count: number;
  invalid_entry_count: number;
  entries_evaluated_count: number;
  total_reported_gross_usd: number | "UNKNOWN";
  invalid_entry_samples: Array<{ index: number; reasons: string[] }>;
  proven_facts: string[];
  unknown_facts: string[];
  owner_approval_required: false;
  data_mutation: false;
  read_only: true;
};

export type FoundationScorecardLaneStatusV1 = "PROVEN" | "PARTIAL" | "BLOCKED" | "UNKNOWN";

export type FoundationScorecardLaneV1 = {
  lane_id: string;
  label: string;
  status: FoundationScorecardLaneStatusV1;
  score_contribution: number;
  max_contribution: number;
  proven_basis: string[];
  unknowns: string[];
  next_proof_required: string;
};

export type TopOfGameFoundationScorecardRuntimeV1 = "OK" | "UNKNOWN_INPUT";

export type TopOfGameFoundationScorecardV1 = {
  contract: "top_of_game_foundation_scorecard_v1";
  runtime_status: TopOfGameFoundationScorecardRuntimeV1;
  foundation_maturity_score_100: number;
  current_goal_score_100: number;
  goal_reached: boolean;
  lanes: FoundationScorecardLaneV1[];
  blockers: string[];
  next_best_foundation_move: string;
  owner_dashboard_ready: boolean;
  owner_dashboard_note: string;
  read_only: true;
  data_mutation: false;
  proven_facts: string[];
  unknown_facts: string[];
};

export type BatchProductionOwnerDecisionsLaneRuntimeStatusV1 =
  | "OK"
  | "UNKNOWN_REGISTRY_MISSING"
  | "UNKNOWN_PARSE_ERROR"
  | "UNKNOWN_NO_BATCH_ROWS";

export type BatchProductionOwnerDecisionsApprovedRowV1 = {
  row_id: string;
  token: string;
  decision_status: string;
  allowed_next_scope: string;
  founder_option_id: string;
  source_registry_file: string;
};

export type ExternalMeasurementFreshnessStatusV1 = "OK" | "STALE" | "UNKNOWN";
export type ExternalMeasurementFreshnessRuntimeStatusV1 = "OK" | "PARTIAL" | "UNKNOWN";
export type ExternalMeasurementUsabilityStatusV1 = "OK" | "UNKNOWN";

export type ExternalMeasurementFreshnessGscV1 = {
  runtime_status: "OK" | "UNKNOWN";
  connection_level: "BRIGHT" | "DIM" | "DARK" | "UNKNOWN";
  artifact_source: "SUPABASE" | "LOCAL_ARTIFACT" | "MANUAL_EXPORT" | "NONE";
  fetched_at_or_export_date: string | "UNKNOWN";
  artifact_recency_status: ExternalMeasurementFreshnessStatusV1;
  measurement_usability_status: ExternalMeasurementUsabilityStatusV1;
  freshness_status: ExternalMeasurementFreshnessStatusV1;
  top_level_note: string;
};

export type ExternalMeasurementFreshnessGa4V1 = {
  runtime_status: "OK" | "UNKNOWN";
  artifact_source: "SUPABASE" | "LOCAL_ARTIFACT" | "NONE";
  fetched_at: string | "UNKNOWN";
  artifact_recency_status: ExternalMeasurementFreshnessStatusV1;
  measurement_usability_status: ExternalMeasurementUsabilityStatusV1;
  freshness_status: ExternalMeasurementFreshnessStatusV1;
  top_level_note: string;
};

/** Read-only GSC/GA4 durable artifact freshness for Command Center — no fetch or mutation. */
export type ExternalMeasurementFreshnessV1 = {
  contract: "external_measurement_freshness_v1";
  read_only: true;
  data_mutation: false;
  runtime_status: ExternalMeasurementFreshnessRuntimeStatusV1;
  overall_status: ExternalMeasurementFreshnessStatusV1;
  gsc: ExternalMeasurementFreshnessGscV1;
  ga4: ExternalMeasurementFreshnessGa4V1;
  recommended_commands: ["npm run buckparts:gsc:fetch", "npm run buckparts:ga4:fetch"];
  proven_facts: string[];
  unknown_facts: string[];
};

export type BrainCoverageVerdictV1 =
  | "CONNECTED"
  | "PARTIAL"
  | "BYPASSING"
  | "DUPLICATE"
  | "DEPRECATED"
  | "MISSING";

export type BrainCoverageManifestEntryV1 = {
  system_id: string;
  npm_script_or_path: string;
  cc_json_path: string | null;
  dashboard_only: boolean;
  verdict: BrainCoverageVerdictV1;
  blocks_lane_work: boolean;
  validation_command: string;
  reason: string;
};

export type BrainCoverageVerdictCountsV1 = Record<BrainCoverageVerdictV1, number>;

/** Compact operator snapshot; avoids scanning entries[] for verdict totals. */
export type CommandCenterBrainCoverageManifestSummaryV1 = {
  total_entries: number;
  verdict_counts: BrainCoverageVerdictCountsV1;
};

/** Read-only inventory of which operating systems feed Command Center JSON vs bypass it. */
export type CommandCenterBrainCoverageManifestV1 = {
  contract: "command_center_brain_coverage_manifest_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  total_entries: number;
  entries: BrainCoverageManifestEntryV1[];
  /** Compact verdict totals for operator jq (same object as summary.verdict_counts). */
  verdict_counts: BrainCoverageVerdictCountsV1;
  summary: CommandCenterBrainCoverageManifestSummaryV1;
  /** @deprecated Use verdict_counts or summary.verdict_counts; kept for backward compatibility. */
  summary_by_verdict: BrainCoverageVerdictCountsV1;
  proven_facts: string[];
  unknown_facts: string[];
};

export type BrainIntegrityGateRuntimeStatusV1 = "OK" | "UNKNOWN";
export type BrainIntegrityGateBrainStatusV1 =
  | "PROCEED"
  | "PROCEED_WITH_KNOWN_LIMITS"
  | "STOP_THE_LINE";

export const BRAIN_CONSOLIDATION_CLASSIFICATIONS_V1 = [
  "INTEGRATE_AS_CC_OPERATING_SUMMARY",
  "INTENTIONALLY_STANDALONE_DOWNSTREAM_VIEW",
  "INTENTIONALLY_STANDALONE_VALIDATION_HARNESS",
  "INTENTIONALLY_STANDALONE_ON_DEMAND_DEEP_PROOF",
  "DO_NOT_INTEGRATE_MUTATING_EXECUTOR",
  "DO_NOT_INTEGRATE_DEPRECATED_CONTEXT",
  "EXTERNAL_LIVE_TRUTH_REQUIRED",
  "DEDUPE_EXISTING_CC_TRUTH",
  "UNKNOWN_CLASSIFICATION_REQUIRES_REVIEW",
] as const;

export type BrainConsolidationClassificationV1 = (typeof BRAIN_CONSOLIDATION_CLASSIFICATIONS_V1)[number];

export type BrainConsolidationClassificationCountsV1 = Record<BrainConsolidationClassificationV1, number>;

export type BrainConsolidationPlanEntryV1 = {
  system_id: string;
  verdict: BrainCoverageVerdictV1;
  dashboard_only: boolean;
  cc_json_path: string | null;
  consolidation_classification: BrainConsolidationClassificationV1;
  consolidation_reason: string;
};

/** Read-only consolidation roadmap from manifest + gate (one slice at a time). */
export type BrainConsolidationPlanV1 = {
  contract: "brain_consolidation_plan_v1";
  read_only: true;
  data_mutation: false;
  total_entries: number;
  connected_count: number;
  missing_count: number;
  bypassing_count: number;
  duplicate_count: number;
  deprecated_count: number;
  partial_count: number;
  dashboard_only_gap_count: number;
  classification_counts: BrainConsolidationClassificationCountsV1;
  next_safe_integration_target: BrainConsolidationPlanEntryV1 | null;
  skipped_standalone_count: number;
  skipped_external_count: number;
  skipped_duplicate_count: number;
  unknown_classification_count: number;
  high_priority_consolidation_targets: BrainConsolidationPlanEntryV1[];
  intentionally_standalone_entries: BrainConsolidationPlanEntryV1[];
  do_not_integrate_entries: BrainConsolidationPlanEntryV1[];
  /** Set only when classification is INTEGRATE_AS_CC_OPERATING_SUMMARY; otherwise null. */
  next_consolidation_slice: string | null;
  stop_rule: string;
  proven_facts: string[];
  unknown_facts: string[];
};

/** Read-only lane-work governance derived from brain coverage manifest only. */
export type BrainIntegrityGateV1 = {
  contract: "brain_integrity_gate_v1";
  read_only: true;
  data_mutation: false;
  runtime_status: BrainIntegrityGateRuntimeStatusV1;
  brain_status: BrainIntegrityGateBrainStatusV1;
  total_entries: number;
  verdict_counts: BrainCoverageVerdictCountsV1;
  /** Same totals as command_center_brain_coverage_manifest_v1.verdict_counts when manifest is present. */
  brain_manifest_counts: BrainCoverageVerdictCountsV1;
  stop_the_line_entries: BrainCoverageManifestEntryV1[];
  allowed_bypass_entries: BrainCoverageManifestEntryV1[];
  missing_entries: BrainCoverageManifestEntryV1[];
  duplicate_entries: BrainCoverageManifestEntryV1[];
  partial_entries: BrainCoverageManifestEntryV1[];
  next_brain_action: string;
  lane_work_allowed: boolean;
  lane_work_allowed_reason: string;
  proven_facts: string[];
  unknown_facts: string[];
};

/** Read-only Layer 7 batch owner approvals from committed founder_decision_registry_v1 exports. */
export type BatchProductionOwnerDecisionsLaneV1 = {
  contract: "batch_production_owner_decisions_lane_v1";
  read_only: true;
  data_mutation: false;
  runtime_status: BatchProductionOwnerDecisionsLaneRuntimeStatusV1;
  source_registry_files: string[];
  primary_source_registry_file: string | "UNKNOWN";
  approved_for_planning_count: number;
  approved_rows: BatchProductionOwnerDecisionsApprovedRowV1[];
  source_row_count: number | "UNKNOWN";
  excluded_not_owner_review_ready_row_ids: string[] | "UNKNOWN";
  mutation_authority: false;
  may_mutate: false;
  may_write_production_evidence: false;
  automation_input: false;
  layer_6_founder_only_production_mutation_approval: "NOT_PROVEN";
  production_evidence_commit: "NOT_PROVEN";
  batch_size_20_status: "BLOCKED";
  owner_action_required: "none";
  next_agent_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

/** Read-only mirror of final root operator digest fields for jq-safe v2 queries. */
export type OperatorDigestProjectionV1 = {
  contract: "operator_digest_v1";
  read_only: true;
  data_mutation: false;
  next_best_action: string;
  why_this_action: string;
  execution_guidance: {
    next_move_mode: "READ_ONLY" | "MUTATING";
    next_move_command: string;
    mutating_blocked: boolean;
    mutating_block_reasons: string[];
    staleness_or_dirty_risk: string[];
  };
  source: "buckparts_command_center_v1_root_digest";
};

export type CommandCenterV2Report = {
  schema_version: "1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  amazon_rescue: AmazonRescueLane;
  unknown_or_human_review: DecisionLane;
  affiliate_readiness: DecisionLane;
  coverage_health: DecisionLane;
  recent_evidence: DecisionLane & { evidence_rollup: EvidenceRollup; evidence_inventory: EvidenceInventoryV1 };
  deploy_live_site_status: DecisionLane & { live_site_monitor: LiveSiteMonitorV1 | null };
  revenue_snapshot: RevenueSnapshotLane;
  /** Bounded read-only view of search demand gaps — not fit/buy proof. */
  demand_to_coverage_engine_v1: DemandToCoverageEngineV1;
  /** Read-only visibility into `public.learning_outcomes` aggregates — not fit, buy, or revenue proof. */
  learning_outcomes_read_model_v1: LearningOutcomesReadModelV1;
  /** Read-only plan: map `data/evidence` JSON files to hypothetical `learning_outcomes` rows — never executed here. */
  evidence_to_learning_outcomes_candidate_import_v1: EvidenceToLearningOutcomesCandidateImportV1;
  /** Read-only first-batch insert ordering vs insertLearningOutcome gates — no DB writes. */
  learning_outcomes_insert_plan_v1: LearningOutcomesInsertPlanV1;
  /** Writer-ready rows only: exact insert payloads for owner review — no DB writes. */
  learning_outcomes_writer_ready_batch_review_v1: LearningOutcomesWriterReadyBatchReviewV1;
  /** Live-outcome Amazon rows blocked only by missing confidence — owner must choose literal; no auto-fill. */
  learning_outcomes_owner_confidence_assignment_plan_v1: LearningOutcomesOwnerConfidenceAssignmentPlanV1;
  /** Read-only view of owner-approved confidence registry file + match counts vs evidence candidates. */
  learning_outcomes_confidence_approval_registry_v1: LearningOutcomesConfidenceApprovalRegistryV1;
  /** Read-only file-presence map for trust / buy-shell modules — not live page or revenue proof. */
  public_trust_unification_backend_contract_v1: PublicTrustUnificationBackendContractV1;
  /** Read-only owner ledger JSON input contract — not click_events, not affiliate API proof. */
  revenue_truth_ledger_contract_v1: RevenueTruthLedgerContractV1;
  recommendation_authority: {
    evaluated_actions: RecommendationAuthorityRecord[];
  };
  /** First token safe for autonomous fresh exact-token search work per registry + queue (null if none). */
  next_allowed_agent_token: string | null;
  /** Highest-priority owner-facing step synthesized from lanes (not chat memory). */
  next_owner_action: string;
  /** Read-only foundation maturity scorecard toward 100% pre-polish — not dashboard UI. */
  top_of_game_foundation_scorecard_v1: TopOfGameFoundationScorecardV1;
  batch_production_owner_decisions_lane_v1: BatchProductionOwnerDecisionsLaneV1;
  /** Read-only batch production stage gates, safety classifications, and setback detectors. */
  batch_production_operating_checklist_v1: BatchProductionOperatingChecklistV1;
  /** Machine-readable batch dispatch derived from checklist operating_decision + stages. */
  batch_production_operating_dispatch_v1: BatchProductionOperatingDispatchV1;
  external_measurement_freshness_v1: ExternalMeasurementFreshnessV1;
  command_center_brain_coverage_manifest_v1: CommandCenterBrainCoverageManifestV1;
  brain_integrity_gate_v1: BrainIntegrityGateV1;
  owner_integrity_sentinel_v1: OwnerIntegritySentinelV1;
  owner_quarantined_fridge_models_v1: OwnerQuarantinedFridgeModelsV1;
  owner_vertical_launch_policy_v1: OwnerVerticalLaunchPolicyV1;
  daily_operator_summary_v1: DailyOperatorSummaryV1;
  demand_work_queue_summary_v1: DemandWorkQueueSummaryV1;
  /** Read-only Large Batch Coverage Factory projection for Codex / Semi-Cruise planning — not mutation-ready. */
  large_batch_coverage_factory_summary_v1: LargeBatchCoverageFactorySummaryV1;
  system_contract_audit_summary_v1: SystemContractAuditSummaryV1;
  founder_decision_registry_summary_v1: FounderDecisionRegistrySummaryV1;
  next_execution_packet_summary_v1: NextExecutionPacketSummaryV1;
  operating_map_summary_v1: OperatingMapSummaryV1;
  brain_consolidation_plan_v1: BrainConsolidationPlanV1;
  /** Read-only semantic page/publishability truth for refrigerator filter pages (Cruise diagnostics). */
  page_publishability_truth_summary_v1: PagePublishabilityTruthSummaryV1;
  /** Read-only refrigerator CSV / evidence / Supabase / public truth spine — not mutation authority. */
  fridge_truth_spine_v1: FridgeTruthSpineV1;
  /** Read-only air purifier committed CSV / buy-gate / public copy truth spine — not mutation authority. */
  air_purifier_truth_spine_v1: AirPurifierTruthSpineV1;
  /** Read-only WHW multi-filter batch production director — not CSV apply or public opening authority. */
  whole_house_water_batch_production_director_v1: WholeHouseWaterBatchProductionDirectorV1;
  /** Read-only wedge truth spine parity matrix — formal spine vs partial proof per wedge. */
  wedge_truth_spine_coverage_matrix_v1: WedgeTruthSpineCoverageMatrixV1;
  /** Final root operator guidance mirrored after brain-gate adjustment (jq-safe v2 path). */
  operator_digest_v1: OperatorDigestProjectionV1;
  /** jq-safe mirror of root execution_guidance after batch dispatch override (set in report builder). */
  execution_guidance?: OperatorDigestProjectionV1["execution_guidance"];
  /** Read-only Semi-Cruise + Netlify credit conservation snapshot — not a mutation permission source. */
  semi_cruise_status_summary_v1: SemiCruiseStatusSummaryV1;
  /** Read-only customer language doctrine paths + Waterdrop DA29-00020B research/CTA status — not published copy. */
  customer_language_and_waterdrop_research_lane_v1: CustomerLanguageAndWaterdropResearchLaneV1;
  /** Read-only GSC demand × wedge launch × repo buyer-path coverage join — not mutation authority. */
  demand_to_coverage_next_lane_v1: DemandToCoverageNextLaneReportV1;
  /** Read-only proposed ap-batch-v3 run descriptor from Command Center lane selection — not mutation authority. */
  ap_batch_v3_run_instantiation_v1?: ApBatchV3RunInstantiationV1;
  /** Read-only model-first AP production strategy lane — appliance model before filter-SKU rescue. */
  air_purifier_model_first_production_lane_v1?: AirPurifierModelFirstProductionLaneReportV1;
  /** Read-only weak buyer path diagnosis for linked AP filters without safe primaries. */
  air_purifier_weak_buyer_path_audit_v1?: AirPurifierWeakBuyerPathAuditReportV1;
  /** Read-only model-first evidence queue for steering (no packet files written). */
  ap_model_first_evidence_queue_v1?: ApModelFirstEvidenceQueueReportV1;
  /** Read-only marketing opportunities and asset briefs from proven operating truth — no auto-publish. */
  marketing_intelligence_engine_v1: BuckpartsMarketingIntelligenceEngineV1;
  /** Read-only always-on agent work queue — permissioned lanes; does not replace batch dispatch. */
  agent_control_plane_v1: BuckpartsAgentControlPlaneV1;
};

export type { DemandToCoverageNextLaneReportV1 };

export type { CustomerLanguageAndWaterdropResearchLaneV1 } from "../../src/lib/owner-dashboard/customer-language-and-waterdrop-research-lane-v1";
export type { SemiCruiseStatusSummaryV1 } from "../../src/lib/owner-dashboard/semi-cruise-status-summary-v1";

export type { OwnerIntegritySentinelV1 } from "../../src/lib/owner-dashboard/owner-integrity-sentinel-v1";
export type { OwnerQuarantinedFridgeModelsV1 } from "../../src/lib/owner-dashboard/owner-quarantined-fridge-models-v1";
export type { OwnerVerticalLaunchPolicyV1 } from "../../src/lib/owner-dashboard/owner-vertical-launch-policy-v1";
export type { DailyOperatorSummaryV1 } from "./buckparts-daily-operator-summary-v1";
export type { DemandWorkQueueSummaryV1 } from "./buckparts-demand-work-queue-summary-v1";
export type { LargeBatchCoverageFactorySummaryV1 } from "./buckparts-large-batch-coverage-factory-summary-v1";
export type { FounderDecisionRegistrySummaryV1 } from "./buckparts-founder-decision-registry-summary-v1";
export type { NextExecutionPacketSummaryV1 } from "./buckparts-next-execution-packet-summary-v1";
export type { OperatingMapSummaryV1 } from "./buckparts-operating-map-summary-v1";
export type { AirPurifierModelFirstProductionLaneReportV1 } from "./air-purifier-model-first-production-lane-v1";
export type { ApModelFirstEvidenceQueueReportV1 } from "./ap-model-first-evidence-queue-v1";
export type { AirPurifierWeakBuyerPathAuditReportV1 } from "./air-purifier-weak-buyer-path-audit-v1";
export type { ApBatchV3RunInstantiationV1 } from "./ap-batch-v3-run-instantiation-v1";
export type {
  BuckpartsMarketingIntelligenceEngineV1,
  MarketingOpportunityV1,
} from "./buckparts-marketing-intelligence-engine-v1";
export type { BuckpartsAgentControlPlaneV1 } from "./buckparts-agent-control-plane-v1";
export type { BatchProductionOperatingChecklistV1 } from "./buckparts-batch-production-operating-checklist-v1";
export type { BatchProductionOperatingDispatchV1 } from "./buckparts-batch-production-operating-dispatch-v1";
export type { SystemContractAuditSummaryV1 } from "./buckparts-system-contract-audit-summary-v1";
export type {
  PagePublishabilityTruthSummaryV1,
  PagePublishabilityTruthRowV1,
} from "./buckparts-page-publishability-truth-v1";
export type { AirPurifierTruthSpineV1 } from "./air-purifier-truth-spine-v1";
export type { FridgeTruthSpineV1 } from "./fridge-truth-spine-v1";
export type { WholeHouseWaterBatchProductionDirectorV1 } from "./whole-house-water-batch-production-director-v1";
export type { WedgeTruthSpineCoverageMatrixV1 } from "./wedge-truth-spine-coverage-matrix-v1";

export type CommandCenterV2ReportWithoutOwnerLanesV1 = Omit<
  CommandCenterV2Report,
  | "owner_integrity_sentinel_v1"
  | "owner_quarantined_fridge_models_v1"
  | "owner_vertical_launch_policy_v1"
  | "daily_operator_summary_v1"
  | "demand_work_queue_summary_v1"
  | "large_batch_coverage_factory_summary_v1"
  | "system_contract_audit_summary_v1"
  | "founder_decision_registry_summary_v1"
  | "next_execution_packet_summary_v1"
  | "operating_map_summary_v1"
  | "page_publishability_truth_summary_v1"
  | "fridge_truth_spine_v1"
  | "air_purifier_truth_spine_v1"
  | "whole_house_water_batch_production_director_v1"
  | "wedge_truth_spine_coverage_matrix_v1"
  | "operator_digest_v1"
  | "semi_cruise_status_summary_v1"
  | "agent_control_plane_v1"
>;

/** @deprecated Use CommandCenterV2ReportWithoutOwnerLanesV1 */
export type CommandCenterV2ReportWithoutIntegritySentinelV1 = Omit<
  CommandCenterV2Report,
  "owner_integrity_sentinel_v1"
>;
