/**
 * Phase 4 Decision-Capture v1 — read-only sibling to phase4_coverage_scoreboard_v1.
 * Counts evidence-entered decision opportunities (BUY / DO-NOT-BUY / UNKNOWN).
 * Raw inventory is not the denominator. No mutation or steering authority.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { DemandToCoverageNextLaneReportV1 } from "./demand-to-coverage-next-lane-v1";
import {
  FRIDGE_MODEL_PDP_REMAIN_NO_BUY_SLUG_V1,
  FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_CONTRACT_V1,
  FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_JSON_REL_V1,
} from "./fridge-truth-spine-v1";

export const PHASE4_DECISION_CAPTURE_CONTRACT_V1 = "phase4_decision_capture_v1" as const;

export const PHASE4_DECISION_CAPTURE_CC_JQ_PATH_V1 =
  ".command_center_v2.phase4_decision_capture_v1" as const;

export const PHASE4_DECISION_CAPTURE_SOURCE_COMMAND_V1 =
  "npm run buckparts:command-center" as const;

export type Phase4DecisionOutcomeV1 = "confident_buy" | "confident_do_not_buy" | "honest_unknown";

export type Phase4DemandSignalStatusV1 = "PROVEN" | "STALE" | "UNKNOWN";

export type Phase4DecisionCaptureRuntimeStatusV1 = "OK" | "ATTENTION" | "NOT_PROVEN" | "UNKNOWN";

export type Phase4DecisionCaptureRowV1 = {
  model_slug: string;
  outcome: Phase4DecisionOutcomeV1;
  evidence_basis: "PROVEN" | "UNKNOWN";
  evidence_refs: string[];
};

export type Phase4DecisionCaptureV1 = {
  contract: typeof PHASE4_DECISION_CAPTURE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  steering_authority: false;
  recommended_jq_path: typeof PHASE4_DECISION_CAPTURE_CC_JQ_PATH_V1;
  source_command: typeof PHASE4_DECISION_CAPTURE_SOURCE_COMMAND_V1;
  generated_at: string;
  runtime_status: Phase4DecisionCaptureRuntimeStatusV1;
  wedge_scope: "refrigerator_water";
  denominator_definition: string;
  decision_universe_count: number;
  confident_buy_count: number;
  confident_do_not_buy_count: number;
  honest_unknown_count: number;
  evidence_backed_wrong_part_prevention_count: number;
  demand_signal_status: Phase4DemandSignalStatusV1;
  demand_signal_notes: string[];
  rows: Phase4DecisionCaptureRowV1[];
  source_paths: string[];
  blockers: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
  steering_note: string;
};

export type CtaGoProofPackForDecisionCaptureV1 = {
  contract?: string;
  scope?: {
    slugs?: string[];
    excluded_quarantined_slugs?: string[];
    excluded_partial_slugs?: string[];
  };
  rows?: Array<{
    slug?: string;
    verdict?: string;
  }>;
};

export type BuildPhase4DecisionCaptureArgsV1 = {
  rootDir: string;
  now?: () => Date;
  demandNextLane?: DemandToCoverageNextLaneReportV1 | null;
  /** Test override: inject CTA/go pack instead of reading draft JSON. */
  loadCtaGoProofPack?: () => CtaGoProofPackForDecisionCaptureV1 | null;
};

const DENOMINATOR_DEFINITION_V1 =
  "Decision opportunities that have entered the BuckParts decision system through evidence-backed evaluation (mapping, owner review, proven BUY, proven DO-NOT-BUY, or honest UNKNOWN). Raw inventory does not enter the denominator until it becomes a customer decision opportunity.";

function sortedUnique(values: string[]): string[] {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()))].sort();
}

function loadCtaGoPackFromDisk(rootDir: string): CtaGoProofPackForDecisionCaptureV1 | null {
  const abs = path.join(rootDir, FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_JSON_REL_V1);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as CtaGoProofPackForDecisionCaptureV1;
  } catch {
    return null;
  }
}

function resolveDemandSignal(
  demand: DemandToCoverageNextLaneReportV1 | null | undefined,
): { status: Phase4DemandSignalStatusV1; notes: string[]; blockers: string[] } {
  if (!demand || demand.contract !== "demand_to_coverage_next_lane_v1") {
    return {
      status: "UNKNOWN",
      notes: [
        "UNKNOWN: demand_to_coverage_next_lane_v1 unavailable — demand is not coerced to zero.",
      ],
      blockers: ["phase4_decision_capture_demand_signal_unknown"],
    };
  }
  if (demand.runtime_status === "UNKNOWN" || demand.source_status === "UNKNOWN") {
    return {
      status: "UNKNOWN",
      notes: [
        "UNKNOWN: demand next-lane runtime/source is UNKNOWN — demand is not coerced to zero.",
        `recommendation_status=${demand.recommendation_status}`,
      ],
      blockers: ["phase4_decision_capture_demand_signal_unknown"],
    };
  }
  if (demand.runtime_status === "PARTIAL") {
    return {
      status: "STALE",
      notes: [
        "STALE/PARTIAL: demand next-lane is partial — treat demand as non-zero-capable but not fully proven.",
        `recommendation_status=${demand.recommendation_status}`,
        `recommended_wedge=${String(demand.recommended_wedge)}`,
      ],
      blockers: [],
    };
  }
  return {
    status: "PROVEN",
    notes: [
      `PROVEN: demand recommendation_status=${demand.recommendation_status}; recommended_wedge=${String(demand.recommended_wedge)}.`,
      "Demand cannot override safety or invent BUY decisions.",
    ],
    blockers: [],
  };
}

