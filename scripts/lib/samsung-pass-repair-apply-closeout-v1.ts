/**
 * Read-only SAMSUNG_PASS_REPAIR_APPLY_CLOSEOUT_V1.
 * Proves Samsung PASS guarded CSV apply was executed and must not be re-applied.
 */

import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  validateFounderDecisionRegistryDocumentV1,
  validateFounderDecisionRegistryRowV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";
import { buildRefrigeratorTruthScoreboardV1 } from "./refrigerator-truth-scoreboard-v1";
import {
  SAMSUNG_PASS_GUARDED_APPLY_REPORT_JSON_REL_V1,
  SAMSUNG_PASS_OWNER_APPROVAL_JSON_REL_V1,
  runSamsungPassRepairGuardedApplyV1,
  type SamsungPassRepairGuardedApplyReportV1,
} from "./samsung-pass-repair-guarded-apply-v1";
import {
  SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1,
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_CONTRACT_V1,
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
  SAMSUNG_PASS_TARGET_FILTER_SLUG_V1,
  type SamsungPassRepairApplyPlanV1,
} from "./samsung-pass-repair-apply-plan-v1";

export const SAMSUNG_PASS_REPAIR_APPLY_CLOSEOUT_CONTRACT_V1 =
  "samsung_pass_repair_apply_closeout_v1" as const;

export const SAMSUNG_PASS_REPAIR_APPLY_CLOSEOUT_JSON_REL_V1 =
  "data/fridge/batch-production/apply-execution-plans/samsung-pass-repair-apply-closeout-v1.json" as const;

export const SAMSUNG_PASS_REPAIR_APPLY_CLOSEOUT_MD_REL_V1 =
  "data/fridge/batch-production/apply-execution-plans/samsung-pass-repair-apply-closeout-v1.md" as const;

export const SAMSUNG_PASS_REPAIR_APPLY_CLOSEOUT_SOURCE_COMMAND_V1 =
  "npm run buckparts:samsung-pass-repair-apply-closeout" as const;

export const SAMSUNG_PASS_APPLY_COMMIT_MESSAGE_NEEDLE_V1 =
  "Apply Samsung pass repair compatibility mappings" as const;

export const SAMSUNG_PASS_EXPECTED_REMOVED_ROW_KEYS_V1 = [
  "samsung-rf27t5201sr,da29-10105j",
  "samsung-rf27t5501sr,da29-00012b",
  "samsung-rf27t5501sr,da29-00020b",
  "samsung-rf28r6301sr,da29-00019a",
  "samsung-rf28t5101sr,da29-00019a",
  "samsung-rs22t5201sg,da29-10105j",
] as const;

export const SAMSUNG_PASS_EXPECTED_ADDED_ROW_KEYS_V1 = [
  "samsung-rf27t5201sr,da97-17376b",
  "samsung-rf27t5501sr,da97-17376b",
  "samsung-rf28r6301sr,da97-17376b",
  "samsung-rf28t5101sr,da97-17376b",
  "samsung-rs22t5201sg,da97-17376b",
] as const;

export const SAMSUNG_PASS_EXPECTED_SCOREBOARD_COUNTS_V1 = {
  multi_mapped_count: 211,
  phantom_model_count: 13,
  wrong_part_risk_count: 75,
} as const;

