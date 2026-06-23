/**
 * Command Center lane wrapper for AP Production Truth — read-only runtime golden cases.
 */

import {
  PRODUCTION_TRUTH_AP_CONTRACT_V1,
  buildProductionTruthApReportV1,
  type ProductionTruthApReportV1,
  type ProductionTruthApDepsV1,
} from "./buckparts-production-truth-ap-v1";
import { PRODUCTION_TRUTH_GOLDEN_CASES_AP_V1 } from "./buckparts-production-truth-golden-cases-ap-v1";
import { assertionBlocksCasePassV1 } from "./buckparts-production-truth-ap-v1";

export const BUCKPARTS_PRODUCTION_TRUTH_AP_NPM_SCRIPT_V1 = "buckparts:production-truth:ap" as const;

export type BuckpartsProductionTruthApRuntimeStatusV1 =
  | "OK"
  | "ATTENTION"
  | "BLOCKED"
  | "UNKNOWN";

export type BuckpartsProductionTruthApCommandCenterLaneV1 = ProductionTruthApReportV1 & {
  runtime_status: BuckpartsProductionTruthApRuntimeStatusV1;
  npm_script: typeof BUCKPARTS_PRODUCTION_TRUTH_AP_NPM_SCRIPT_V1;
};

export function resolveBuckpartsProductionTruthApRuntimeStatusV1(
  report: Pick<ProductionTruthApReportV1, "supabase_configured" | "summary">,
): BuckpartsProductionTruthApRuntimeStatusV1 {
  if (!report.supabase_configured) return "UNKNOWN";
  if (report.summary.fail > 0) return "BLOCKED";
  if (report.summary.inventory_warning_count > 0) return "ATTENTION";
  return "OK";
}

export async function buildBuckpartsProductionTruthApCommandCenterLaneV1(
  deps: ProductionTruthApDepsV1 = {},
): Promise<BuckpartsProductionTruthApCommandCenterLaneV1> {
  const report = await buildProductionTruthApReportV1(deps);
  return {
    ...report,
    contract: PRODUCTION_TRUTH_AP_CONTRACT_V1,
    runtime_status: resolveBuckpartsProductionTruthApRuntimeStatusV1(report),
    npm_script: BUCKPARTS_PRODUCTION_TRUTH_AP_NPM_SCRIPT_V1,
  };
}

export function buildBuckpartsProductionTruthApCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): BuckpartsProductionTruthApCommandCenterLaneV1 {
  const cases = PRODUCTION_TRUTH_GOLDEN_CASES_AP_V1.map((golden) => ({
    case_id: golden.case_id,
    title: golden.title,
    case_type: golden.case_type,
    status: "SKIP" as const,
    customer_safety_status: "SKIP" as const,
    inventory_warnings: [] as [],
    filter_slug: golden.filter_slug ?? null,
    model_slug: golden.model_slug ?? null,
    authority_artifacts: golden.authority_artifacts,
    assertions: golden.assertions.map((a) => ({
      assertion_id: a.assertion_id,
      kind: a.kind,
      testability: a.testability,
      blocks_case_pass: assertionBlocksCasePassV1(a),
      status: "SKIP" as const,
      expected: a.expected,
      actual: null,
      detail: `Production Truth lane build failed: ${args.reason}`,
    })),
  }));

  const report: ProductionTruthApReportV1 = {
    contract: PRODUCTION_TRUTH_AP_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: args.generated_at,
    supabase_configured: false,
    runtime_loader: "getAirPurifierFilterBySlug | getAirPurifierModelBySlug",
    summary: {
      total_cases: cases.length,
      pass: 0,
      fail: 0,
      pass_with_inventory_warnings: 0,
      inventory_warning_count: 0,
      skip: cases.length,
      unknown: 0,
    },
    cases,
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [`UNKNOWN: buckparts_production_truth_ap_v1 build failed — ${args.reason}`],
  };

  return {
    ...report,
    runtime_status: "UNKNOWN",
    npm_script: BUCKPARTS_PRODUCTION_TRUTH_AP_NPM_SCRIPT_V1,
  };
}