function emptyCapture(args: {
  generated_at: string;
  blockers: string[];
  unknown_facts: string[];
}): Phase4DecisionCaptureV1 {
  return {
    contract: PHASE4_DECISION_CAPTURE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    steering_authority: false,
    recommended_jq_path: PHASE4_DECISION_CAPTURE_CC_JQ_PATH_V1,
    source_command: PHASE4_DECISION_CAPTURE_SOURCE_COMMAND_V1,
    generated_at: args.generated_at,
    runtime_status: "NOT_PROVEN",
    wedge_scope: "refrigerator_water",
    denominator_definition: DENOMINATOR_DEFINITION_V1,
    decision_universe_count: 0,
    confident_buy_count: 0,
    confident_do_not_buy_count: 0,
    honest_unknown_count: 0,
    evidence_backed_wrong_part_prevention_count: 0,
    demand_signal_status: "UNKNOWN",
    demand_signal_notes: [
      "UNKNOWN: decision universe not proven — demand remains UNKNOWN (never zero).",
    ],
    rows: [],
    source_paths: [],
    blockers: sortedUnique(args.blockers),
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: sortedUnique(args.unknown_facts),
    recommended_next_action:
      "NOT_PROVEN: restore artifact-backed CTA/go proof pack before using Decision-Capture.",
    steering_note:
      "Sibling to phase4_coverage_scoreboard_v1 only: issue_registry remains steering; canonical_final remains NBA; Decision-Capture cannot authorize mutation or set NBA.",
  };
}

