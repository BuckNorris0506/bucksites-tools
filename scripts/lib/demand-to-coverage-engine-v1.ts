import type {
  DemandToCoverageBoundedRowV1,
  DemandToCoverageCoverageState,
  DemandToCoverageEngineV1,
  DemandToCoverageEvidenceGapKind,
  DemandToCoverageRuntimeStatus,
  DemandToCoverageSearchGapDemandV1,
  DemandToCoverageVerificationRecommendation,
  RecommendationAuthorityRecord,
} from "./buckparts-command-center-v2-types";

const BOUNDED_ROW_CAP = 20 as const;

const ACTIONABLE_STATUSES = ["open", "reviewing", "queued"] as const;

/** Proven `likely_entity_type` check constraint values from search_intelligence migration. */
const ENTITY_TYPES = new Set<string>([
  "alias",
  "model",
  "filter_part",
  "compatibility_mapping",
  "help_page",
  "unknown",
]);

export type SearchGapRowDb = {
  id: number | string;
  catalog: string;
  normalized_query: string;
  sample_raw_query: string;
  search_count: number;
  zero_result_count: number;
  last_seen_at: string;
  status: string;
  likely_entity_type: string;
  created_at: string;
  updated_at: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isIntish(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v);
}

function parseSearchGapRow(raw: unknown): SearchGapRowDb | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== "number" && typeof id !== "string") return null;
  if (!isNonEmptyString(o.catalog)) return null;
  if (!isNonEmptyString(o.normalized_query)) return null;
  if (!isNonEmptyString(o.sample_raw_query)) return null;
  if (!isIntish(o.search_count) || o.search_count < 0) return null;
  if (!isIntish(o.zero_result_count) || o.zero_result_count < 0) return null;
  if (!isNonEmptyString(o.last_seen_at)) return null;
  if (!isNonEmptyString(o.status)) return null;
  if (!isNonEmptyString(o.likely_entity_type)) return null;
  if (!isNonEmptyString(o.created_at)) return null;
  if (!isNonEmptyString(o.updated_at)) return null;
  return {
    id,
    catalog: o.catalog,
    normalized_query: o.normalized_query,
    sample_raw_query: o.sample_raw_query,
    search_count: o.search_count,
    zero_result_count: o.zero_result_count,
    last_seen_at: o.last_seen_at,
    status: o.status,
    likely_entity_type: o.likely_entity_type,
    created_at: o.created_at,
    updated_at: o.updated_at,
  };
}

function demandFromRow(row: SearchGapRowDb): DemandToCoverageSearchGapDemandV1 {
  return {
    search_gap_id: String(row.id),
    catalog: row.catalog,
    normalized_query: row.normalized_query,
    sample_raw_query: row.sample_raw_query,
    search_count: row.search_count,
    zero_result_count: row.zero_result_count,
    last_seen_at: row.last_seen_at,
    status: row.status,
    likely_entity_type: ENTITY_TYPES.has(row.likely_entity_type) ? row.likely_entity_type : "unknown",
  };
}

function deriveEvidenceGap(demand: DemandToCoverageSearchGapDemandV1): DemandToCoverageEvidenceGapKind {
  if (demand.likely_entity_type === "unknown") return "ENTITY_TYPE_UNKNOWN";
  if (demand.zero_result_count > 0) return "ZERO_RESULT_GAP";
  if (demand.zero_result_count === 0) return "VERIFICATION_REQUIRED";
  return "COVERAGE_UNKNOWN";
}

function deriveRecommendedVerification(
  demand: DemandToCoverageSearchGapDemandV1,
): DemandToCoverageVerificationRecommendation {
  if (demand.zero_result_count === 0) return "OWNER_REVIEW_REQUIRED";
  const t = demand.likely_entity_type;
  if (t === "compatibility_mapping") return "VERIFY_COMPATIBILITY_EVIDENCE";
  if (t === "model") return "CHECK_RETAILER_EVIDENCE";
  if (t === "help_page") return "OWNER_REVIEW_REQUIRED";
  if (t === "unknown") return "RESEARCH_CANDIDATE_ENTITY";
  if (t === "alias" || t === "filter_part") return "RESEARCH_CANDIDATE_ENTITY";
  return "UNKNOWN";
}

