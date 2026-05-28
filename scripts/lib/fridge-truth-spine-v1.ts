import { buildFridgeCommandCenterAndPublicTruthAuditV1 } from "./fridge-command-center-and-public-truth-audit-v1";
import { buildFridgeSupabaseVsCsvRetailerLinksDiffV1 } from "./fridge-supabase-vs-csv-retailer-links-diff-v1";
import { buildFridgeTruthReconciliationV1 } from "./fridge-truth-reconciliation-v1";
import { buildRefrigeratorModelFirstTruthAuditV1 } from "./refrigerator-model-first-truth-audit-v1";

export const FRIDGE_TRUTH_SPINE_CONTRACT_V1 = "fridge_truth_spine_v1" as const;

export const FRIDGE_TRUTH_SPINE_RECOMMENDED_NEXT_ACTION_V1 =
  "Founder-approved CSV export/backfill plan for 16 Supabase-proven fridge buyer paths; do not rebuild fridge products from scratch; do not apply without owner approval." as const;

export const FRIDGE_TRUTH_SPINE_TRUTH_FIRST_NOTES_V1 = [
  "Affiliate links remain second to truth.",
  "Safe CTAs are allowed only when buyer-path gates pass.",
  "Mapping confidence remains a separate fit-truth issue and must not be overclaimed.",
] as const;

export const FRIDGE_EVIDENCE_ONLY_MISMATCH_SLUGS_V1 = ["4396508", "gswf"] as const;

