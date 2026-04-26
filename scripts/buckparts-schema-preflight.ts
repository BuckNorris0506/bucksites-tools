/**
 * Read-only schema contract check for BuckParts DB work.
 * Uses service-role Supabase client + PostgREST column validation (no writes).
 *
 * Prevents shipping scripts against tables/columns that exist in repo migrations
 * but not in the connected production database (e.g. `retailer_offer_candidates`
 * vs legacy `retailer_link_candidates`).
 */
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

type TableContract = {
  /** Human label for JSON output */
  label: string;
  table: string;
  /** Columns that must exist; validated in one `.select()` */
  columns: string[];
};

/** Matches production `public.retailer_offer_candidates` (not legacy `retailer_link_candidates`). */
const CANDIDATE_QUEUE: TableContract = {
  label: "hqii_candidate_queue",
  table: "retailer_offer_candidates",
  columns: [
    "id",
    "refrigerator_filter_id",
    "air_purifier_filter_id",
    "vacuum_filter_id",
    "humidifier_filter_id",
    "appliance_air_part_id",
    "whole_house_water_part_id",
    "offer_url",
    "source_kind",
    "validation_status",
    // Phase 1 migration `20260424133000_retailer_offer_candidates_phase1_state.sql`
    "candidate_state",
    "canonical_url",
    "asin",
    "token_required",
    "token_evidence_ok",
    "token_evidence_notes",
    "browser_truth_classification",
    "browser_truth_notes",
    "browser_truth_checked_at",
    "retry_after",
    "retry_count",
    "last_error",
  ],
};

const LIVE_RETAILER_LINKS: TableContract[] = [
  {
    label: "refrigerator_water_retailer_links",
    table: "retailer_links",
    columns: [
      "id",
      "filter_id",
      "retailer_name",
      "affiliate_url",
      "is_primary",
      "retailer_key",
      "browser_truth_classification",
      "browser_truth_notes",
      "browser_truth_checked_at",
    ],
  },
  {
    label: "air_purifier_retailer_links",
    table: "air_purifier_retailer_links",
    columns: [
      "id",
      "air_purifier_filter_id",
      "retailer_name",
      "affiliate_url",
      "destination_url",
      "is_primary",
      "retailer_key",
      "status",
      "source",
      "browser_truth_classification",
      "browser_truth_notes",
      "browser_truth_checked_at",
    ],
  },
  {
    label: "vacuum_retailer_links",
    table: "vacuum_retailer_links",
    columns: [
      "id",
      "vacuum_filter_id",
      "retailer_name",
      "affiliate_url",
      "destination_url",
      "is_primary",
      "retailer_key",
      "status",
      "source",
      "browser_truth_classification",
      "browser_truth_notes",
      "browser_truth_checked_at",
    ],
  },
  {
    label: "humidifier_retailer_links",
    table: "humidifier_retailer_links",
    columns: [
      "id",
      "humidifier_filter_id",
      "retailer_name",
      "affiliate_url",
      "destination_url",
      "is_primary",
      "retailer_key",
      "status",
      "source",
      "browser_truth_classification",
      "browser_truth_notes",
      "browser_truth_checked_at",
    ],
  },
  {
    label: "appliance_air_retailer_links",
    table: "appliance_air_retailer_links",
    columns: [
      "id",
      "appliance_air_part_id",
      "retailer_name",
      "affiliate_url",
      "destination_url",
      "is_primary",
      "retailer_key",
      "status",
      "source",
      "browser_truth_classification",
      "browser_truth_notes",
      "browser_truth_checked_at",
    ],
  },
  {
    label: "whole_house_water_retailer_links",
    table: "whole_house_water_retailer_links",
    columns: [
      "id",
      "whole_house_water_part_id",
      "retailer_name",
      "affiliate_url",
      "destination_url",
      "is_primary",
      "retailer_key",
      "status",
      "source",
      "browser_truth_classification",
      "browser_truth_notes",
      "browser_truth_checked_at",
    ],
  },
];

/** Wedge entity tables used to resolve `filter_slug` → id in HQ II upsert */
const WEDGE_ENTITY_TABLES: TableContract[] = [
  { label: "refrigerator_water_filters", table: "filters", columns: ["id", "slug"] },
  {
    label: "air_purifier_filters",
    table: "air_purifier_filters",
    columns: ["id", "slug"],
  },
  { label: "vacuum_filters", table: "vacuum_filters", columns: ["id", "slug"] },
  {
    label: "humidifier_filters",
    table: "humidifier_filters",
    columns: ["id", "slug"],
  },
  {
    label: "whole_house_water_parts",
    table: "whole_house_water_parts",
    columns: ["id", "slug"],
  },
  {
    label: "appliance_air_parts",
    table: "appliance_air_parts",
    columns: ["id", "slug"],
  },
];

async function verifyContract(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  c: TableContract,
): Promise<
  | { ok: true }
  | { ok: false; table: string; missing_columns: string[]; error_summary: string }
> {
  const selectList = c.columns.join(",");
  const { error: batchErr } = await supabase.from(c.table).select(selectList).limit(1);
  if (!batchErr) {
    return { ok: true };
  }

  const missing: string[] = [];
  for (const col of c.columns) {
    const { error: colErr } = await supabase.from(c.table).select(col).limit(1);
    if (colErr) {
      missing.push(col);
    }
  }

  const summary =
    missing.length === c.columns.length
      ? `${c.table}: table missing, inaccessible, or no columns matched (first error: ${batchErr.message})`
      : `${c.table}: missing or inaccessible column(s): ${missing.join(", ")}`;

  return {
    ok: false,
    table: c.table,
    missing_columns: missing,
    error_summary: summary,
  };
}

async function main() {
  loadEnv();
  const supabase = getSupabaseAdmin();

  const contracts: TableContract[] = [
    CANDIDATE_QUEUE,
    ...WEDGE_ENTITY_TABLES,
    ...LIVE_RETAILER_LINKS,
  ];

  const failures: Array<{
    label: string;
    table: string;
    missing_columns: string[];
    error_summary: string;
  }> = [];

  for (const c of contracts) {
    const r = await verifyContract(supabase, c);
    if (!r.ok) {
      failures.push({
        label: c.label,
        table: r.table,
        missing_columns: r.missing_columns,
        error_summary: r.error_summary,
      });
    }
  }

  const pass = failures.length === 0;
  const payload = {
    result: pass ? "PASS" : "FAIL",
    checked_at: new Date().toISOString(),
    candidate_queue_table: CANDIDATE_QUEUE.table,
    failures,
    note:
      "Failures usually mean a missing table or a missing/renamed column vs repo contracts. " +
      "HQ II queue scripts must target `retailer_offer_candidates`, not `retailer_link_candidates`.",
  };

  console.log(JSON.stringify(payload, null, 2));
  process.exitCode = pass ? 0 : 1;
}

main().catch((e) => {
  console.error(
    JSON.stringify(
      {
        result: "FAIL",
        failures: [
          {
            label: "preflight_runtime",
            table: "(none)",
            missing_columns: [],
            error_summary: e instanceof Error ? e.message : String(e),
          },
        ],
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
