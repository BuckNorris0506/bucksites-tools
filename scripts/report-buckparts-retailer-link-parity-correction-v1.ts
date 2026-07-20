#!/usr/bin/env node
/**
 * Read-only Phase 3 retailer-link parity correction reporter.
 * This command never applies a plan or writes durable artifacts.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildRetailerLinkParityCloseoutV1,
} from "./lib/buckparts-retailer-link-parity-closeout-v1";
import {
  buildRetailerLinkParityCorrectionPlanV1,
} from "./lib/buckparts-retailer-link-parity-correction-plan-v1";
import {
  buildRetailerLinkParityIssueIntakeV1,
  type BuckpartsRetailerLinkParityIssueIntakeReportV1,
} from "./lib/buckparts-retailer-link-parity-issue-intake-v1";
import {
  buildFridgeSupabaseVsCsvRetailerLinksDiffV1,
  type FridgeSupabaseVsCsvRetailerLinksDiffV1,
} from "./lib/fridge-supabase-vs-csv-retailer-links-diff-v1";

export type RetailerLinkParityCorrectionReportModeV1 =
  | "detect"
  | "intake_preview"
  | "plan_dry_run"
  | "owner_review"
  | "closeout_verify";

export function parseRetailerLinkParityCorrectionArgvV1(
  argv: readonly string[],
): RetailerLinkParityCorrectionReportModeV1 {
  if (argv.includes("--write") || argv.includes("--apply")) {
    throw new Error("This retailer-link parity report is read-only; --write and --apply are refused.");
  }
  const requested = [
    ["--intake-preview", "intake_preview"],
    ["--plan-dry-run", "plan_dry_run"],
    ["--owner-review", "owner_review"],
    ["--closeout-verify", "closeout_verify"],
  ].filter(([flag]) => argv.includes(flag));
  if (requested.length > 1) throw new Error("Choose at most one report mode.");
  if (requested.length === 0) return "detect";
  return requested[0]![1] as RetailerLinkParityCorrectionReportModeV1;
}

export type RetailerLinkParityCorrectionReportBuildersV1 = {
  buildIntake: (rootDir: string) => Promise<BuckpartsRetailerLinkParityIssueIntakeReportV1>;
  buildPostDiff: (rootDir: string) => Promise<FridgeSupabaseVsCsvRetailerLinksDiffV1>;
};

const defaultBuilders: RetailerLinkParityCorrectionReportBuildersV1 = {
  buildIntake: (rootDir) => buildRetailerLinkParityIssueIntakeV1({ rootDir }),
  buildPostDiff: (rootDir) => buildFridgeSupabaseVsCsvRetailerLinksDiffV1({ rootDir }),
};

/** Shared read-only intake→plan derivation for reporter and Command Center. */
export async function deriveRetailerLinkParityCorrectionProjectionV1(args: {
  rootDir: string;
  builders?: RetailerLinkParityCorrectionReportBuildersV1;
}): Promise<{
  intake: BuckpartsRetailerLinkParityIssueIntakeReportV1;
  plan: ReturnType<typeof buildRetailerLinkParityCorrectionPlanV1>;
  posture: "ARMED_AND_IDLE" | "NOT_PROVEN" | "PLAN_READY";
}> {
  const intake = await (args.builders ?? defaultBuilders).buildIntake(args.rootDir);
  const plan = buildRetailerLinkParityCorrectionPlanV1({ intake });
  const noOp = plan.row_count === 0 && (
    plan.blockers.some((blocker) => blocker.startsWith("no_op_update_refused:")) ||
    intake.candidates.length === 0
  );
  return {
    intake,
    plan,
    posture: noOp ? "ARMED_AND_IDLE" : plan.blockers.length === 0 ? "PLAN_READY" : "NOT_PROVEN",
  };
}

export async function runRetailerLinkParityCorrectionReportV1(args: {
  rootDir: string;
  mode: RetailerLinkParityCorrectionReportModeV1;
  builders?: RetailerLinkParityCorrectionReportBuildersV1;
}) {
  const builders = args.builders ?? defaultBuilders;
  const { intake, plan } = await deriveRetailerLinkParityCorrectionProjectionV1(args);
  const base = {
    mode: args.mode,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
  };

  const noOp =
    plan.row_count === 0 &&
    plan.blockers.includes("zero_row_plan_refused") &&
    plan.blockers.some((blocker) => blocker.startsWith("no_op_update_refused:"));
  const armedIdleNext =
    "No apply-ready parity correction exists. Continue read-only monitoring.";

  if (args.mode === "detect" || args.mode === "intake_preview") {
    return {
      ...base,
      counts: {
        detected: intake.detected_count,
        correctable: intake.correctable_count,
        unknown: intake.unknown_count,
        planned: plan.row_count,
        awaiting_approval: 0,
        applied: 0,
        verified: 0,
        // Plan/intake blockers are not reconciliation failures; no-op idle stays 0.
        failed_or_reconciliation: noOp ? 0 : intake.blocked_count,
      },
      blockers: [...new Set([...intake.blockers, ...plan.blockers])].sort(),
      posture: noOp || (plan.row_count === 0 && intake.candidates.length === 0)
        ? "ARMED_AND_IDLE"
        : "NOT_PROVEN",
      next_action: noOp ? armedIdleNext : intake.recommended_next_action,
      plan_sha256: plan.plan_sha256,
    };
  }

  if (args.mode === "plan_dry_run" || args.mode === "owner_review") {
    return {
      ...base,
      counts: {
        detected: intake.detected_count,
        correctable: intake.correctable_count,
        unknown: intake.unknown_count,
        planned: plan.row_count,
        awaiting_approval: args.mode === "owner_review" && plan.row_count > 0 ? plan.row_count : 0,
        applied: 0,
        verified: 0,
        // Pre-apply modes never claim FAILED_RECONCILIATION; that requires closeout.
        failed_or_reconciliation: 0,
      },
      blockers: plan.blockers,
      posture: noOp ? "ARMED_AND_IDLE" : plan.blockers.length === 0 ? "PLAN_READY" : "NOT_PROVEN",
      next_action: noOp ? armedIdleNext : plan.recommended_next_action,
      plan_sha256: plan.plan_sha256,
    };
  }

  const closeout = buildRetailerLinkParityCloseoutV1({
    plan,
    postDiff: await builders.buildPostDiff(args.rootDir),
    expected_plan_sha256: plan.plan_sha256,
  });
  return {
    ...base,
    counts: {
      detected: intake.detected_count,
      correctable: intake.correctable_count,
      unknown: intake.unknown_count,
      planned: plan.row_count,
      awaiting_approval: 0,
      applied: 0,
      verified: closeout.verified_count,
      failed_or_reconciliation: closeout.failed_or_reconciliation_count,
    },
    blockers: closeout.blockers,
    posture: closeout.closeout_status === "VERIFIED" ? "VERIFIED" : "NOT_PROVEN",
    next_action: closeout.recommended_next_action,
    plan_sha256: plan.plan_sha256,
    closeout_status: closeout.closeout_status,
  };
}

async function main(): Promise<void> {
  const mode = parseRetailerLinkParityCorrectionArgvV1(process.argv.slice(2));
  // The exported runner accepts injected builders for test hooks; normal CLI runs use repo libs.
  const summary = await runRetailerLinkParityCorrectionReportV1({ rootDir: process.cwd(), mode });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

function isExecutedAsCliMainV1(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(path.resolve(entry)).href;
  } catch {
    return false;
  }
}

if (
  isExecutedAsCliMainV1() &&
  process.env.BUCKPARTS_PARITY_CORRECTION_TEST_HOOK !== "1"
) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
