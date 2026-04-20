/** Row shapes aligned with Supabase tables (extend as your schema evolves). */

export type Brand = {
  id: string;
  slug: string;
  name: string;
  created_at?: string;
};

export type Filter = {
  id: string;
  slug: string;
  brand_id: string;
  oem_part_number: string;
  name: string | null;
  replacement_interval_months: number | null;
  notes: string | null;
};

export type FilterAlias = {
  id: string;
  filter_id: string;
  alias: string;
};

export type FridgeModel = {
  id: string;
  slug: string;
  brand_id: string;
  model_number: string;
  notes: string | null;
};

export type FridgeModelAlias = {
  id: string;
  fridge_model_id: string;
  alias: string;
};

export type CompatibilityMapping = {
  fridge_model_id: string;
  filter_id: string;
};

/**
 * Present on non-fridge compatibility tables (`air_purifier_compatibility_mappings`,
 * `vacuum_compatibility_mappings`, `humidifier_compatibility_mappings`,
 * `appliance_air_compatibility_mappings`, `whole_house_water_compatibility_mappings`).
 * Fridge `compatibility_mappings` does not include this column yet.
 */
export type VerticalCompatibilityIsRecommended = {
  is_recommended: boolean;
};

/** Live outbound links only (`retailer_link_candidates` holds pre-approval URLs). */
export type RetailerLink = {
  id: string;
  filter_id: string;
  retailer_name: string | null;
  affiliate_url: string;
  is_primary: boolean | null;
  retailer_key: string;
  browser_truth_classification?: string | null;
  browser_truth_notes?: string | null;
  browser_truth_checked_at?: string | null;
};

export type RetailerLinkCandidateReviewStatus = "pending" | "rejected";

/** Not exposed to anon RLS; use service role for ingest / promotion scripts. */
export type RetailerLinkCandidate = {
  id: string;
  filter_id: string;
  retailer_key: string;
  candidate_url: string;
  retailer_name: string | null;
  source: string;
  review_status: RetailerLinkCandidateReviewStatus;
  notes: string | null;
  created_at: string;
};

export type HelpPage = {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  meta_description: string | null;
};

export type ResetInstruction = {
  id: string;
  brand_id: string;
  title: string | null;
  body_markdown: string;
};

export type ClickEvent = {
  id?: string;
  retailer_link_id: string | null;
  target_url: string;
  user_agent: string | null;
  referrer: string | null;
  created_at?: string;
};

export type SearchEvent = {
  id?: number;
  raw_query: string;
  normalized_query: string;
  results_count: number;
  catalog: string;
  created_at?: string;
};

export type SearchGapStatus = "open" | "reviewing" | "queued" | "resolved" | "ignored";
export type SearchGapEntityType =
  | "alias"
  | "model"
  | "filter_part"
  | "compatibility_mapping"
  | "help_page"
  | "unknown";

export type SearchGap = {
  id?: number;
  catalog: string;
  normalized_query: string;
  sample_raw_query: string;
  search_count: number;
  zero_result_count: number;
  last_seen_at?: string;
  status: SearchGapStatus;
  likely_entity_type: SearchGapEntityType;
  created_at?: string;
  updated_at?: string;
};

export type SearchGapCandidateStatus =
  | "proposed"
  | "reviewing"
  | "approved"
  | "rejected"
  | "applied";

export type SearchGapCandidateType =
  | "alias"
  | "model"
  | "filter_part"
  | "compatibility_mapping"
  | "help_page";

export type SearchGapCandidate = {
  id?: number;
  search_gap_id: number;
  catalog: string;
  normalized_query: string;
  candidate_type: SearchGapCandidateType;
  candidate_payload_json: Record<string, unknown>;
  confidence_score: number;
  status: SearchGapCandidateStatus;
  created_at?: string;
};

export type StagedActionStatus =
  | "queued"
  | "reviewing"
  | "ready"
  | "promoted"
  | "rejected";

export type StagedAliasAddition = {
  id?: number;
  search_gap_candidate_id: number;
  catalog: string;
  normalized_query: string;
  target_kind: "model" | "filter_part";
  target_table: string;
  target_record_id: string | null;
  proposed_alias: string;
  payload_json: Record<string, unknown>;
  status: StagedActionStatus;
  created_at?: string;
};

export type StagedModelAddition = {
  id?: number;
  search_gap_candidate_id: number;
  catalog: string;
  normalized_query: string;
  proposed_model_number: string;
  proposed_brand_id: string | null;
  proposed_brand_slug: string | null;
  payload_json: Record<string, unknown>;
  status: StagedActionStatus;
  created_at?: string;
};

export type StagedFilterPartAddition = {
  id?: number;
  search_gap_candidate_id: number;
  catalog: string;
  normalized_query: string;
  proposed_oem_part_number: string | null;
  proposed_brand_id: string | null;
  proposed_brand_slug: string | null;
  target_part_id: string | null;
  proposed_alias: string | null;
  payload_json: Record<string, unknown>;
  status: StagedActionStatus;
  created_at?: string;
};

export type StagedCompatibilityMappingAddition = {
  id?: number;
  search_gap_candidate_id: number;
  catalog: string;
  normalized_query: string;
  compat_table: string;
  model_fk: string;
  part_fk: string;
  model_id: string;
  part_id: string;
  payload_json: Record<string, unknown>;
  status: StagedActionStatus;
  created_at?: string;
};

export type StagedHelpPageAddition = {
  id?: number;
  search_gap_candidate_id: number;
  catalog: string;
  normalized_query: string;
  suggested_slug: string;
  suggested_title: string;
  payload_json: Record<string, unknown>;
  status: StagedActionStatus;
  created_at?: string;
};
