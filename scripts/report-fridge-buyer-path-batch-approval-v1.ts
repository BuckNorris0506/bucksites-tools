/**
 * Read-only fridge buyer-path batch approval bridge — stdout JSON by default.
 *
 *   npm run buckparts:fridge-buyer-path-batch-approval
 *   npm run buckparts:fridge-buyer-path-batch-approval -- --decisions path/to/checklist.md
 *   npm run buckparts:fridge-buyer-path-batch-approval -- --decisions checklist.md --registry-out data/owner-decisions/fridge-buyer-path-batch-approval-v1.json
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFridgeBuyerPathBatchApprovalReportV1,
  compileFridgeBuyerPathBatchApprovalRegistryExportV1,
  FRIDGE_BUYER_PATH_BATCH_APPROVAL_DEFAULT_REGISTRY_REL_V1,
} from "./lib/fridge-buyer-path-batch-approval-v1";
import { buildFridgeBuyerPathBatchProposalV1 } from "./lib/fridge-buyer-path-batch-proposal-v1";

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

  const proposal = buildFridgeBuyerPathBatchProposalV1({ rootDir: REPO_ROOT, now });
  let report = buildFridgeBuyerPathBatchApprovalReportV1({ rootDir: REPO_ROOT, now });

  if (decisionsPath) {
    const markdown = readFileSync(path.resolve(decisionsPath), "utf8");
    const compiled = compileFridgeBuyerPathBatchApprovalRegistryExportV1({
      proposal,
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
        compiled.row.fridge_buyer_path_batch_approval_context_v1?.founder_option_id ===
        "approve_for_next_planning_only"
          ? "owner_approved_for_next_planning_only"
          : compiled.row.fridge_buyer_path_batch_approval_context_v1?.founder_option_id === "reject"
            ? "owner_rejected"
            : "awaiting_owner_approval",
    };

    if (registryOut) {
      const abs = path.resolve(REPO_ROOT, registryOut);
      const rel = path.relative(REPO_ROOT, abs).split(path.sep).join("/");
      if (!rel.startsWith("data/owner-decisions/")) {
        process.stderr.write("--registry-out must be under data/owner-decisions/\n");
        process.exitCode = 1;
        return;
      }
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, `${JSON.stringify(compiled.document, null, 2)}\n`, "utf8");
      report = {
        ...report,
        proven_facts: [
          ...report.proven_facts,
          `PROVEN: wrote founder decision registry artifact only: ${rel}`,
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