function rowAuthority(args: {
  rowIndex: number;
  searchGapId: string;
  verification: DemandToCoverageVerificationRecommendation;
}): RecommendationAuthorityRecord[] {
  const baseScope =
    "Read-only research lane from search_gaps counts only; demand is not fit proof or buy proof; no public buy guidance.";
  const agentAction =
    args.verification === "VERIFY_COMPATIBILITY_EVIDENCE"
      ? "Review existing compatibility evidence artifacts and internal mappings read-only for this normalized_query; do not approve compatibility for production."
      : args.verification === "CHECK_RETAILER_EVIDENCE"
        ? "Read-only retailer listing or PDP checks (no affiliate link publishing, no CTA edits)."
        : args.verification === "OWNER_REVIEW_REQUIRED"
          ? "Escalate help-page or IA-classified gap to owner for content strategy read-only triage (no autonomous publish)."
          : "Research candidate entity / filter intent read-only against internal catalog docs and safe OEM sources.";

  return [
    {
      source: `command_center_v2.demand_to_coverage_engine_v1.row.${args.rowIndex}.agent_readonly`,
      proposed_action: agentAction,
      action_type: "AGENT_ACTION",
      authority_level: "UNKNOWN",
      authority_scope: baseScope,
      allowed_as_recommendation: true,
      reason: `search_gap_id=${args.searchGapId}: agent path limited to read-only verification/research consistent with ${args.verification}.`,
    },
    {
      source: `command_center_v2.demand_to_coverage_engine_v1.row.${args.rowIndex}.owner_mutations`,
      proposed_action:
        "Owner approval required before any database mutation, public buy CTA, retailer_links write, or treating this gap as monetization-ready.",
      action_type: "OWNER_ACTION",
      authority_level: "DARK",
      authority_scope:
        "Owner gate for all mutating workflows and public-page impact; this engine does not emit buy-readiness states or public-buy guidance.",
      allowed_as_recommendation: true,
      reason: `search_gap_id=${args.searchGapId}: separates autonomous read-only research from actions that would change live data or shopper-facing pages.`,
    },
  ];
}

function buildBoundedRow(row: SearchGapRowDb, rowIndex: number): DemandToCoverageBoundedRowV1 {
  const demand = demandFromRow(row);
  const evidence_gap_kind = deriveEvidenceGap(demand);
  const recommended_verification = deriveRecommendedVerification(demand);
  const coverage_state: DemandToCoverageCoverageState = "UNKNOWN";
  const unknown_facts: string[] = [
    "Catalog wedge coverage for this normalized_query is not proven from search_gaps alone.",
    "Zero-result counts aggregate demand signal only — not PDP fit, stock, or buy readiness.",
  ];
  if (!ENTITY_TYPES.has(row.likely_entity_type)) {
    unknown_facts.push("likely_entity_type missing or outside proven enum after parse — coerced to unknown for safety.");
  }
  return {
    demand,
    coverage_state,
    evidence_gap_kind,
    recommended_verification,
    unknown_facts,
    authority: rowAuthority({
      rowIndex,
      searchGapId: demand.search_gap_id,
      verification: recommended_verification,
    }),
  };
}

function emptyEngine(runtime: DemandToCoverageRuntimeStatus, unknown_facts: string[]): DemandToCoverageEngineV1 {
  return {
    contract: "demand_to_coverage_engine_v1",
    runtime_status: runtime,
    bounded_row_cap: BOUNDED_ROW_CAP,
    rows: [],
    proven_facts: [
      "Source table public.search_gaps columns used: id, catalog, normalized_query, sample_raw_query, search_count, zero_result_count, last_seen_at, status, likely_entity_type, created_at, updated_at (per supabase/migrations/20260410170000_search_intelligence.sql).",
      "Query filters status in open|reviewing|queued and orders by status, zero_result_count desc, search_count desc, last_seen_at desc to align with search_gaps_priority_idx.",
    ],
    unknown_facts,
  };
}

export function buildDemandToCoverageEngineV1FromRows(
  rawRows: unknown[],
  runtime: DemandToCoverageRuntimeStatus,
  topLevelUnknownFacts: string[],
): DemandToCoverageEngineV1 {
  const parsed = rawRows.map(parseSearchGapRow).filter((r): r is SearchGapRowDb => r !== null);
  const rows = parsed.slice(0, BOUNDED_ROW_CAP).map((r, i) => buildBoundedRow(r, i));
  const base = emptyEngine(runtime, topLevelUnknownFacts);
  return {
    ...base,
    rows,
    proven_facts: [
      ...base.proven_facts,
      ...(rows.length > 0
        ? [`Attached ${rows.length} bounded row(s) capped at ${BOUNDED_ROW_CAP}.`]
        : ["No actionable search_gaps rows returned for this run."]),
    ],
  };
}

export async function fetchDemandToCoverageEngineV1FromSupabase(): Promise<DemandToCoverageEngineV1> {
  try {
    const { loadEnv } = await import("./load-env");
    const { getSupabaseAdmin } = await import("./supabase-admin");
    loadEnv();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("search_gaps")
      .select(
        "id,catalog,normalized_query,sample_raw_query,search_count,zero_result_count,last_seen_at,status,likely_entity_type,created_at,updated_at",
      )
      .in("status", [...ACTIONABLE_STATUSES])
      .order("status", { ascending: true })
      .order("zero_result_count", { ascending: false })
      .order("search_count", { ascending: false })
      .order("last_seen_at", { ascending: false })
      .limit(BOUNDED_ROW_CAP);
    if (error) {
      return buildDemandToCoverageEngineV1FromRows([], "UNKNOWN_QUERY_ERROR", [
        `search_gaps select error: ${error.message}`,
      ]);
    }
    return buildDemandToCoverageEngineV1FromRows(data ?? [], "OK", []);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return buildDemandToCoverageEngineV1FromRows([], "UNKNOWN_DB_UNAVAILABLE", [
      `demand_to_coverage_engine_v1 Supabase load failed: ${msg}`,
    ]);
  }
}
