/**
 * Read-only customer authority outcome evaluation — compares history snapshots to later customer evidence.
 * Does not replace next_best_action or mutate product data.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { CustomerAuthorityScoreV1 } from "./customer-authority-score-v1";
import type { CustomerClosureReportV1 } from "./customer-closure-report-v1";
import type { CustomerSteeringComparisonV1 } from "./customer-steering-comparison-v1";
import type { CustomerRealityScoreboardV1 } from "./customer-reality-scoreboard-v1";
import {
  CUSTOMER_AUTHORITY_HISTORY_DIR_REL_V1,
  CUSTOMER_AUTHORITY_HISTORY_SNAPSHOT_CONTRACT_V1,
  type CustomerAuthorityHistorySnapshotV1,
  type CustomerAuthorityHistoryFsV1,
} from "./customer-authority-history-v1";

export const CUSTOMER_AUTHORITY_OUTCOMES_CONTRACT_V1 = "customer_authority_outcomes_v1" as const;

export const CUSTOMER_AUTHORITY_OUTCOMES_CC_JQ_PATH_V1 =
  ".command_center_v2.customer_authority_outcomes_v1" as const;

export const CUSTOMER_AUTHORITY_OUTCOMES_SOURCE_COMMAND_V1 =
  "npm run buckparts:command-center" as const;

export const CUSTOMER_AUTHORITY_OUTCOME_WINDOW_DAYS_V1 = 7;

export type CustomerAuthorityOutcomeEvidenceBasisV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type CustomerAuthoritySteeringPredictionV1 =
  | "CORRECT"
  | "INCORRECT"
  | "INCONCLUSIVE"
  | "NOT_EVALUABLE";

export type CustomerAuthorityOutcomeVerdictV1 =
  | "INSUFFICIENT_HISTORY"
  | "CUSTOMER_STEERING_SIGNAL_POSITIVE"
  | "CUSTOMER_STEERING_SIGNAL_NEGATIVE"
  | "MIXED"
  | "UNKNOWN";

export type CustomerAuthorityOutcomeLaterEvidenceV1 = {
  evidence_basis: CustomerAuthorityOutcomeEvidenceBasisV1;
  all_wedge_coverage_percent: number | "UNKNOWN";
  marketing_high_risk_opportunity_count: number | "UNKNOWN";
  customer_visible_closures_count: number | "UNKNOWN";
  closure_evidence_for_target: boolean | "UNKNOWN";
  target_slug_customer_visible: boolean | "UNKNOWN";
  closure_closed_at: string | null;
};

export type CustomerAuthorityEvaluatedSnapshotAtSnapshotV1 = {
  customer_action: string | null;
  factory_next_best_action: string;
  conflicts_with_factory: boolean | "UNKNOWN";
  customer_tier: number | "UNKNOWN";
  closure_target_slug: string | null;
  closure_target_slug_basis: CustomerAuthorityOutcomeEvidenceBasisV1;
};

export type CustomerAuthorityEvaluatedSnapshotV1 = {
  snapshot_date_utc: string;
  snapshot_generated_at: string;
  rel_path: string;
  at_snapshot: CustomerAuthorityEvaluatedSnapshotAtSnapshotV1;
  later_evidence: CustomerAuthorityOutcomeLaterEvidenceV1 | null;
  outcome_window_elapsed: boolean;
  outcome_window_days: number;
  customer_steering_prediction: CustomerAuthoritySteeringPredictionV1;
  prediction_basis: CustomerAuthorityOutcomeEvidenceBasisV1;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type CustomerAuthorityOutcomesV1 = {
  contract: typeof CUSTOMER_AUTHORITY_OUTCOMES_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof CUSTOMER_AUTHORITY_OUTCOMES_CC_JQ_PATH_V1;
  source_command: typeof CUSTOMER_AUTHORITY_OUTCOMES_SOURCE_COMMAND_V1;
  generated_at: string;
  snapshot_count: number;
  evaluable_snapshot_count: number;
  unevaluable_snapshot_count: number;
  trend_measurable: boolean;
  outcome_window_days: number;
  evaluated_snapshots: CustomerAuthorityEvaluatedSnapshotV1[];
  current_verdict: CustomerAuthorityOutcomeVerdictV1;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type BuildCustomerAuthorityOutcomesV1Input = {
  generated_at: string;
  rootDir: string;
  authorityScore: CustomerAuthorityScoreV1 | null | undefined;
  steering: CustomerSteeringComparisonV1 | null | undefined;
  closure: CustomerClosureReportV1 | null | undefined;
  scoreboard: CustomerRealityScoreboardV1 | null | undefined;
  outcome_window_days?: number;
  fs?: Partial<CustomerAuthorityHistoryFsV1>;
};

function normalizeSlugV1(slug: string): string {
  return slug.trim().toLowerCase();
}

export function daysBetweenUtcDatesV1(startDateUtc: string, endDateUtc: string): number {
  const start = Date.parse(`${startDateUtc}T00:00:00.000Z`);
  const end = Date.parse(`${endDateUtc}T00:00:00.000Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.floor((end - start) / 86_400_000);
}

export function generatedAtDateUtcV1(isoTimestamp: string): string {
  const parsed = Date.parse(isoTimestamp);
  if (Number.isNaN(parsed)) return isoTimestamp.slice(0, 10);
  return new Date(parsed).toISOString().slice(0, 10);
}

function loadCustomerAuthorityHistorySnapshotsFullV1(args: {
  rootDir: string;
  fs?: Partial<CustomerAuthorityHistoryFsV1>;
}): CustomerAuthorityHistorySnapshotV1[] {
  const fileExists = args.fs?.fileExists ?? existsSync;
  const readDir = args.fs?.readDir ?? readdirSync;
  const readTextFile = args.fs?.readTextFile ?? ((abs) => readFileSync(abs, "utf8"));

  const dirAbs = path.join(args.rootDir, CUSTOMER_AUTHORITY_HISTORY_DIR_REL_V1);
  if (!fileExists(dirAbs)) return [];

  const snapshots: CustomerAuthorityHistorySnapshotV1[] = [];
  for (const filename of readDir(dirAbs)) {
    if (!filename.endsWith(".json")) continue;
    try {
      const parsed = JSON.parse(
        readTextFile(path.join(dirAbs, filename)),
      ) as CustomerAuthorityHistorySnapshotV1;
      if (parsed.contract !== CUSTOMER_AUTHORITY_HISTORY_SNAPSHOT_CONTRACT_V1) continue;
      snapshots.push(parsed);
    } catch {
      // skip invalid files
    }
  }

  return snapshots.sort((a, b) => a.snapshot_date_utc.localeCompare(b.snapshot_date_utc));
}

export function resolveClosureTargetSlugAtSnapshotV1(args: {
  snapshot: CustomerAuthorityHistorySnapshotV1;
  steering: CustomerSteeringComparisonV1 | null | undefined;
}): { slug: string | null; basis: CustomerAuthorityOutcomeEvidenceBasisV1 } {
  const captures = args.snapshot.captures as CustomerAuthorityHistorySnapshotV1["captures"] & {
    closure_target_slug?: string | null;
  };
  if (typeof captures.closure_target_slug === "string" && captures.closure_target_slug.trim() !== "") {
    return { slug: captures.closure_target_slug, basis: "PROVEN" };
  }
  if ("closure_target_slug" in captures && captures.closure_target_slug === null) {
    return { slug: null, basis: "PROVEN" };
  }

  const customerAction = args.snapshot.captures.customer_action;
  if (
    args.steering?.contract === "customer_steering_comparison_v1" &&
    customerAction &&
    args.steering.next_customer_action_dry_run.action === customerAction
  ) {
    const slug = args.steering.next_customer_action_dry_run.closure_target_slug;
    return {
      slug,
      basis: slug ? "INFERRED" : "UNKNOWN",
    };
  }

  return { slug: null, basis: "UNKNOWN" };
}

function currentLaterEvidenceV1(args: {
  closure: CustomerClosureReportV1 | null | undefined;
  scoreboard: CustomerRealityScoreboardV1 | null | undefined;
  authorityScore: CustomerAuthorityScoreV1 | null | undefined;
  targetSlug: string | null;
}): CustomerAuthorityOutcomeLaterEvidenceV1 {
  const coverage =
    args.scoreboard?.verified_buyer_path_coverage.all_wedge_coverage_percent ??
    args.authorityScore?.components.buyer_path_coverage.all_wedge_coverage_percent ??
    "UNKNOWN";
  const wrongPart =
    args.scoreboard?.wrong_part_exposure_status.marketing_high_risk_opportunity_count ??
    args.authorityScore?.components.wrong_part_exposure.high_risk_opportunity_count ??
    "UNKNOWN";
  const closureCount =
    args.closure?.customer_visible_closures_count ??
    args.authorityScore?.components.closure_proof.customer_visible_closures_count ??
    "UNKNOWN";

  let closure_evidence_for_target: boolean | "UNKNOWN" = "UNKNOWN";
  let target_slug_customer_visible: boolean | "UNKNOWN" = "UNKNOWN";
  let closure_closed_at: string | null = null;
  let evidence_basis: CustomerAuthorityOutcomeEvidenceBasisV1 = "UNKNOWN";

  if (!args.targetSlug) {
    return {
      evidence_basis: "UNKNOWN",
      all_wedge_coverage_percent: coverage,
      marketing_high_risk_opportunity_count: wrongPart,
      customer_visible_closures_count: closureCount,
      closure_evidence_for_target: "UNKNOWN",
      target_slug_customer_visible: "UNKNOWN",
      closure_closed_at: null,
    };
  }

  if (args.closure?.contract !== "customer_closure_report_v1") {
    return {
      evidence_basis: "UNKNOWN",
      all_wedge_coverage_percent: coverage,
      marketing_high_risk_opportunity_count: wrongPart,
      customer_visible_closures_count: closureCount,
      closure_evidence_for_target: false,
      target_slug_customer_visible: false,
      closure_closed_at: null,
    };
  }

  const targetKey = normalizeSlugV1(args.targetSlug);
  const shipment = args.closure.customer_visible_shipments.find(
    (row) => normalizeSlugV1(row.slug) === targetKey,
  );
  if (!shipment) {
    return {
      evidence_basis: "PROVEN",
      all_wedge_coverage_percent: coverage,
      marketing_high_risk_opportunity_count: wrongPart,
      customer_visible_closures_count: closureCount,
      closure_evidence_for_target: false,
      target_slug_customer_visible: false,
      closure_closed_at: null,
    };
  }

  const provenVisible =
    shipment.customer_visible === true && shipment.evidence_basis === "PROVEN";
  closure_evidence_for_target = provenVisible;
  target_slug_customer_visible = provenVisible;
  closure_closed_at = shipment.closed_at;
  evidence_basis = provenVisible ? "PROVEN" : shipment.evidence_basis === "INFERRED" ? "INFERRED" : "UNKNOWN";

  return {
    evidence_basis,
    all_wedge_coverage_percent: coverage,
    marketing_high_risk_opportunity_count: wrongPart,
    customer_visible_closures_count: closureCount,
    closure_evidence_for_target,
    target_slug_customer_visible,
    closure_closed_at,
  };
}

export function evaluateCustomerAuthoritySnapshotOutcomeV1(args: {
  snapshot: CustomerAuthorityHistorySnapshotV1;
  rel_path: string;
  generated_at: string;
  insufficient_history: boolean;
  outcome_window_days: number;
  steering: CustomerSteeringComparisonV1 | null | undefined;
  closure: CustomerClosureReportV1 | null | undefined;
  scoreboard: CustomerRealityScoreboardV1 | null | undefined;
  authorityScore: CustomerAuthorityScoreV1 | null | undefined;
}): CustomerAuthorityEvaluatedSnapshotV1 {
  const proven_facts: string[] = [];
  const inferred_facts: string[] = [];
  const unknown_facts: string[] = [];

  const target = resolveClosureTargetSlugAtSnapshotV1({
    snapshot: args.snapshot,
    steering: args.steering,
  });

  const evalDateUtc = generatedAtDateUtcV1(args.generated_at);
  const daysElapsed = daysBetweenUtcDatesV1(args.snapshot.snapshot_date_utc, evalDateUtc);
  const outcome_window_elapsed = daysElapsed >= args.outcome_window_days;

  const later_evidence = outcome_window_elapsed
    ? currentLaterEvidenceV1({
        closure: args.closure,
        scoreboard: args.scoreboard,
        authorityScore: args.authorityScore,
        targetSlug: target.slug,
      })
    : null;

  const at_snapshot: CustomerAuthorityEvaluatedSnapshotAtSnapshotV1 = {
    customer_action: args.snapshot.captures.customer_action,
    factory_next_best_action: args.snapshot.captures.factory_next_best_action,
    conflicts_with_factory: args.snapshot.captures.conflicts_with_factory,
    customer_tier: args.snapshot.captures.customer_tier,
    closure_target_slug: target.slug,
    closure_target_slug_basis: target.basis,
  };

  let customer_steering_prediction: CustomerAuthoritySteeringPredictionV1 = "NOT_EVALUABLE";
  let prediction_basis: CustomerAuthorityOutcomeEvidenceBasisV1 = "UNKNOWN";

  if (args.insufficient_history) {
    unknown_facts.push(
      "UNKNOWN: fewer than two authority history snapshots — per-snapshot outcome not scored.",
    );
    return {
      snapshot_date_utc: args.snapshot.snapshot_date_utc,
      snapshot_generated_at: args.snapshot.snapshot_generated_at,
      rel_path: args.rel_path,
      at_snapshot,
      later_evidence,
      outcome_window_elapsed,
      outcome_window_days: args.outcome_window_days,
      customer_steering_prediction,
      prediction_basis,
      proven_facts,
      inferred_facts,
      unknown_facts,
    };
  }

  if (args.snapshot.captures.conflicts_with_factory !== true) {
    unknown_facts.push(
      "UNKNOWN: snapshot did not record a customer-vs-factory steering conflict — nothing to evaluate.",
    );
    return {
      snapshot_date_utc: args.snapshot.snapshot_date_utc,
      snapshot_generated_at: args.snapshot.snapshot_generated_at,
      rel_path: args.rel_path,
      at_snapshot,
      later_evidence,
      outcome_window_elapsed,
      outcome_window_days: args.outcome_window_days,
      customer_steering_prediction,
      prediction_basis,
      proven_facts,
      inferred_facts,
      unknown_facts,
    };
  }

  if (!outcome_window_elapsed) {
    unknown_facts.push(
      `UNKNOWN: outcome window (${String(args.outcome_window_days)}d) not elapsed since ${args.snapshot.snapshot_date_utc}.`,
    );
    return {
      snapshot_date_utc: args.snapshot.snapshot_date_utc,
      snapshot_generated_at: args.snapshot.snapshot_generated_at,
      rel_path: args.rel_path,
      at_snapshot,
      later_evidence,
      outcome_window_elapsed,
      outcome_window_days: args.outcome_window_days,
      customer_steering_prediction,
      prediction_basis,
      proven_facts,
      inferred_facts,
      unknown_facts,
    };
  }

  if (!target.slug) {
    unknown_facts.push(
      "UNKNOWN: no closure_target_slug at snapshot time and no inferable target — cannot link later closure evidence.",
    );
    return {
      snapshot_date_utc: args.snapshot.snapshot_date_utc,
      snapshot_generated_at: args.snapshot.snapshot_generated_at,
      rel_path: args.rel_path,
      at_snapshot,
      later_evidence,
      outcome_window_elapsed,
      outcome_window_days: args.outcome_window_days,
      customer_steering_prediction,
      prediction_basis,
      proven_facts,
      inferred_facts,
      unknown_facts,
    };
  }

  if (!later_evidence) {
    unknown_facts.push("UNKNOWN: later evidence unavailable after outcome window.");
    return {
      snapshot_date_utc: args.snapshot.snapshot_date_utc,
      snapshot_generated_at: args.snapshot.snapshot_generated_at,
      rel_path: args.rel_path,
      at_snapshot,
      later_evidence,
      outcome_window_elapsed,
      outcome_window_days: args.outcome_window_days,
      customer_steering_prediction,
      prediction_basis,
      proven_facts,
      inferred_facts,
      unknown_facts,
    };
  }

  if (later_evidence.closure_evidence_for_target === true) {
    customer_steering_prediction = "CORRECT";
    prediction_basis = "PROVEN";
    proven_facts.push(
      `PROVEN: customer-visible PROVEN closure exists for target slug ${target.slug} after snapshot ${args.snapshot.snapshot_date_utc}.`,
    );
  } else if (later_evidence.closure_evidence_for_target === false) {
    const snapshotWrongPart = args.snapshot.captures.marketing_high_risk_opportunity_count;
    const laterWrongPart = later_evidence.marketing_high_risk_opportunity_count;
    const snapshotCoverage = args.snapshot.captures.all_wedge_coverage_percent;
    const laterCoverage = later_evidence.all_wedge_coverage_percent;

    const wrongPartImproved =
      typeof snapshotWrongPart === "number" &&
      typeof laterWrongPart === "number" &&
      laterWrongPart < snapshotWrongPart;
    const coverageImproved =
      typeof snapshotCoverage === "number" &&
      typeof laterCoverage === "number" &&
      laterCoverage > snapshotCoverage;

    if (wrongPartImproved || coverageImproved) {
      customer_steering_prediction = "INCONCLUSIVE";
      prediction_basis = "INFERRED";
      inferred_facts.push(
        "INFERRED: later metrics moved but no PROVEN customer-visible closure ties improvement to the snapshot action.",
      );
    } else {
      customer_steering_prediction = "INCORRECT";
      prediction_basis = "PROVEN";
      proven_facts.push(
        `PROVEN: target slug ${target.slug} has no PROVEN customer-visible closure after ${String(args.outcome_window_days)}d outcome window.`,
      );
    }
  } else {
    customer_steering_prediction = "INCONCLUSIVE";
    prediction_basis = "UNKNOWN";
    unknown_facts.push(
      "UNKNOWN: closure evidence for target slug could not be classified PROVEN or absent.",
    );
  }

  return {
    snapshot_date_utc: args.snapshot.snapshot_date_utc,
    snapshot_generated_at: args.snapshot.snapshot_generated_at,
    rel_path: args.rel_path,
    at_snapshot,
    later_evidence,
    outcome_window_elapsed,
    outcome_window_days: args.outcome_window_days,
    customer_steering_prediction,
    prediction_basis,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}

function deriveCurrentVerdictV1(args: {
  snapshot_count: number;
  evaluated_snapshots: CustomerAuthorityEvaluatedSnapshotV1[];
}): CustomerAuthorityOutcomeVerdictV1 {
  if (args.snapshot_count < 2) {
    return "INSUFFICIENT_HISTORY";
  }

  const scored = args.evaluated_snapshots.filter(
    (row) =>
      row.at_snapshot.conflicts_with_factory === true &&
      row.customer_steering_prediction !== "NOT_EVALUABLE",
  );

  if (scored.length === 0) {
    return "UNKNOWN";
  }

  const correct = scored.filter((row) => row.customer_steering_prediction === "CORRECT").length;
  const incorrect = scored.filter((row) => row.customer_steering_prediction === "INCORRECT").length;

  if (correct > 0 && incorrect === 0) {
    return "CUSTOMER_STEERING_SIGNAL_POSITIVE";
  }
  if (incorrect > 0 && correct === 0) {
    return "CUSTOMER_STEERING_SIGNAL_NEGATIVE";
  }
  if (correct > 0 && incorrect > 0) {
    return "MIXED";
  }

  return "UNKNOWN";
}

export function buildCustomerAuthorityOutcomesV1(
  input: BuildCustomerAuthorityOutcomesV1Input,
): CustomerAuthorityOutcomesV1 {
  const outcome_window_days = input.outcome_window_days ?? CUSTOMER_AUTHORITY_OUTCOME_WINDOW_DAYS_V1;
  const proven_facts: string[] = [
    "PROVEN: customer_authority_outcomes_v1 compares authority history snapshots to later customer lanes only.",
    "PROVEN: does not replace next_best_action or mutate product data.",
  ];
  const inferred_facts: string[] = [];
  const unknown_facts: string[] = [];

  const snapshots = loadCustomerAuthorityHistorySnapshotsFullV1({
    rootDir: input.rootDir,
    fs: input.fs,
  });
  const snapshot_count = snapshots.length;
  const insufficient_history = snapshot_count < 2;

  const evaluated_snapshots = snapshots.map((snapshot) =>
    evaluateCustomerAuthoritySnapshotOutcomeV1({
      snapshot,
      rel_path: `${CUSTOMER_AUTHORITY_HISTORY_DIR_REL_V1}/${snapshot.snapshot_date_utc}.json`,
      generated_at: input.generated_at,
      insufficient_history,
      outcome_window_days,
      steering: input.steering,
      closure: input.closure,
      scoreboard: input.scoreboard,
      authorityScore: input.authorityScore,
    }),
  );

  const evaluable_snapshot_count = evaluated_snapshots.filter(
    (row) => row.customer_steering_prediction !== "NOT_EVALUABLE",
  ).length;
  const unevaluable_snapshot_count = evaluated_snapshots.length - evaluable_snapshot_count;
  const trend_measurable = evaluable_snapshot_count >= 2;
  const current_verdict = deriveCurrentVerdictV1({ snapshot_count, evaluated_snapshots });

  proven_facts.push(`PROVEN: snapshot_count=${String(snapshot_count)}.`);
  proven_facts.push(`PROVEN: evaluable_snapshot_count=${String(evaluable_snapshot_count)}.`);
  proven_facts.push(`PROVEN: current_verdict=${current_verdict}.`);

  if (insufficient_history) {
    unknown_facts.push(
      "UNKNOWN: INSUFFICIENT_HISTORY — need at least two authority snapshots before outcome verdict.",
    );
  }
  if (snapshot_count >= 2 && evaluable_snapshot_count === 0) {
    unknown_facts.push(
      "UNKNOWN: no evaluable conflicting snapshots after outcome window — verdict remains UNKNOWN.",
    );
  }
  if (snapshot_count >= 2 && evaluable_snapshot_count > 0 && current_verdict === "UNKNOWN") {
    inferred_facts.push(
      "INFERRED: evaluable snapshots exist but none reached PROVEN CORRECT/INCORRECT — metrics inconclusive.",
    );
  }

  return {
    contract: CUSTOMER_AUTHORITY_OUTCOMES_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: CUSTOMER_AUTHORITY_OUTCOMES_CC_JQ_PATH_V1,
    source_command: CUSTOMER_AUTHORITY_OUTCOMES_SOURCE_COMMAND_V1,
    generated_at: input.generated_at,
    snapshot_count,
    evaluable_snapshot_count,
    unevaluable_snapshot_count,
    trend_measurable,
    outcome_window_days,
    evaluated_snapshots,
    current_verdict,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
