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

export type ClickVisibilitySnapshot = {
  runtime_status: "OK" | "UNKNOWN_DB_UNAVAILABLE" | "UNKNOWN_SCHEMA";
  generated_at: string;
  window_days: { short: 7; long: 30 };
  last_7_days_clicks: number | "UNKNOWN";
  last_30_days_clicks: number | "UNKNOWN";
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

export type CommandCenterV2Report = {
  schema_version: "1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  amazon_rescue: AmazonRescueLane;
  unknown_or_human_review: DecisionLane;
  affiliate_readiness: DecisionLane;
  coverage_health: DecisionLane;
  recent_evidence: DecisionLane & { evidence_rollup: EvidenceRollup };
  deploy_live_site_status: DecisionLane;
  revenue_snapshot: RevenueSnapshotLane;
  /** First token safe for autonomous fresh exact-token search work per registry + queue (null if none). */
  next_allowed_agent_token: string | null;
  /** Highest-priority owner-facing step synthesized from lanes (not chat memory). */
  next_owner_action: string;
};
