/** Command Center v2 — owner/operator decision surface (read-only reports). */

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
  recommendation_authority: {
    evaluated_actions: RecommendationAuthorityRecord[];
  };
  /** First token safe for autonomous fresh exact-token search work per registry + queue (null if none). */
  next_allowed_agent_token: string | null;
  /** Highest-priority owner-facing step synthesized from lanes (not chat memory). */
  next_owner_action: string;
};
