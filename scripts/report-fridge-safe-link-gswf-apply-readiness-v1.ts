#!/usr/bin/env node
/**
 * Read-only GSWF safe-link apply-readiness packet — stdout JSON + draft writes.
 *
 *   npm run buckparts:fridge-safe-link-gswf-apply-readiness
 */

import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FRIDGE_SAFE_LINK_GSWF_PRECHECK_COMMAND_V1,
  buildFridgeSafeLinkGswfApplyReadinessV1,
  writeFridgeSafeLinkGswfApplyReadinessDraftsV1,
} from "./lib/fridge-safe-link-gswf-apply-readiness-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function loadPrecheckSnapshot(): {
  precheck_run_at: string;
  resolved_filter_id: string | null;
  asin_reuse_policy_classification: string | null;
  asin_reuse_policy_status: string | null;
  asin_reuse_policy_asin: string | null;
  existing_amazon_row_count: number | null;
  approved_amazon_row_count: number | null;
  live_direct_buyable_amazon_row_count: number | null;
  insert_plan_hint: string | null;
} {
  const raw = execSync(FRIDGE_SAFE_LINK_GSWF_PRECHECK_COMMAND_V1, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("precheck stdout missing JSON object");
  }
  const doc = JSON.parse(raw.slice(start, end + 1)) as {
    generated_at?: string;
    rows?: Array<Record<string, unknown>>;
  };
  const row = doc.rows?.[0];
  if (!row) {
    throw new Error("precheck missing rows[0] for GSWF");
  }
  return {
    precheck_run_at: typeof doc.generated_at === "string" ? doc.generated_at : null,
    resolved_filter_id: typeof row.resolved_filter_id === "string" ? row.resolved_filter_id : null,
    asin_reuse_policy_classification:
      typeof row.asin_reuse_policy_classification === "string"
        ? row.asin_reuse_policy_classification
        : null,
    asin_reuse_policy_status:
      typeof row.asin_reuse_policy_status === "string" ? row.asin_reuse_policy_status : null,
    asin_reuse_policy_asin:
      typeof row.asin_reuse_policy_asin === "string" ? row.asin_reuse_policy_asin : null,
    existing_amazon_row_count:
      typeof row.existing_amazon_row_count === "number" ? row.existing_amazon_row_count : null,
    approved_amazon_row_count:
      typeof row.approved_amazon_row_count === "number" ? row.approved_amazon_row_count : null,
    live_direct_buyable_amazon_row_count:
      typeof row.live_direct_buyable_amazon_row_count === "number"
        ? row.live_direct_buyable_amazon_row_count
        : null,
    insert_plan_hint: typeof row.insert_plan_hint === "string" ? row.insert_plan_hint : null,
  };
}

function main(): void {
  const precheckRow = loadPrecheckSnapshot();
  const report = buildFridgeSafeLinkGswfApplyReadinessV1({
    rootDir: REPO_ROOT,
    precheckSnapshot: {
      command: FRIDGE_SAFE_LINK_GSWF_PRECHECK_COMMAND_V1,
      precheck_run_at: precheckRow.precheck_run_at,
      resolved_filter_id: precheckRow.resolved_filter_id,
      asin_reuse_policy_classification: precheckRow.asin_reuse_policy_classification,
      asin_reuse_policy_status: precheckRow.asin_reuse_policy_status,
      asin_reuse_policy_asin: precheckRow.asin_reuse_policy_asin,
      asin_reuse_policy_mutation_ready: false,
      existing_amazon_row_count: precheckRow.existing_amazon_row_count,
      approved_amazon_row_count: precheckRow.approved_amazon_row_count,
      live_direct_buyable_amazon_row_count: precheckRow.live_direct_buyable_amazon_row_count,
      insert_plan_hint: precheckRow.insert_plan_hint,
    },
  });
  const written = writeFridgeSafeLinkGswfApplyReadinessDraftsV1({ rootDir: REPO_ROOT, report });
  process.stderr.write(
    `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only apply-readiness; no mutation authorized).\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
