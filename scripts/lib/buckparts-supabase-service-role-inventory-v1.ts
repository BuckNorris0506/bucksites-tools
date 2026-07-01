/**
 * Static inventory of scripts that import getSupabaseAdmin / supabase-admin.
 * Audit fails when a new service-role writer is discovered but not listed here.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const BUCKPARTS_SUPABASE_SERVICE_ROLE_INVENTORY_CONTRACT_V1 =
  "buckparts_supabase_service_role_inventory_v1" as const;

export type SupabaseServiceRoleAccessClassV1 =
  | "write_guarded"
  | "write_unguarded"
  | "read_only";

export type SupabaseServiceRoleInventoryEntryV1 = {
  rel_path: string;
  access_class: SupabaseServiceRoleAccessClassV1;
  mutation_lane?: string;
};

const SERVICE_ROLE_IMPORT_RE =
  /from\s+["'].*supabase-admin["']|getSupabaseAdmin\s*\(/;

export function fileHasSupabaseWriteOperationV1(text: string): boolean {
  if (/supabase\.from\s*\([^)]+\)\s*\.\s*(?:insert|update|delete|upsert)\s*\(/m.test(text)) {
    return true;
  }
  const chainRe = /\.from\s*\([^)]+\)\s*[\s\S]{0,200}?\.(?:insert|update|delete|upsert)\s*\(/gm;
  return chainRe.test(text);
}

export const SUPABASE_SERVICE_ROLE_INVENTORY_ENTRIES_V1: SupabaseServiceRoleInventoryEntryV1[] =
  [
    {
      rel_path: "scripts/lib/air-purifier-supabase-apply-parity-v1.ts",
      access_class: "write_guarded",
      mutation_lane: "air_purifier_supabase_parity_apply_v1",
    },
    {
      rel_path: "scripts/lib/rpwfe-official-ge-supabase-parity-apply-v1.ts",
      access_class: "write_guarded",
      mutation_lane: "rpwfe_official_ge_supabase_parity_apply_v1",
    },
    {
      rel_path: "scripts/apply-search-gap-status-air-purifier.ts",
      access_class: "write_guarded",
      mutation_lane: "search_gap_status_air_purifier_v1",
    },
    {
      rel_path: "scripts/apply-search-gap-status-refrigerator.ts",
      access_class: "write_guarded",
      mutation_lane: "search_gap_status_refrigerator_v1",
    },
    {
      rel_path: "scripts/apply-search-gap-status-whole-house-water.ts",
      access_class: "write_guarded",
      mutation_lane: "search_gap_status_whole_house_water_v1",
    },
    {
      rel_path: "scripts/apply-staged-compat-part-choice-refrigerator.ts",
      access_class: "write_guarded",
      mutation_lane: "staged_compat_part_choice_refrigerator_v1",
    },
    {
      rel_path: "scripts/apply-staged-filter-brand-refrigerator.ts",
      access_class: "write_guarded",
      mutation_lane: "staged_filter_brand_refrigerator_v1",
    },
    {
      rel_path: "scripts/hqii-candidate-queue-upsert.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/lib/hqii-candidate-queue-upsert-run-v1.ts",
      access_class: "write_guarded",
      mutation_lane: "hqii_candidate_queue_upsert_v1",
    },
    { rel_path: "scripts/import-seed.ts", access_class: "write_unguarded" },
    {
      rel_path: "scripts/ingest-hqii-retailer-links.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/lib/ingest-hqii-retailer-links-run-v1.ts",
      access_class: "write_guarded",
      mutation_lane: "ingest_hqii_retailer_links_v1",
    },
    {
      rel_path: "scripts/lib/learning-outcomes-writer.ts",
      access_class: "write_unguarded",
    },
    { rel_path: "scripts/lib/vertical-seed.ts", access_class: "write_unguarded" },
    {
      rel_path: "scripts/lib/promote-staged-refrigerator-run-v1.ts",
      access_class: "write_guarded",
      mutation_lane: "promote_staged_refrigerator_v1",
    },
    {
      rel_path: "scripts/promote-staged-refrigerator.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/remove-demo-wedge-brands.ts",
      access_class: "write_unguarded",
    },
    {
      rel_path: "scripts/reprocess-compat-after-models-refrigerator.ts",
      access_class: "write_guarded",
      mutation_lane: "staged_compat_reprocess_refrigerator_v1",
    },
    {
      rel_path: "scripts/resolve-staged-compat-refrigerator.ts",
      access_class: "write_guarded",
      mutation_lane: "staged_compat_resolve_refrigerator_v1",
    },
    {
      rel_path: "scripts/search-gap-candidates-apply.ts",
      access_class: "write_guarded",
      mutation_lane: "search_gap_candidates_apply_v1",
    },
    {
      rel_path: "scripts/search-gap-candidates-generate.ts",
      access_class: "write_guarded",
      mutation_lane: "search_gap_candidates_generate_v1",
    },
    {
      rel_path: "scripts/search-gaps-classify.ts",
      access_class: "write_guarded",
      mutation_lane: "search_gaps_classify_v1",
    },
    {
      rel_path: "scripts/verify-oem-retailer-links-playwright.ts",
      access_class: "write_unguarded",
    },
    {
      rel_path: "scripts/apply-air-purifier-supabase-parity-v1.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/apply-rpwfe-official-ge-supabase-parity-v1.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/audit-amazon-false-negative-rescue.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/audit-homekeep-traffic-monetization-readiness.ts",
      access_class: "read_only",
    },
    { rel_path: "scripts/buckparts-schema-preflight.ts", access_class: "read_only" },
    {
      rel_path: "scripts/collect-fridge-non-amazon-evidence.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/generate-fridge-non-amazon-review-packets.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/lib/air-purifier-supabase-vs-csv-diff-v1.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/lib/ap-homeowner-pilot-scorecard-v1.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/lib/buckparts-page-factory-preflight-v1.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/lib/buckparts-page-publishability-truth-v1.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/lib/demand-to-coverage-engine-v1.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/lib/fridge-command-center-and-public-truth-audit-v1.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/lib/fridge-supabase-vs-csv-retailer-links-diff-v1.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/lib/learning-outcomes-read-model-v1.ts",
      access_class: "read_only",
    },
    { rel_path: "scripts/lib/supabase-admin.ts", access_class: "read_only" },
    {
      rel_path: "scripts/preflight-amazon-false-negative-rescue.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/preflight-amazon-multipack-conversion-batch.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/preflight-buyable-subtype-production-schema.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/prioritize-coverage-next-batch.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/proof-filter-purchase-option-order.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-air-purifier-mapping-guardrails.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-amazon-first-blocked-conversion-queue.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-amazon-multipack-duplicate-slots.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-amazon-refrigerator-token-precheck.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-amazon-rescue-existing-whw-rows.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-amazon-rescue-human-verification-packet.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-ap-go-attribution-slice-v1.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-buckparts-blocked-link-money-queue.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-buckparts-command-center.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-buckparts-command-surface.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-buckparts-demand-work-queue.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-buckparts-oem-catalog-blocked-details.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-flexoffers-readiness-fridge.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-frigidaire-dead-oem-link-ids.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-frigidaire-next-monetizable-candidates.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-homekeep-affiliate-clicks.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-homekeep-business-scorecard.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-homekeep-cross-wedge-ops.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-homekeep-launch-readiness.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-model-priority-refrigerator.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-oem-catalog-next-money-cohort.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-refrigerator-mapping-guardrails.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-repairclinic-air-purifier-blocked-details.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-repairclinic-refrigerator-blocked-details.ts",
      access_class: "read_only",
    },
    { rel_path: "scripts/report-search-miss-audit.ts", access_class: "read_only" },
    {
      rel_path: "scripts/report-waterdrop-proof-slice-candidates.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/report-whole-house-water-mapping-guardrails.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/review-staged-compat-refrigerator.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/review-staged-filter-brand-refrigerator.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/review-staged-part-resolution-refrigerator.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/run-amazon-monetization-batch.ts",
      access_class: "read_only",
    },
    {
      rel_path: "scripts/run-fridge-non-amazon-operator.ts",
      access_class: "read_only",
    },
    { rel_path: "scripts/runbook-air-purifier.ts", access_class: "read_only" },
    { rel_path: "scripts/runbook-refrigerator.ts", access_class: "read_only" },
    {
      rel_path: "scripts/runbook-whole-house-water.ts",
      access_class: "read_only",
    },
    { rel_path: "scripts/search-gaps-rank.ts", access_class: "read_only" },
  ];

function listTypeScriptFilesUnder(args: {
  rootDir: string;
  relDir: string;
  fileExists?: (abs: string) => boolean;
}): string[] {
  const fileExists = args.fileExists ?? existsSync;
  const absDir = path.join(args.rootDir, args.relDir);
  if (!fileExists(absDir)) return [];

  const out: string[] = [];
  const walk = (abs: string, rel: string): void => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const entryAbs = path.join(abs, entry.name);
      const entryRel = path.posix.join(rel, entry.name);
      if (entry.isDirectory()) {
        walk(entryAbs, entryRel);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
        out.push(entryRel);
      }
    }
  };
  walk(absDir, args.relDir.replace(/\\/g, "/"));
  return out.sort();
}

export function discoverSupabaseServiceRoleScriptRelPathsV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): string[] {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const relPaths = listTypeScriptFilesUnder({
    rootDir: args.rootDir,
    relDir: "scripts",
    fileExists,
  });
  const discovered: string[] = [];
  for (const rel of relPaths) {
    const text = readText(path.join(args.rootDir, rel));
    if (SERVICE_ROLE_IMPORT_RE.test(text)) discovered.push(rel);
  }
  return discovered;
}

export function discoverSupabaseServiceRoleWritersV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): string[] {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const writers: string[] = [];
  for (const rel of discoverSupabaseServiceRoleScriptRelPathsV1(args)) {
    const text = readText(path.join(args.rootDir, rel));
    if (fileHasSupabaseWriteOperationV1(text)) writers.push(rel);
  }
  return writers;
}

export function auditSupabaseServiceRoleInventoryDriftV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): { ok: true } | { ok: false; blockers: string[] } {
  const inventoryPaths = new Set(
    SUPABASE_SERVICE_ROLE_INVENTORY_ENTRIES_V1.map((entry) => entry.rel_path),
  );
  const discovered = discoverSupabaseServiceRoleScriptRelPathsV1(args);
  const discoveredWriters = new Set(discoverSupabaseServiceRoleWritersV1(args));
  const blockers: string[] = [];

  for (const rel of discovered) {
    if (!inventoryPaths.has(rel)) {
      blockers.push(`supabase_service_role_inventory_missing:${rel}`);
    }
  }

  for (const entry of SUPABASE_SERVICE_ROLE_INVENTORY_ENTRIES_V1) {
    const abs = path.join(args.rootDir, entry.rel_path);
    const fileExists = args.fileExists ?? existsSync;
    if (!fileExists(abs)) {
      blockers.push(`supabase_service_role_inventory_stale_missing_file:${entry.rel_path}`);
      continue;
    }
    const text = (args.readText ?? ((p: string) => readFileSync(p, "utf8")))(abs);
    const isWriter = discoveredWriters.has(entry.rel_path);
    const isWriteClass =
      entry.access_class === "write_guarded" || entry.access_class === "write_unguarded";
    if (isWriter && !isWriteClass) {
      blockers.push(
        `supabase_service_role_inventory_class_mismatch_writer:${entry.rel_path}:expected_write_class`,
      );
    }
    if (!isWriter && isWriteClass) {
      blockers.push(
        `supabase_service_role_inventory_class_mismatch_reader:${entry.rel_path}:expected_read_only`,
      );
    }
    if (
      entry.access_class === "write_guarded" &&
      isWriter &&
      !text.includes("founderRegistryRowPassesMutationApprovalGateV1") &&
      !text.includes("mutation_authorized") &&
      !text.includes("mutationGateRef")
    ) {
      blockers.push(`supabase_service_role_inventory_guarded_lane_unverified:${entry.rel_path}`);
    }
  }

  if (blockers.length > 0) return { ok: false, blockers };
  return { ok: true };
}
