/**
 * Read-only Wedge Truth Spine Coverage Matrix v1 — parity inventory across Homekeep wedges.
 * Detects formal truth spines vs partial operational proof from repo files only.
 * No CSV, Supabase, launch-state, buy-gate, or public UI mutation.
 */

import { existsSync } from "node:fs";
import path from "node:path";

import {
  HOMEKEEP_WEDGE_CATALOG,
  HOMEKEEP_WEDGE_CATALOG_ORDER,
  type HomekeepWedgeCatalog,
} from "@/lib/catalog/identity";
import {
  getVerticalLaunchState,
  isVerticalLive,
  VERTICAL_SLUGS_WITH_APP_SEGMENT_LAYOUT,
  type VerticalLaunchState,
  type VerticalSlug,
} from "@/lib/catalog/vertical-launch-state";

import { AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1 } from "./air-purifier-truth-spine-v1";
import { FRIDGE_TRUTH_SPINE_CONTRACT_V1 } from "./fridge-truth-spine-v1";
import {
  buildPublicWedgeReadinessAndEasiestWinsV1,
  PUBLIC_WEDGE_READINESS_AND_EASIEST_WINS_CONTRACT_V1,
  type PublicWedgeReadinessRowV1,
} from "./public-wedge-readiness-and-easiest-wins-v1";

export const WEDGE_TRUTH_SPINE_COVERAGE_MATRIX_CONTRACT_V1 =
  "wedge_truth_spine_coverage_matrix_v1" as const;

export type WedgeTruthCoverageStatusV1 =
  | "FORMAL_SPINE"
  | "PARTIAL_OPERATIONAL_PROOF"
  | "PUBLIC_BUT_SPINE_GAP"
  | "PREVIEW_ONLY_UNPROVEN"
  | "SAMPLE_ONLY"
  | "UNKNOWN";

export type WedgePublicIndexingStatusV1 =
  | "INDEXABLE_LIVE"
  | "NOINDEX_UNPROVEN"
  | "PREVIEW_NOINDEX"
  | "UNKNOWN";

export type WedgeTruthSpineCoverageRowV1 = {
  wedge: HomekeepWedgeCatalog;
  public_launch_state: VerticalLaunchState | "refrigerator_routes_live";
  public_indexing_status: WedgePublicIndexingStatusV1;
  has_formal_truth_spine: boolean;
  truth_spine_contract_name: string | "UNKNOWN";
  has_public_readiness_report_coverage: boolean;
  has_safe_cta_queue_or_batch_director: boolean;
  has_model_first_evidence_lane: boolean;
  has_buyer_path_proof_lane: boolean;
  has_browser_truth_lane: boolean;
  has_apply_plan_lane: boolean;
  safe_cta_count_from_committed_csv: number | "UNKNOWN";
  current_public_opening_authorized: false;
  truth_coverage_status: WedgeTruthCoverageStatusV1;
  next_truth_gap_to_close: string;
  proven_lane_refs: string[];
};

export type WedgeTruthSpineCoverageMatrixInspectSummaryV1 = {
  recommended_jq_paths: {
    standalone_report: ".inspect_summary";
    command_center: ".command_center_v2.wedge_truth_spine_coverage_matrix_v1.inspect_summary";
  };
  wedges_with_formal_spine_count: number;
  wedges_public_but_without_formal_spine: HomekeepWedgeCatalog[];
  wedges_partial_operational_proof: HomekeepWedgeCatalog[];
  wedges_preview_or_sample_only: HomekeepWedgeCatalog[];
  next_truth_gap: string;
  ap_truth_spine_gap_present: boolean;
  whw_truth_spine_gap_present: boolean;
  recommended_next_action: string;
};

