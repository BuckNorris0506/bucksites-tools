/**
 * Read-only fridge buyer-path apply-plan approval bridge — stdout JSON by default.
 *
 *   npm run buckparts:fridge-buyer-path-batch-apply-plan-approval
 *   npm run buckparts:fridge-buyer-path-batch-apply-plan-approval -- --decisions path/to/checklist.md
 *   npm run buckparts:fridge-buyer-path-batch-apply-plan-approval -- --decisions checklist.md --registry-out data/owner-decisions/fridge-buyer-path-batch-apply-plan-approval-v1.json
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertFridgeApplyPlanApprovalRegistryOutPathAllowedV1,
  buildFridgeBuyerPathBatchApplyPlanApprovalReportV1,
  compileFridgeBuyerPathBatchApplyPlanApprovalRegistryExportV1,
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_DEFAULT_REGISTRY_REL_V1,
  loadFridgeBuyerPathBatchApplyPlanArtifactV1,
} from "./lib/fridge-buyer-path-batch-apply-plan-approval-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function readArgValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx < 0) return null;
  return argv[idx + 1] ?? null;
}

function main(): void {
  const argv = process.argv.slice(2);
  const decisionsPath = readArgValue(argv, "--decisions");
  const registryOut = readArgValue(argv, "--registry-out");
  const now = () => new Date();

  const applyPlan = loadFridgeBuyerPathBatchApplyPlanArtifactV1({
    rootDir: REPO_ROOT,
    relPath: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
  });
  if (!applyPlan) {
    process.stderr.write(
      `apply-plan artifact missing or invalid at ${FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1}\n`,
    );
    process.exitCode = 1;
    return;
  }

  let report = buildFridgeBuyerPathBatchApplyPlanApprovalReportV1({ rootDir: REPO_ROOT, now });

  if (decisionsPath) {
    const markdown = readFileSync(path.resolve(decisionsPath), "utf8");
    const compiled = compileFridgeBuyerPathBatchApplyPlanApprovalRegistryExportV1({
      applyPlan,
      decisionsMarkdown: markdown,
      decided_at: now().toISOString(),
    });
    if (!compiled.ok) {
      process.stderr.write(`${compiled.errors.join("\n")}\n`);
      process.exitCode = 1;
      return;
    }
    report = {
      ...report,
      matched_registry_row: compiled.row,
      founder_decision_registry_export_preview: compiled.document,
      approval_status:
        compiled.row.fridge_buyer_path_batch_apply_plan_approval_context_v1?.founder_option_id ===
        "approve_for_next_planning_only"
          ? "owner_approved_for_next_planning_only"
          : compiled.row.fridge_buyer_path_batch_apply_plan_approval_context_v1?.founder_option_id ===
              "reject"
            ? "owner_rejected"
            : "awaiting_owner_approval",
    };

    if (registryOut) {
      try {
        assertFridgeApplyPlanApprovalRegistryOutPathAllowedV1(registryOut, REPO_ROOT);
      } catch (error: unknown) {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
        return;
      }
      const abs = path.resolve(REPO_ROOT, registryOut);
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, `${JSON.stringify(compiled.document, null, 2)}\n`, "utf8");
      report = {
        ...report,
        proven_facts: [
          ...report.proven_facts,
          `PROVEN: wrote founder decision registry artifact only: ${FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_DEFAULT_REGISTRY_REL_V1}`,
        ],
      };
    }
  } else if (registryOut) {
    process.stderr.write("--registry-out requires --decisions\n");
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