export type FridgeTruthSpineV1 = {
  contract: typeof FRIDGE_TRUTH_SPINE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_contracts: string[];
  csv_truth: {
    safe_buyer_path_verdict: string;
    linked_filters_with_safe_direct_buyable_primary: number;
    primary_weak_reason_counts: Record<string, number>;
  };
  evidence_truth: {
    win_artifact_count: number;
    linked_slugs_with_evidence_win_count: number;
  };
  supabase_csv_diff: {
    supabase_truth_status: string;
    checked_slug_count: number;
    supabase_has_win_csv_missing_count: number;
    evidence_only_not_in_supabase_count: number;
    evidence_only_slugs: readonly string[];
  };
  public_truth: {
    public_truth_status: string;
    live_page_check_status: string;
    checked_slug_count: number;
    should_redo_fridge_products_now: string;
  };
  recommended_next_action: string;
  truth_first_notes: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type BuildFridgeTruthSpineV1Args = {
  rootDir: string;
  now?: () => Date;
  /** Command Center skips live HTTP probes; public truth uses Supabase-gated simulation. */
  skipLivePublicProbe?: boolean;
};

export function buildFridgeTruthSpineUnknownV1(args: {
  generated_at: string;
  reason: string;
}): FridgeTruthSpineV1 {
  return {
    contract: FRIDGE_TRUTH_SPINE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: args.generated_at,
    source_contracts: [],
    csv_truth: {
      safe_buyer_path_verdict: "UNKNOWN",
      linked_filters_with_safe_direct_buyable_primary: 0,
      primary_weak_reason_counts: {},
    },
    evidence_truth: {
      win_artifact_count: 0,
      linked_slugs_with_evidence_win_count: 0,
    },
    supabase_csv_diff: {
      supabase_truth_status: "UNKNOWN",
      checked_slug_count: 0,
      supabase_has_win_csv_missing_count: 0,
      evidence_only_not_in_supabase_count: 0,
      evidence_only_slugs: [...FRIDGE_EVIDENCE_ONLY_MISMATCH_SLUGS_V1],
    },
    public_truth: {
      public_truth_status: "UNKNOWN",
      live_page_check_status: "UNKNOWN_NOT_CHECKED",
      checked_slug_count: 0,
      should_redo_fridge_products_now: "UNKNOWN",
    },
    recommended_next_action: FRIDGE_TRUTH_SPINE_RECOMMENDED_NEXT_ACTION_V1,
    truth_first_notes: [...FRIDGE_TRUTH_SPINE_TRUTH_FIRST_NOTES_V1],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [`UNKNOWN: fridge_truth_spine_v1 failed: ${args.reason}`],
  };
}

export async function buildFridgeTruthSpineV1(
  args: BuildFridgeTruthSpineV1Args,
): Promise<FridgeTruthSpineV1> {
  const now = args.now ?? (() => new Date());
  const generated_at = now().toISOString();

  const modelAudit = buildRefrigeratorModelFirstTruthAuditV1({ rootDir: args.rootDir, now });
  const reconciliation = buildFridgeTruthReconciliationV1({ rootDir: args.rootDir, now });
  const diff = await buildFridgeSupabaseVsCsvRetailerLinksDiffV1({ rootDir: args.rootDir, deps: { now } });
  const publicAudit = await buildFridgeCommandCenterAndPublicTruthAuditV1({
    rootDir: args.rootDir,
    deps: {
      now,
      buildDiff: async () => diff,
      probeLivePage: async () => ({
        http_status: null,
        error: args.skipLivePublicProbe === false ? null : "skipped_for_command_center_spine",
      }),
      env:
        args.skipLivePublicProbe === false
          ? process.env
          : ({ NODE_ENV: "production" } as NodeJS.ProcessEnv),
    },
  });

  const proven_facts = [
    `PROVEN: committed CSV has ${modelAudit.linked_filters_with_safe_direct_buyable_primary}/${modelAudit.unique_linked_filter_slugs} safe direct-buyable primaries; verdict=${modelAudit.safe_buyer_path_verdict}.`,
    `PROVEN: ${reconciliation.prior_win_artifact_summary.linked_filter_slugs_with_evidence_win.length} linked slug(s) with evidence-win artifacts; CSV direct_buyable anywhere=${reconciliation.csv_truth_summary.filters_with_direct_buyable_anywhere_count}.`,
    `PROVEN: Supabase-vs-CSV diff ${diff.supabase_has_win_csv_missing_count}/${diff.checked_slug_count} SUPABASE_HAS_WIN_CSV_MISSING; evidence-only=${diff.evidence_only_not_in_supabase_count}.`,
    `PROVEN: Public truth simulation ${publicAudit.public_truth_status}; should_redo_fridge_products_now=${publicAudit.should_redo_fridge_products_now}.`,
    "PROVEN: This lane does not authorize CSV export, apply, or Supabase mutation.",
  ];

  const inferred_facts = [
    "INFERRED: Live public pages use Supabase retailer_links through filterRealBuyRetailerLinks (not committed CSV).",
  ];

  const unknown_facts: string[] = [];
  if (publicAudit.live_page_check_status === "UNKNOWN_NOT_CHECKED") {
    unknown_facts.push(
      "UNKNOWN: Live HTTP checks for all evidence-win /filter/{slug} pages were skipped in Command Center spine build; run report-fridge-command-center-and-public-truth-audit-v1 for full live proof.",
    );
  }
  if (diff.supabase_truth_status === "UNKNOWN_DB_UNAVAILABLE") {
    unknown_facts.push(
      `UNKNOWN: Supabase retailer_links diff unavailable (${diff.supabase_unavailable_reason ?? "no reason"}).`,
    );
  }

  return {
    contract: FRIDGE_TRUTH_SPINE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at,
    source_contracts: [
      modelAudit.contract,
      reconciliation.contract,
      diff.contract,
      publicAudit.contract,
    ],
    csv_truth: {
      safe_buyer_path_verdict: modelAudit.safe_buyer_path_verdict,
      linked_filters_with_safe_direct_buyable_primary:
        modelAudit.linked_filters_with_safe_direct_buyable_primary,
      primary_weak_reason_counts:
        modelAudit.diagnostic_crosscheck_summary.primary_weak_reason_counts,
    },
    evidence_truth: {
      win_artifact_count: reconciliation.evidence_truth_summary.win_artifact_count,
      linked_slugs_with_evidence_win_count:
        reconciliation.prior_win_artifact_summary.linked_filter_slugs_with_evidence_win.length,
    },
    supabase_csv_diff: {
      supabase_truth_status: diff.supabase_truth_status,
      checked_slug_count: diff.checked_slug_count,
      supabase_has_win_csv_missing_count: diff.supabase_has_win_csv_missing_count,
      evidence_only_not_in_supabase_count: diff.evidence_only_not_in_supabase_count,
      evidence_only_slugs: [...FRIDGE_EVIDENCE_ONLY_MISMATCH_SLUGS_V1],
    },
    public_truth: {
      public_truth_status: publicAudit.public_truth_status,
      live_page_check_status: publicAudit.live_page_check_status,
      checked_slug_count: publicAudit.checked_slug_count,
      should_redo_fridge_products_now: publicAudit.should_redo_fridge_products_now,
    },
    recommended_next_action: FRIDGE_TRUTH_SPINE_RECOMMENDED_NEXT_ACTION_V1,
    truth_first_notes: [...FRIDGE_TRUTH_SPINE_TRUTH_FIRST_NOTES_V1],
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