export type WedgeTruthSpineCoverageMatrixV1 = {
  contract: typeof WEDGE_TRUTH_SPINE_COVERAGE_MATRIX_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_contracts: string[];
  wedges: WedgeTruthSpineCoverageRowV1[];
  inspect_summary: WedgeTruthSpineCoverageMatrixInspectSummaryV1;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

const VERTICAL_BY_WEDGE: Record<HomekeepWedgeCatalog, VerticalSlug | "refrigerator_routes"> = {
  [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: "refrigerator_routes",
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: "air-purifier",
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: "whole-house-water",
  [HOMEKEEP_WEDGE_CATALOG.vacuum]: "vacuum",
  [HOMEKEEP_WEDGE_CATALOG.humidifier]: "humidifier",
  [HOMEKEEP_WEDGE_CATALOG.appliance_air]: "appliance-air",
};

type WedgeCapabilityProbeV1 = {
  formal_spine_contract: string | null;
  formal_spine_lib: string | null;
  model_first_lib: string | null;
  buyer_path_lib: string | null;
  browser_truth_lib: string | null;
  apply_plan_lib: string | null;
  safe_cta_queue_or_batch_director_lib: string | null;
  extra_lane_refs: string[];
};

const WEDGE_CAPABILITY_PROBES: Record<HomekeepWedgeCatalog, WedgeCapabilityProbeV1> = {
  [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: {
    formal_spine_contract: FRIDGE_TRUTH_SPINE_CONTRACT_V1,
    formal_spine_lib: "scripts/lib/fridge-truth-spine-v1.ts",
    model_first_lib: "scripts/lib/refrigerator-model-first-truth-audit-v1.ts",
    buyer_path_lib: "scripts/lib/fridge-truth-reconciliation-v1.ts",
    browser_truth_lib: "scripts/lib/fridge-command-center-and-public-truth-audit-v1.ts",
    apply_plan_lib: null,
    safe_cta_queue_or_batch_director_lib: null,
    extra_lane_refs: [
      "scripts/lib/fridge-supabase-vs-csv-retailer-links-diff-v1.ts",
      "command_center_v2.fridge_truth_spine_v1",
    ],
  },
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: {
    formal_spine_contract: AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1,
    formal_spine_lib: "scripts/lib/air-purifier-truth-spine-v1.ts",
    model_first_lib: "scripts/lib/ap-model-first-evidence-queue-v1.ts",
    buyer_path_lib: "scripts/lib/air-purifier-weak-buyer-path-audit-v1.ts",
    browser_truth_lib: null,
    apply_plan_lib: "scripts/lib/air-purifier-apply-planner-batch-v2-v1.ts",
    safe_cta_queue_or_batch_director_lib: "scripts/lib/air-purifier-batch-production-lane-v1.ts",
    extra_lane_refs: [
      "air_purifier_batch_production_lane_v1",
      "command_center_v2.batch_production_operating_checklist_v1",
      "command_center_v2.air_purifier_truth_spine_v1",
    ],
  },
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: {
    formal_spine_contract: null,
    formal_spine_lib: null,
    model_first_lib: "scripts/lib/whole-house-water-model-first-evidence-result-v1.ts",
    buyer_path_lib: "scripts/lib/whole-house-water-buyer-path-proof-result-v1.ts",
    browser_truth_lib: "scripts/lib/whole-house-water-browser-truth-capture-result-v1.ts",
    apply_plan_lib: "scripts/lib/whole-house-water-safe-retailer-link-apply-plan-v1.ts",
    safe_cta_queue_or_batch_director_lib:
      "scripts/lib/whole-house-water-batch-production-director-v1.ts",
    extra_lane_refs: [
      "whole_house_water_safe_cta_expansion_queue_v1",
      "command_center_v2.whole_house_water_batch_production_director_v1",
    ],
  },
  [HOMEKEEP_WEDGE_CATALOG.vacuum]: {
    formal_spine_contract: null,
    formal_spine_lib: null,
    model_first_lib: null,
    buyer_path_lib: null,
    browser_truth_lib: null,
    apply_plan_lib: null,
    safe_cta_queue_or_batch_director_lib: null,
    extra_lane_refs: [],
  },
  [HOMEKEEP_WEDGE_CATALOG.humidifier]: {
    formal_spine_contract: null,
    formal_spine_lib: null,
    model_first_lib: null,
    buyer_path_lib: null,
    browser_truth_lib: null,
    apply_plan_lib: null,
    safe_cta_queue_or_batch_director_lib: null,
    extra_lane_refs: [],
  },
  [HOMEKEEP_WEDGE_CATALOG.appliance_air]: {
    formal_spine_contract: null,
    formal_spine_lib: null,
    model_first_lib: null,
    buyer_path_lib: null,
    browser_truth_lib: null,
    apply_plan_lib: null,
    safe_cta_queue_or_batch_director_lib: null,
    extra_lane_refs: [],
  },
};

function repoFileExists(rootDir: string, rel: string | null): boolean {
  if (!rel) return false;
  return existsSync(path.join(rootDir, rel));
}

function launchStateLabel(wedge: HomekeepWedgeCatalog): VerticalLaunchState | "refrigerator_routes_live" {
  const vertical = VERTICAL_BY_WEDGE[wedge];
  if (vertical === "refrigerator_routes") return "refrigerator_routes_live";
  return getVerticalLaunchState(vertical);
}

function publicIndexingStatus(wedge: HomekeepWedgeCatalog): WedgePublicIndexingStatusV1 {
  const vertical = VERTICAL_BY_WEDGE[wedge];
  if (vertical === "refrigerator_routes") {
    return isVerticalLive("refrigerator") ? "INDEXABLE_LIVE" : "UNKNOWN";
  }
  if (isVerticalLive(vertical)) return "INDEXABLE_LIVE";
  if (VERTICAL_SLUGS_WITH_APP_SEGMENT_LAYOUT.includes(vertical)) return "PREVIEW_NOINDEX";
  if (getVerticalLaunchState(vertical) === "NOINDEX_UNPROVEN") return "NOINDEX_UNPROVEN";
  return "UNKNOWN";
}

function safeCtaCountFromReadiness(row: PublicWedgeReadinessRowV1): number | "UNKNOWN" {
  if (row.csv_data_source === "sample_csv_only" || row.csv_data_source === "missing") {
    return "UNKNOWN";
  }
  return row.safe_cta_count;
}

function resolveTruthCoverageStatus(args: {
  wedge: HomekeepWedgeCatalog;
  hasFormalSpine: boolean;
  readiness: PublicWedgeReadinessRowV1;
  hasPartialOperationalLanes: boolean;
}): WedgeTruthCoverageStatusV1 {
  const { wedge, hasFormalSpine, readiness, hasPartialOperationalLanes } = args;

  if (readiness.csv_data_source === "sample_csv_only") return "SAMPLE_ONLY";

  if (hasFormalSpine) return "FORMAL_SPINE";

  if (readiness.csv_data_source === "committed_csv" && hasPartialOperationalLanes) {
    if (wedge === HOMEKEEP_WEDGE_CATALOG.whole_house_water) return "PARTIAL_OPERATIONAL_PROOF";
  }

  if (
    readiness.currently_public_facing_status === "LIVE" &&
    readiness.csv_data_source === "committed_csv" &&
    !hasFormalSpine
  ) {
    return "PUBLIC_BUT_SPINE_GAP";
  }

  if (
    readiness.currently_public_facing_status === "PREVIEW_ONLY" ||
    readiness.currently_public_facing_status === "HIDDEN_OR_NOINDEXED"
  ) {
    return readiness.csv_data_source === "committed_csv"
      ? "PREVIEW_ONLY_UNPROVEN"
      : "PREVIEW_ONLY_UNPROVEN";
  }

  if (hasPartialOperationalLanes) return "PARTIAL_OPERATIONAL_PROOF";

  return "UNKNOWN";
}

function nextTruthGap(args: {
  wedge: HomekeepWedgeCatalog;
  status: WedgeTruthCoverageStatusV1;
  hasFormalSpine: boolean;
  readiness: PublicWedgeReadinessRowV1;
}): string {
  const { wedge, status, hasFormalSpine, readiness } = args;

  if (status === "FORMAL_SPINE") {
    if (wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water) {
      return "Maintain fridge_truth_spine_v1 on Command Center; do not treat spine as CSV apply authorization.";
    }
    if (wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier) {
      return "Maintain air_purifier_truth_spine_v1 on Command Center; expand safe buyer paths under truth gates — do not claim all filters verified.";
    }
    return "Maintain formal truth spine on Command Center; do not treat spine as CSV apply authorization.";
  }
  if (wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier && status === "PUBLIC_BUT_SPINE_GAP") {
    return "Add air_purifier_truth_spine_v1 (or equivalent formal spine) before treating AP as fridge-parity proven.";
  }
  if (wedge === HOMEKEEP_WEDGE_CATALOG.whole_house_water && status === "PARTIAL_OPERATIONAL_PROOF") {
    return "Promote WHW from batch director/evidence lanes to whole_house_water_truth_spine_v1; do not open publicly until policy gates pass.";
  }
  if (status === "SAMPLE_ONLY") {
    return "Replace sample CSVs with committed catalog + proof lanes before any public opening claim.";
  }
  if (status === "PREVIEW_ONLY_UNPROVEN") {
    return readiness.reason || "Keep preview/noindex until committed safe buyer-path proof exists.";
  }
  if (!hasFormalSpine) {
    return "Formal truth spine contract not proven in repo for this wedge.";
  }
  return "UNKNOWN";
}

function buildProvenLaneRefs(rootDir: string, probe: WedgeCapabilityProbeV1): string[] {
  const refs: string[] = [];
  for (const rel of [
    probe.formal_spine_lib,
    probe.model_first_lib,
    probe.buyer_path_lib,
    probe.browser_truth_lib,
    probe.apply_plan_lib,
    probe.safe_cta_queue_or_batch_director_lib,
  ]) {
    if (rel && repoFileExists(rootDir, rel)) refs.push(rel);
  }
  for (const ref of probe.extra_lane_refs) refs.push(ref);
  return refs;
}

function hasPartialOperationalLanes(rootDir: string, probe: WedgeCapabilityProbeV1): boolean {
  const laneHits = [
    probe.model_first_lib,
    probe.buyer_path_lib,
    probe.browser_truth_lib,
    probe.apply_plan_lib,
    probe.safe_cta_queue_or_batch_director_lib,
  ].filter((rel) => rel && repoFileExists(rootDir, rel)).length;
  return laneHits >= 2;
}

export function buildWedgeTruthSpineCoverageMatrixInspectSummaryV1(args: {
  wedges: WedgeTruthSpineCoverageRowV1[];
  recommended_next_action: string;
}): WedgeTruthSpineCoverageMatrixInspectSummaryV1 {
  const formal = args.wedges.filter((w) => w.truth_coverage_status === "FORMAL_SPINE");
  const publicNoSpine = args.wedges.filter((w) => w.truth_coverage_status === "PUBLIC_BUT_SPINE_GAP");
  const partial = args.wedges.filter((w) => w.truth_coverage_status === "PARTIAL_OPERATIONAL_PROOF");
  const previewOrSample = args.wedges.filter(
    (w) =>
      w.truth_coverage_status === "PREVIEW_ONLY_UNPROVEN" ||
      w.truth_coverage_status === "SAMPLE_ONLY",
  );

  const apGap = args.wedges.some(
    (w) =>
      w.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier &&
      w.truth_coverage_status === "PUBLIC_BUT_SPINE_GAP",
  );
  const whwGap = args.wedges.some(
    (w) =>
      w.wedge === HOMEKEEP_WEDGE_CATALOG.whole_house_water &&
      !w.has_formal_truth_spine,
  );

  const nextGap =
    publicNoSpine[0]?.next_truth_gap_to_close ??
    partial.find((w) => w.wedge === HOMEKEEP_WEDGE_CATALOG.whole_house_water)
      ?.next_truth_gap_to_close ??
    partial[0]?.next_truth_gap_to_close ??
    "UNKNOWN";

  return {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary",
      command_center: ".command_center_v2.wedge_truth_spine_coverage_matrix_v1.inspect_summary",
    },
    wedges_with_formal_spine_count: formal.length,
    wedges_public_but_without_formal_spine: publicNoSpine.map((w) => w.wedge),
    wedges_partial_operational_proof: partial.map((w) => w.wedge),
    wedges_preview_or_sample_only: previewOrSample.map((w) => w.wedge),
    next_truth_gap: nextGap,
    ap_truth_spine_gap_present: apGap,
    whw_truth_spine_gap_present: whwGap,
    recommended_next_action: args.recommended_next_action,
  };
}

export function buildWedgeTruthSpineCoverageMatrixUnknownV1(args: {
  generated_at: string;
  reason: string;
}): WedgeTruthSpineCoverageMatrixV1 {
  const emptyInspect = buildWedgeTruthSpineCoverageMatrixInspectSummaryV1({
    wedges: [],
    recommended_next_action: "UNKNOWN: matrix build failed.",
  });
  return {
    contract: WEDGE_TRUTH_SPINE_COVERAGE_MATRIX_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: args.generated_at,
    source_contracts: [],
    wedges: [],
    inspect_summary: emptyInspect,
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [`UNKNOWN: wedge_truth_spine_coverage_matrix_v1 failed: ${args.reason}`],
  };
}

export function buildWedgeTruthSpineCoverageMatrixV1(args: {
  rootDir: string;
  now?: () => Date;
}): WedgeTruthSpineCoverageMatrixV1 {
  const now = args.now ?? (() => new Date());
  const readiness = buildPublicWedgeReadinessAndEasiestWinsV1({ rootDir: args.rootDir, now: args.now });
  const readinessByWedge = new Map(readiness.wedge_rows.map((row) => [row.wedge, row]));

  const wedges: WedgeTruthSpineCoverageRowV1[] = [];

  for (const wedge of HOMEKEEP_WEDGE_CATALOG_ORDER) {
    const probe = WEDGE_CAPABILITY_PROBES[wedge];
    const readinessRow = readinessByWedge.get(wedge);
    const hasFormalSpine =
      probe.formal_spine_contract !== null &&
      repoFileExists(args.rootDir, probe.formal_spine_lib);

    const partialLanes = hasPartialOperationalLanes(args.rootDir, probe);

    const truth_coverage_status = readinessRow
      ? resolveTruthCoverageStatus({
          wedge,
          hasFormalSpine,
          readiness: readinessRow,
          hasPartialOperationalLanes: partialLanes,
        })
      : "UNKNOWN";

    wedges.push({
      wedge,
      public_launch_state: launchStateLabel(wedge),
      public_indexing_status: publicIndexingStatus(wedge),
      has_formal_truth_spine: hasFormalSpine,
      truth_spine_contract_name: hasFormalSpine
        ? (probe.formal_spine_contract ?? "UNKNOWN")
        : "UNKNOWN",
      has_public_readiness_report_coverage: repoFileExists(
        args.rootDir,
        "scripts/lib/public-wedge-readiness-and-easiest-wins-v1.ts",
      ),
      has_safe_cta_queue_or_batch_director: repoFileExists(
        args.rootDir,
        probe.safe_cta_queue_or_batch_director_lib,
      ),
      has_model_first_evidence_lane: repoFileExists(args.rootDir, probe.model_first_lib),
      has_buyer_path_proof_lane: repoFileExists(args.rootDir, probe.buyer_path_lib),
      has_browser_truth_lane: repoFileExists(args.rootDir, probe.browser_truth_lib),
      has_apply_plan_lane: repoFileExists(args.rootDir, probe.apply_plan_lib),
      safe_cta_count_from_committed_csv: readinessRow
        ? safeCtaCountFromReadiness(readinessRow)
        : "UNKNOWN",
      current_public_opening_authorized: false,
      truth_coverage_status,
      next_truth_gap_to_close: readinessRow
        ? nextTruthGap({
            wedge,
            status: truth_coverage_status,
            hasFormalSpine,
            readiness: readinessRow,
          })
        : "UNKNOWN",
      proven_lane_refs: buildProvenLaneRefs(args.rootDir, probe),
    });
  }

  const recommended_next_action =
    "Do not scale wedges as equally proven: fridge has fridge_truth_spine_v1 and AP has air_purifier_truth_spine_v1 (formal spine ≠ all-filters verified); WHW stays PARTIAL_OPERATIONAL_PROOF with whw_public_opening_authorized=false; sample-only wedges remain unproven.";

  const inspect_summary = buildWedgeTruthSpineCoverageMatrixInspectSummaryV1({
    wedges,
    recommended_next_action,
  });

  const fridgeRow = wedges.find((w) => w.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
  const apRow = wedges.find((w) => w.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier);
  const whwRow = wedges.find((w) => w.wedge === HOMEKEEP_WEDGE_CATALOG.whole_house_water);

  return {
    contract: WEDGE_TRUTH_SPINE_COVERAGE_MATRIX_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    source_contracts: [
      PUBLIC_WEDGE_READINESS_AND_EASIEST_WINS_CONTRACT_V1,
      FRIDGE_TRUTH_SPINE_CONTRACT_V1,
      AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1,
    ],
    wedges,
    inspect_summary,
    proven_facts: [
      `PROVEN: Matrix inspects ${String(wedges.length)} Homekeep wedges from repo file presence + ${PUBLIC_WEDGE_READINESS_AND_EASIEST_WINS_CONTRACT_V1}.`,
      fridgeRow
        ? `PROVEN: refrigerator_water has_formal_truth_spine=${String(fridgeRow.has_formal_truth_spine)} contract=${fridgeRow.truth_spine_contract_name}.`
        : "PROVEN: refrigerator_water row missing.",
      apRow
        ? `PROVEN: air_purifier truth_coverage_status=${apRow.truth_coverage_status}; has_formal_truth_spine=${String(apRow.has_formal_truth_spine)}.`
        : "PROVEN: air_purifier row missing.",
      whwRow
        ? `PROVEN: whole_house_water truth_coverage_status=${whwRow.truth_coverage_status}; has_formal_truth_spine=${String(whwRow.has_formal_truth_spine)}; safe_cta_count=${String(whwRow.safe_cta_count_from_committed_csv)}.`
        : "PROVEN: whole_house_water row missing.",
      `PROVEN: wedges_with_formal_spine_count=${String(inspect_summary.wedges_with_formal_spine_count)}.`,
      `PROVEN: ap_truth_spine_gap_present=${String(inspect_summary.ap_truth_spine_gap_present)}; whw_truth_spine_gap_present=${String(inspect_summary.whw_truth_spine_gap_present)}.`,
      "PROVEN: current_public_opening_authorized=false on all wedge rows; matrix does not authorize public opening.",
    ],
    inferred_facts: [
      inspect_summary.wedges_public_but_without_formal_spine.length > 0
        ? `INFERRED: LIVE wedge(s) without formal spine: ${inspect_summary.wedges_public_but_without_formal_spine.join(", ")} — fridge parity does not carry automatically.`
        : "INFERRED: No LIVE wedge flagged PUBLIC_BUT_SPINE_GAP.",
      inspect_summary.wedges_partial_operational_proof.includes(
        HOMEKEEP_WEDGE_CATALOG.whole_house_water,
      )
        ? "INFERRED: WHW batch director + evidence lanes count as partial operational proof only — not a formal truth spine."
        : "INFERRED: WHW partial operational proof not classified.",
      wedges.filter((w) => w.truth_coverage_status === "SAMPLE_ONLY").length > 0
        ? `INFERRED: Sample-only wedges (${wedges
            .filter((w) => w.truth_coverage_status === "SAMPLE_ONLY")
            .map((w) => w.wedge)
            .join(", ")}) must not be treated as safe or open.`
        : "INFERRED: No sample-only wedges detected.",
    ],
    unknown_facts: [
      "UNKNOWN: Whether whole_house_water will graduate to FORMAL_SPINE before public opening.",
      "UNKNOWN: Revenue, traffic, or conversion parity across wedges.",
      "UNKNOWN: Live Supabase safe CTA parity vs committed CSV for air_purifier (spine proves committed inventory + buy gate only).",
    ],
  };
}