export type SamsungPassRepairApplyCloseoutV1 = {
  contract: typeof SAMSUNG_PASS_REPAIR_APPLY_CLOSEOUT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  source_command: typeof SAMSUNG_PASS_REPAIR_APPLY_CLOSEOUT_SOURCE_COMMAND_V1;
  git_head_sha: string;
  apply_execution_commit_sha: string | null;
  apply_execution_commit_message: string | null;
  apply_execution_status: "APPLIED" | "NOT_PROVEN";
  guarded_apply_report_rel_path: typeof SAMSUNG_PASS_GUARDED_APPLY_REPORT_JSON_REL_V1;
  guarded_apply_report_apply_status: SamsungPassRepairGuardedApplyReportV1["apply_status"];
  guarded_apply_report_mode: SamsungPassRepairGuardedApplyReportV1["mode"];
  apply_plan_rel_path: typeof SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1;
  apply_plan_consumed: boolean;
  rerun_apply_should_block: boolean;
  owner_approval_rel_path: typeof SAMSUNG_PASS_OWNER_APPROVAL_JSON_REL_V1;
  owner_approval_decision_id: string | null;
  owner_approval_valid: boolean;
  csv_verification: {
    target_csv_rel_path: string;
    intended_da97_17376b_mappings_present: boolean;
    removed_mappings_absent: boolean;
    present_da97_17376b_row_keys: string[];
    absent_removed_row_keys: string[];
    still_present_removed_row_keys: string[];
    missing_da97_17376b_row_keys: string[];
  };
  scoreboard_counts_after_refresh: {
    multi_mapped_count: number;
    phantom_model_count: number;
    wrong_part_risk_count: number;
    matches_expected: boolean;
  };
  closeout_verification_passed: boolean;
  verification_blockers: string[];
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

type SamsungPassOwnerApprovalContextV1 = {
  founder_option_id?: string;
  apply_plan_rel_path?: string;
  apply_not_executed?: boolean;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function rowKey(fridgeSlug: string, filterSlug: string): string {
  return `${normalizeSlug(fridgeSlug)},${normalizeSlug(filterSlug)}`;
}

function readJsonFile<T>(rootDir: string, relPath: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, relPath), "utf8")) as T;
}

