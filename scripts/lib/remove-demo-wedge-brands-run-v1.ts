/**
 * Remove demo wedge brands — run orchestration with truth-ledger outcome recording.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BuckpartsIoCapabilityV1 } from "./buckparts-io-capabilities-v1";
import {
  buildRemoveDemoWedgeBrandsMutationPreflightV1,
  REMOVE_DEMO_WEDGE_BRAND_TARGET_SLUGS_V1,
  REMOVE_DEMO_WEDGE_BRANDS_MUTATION_GATE_REF_V1,
  REMOVE_DEMO_WEDGE_BRANDS_MUTATION_LANE_V1,
  removeDemoWedgeBrandsMutationAuthorizedV1,
  type RemoveDemoWedgeBrandsMutationPreflightV1,
} from "./remove-demo-wedge-brands-mutation-gate-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { log } from "./log";
import {
  recordTruthLedgerMutationOutcomeV1,
  type TruthLedgerMutationApplyOutcomeV1,
} from "./truth-ledger-v1";

/** Inventory/static-audit marker — run module satisfies mutationGateRef checks. */
const mutationGateRef = REMOVE_DEMO_WEDGE_BRANDS_MUTATION_GATE_REF_V1;
void mutationGateRef;

const TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1 = "MUTATION" as const;

export type RemoveDemoWedgeBrandsApplyStatusV1 = "BLOCKED" | "APPLIED";

export type RemoveDemoWedgeBrandsReportV1 = {
  dry_run: boolean;
  target_slugs: readonly string[];
  would_delete_slugs: string[];
  deleted_slugs: string[];
  apply_status?: RemoveDemoWedgeBrandsApplyStatusV1;
  mutation_authorized?: boolean;
  mutation_preflight_blockers?: string[];
  founder_decision_id?: string | null;
};

export type RemoveDemoWedgeBrandsRunResultV1 = {
  report: RemoveDemoWedgeBrandsReportV1;
  exit_code: 0 | 1;
};

export type RemoveDemoWedgeBrandsDepsV1 = {
  getSupabaseAdmin: () => SupabaseClient;
};

async function selectDemoBrandSlugsV1(
  deps: RemoveDemoWedgeBrandsDepsV1,
): Promise<string[]> {
  const supabase = deps.getSupabaseAdmin();
  const { data, error } = await supabase
    .from("brands")
    .select("slug")
    .in("slug", [...REMOVE_DEMO_WEDGE_BRAND_TARGET_SLUGS_V1]);
  if (error) throw error;
  return (data ?? []).map((r) => r.slug as string);
}

export async function runRemoveDemoWedgeBrandsV1(args: {
  rootDir: string;
  write: boolean;
  deps: RemoveDemoWedgeBrandsDepsV1;
  now?: () => Date;
  io_capability?: BuckpartsIoCapabilityV1;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
  allowFrozen?: boolean;
  recordTruthLedger?: typeof recordTruthLedgerMutationOutcomeV1;
}): Promise<RemoveDemoWedgeBrandsRunResultV1> {
  const recordTruthLedger = args.recordTruthLedger ?? recordTruthLedgerMutationOutcomeV1;
  const wouldDelete = await selectDemoBrandSlugsV1(args.deps);

  const baseReport: RemoveDemoWedgeBrandsReportV1 = {
    dry_run: !args.write,
    target_slugs: REMOVE_DEMO_WEDGE_BRAND_TARGET_SLUGS_V1,
    would_delete_slugs: wouldDelete,
    deleted_slugs: [],
  };

  if (!args.write) {
    log(
      "remove-demo-wedge-brands",
      `Dry-run: would delete ${wouldDelete.length} brand row(s): ${
        wouldDelete.length ? wouldDelete.join(", ") : "(none — already clean)"
      }`,
    );
    return { report: baseReport, exit_code: 0 };
  }

  const preflight: RemoveDemoWedgeBrandsMutationPreflightV1 =
    buildRemoveDemoWedgeBrandsMutationPreflightV1({
      rootDir: args.rootDir,
      mode: "write",
      io_capability: args.io_capability,
      now: args.now,
      readText: args.readText,
      founderRows: args.founderRows,
      allowFrozen: args.allowFrozen,
    });
  const mutation_authorized = removeDemoWedgeBrandsMutationAuthorizedV1(preflight);
  const blockers = [...preflight.blockers];

  let deleted_slugs: string[] = [];
  if (mutation_authorized) {
    const supabase = args.deps.getSupabaseAdmin();
    const { data, error } = await supabase
      .from("brands")
      .delete()
      .in("slug", [...REMOVE_DEMO_WEDGE_BRAND_TARGET_SLUGS_V1])
      .select("slug");
    if (error) throw error;
    deleted_slugs = (data ?? []).map((r) => r.slug as string);
    log(
      "remove-demo-wedge-brands",
      `Deleted ${deleted_slugs.length} brand row(s): ${
        deleted_slugs.length ? deleted_slugs.join(", ") : "(none — already clean)"
      }`,
    );
  } else {
    log(
      "remove-demo-wedge-brands",
      `Write blocked (${blockers.join(", ") || "unauthorized"}); no DELETE performed.`,
    );
  }

  let apply_status: RemoveDemoWedgeBrandsApplyStatusV1 =
    blockers.length > 0 ? "BLOCKED" : "APPLIED";

  const applyOutcome: TruthLedgerMutationApplyOutcomeV1 =
    apply_status === "BLOCKED" ? "blocked" : "applied";
  const record = recordTruthLedger({
    rootDir: args.rootDir,
    io_capability: TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1,
    mutation_lane: REMOVE_DEMO_WEDGE_BRANDS_MUTATION_LANE_V1,
    founder_decision_id: preflight.founder_decision_id,
    apply_outcome: applyOutcome,
    blockers,
    now: args.now,
  });
  if (!record.ok) {
    blockers.push(...record.blockers);
    apply_status = "BLOCKED";
  }

  return {
    report: {
      ...baseReport,
      dry_run: false,
      deleted_slugs: apply_status === "BLOCKED" ? [] : deleted_slugs,
      apply_status,
      mutation_authorized: mutation_authorized && apply_status === "APPLIED",
      mutation_preflight_blockers: blockers,
      founder_decision_id: preflight.founder_decision_id,
    },
    exit_code: apply_status === "BLOCKED" ? 1 : 0,
  };
}