export function buildPhase4DecisionCaptureV1(
  args: BuildPhase4DecisionCaptureArgsV1,
): Phase4DecisionCaptureV1 {
  const generated_at = (args.now ?? (() => new Date()))().toISOString();
  const pack =
    args.loadCtaGoProofPack?.() ?? loadCtaGoPackFromDisk(args.rootDir);

  if (!pack || pack.contract !== FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_CONTRACT_V1) {
    return emptyCapture({
      generated_at,
      blockers: ["phase4_decision_capture_cta_go_proof_required"],
      unknown_facts: [
        "UNKNOWN: CTA/go proof pack missing or wrong contract — cannot form evidence-entered decision universe.",
      ],
    });
  }

  const scopeSlugs = [...(pack.scope?.slugs ?? [])].map((s) => s.trim()).filter(Boolean);
  const quarantined = [...(pack.scope?.excluded_quarantined_slugs ?? [])]
    .map((s) => s.trim())
    .filter(Boolean);
  const partial = [...(pack.scope?.excluded_partial_slugs ?? [])].map((s) => s.trim()).filter(Boolean);
  const universe = sortedUnique([...scopeSlugs, ...quarantined, ...partial]);

  if (universe.length === 0) {
    return emptyCapture({
      generated_at,
      blockers: ["phase4_decision_capture_empty_universe"],
      unknown_facts: [
        "UNKNOWN: CTA/go proof pack produced an empty evidence-entered universe.",
      ],
    });
  }

  const verdictBySlug = new Map<string, string>();
  for (const row of pack.rows ?? []) {
    const slug = String(row.slug ?? "").trim();
    const verdict = String(row.verdict ?? "").trim();
    if (slug && verdict) verdictBySlug.set(slug, verdict);
  }

  const remainNoBuy = FRIDGE_MODEL_PDP_REMAIN_NO_BUY_SLUG_V1;
  const rows: Phase4DecisionCaptureRowV1[] = [];
  for (const model_slug of universe) {
    if (model_slug === remainNoBuy) {
      rows.push({
        model_slug,
        outcome: "confident_do_not_buy",
        evidence_basis: "PROVEN",
        evidence_refs: [
          FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_JSON_REL_V1,
          `remain_no_buy:${remainNoBuy}`,
        ],
      });
      continue;
    }
    const verdict = verdictBySlug.get(model_slug);
    if (verdict === "SAFE_BUYER_PATH_PASS") {
      rows.push({
        model_slug,
        outcome: "confident_buy",
        evidence_basis: "PROVEN",
        evidence_refs: [FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_JSON_REL_V1, "verdict:SAFE_BUYER_PATH_PASS"],
      });
      continue;
    }
    rows.push({
      model_slug,
      outcome: "honest_unknown",
      evidence_basis: quarantined.includes(model_slug) || partial.includes(model_slug)
        ? "PROVEN"
        : verdict
          ? "PROVEN"
          : "UNKNOWN",
      evidence_refs: [
        FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_JSON_REL_V1,
        quarantined.includes(model_slug)
          ? "scope:excluded_quarantined"
          : partial.includes(model_slug)
            ? "scope:excluded_partial"
            : verdict
              ? `verdict:${verdict}`
              : "scope:entered_without_pass",
      ],
    });
  }

  const confident_buy_count = rows.filter((r) => r.outcome === "confident_buy").length;
  const confident_do_not_buy_count = rows.filter((r) => r.outcome === "confident_do_not_buy").length;
  const honest_unknown_count = rows.filter((r) => r.outcome === "honest_unknown").length;
  const decision_universe_count = rows.length;

  if (
    confident_buy_count + confident_do_not_buy_count + honest_unknown_count !==
    decision_universe_count
  ) {
    return emptyCapture({
      generated_at,
      blockers: ["phase4_decision_capture_outcome_partition_broken"],
      unknown_facts: ["UNKNOWN: BUY/DO-NOT-BUY/UNKNOWN partition failed internal integrity check."],
    });
  }

  // Current evidence only: remain-no-buy. Dated WRONG_PART_RISK audits are not silently counted.
  const evidence_backed_wrong_part_prevention_count = universe.includes(remainNoBuy) ? 1 : 0;

  const demand = resolveDemandSignal(args.demandNextLane);
  const blockers = sortedUnique([
    ...demand.blockers,
    ...(decision_universe_count === 0 ? ["phase4_decision_capture_empty_universe"] : []),
  ]);

  const runtime_status: Phase4DecisionCaptureRuntimeStatusV1 =
    blockers.length > 0 || honest_unknown_count > 0 ? "ATTENTION" : "OK";

  return {
    contract: PHASE4_DECISION_CAPTURE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    steering_authority: false,
    recommended_jq_path: PHASE4_DECISION_CAPTURE_CC_JQ_PATH_V1,
    source_command: PHASE4_DECISION_CAPTURE_SOURCE_COMMAND_V1,
    generated_at,
    runtime_status,
    wedge_scope: "refrigerator_water",
    denominator_definition: DENOMINATOR_DEFINITION_V1,
    decision_universe_count,
    confident_buy_count,
    confident_do_not_buy_count,
    honest_unknown_count,
    evidence_backed_wrong_part_prevention_count,
    demand_signal_status: demand.status,
    demand_signal_notes: demand.notes,
    rows,
    source_paths: sortedUnique([FRIDGE_TRUTH_SPINE_CTA_GO_PROOF_JSON_REL_V1]),
    blockers,
    proven_facts: sortedUnique([
      `PROVEN: evidence-entered decision_universe_count=${decision_universe_count} (raw fridge inventory excluded).`,
      `PROVEN: confident_buy_count=${confident_buy_count}; confident_do_not_buy_count=${confident_do_not_buy_count}; honest_unknown_count=${honest_unknown_count}.`,
      `PROVEN: evidence_backed_wrong_part_prevention_count=${evidence_backed_wrong_part_prevention_count} (remain-no-buy current evidence only).`,
      "PROVEN: mutation_authorized=false; steering_authority=false.",
    ]),
    inferred_facts: sortedUnique([
      "INFERRED: quarantined/PARTIAL exclusions are honest_unknown decision opportunities, not raw inventory.",
    ]),
    unknown_facts: sortedUnique([
      ...demand.notes.filter((n) => n.startsWith("UNKNOWN:")),
      "UNKNOWN: dated model-filter WRONG_PART_RISK audits are not counted as live DO-NOT-BUY without a current evidence re-run.",
      "UNKNOWN: conversion/revenue impact of decision outcomes.",
    ]),
    recommended_next_action:
      honest_unknown_count > 0
        ? `Read-only: ${honest_unknown_count} honest_unknown decision opportunities remain in the evidence-entered universe (quarantine/PARTIAL/non-PASS). No mutation authorized.`
        : "Read-only: Decision-Capture universe is partitioned; continue evidence evaluation without autonomous apply.",
    steering_note:
      "Sibling to phase4_coverage_scoreboard_v1 only: supply census remains canonical for SAFE_BUYER_PATH_* page counts; issue_registry remains steering; canonical_final remains NBA; Decision-Capture cannot authorize mutation or set NBA.",
  };
}

export function buildPhase4DecisionCaptureUnknownV1(args: {
  reason: string;
  now?: () => Date;
}): Phase4DecisionCaptureV1 {
  return emptyCapture({
    generated_at: (args.now ?? (() => new Date()))().toISOString(),
    blockers: [
      "phase4_decision_capture_build_failed",
      `phase4_decision_capture_build_failed:${args.reason}`,
    ],
    unknown_facts: [`UNKNOWN: Decision-Capture build failed: ${args.reason}`],
  });
}