function readCompatRowKeys(rootDir: string, relPath: string): Set<string> {
  const rows = parse(readFileSync(path.join(rootDir, relPath), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ fridge_slug?: string; filter_slug?: string }>;

  return new Set(
    rows
      .filter((row) => row.fridge_slug && row.filter_slug)
      .map((row) => rowKey(row.fridge_slug!, row.filter_slug!)),
  );
}

function gitHeadSha(rootDir: string): string {
  try {
    return execSync("git rev-parse HEAD", {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return "unknown";
  }
}

function findApplyExecutionCommit(rootDir: string): { sha: string; message: string } | null {
  try {
    const output = execSync(
      `git log --format=%H%x00%s -- ${path.join(rootDir, "data/compatibility_mappings.csv")}`,
      { cwd: rootDir, encoding: "utf8", maxBuffer: 10 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"] },
    );
    for (const line of output.split("\n")) {
      if (!line.trim()) continue;
      const [sha, message] = line.split("\0");
      if (!sha || !message) continue;
      if (message.includes(SAMSUNG_PASS_APPLY_COMMIT_MESSAGE_NEEDLE_V1)) {
        return { sha: sha.trim(), message: message.trim() };
      }
    }
  } catch {
    return null;
  }
  return null;
}

function verifyOwnerApproval(args: {
  rootDir: string;
  applyPlanRelPath: string;
  referenceTimeIso: string;
}): { valid: boolean; decisionId: string | null; blockers: string[] } {
  const blockers: string[] = [];
  const doc = readJsonFile<{ rows?: unknown[] }>(
    args.rootDir,
    SAMSUNG_PASS_OWNER_APPROVAL_JSON_REL_V1,
  );
  const validated = validateFounderDecisionRegistryDocumentV1(doc);
  if (!validated.ok) {
    return { valid: false, decisionId: null, blockers: [`owner approval invalid: ${validated.errors.join("; ")}`] };
  }

  for (const raw of doc.rows ?? []) {
    const row = raw as {
      decision_id?: string;
      decision_status?: string;
      allowed_next_scope?: string;
      evidence_required_before_mutation?: boolean;
      samsung_pass_repair_owner_approval_context_v1?: SamsungPassOwnerApprovalContextV1;
    };
    const rowValidation = validateFounderDecisionRegistryRowV1(row);
    if (!rowValidation.ok) continue;
    const ctx = row.samsung_pass_repair_owner_approval_context_v1;
    if (ctx?.founder_option_id !== "approve_apply_plan") continue;
    if (ctx.apply_plan_rel_path !== args.applyPlanRelPath) continue;
    if (row.decision_status !== "approved") continue;
    if (row.allowed_next_scope !== "owner_mutation_approved") continue;
    if (row.evidence_required_before_mutation !== true) continue;
    const gate = founderRegistryRowPassesMutationApprovalGateV1({
      row: rowValidation.row,
      referenceTimeIso: args.referenceTimeIso,
      rootDir: args.rootDir,
      readText: (abs) => readFileSync(abs, "utf8"),
    });
    if (!gate.ok) {
      blockers.push(
        `owner approval row fails mutation approval gate: ${gate.blockers.join(",")}`,
      );
      continue;
    }
    return { valid: true, decisionId: row.decision_id ?? null, blockers: [] };
  }

  blockers.push("no approve_apply_plan owner approval row found");
  return { valid: false, decisionId: null, blockers };
}

export function verifySamsungPassRepairCsvStateV1(rootDir: string, targetCsvRelPath: string) {
  const keys = readCompatRowKeys(rootDir, targetCsvRelPath);
  const present_da97_17376b_row_keys = SAMSUNG_PASS_EXPECTED_ADDED_ROW_KEYS_V1.filter((key) =>
    keys.has(key),
  );
  const missing_da97_17376b_row_keys = SAMSUNG_PASS_EXPECTED_ADDED_ROW_KEYS_V1.filter(
    (key) => !keys.has(key),
  );
  const absent_removed_row_keys = SAMSUNG_PASS_EXPECTED_REMOVED_ROW_KEYS_V1.filter(
    (key) => !keys.has(key),
  );
  const still_present_removed_row_keys = SAMSUNG_PASS_EXPECTED_REMOVED_ROW_KEYS_V1.filter((key) =>
    keys.has(key),
  );

  return {
    target_csv_rel_path: targetCsvRelPath,
    intended_da97_17376b_mappings_present: missing_da97_17376b_row_keys.length === 0,
    removed_mappings_absent: still_present_removed_row_keys.length === 0,
    present_da97_17376b_row_keys: [...present_da97_17376b_row_keys],
    absent_removed_row_keys: [...absent_removed_row_keys],
    still_present_removed_row_keys: [...still_present_removed_row_keys],
    missing_da97_17376b_row_keys: [...missing_da97_17376b_row_keys],
  };
}

export function buildSamsungPassRepairApplyCloseoutV1(args: {
  rootDir: string;
  now?: () => Date;
}): SamsungPassRepairApplyCloseoutV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const verification_blockers: string[] = [];

  const applyPlan = readJsonFile<SamsungPassRepairApplyPlanV1>(
    args.rootDir,
    SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
  );
  if (applyPlan.contract !== SAMSUNG_PASS_REPAIR_APPLY_PLAN_CONTRACT_V1) {
    throw new Error("Samsung PASS apply plan contract mismatch");
  }

  const guardedReport = readJsonFile<SamsungPassRepairGuardedApplyReportV1>(
    args.rootDir,
    SAMSUNG_PASS_GUARDED_APPLY_REPORT_JSON_REL_V1,
  );

  const git_head_sha = gitHeadSha(args.rootDir);
  const applyCommit = findApplyExecutionCommit(args.rootDir);
  const csvVerification = verifySamsungPassRepairCsvStateV1(args.rootDir, applyPlan.target_csv_rel_path);
  const ownerApproval = verifyOwnerApproval({
    rootDir: args.rootDir,
    applyPlanRelPath: SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
    referenceTimeIso: generatedAt,
  });

  const rerunReport = runSamsungPassRepairGuardedApplyV1({
    rootDir: args.rootDir,
    mode: "dry_run",
    now: args.now,
  });
  const rerun_apply_should_block = rerunReport.apply_status === "BLOCKED";
  const apply_plan_consumed = rerun_apply_should_block;

  const scoreboard = buildRefrigeratorTruthScoreboardV1({ rootDir: args.rootDir, now: args.now });
  const scoreboard_counts_after_refresh = {
    multi_mapped_count: scoreboard.counts.multi_mapped_count,
    phantom_model_count: scoreboard.counts.phantom_model_count,
    wrong_part_risk_count: scoreboard.counts.wrong_part_risk_count,
    matches_expected:
      scoreboard.counts.multi_mapped_count ===
        SAMSUNG_PASS_EXPECTED_SCOREBOARD_COUNTS_V1.multi_mapped_count &&
      scoreboard.counts.phantom_model_count ===
        SAMSUNG_PASS_EXPECTED_SCOREBOARD_COUNTS_V1.phantom_model_count &&
      scoreboard.counts.wrong_part_risk_count ===
        SAMSUNG_PASS_EXPECTED_SCOREBOARD_COUNTS_V1.wrong_part_risk_count,
  };

  if (!applyCommit) {
    verification_blockers.push("apply execution commit not found in git history for compatibility_mappings.csv");
  }
  if (!ownerApproval.valid) {
    verification_blockers.push(...ownerApproval.blockers);
  }
  if (!csvVerification.intended_da97_17376b_mappings_present) {
    verification_blockers.push(
      `missing intended da97-17376b mappings: ${csvVerification.missing_da97_17376b_row_keys.join("|")}`,
    );
  }
  if (!csvVerification.removed_mappings_absent) {
    verification_blockers.push(
      `removed mappings still present: ${csvVerification.still_present_removed_row_keys.join("|")}`,
    );
  }
  if (!apply_plan_consumed) {
    verification_blockers.push("apply plan is still reusable — guarded apply dry-run did not block");
  }
  if (!rerun_apply_should_block) {
    verification_blockers.push("rerun_apply_should_block=false — guarded apply must block re-apply");
  }
  if (!scoreboard_counts_after_refresh.matches_expected) {
    verification_blockers.push(
      `scoreboard counts mismatch — got multi=${String(scoreboard.counts.multi_mapped_count)} phantom=${String(scoreboard.counts.phantom_model_count)} wrong=${String(scoreboard.counts.wrong_part_risk_count)}`,
    );
  }

  const csvProvesApplied =
    csvVerification.intended_da97_17376b_mappings_present &&
    csvVerification.removed_mappings_absent &&
    applyCommit != null;

  const apply_execution_status: SamsungPassRepairApplyCloseoutV1["apply_execution_status"] =
    csvProvesApplied ? "APPLIED" : "NOT_PROVEN";

  if (apply_execution_status !== "APPLIED") {
    verification_blockers.push("apply_execution_status is NOT_PROVEN");
  }

  const closeout_verification_passed = verification_blockers.length === 0;

  return {
    contract: SAMSUNG_PASS_REPAIR_APPLY_CLOSEOUT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: generatedAt,
    source_command: SAMSUNG_PASS_REPAIR_APPLY_CLOSEOUT_SOURCE_COMMAND_V1,
    git_head_sha,
    apply_execution_commit_sha: applyCommit?.sha ?? null,
    apply_execution_commit_message: applyCommit?.message ?? null,
    apply_execution_status,
    guarded_apply_report_rel_path: SAMSUNG_PASS_GUARDED_APPLY_REPORT_JSON_REL_V1,
    guarded_apply_report_apply_status: guardedReport.apply_status,
    guarded_apply_report_mode: guardedReport.mode,
    apply_plan_rel_path: SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
    apply_plan_consumed,
    rerun_apply_should_block,
    owner_approval_rel_path: SAMSUNG_PASS_OWNER_APPROVAL_JSON_REL_V1,
    owner_approval_decision_id: ownerApproval.decisionId,
    owner_approval_valid: ownerApproval.valid,
    csv_verification: csvVerification,
    scoreboard_counts_after_refresh,
    closeout_verification_passed,
    verification_blockers,
    exact_repo_paths_read: [
      SAMSUNG_PASS_GUARDED_APPLY_REPORT_JSON_REL_V1,
      SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
      SAMSUNG_PASS_OWNER_APPROVAL_JSON_REL_V1,
      applyPlan.target_csv_rel_path,
      "scripts/lib/refrigerator-truth-scoreboard-v1.ts",
    ].sort(),
    proven_facts: [
      `PROVEN: apply_execution_status=${apply_execution_status} via git commit ${applyCommit?.sha ?? "none"} + CSV parity.`,
      `PROVEN: guarded_apply_report on disk shows apply_status=${guardedReport.apply_status} (post-apply re-run blocks because before_mappings no longer match).`,
      `PROVEN: rerun_apply_should_block=${String(rerun_apply_should_block)}; apply_plan_consumed=${String(apply_plan_consumed)}.`,
      `PROVEN: ${String(csvVerification.present_da97_17376b_row_keys.length)} da97-17376b row keys present; ${String(csvVerification.absent_removed_row_keys.length)} removed row keys absent.`,
      `PROVEN: owner_approval_valid=${String(ownerApproval.valid)}; decision_id=${ownerApproval.decisionId ?? "none"}.`,
      `PROVEN: scoreboard after refresh — multi_mapped=${String(scoreboard.counts.multi_mapped_count)}, phantom_model=${String(scoreboard.counts.phantom_model_count)}, wrong_part_risk=${String(scoreboard.counts.wrong_part_risk_count)}.`,
      "PROVEN: Read-only closeout — no compatibility_mappings.csv or product data mutation performed.",
    ],
    unknown_facts: [
      "UNKNOWN: Whether live Supabase compatibility_mappings matches committed CSV.",
      "UNKNOWN: Whether wrong_part_risk_count will drop before Tier-1 manual evidence capture on the 5 Samsung slugs.",
    ],
  };
}

export function buildSamsungPassRepairApplyCloseoutMarkdownV1(
  closeout: SamsungPassRepairApplyCloseoutV1,
): string {
  const lines: string[] = [
    "# Samsung PASS repair apply closeout v1",
    "",
    `Generated: ${closeout.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${closeout.contract}\``,
    `- read_only: **true**`,
    `- closeout_verification_passed: **${String(closeout.closeout_verification_passed)}**`,
    `- apply_execution_status: **${closeout.apply_execution_status}**`,
    `- rerun_apply_should_block: **${String(closeout.rerun_apply_should_block)}**`,
    `- apply_plan_consumed: **${String(closeout.apply_plan_consumed)}**`,
    "",
    "## Git",
    "",
    `- HEAD: \`${closeout.git_head_sha}\``,
    `- apply commit: \`${closeout.apply_execution_commit_sha ?? "none"}\``,
    `- apply commit message: ${closeout.apply_execution_commit_message ?? "none"}`,
    "",
    "## Guarded apply report (on disk)",
    "",
    `- path: \`${closeout.guarded_apply_report_rel_path}\``,
    `- apply_status: **${closeout.guarded_apply_report_apply_status}** (expected BLOCKED after apply — before_mappings stale)`,
    `- mode: **${closeout.guarded_apply_report_mode}**`,
    "",
    "## CSV verification",
    "",
    `- target: \`${closeout.csv_verification.target_csv_rel_path}\``,
    `- intended da97-17376b mappings present: **${String(closeout.csv_verification.intended_da97_17376b_mappings_present)}**`,
    `- removed mappings absent: **${String(closeout.csv_verification.removed_mappings_absent)}**`,
    "",
    "## Scoreboard (after audit refresh)",
    "",
    `| Metric | Value | Expected |`,
    `| --- | ---: | ---: |`,
    `| multi_mapped_count | ${String(closeout.scoreboard_counts_after_refresh.multi_mapped_count)} | ${String(SAMSUNG_PASS_EXPECTED_SCOREBOARD_COUNTS_V1.multi_mapped_count)} |`,
    `| phantom_model_count | ${String(closeout.scoreboard_counts_after_refresh.phantom_model_count)} | ${String(SAMSUNG_PASS_EXPECTED_SCOREBOARD_COUNTS_V1.phantom_model_count)} |`,
    `| wrong_part_risk_count | ${String(closeout.scoreboard_counts_after_refresh.wrong_part_risk_count)} | ${String(SAMSUNG_PASS_EXPECTED_SCOREBOARD_COUNTS_V1.wrong_part_risk_count)} |`,
    "",
    "## Owner approval",
    "",
    `- path: \`${closeout.owner_approval_rel_path}\``,
    `- valid: **${String(closeout.owner_approval_valid)}**`,
    `- decision_id: \`${closeout.owner_approval_decision_id ?? "none"}\``,
    "",
  ];

  if (closeout.verification_blockers.length > 0) {
    lines.push("## Verification blockers", "", ...closeout.verification_blockers.map((b) => `- ${b}`), "");
  }

  lines.push(
    "## Slug rollup",
    "",
    ...SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1.map(
      (slug) => `- \`${slug}\` → \`${SAMSUNG_PASS_TARGET_FILTER_SLUG_V1}\``,
    ),
    "",
  );

  return `${lines.join("\n")}\n`;
}

export function writeSamsungPassRepairApplyCloseoutArtifactsV1(args: {
  rootDir: string;
  closeout: SamsungPassRepairApplyCloseoutV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(args.rootDir, SAMSUNG_PASS_REPAIR_APPLY_CLOSEOUT_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, SAMSUNG_PASS_REPAIR_APPLY_CLOSEOUT_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.closeout, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildSamsungPassRepairApplyCloseoutMarkdownV1(args.closeout), "utf8");
  return {
    json_rel_path: SAMSUNG_PASS_REPAIR_APPLY_CLOSEOUT_JSON_REL_V1,
    md_rel_path: SAMSUNG_PASS_REPAIR_APPLY_CLOSEOUT_MD_REL_V1,
  };
}
