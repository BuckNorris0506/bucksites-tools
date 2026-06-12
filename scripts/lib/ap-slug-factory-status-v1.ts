/**
 * Read-only AP slug factory status v1 — per-filter factory stage from committed repo artifacts only.
 * No CSV/Supabase mutation, no live HTTP, no owner-decision writes.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  isManufacturerSiteSearchUrl,
  isOfficialReferencePdpUrl,
} from "@/lib/retailers/launch-buy-links";

import type { ApAgentEvidenceRowV1 } from "./air-purifier-agent-packets-v1";
import {
  parseAgentResultFileContentV1,
  validateAgentEvidenceRowV1,
} from "./air-purifier-agent-results-aggregator-v1";
import {
  loadApRetailerLinksCsvV1,
  type AirPurifierApplyPlannerReportV1,
} from "./air-purifier-apply-planner-v1";
import {
  deriveApHyperagentChatDiscoveryValidationStatusV1,
  validateApHyperagentChatDiscoveryOutputV1,
  type ApHyperagentChatDiscoveryOutputV1,
} from "./air-purifier-hyperagent-chat-discovery-validation-v1";
import { countSpentPlannedRowsV1 } from "./buckparts-batch-production-operating-checklist-v1";

export const AP_SLUG_FACTORY_STATUS_CONTRACT_V1 = "ap_slug_factory_status_v1" as const;

export const AP_SLUG_FACTORY_STAGE_IDS_V1 = [
  "catalog_present",
  "discovery_validated",
  "canonical_evidence_present",
  "aggregator_auto_apply_eligible",
  "apply_plan_ready",
  "executor_dry_run_ready",
  "csv_apply_complete",
  "repo_validation_complete",
  "supabase_parity_applied",
  "production_smoke_complete",
] as const;

export type ApSlugFactoryStageIdV1 = (typeof AP_SLUG_FACTORY_STAGE_IDS_V1)[number];

export type ApSlugFactoryStageStatusValueV1 =
  | "complete"
  | "pending"
  | "blocked"
  | "unknown";

export type ApSlugFactoryStageProofKindV1 =
  | "repo_artifact"
  | "documented_only"
  | "inferred"
  | "unknown";

export type ApSlugFactoryStageStatusV1 = {
  stage_id: ApSlugFactoryStageIdV1;
  status: ApSlugFactoryStageStatusValueV1;
  proof_kind: ApSlugFactoryStageProofKindV1;
  evidence: string[];
  blocker_reasons: string[];
};

export type ApSlugFactoryStatusArtifactPathsV1 = {
  catalog_csv_paths: string[];
  discovery_packet_path: string | null;
  evidence_result_path: string | null;
  apply_plan_path: string | null;
  executor_dry_run_path: string | null;
  executor_apply_path: string | null;
  supabase_commit_result_doc_path: string | null;
  production_smoke_result_path: string | null;
};

export type ApSlugFactoryStatusV1 = {
  contract: typeof AP_SLUG_FACTORY_STATUS_CONTRACT_V1;
  slug: string;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  /** First incomplete factory stage — not the last completed stage. */
  next_unresolved_stage_id: ApSlugFactoryStageIdV1 | null;
  /**
   * @deprecated Mirror of `next_unresolved_stage_id` for backward compatibility.
   * Means next unresolved stage, not last completed stage.
   */
  current_stage_id: ApSlugFactoryStageIdV1 | null;
  stage_statuses: ApSlugFactoryStageStatusV1[];
  artifact_paths: ApSlugFactoryStatusArtifactPathsV1;
  proven_facts: string[];
  documented_facts: string[];
  unknown_facts: string[];
  next_owner_gate: string | null;
  next_mechanical_command: string | null;
};

const AP_CATALOG_CSV_RELS_V1 = {
  filters: "data/air-purifier/filters.csv",
  retailer_links: "data/air-purifier/retailer_links.csv",
  filter_aliases: "data/air-purifier/filter_aliases.csv",
  compatibility_mappings: "data/air-purifier/compatibility_mappings.csv",
} as const;

const AP_EVIDENCE_RESULTS_DIR_RELS_V1 = [
  "data/air-purifier/batch-production/agent-results",
  "data/air-purifier/batch-production/agent-results-batch-v2",
  "data/air-purifier/batch-production/agent-results-batch-v3",
  "data/air-purifier/batch-production/agent-results-model-first-v1",
] as const;

const AP_APPLY_PLANS_DIR_REL_V1 = "data/air-purifier/batch-production/apply-plans-batch-v2";
const AP_APPLY_RUNS_DIR_REL_V1 = "data/air-purifier/batch-production/apply-runs-batch-v2";
const AP_DISCOVERY_FIXTURES_DIR_REL_V1 =
  "data/air-purifier/batch-production/fixtures";
const AP_PRODUCTION_SMOKE_DIR_REL_V1 =
  "data/air-purifier/batch-production/production-smoke-results";
const AP_SUPABASE_COMMIT_DOCS_DIR_REL_V1 = "docs/air-purifier";

export const AP_SLUG_FACTORY_STATUS_SOURCE_COMMAND_V1 =
  "node --import tsx scripts/report-ap-slug-factory-status-v1.ts --slug <filter_slug>" as const;

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function isPdpLikeFinalUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  if (isManufacturerSiteSearchUrl(url)) return false;
  return isOfficialReferencePdpUrl(url) || /\.html$/i.test(url) || /\/product\//i.test(url);
}

function hasApplyPlanFields(row: ApAgentEvidenceRowV1): boolean {
  if (row.recommended_csv_mutation) return true;
  return !!(
    row.final_url?.trim() &&
    row.browser_truth_classification?.trim() &&
    row.slug?.trim()
  );
}

function isAutoApplyEligibleRow(row: ApAgentEvidenceRowV1): boolean {
  if (row.decision !== "PASS_DIRECT_BUYABLE") return false;
  if (row.browser_truth_classification?.trim() !== "direct_buyable") return false;
  if (row.buy_action_seen !== true) return false;
  if (!isPdpLikeFinalUrl(row.final_url)) return false;
  if (row.exact_tokens_seen.length === 0) return false;
  if (row.wrong_family_tokens_seen.length > 0) return false;
  if (row.owner_review_required) return false;
  if (!hasApplyPlanFields(row)) return false;
  return true;
}

function readCsvColumnSet(args: {
  rootDir: string;
  relPath: string;
  slugColumnIndex: number;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): Set<string> {
  const abs = path.join(args.rootDir, args.relPath);
  if (!args.fileExists(abs)) return new Set();
  const rows = parse(args.readText(abs), {
    columns: false,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as string[][];
  const slugs = new Set<string>();
  for (let i = 1; i < rows.length; i += 1) {
    const slug = rows[i]?.[args.slugColumnIndex]?.trim();
    if (slug) slugs.add(normalizeSlug(slug));
  }
  return slugs;
}

function evaluateCatalogPresent(args: {
  rootDir: string;
  slug: string;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): { status: ApSlugFactoryStageStatusValueV1; evidence: string[]; blockers: string[] } {
  const slug = normalizeSlug(args.slug);
  const checks: { label: string; rel: string; present: boolean }[] = [
    {
      label: "filters.csv",
      rel: AP_CATALOG_CSV_RELS_V1.filters,
      present: readCsvColumnSet({
        rootDir: args.rootDir,
        relPath: AP_CATALOG_CSV_RELS_V1.filters,
        slugColumnIndex: 1,
        fileExists: args.fileExists,
        readText: args.readText,
      }).has(slug),
    },
    {
      label: "retailer_links.csv",
      rel: AP_CATALOG_CSV_RELS_V1.retailer_links,
      present: readCsvColumnSet({
        rootDir: args.rootDir,
        relPath: AP_CATALOG_CSV_RELS_V1.retailer_links,
        slugColumnIndex: 0,
        fileExists: args.fileExists,
        readText: args.readText,
      }).has(slug),
    },
    {
      label: "filter_aliases.csv",
      rel: AP_CATALOG_CSV_RELS_V1.filter_aliases,
      present: readCsvColumnSet({
        rootDir: args.rootDir,
        relPath: AP_CATALOG_CSV_RELS_V1.filter_aliases,
        slugColumnIndex: 0,
        fileExists: args.fileExists,
        readText: args.readText,
      }).has(slug),
    },
    {
      label: "compatibility_mappings.csv",
      rel: AP_CATALOG_CSV_RELS_V1.compatibility_mappings,
      present: readCsvColumnSet({
        rootDir: args.rootDir,
        relPath: AP_CATALOG_CSV_RELS_V1.compatibility_mappings,
        slugColumnIndex: 1,
        fileExists: args.fileExists,
        readText: args.readText,
      }).has(slug),
    },
  ];

  const missing = checks.filter((c) => !c.present);
  const evidence = checks.map((c) => `${c.label}: ${c.present ? "present" : "missing"}`);
  if (missing.length === 0) {
    return { status: "complete", evidence, blockers: [] };
  }
  if (missing.length === checks.length) {
    return {
      status: "blocked",
      evidence,
      blockers: [`slug not found in any AP catalog CSV: ${slug}`],
    };
  }
  return {
    status: "pending",
    evidence,
    blockers: missing.map((c) => `missing from ${c.rel}`),
  };
}

function findDiscoveryPacketPath(args: {
  rootDir: string;
  slug: string;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
  listDir: (abs: string) => string[];
}): string | null {
  const slug = normalizeSlug(args.slug);
  const preferred = path.posix.join(
    AP_DISCOVERY_FIXTURES_DIR_REL_V1,
    `ap-hyperagent-chat-discovery-${slug}-v1.json`,
  );
  if (args.fileExists(path.join(args.rootDir, preferred))) return preferred;

  const absFixturesDir = path.join(args.rootDir, AP_DISCOVERY_FIXTURES_DIR_REL_V1);
  if (!args.fileExists(absFixturesDir)) return null;
  let files: string[] = [];
  try {
    files = args.listDir(absFixturesDir).filter((f) => f.endsWith(".json"));
  } catch {
    return null;
  }
  for (const file of files) {
    if (!file.includes(slug)) continue;
    const rel = path.posix.join(AP_DISCOVERY_FIXTURES_DIR_REL_V1, file);
    try {
      const raw = JSON.parse(args.readText(path.join(args.rootDir, rel))) as ApHyperagentChatDiscoveryOutputV1;
      if (
        Array.isArray(raw.candidate_rows) &&
        raw.candidate_rows.some((r) => normalizeSlug(r.filter_slug) === slug)
      ) {
        return rel;
      }
    } catch {
      // skip invalid json
    }
  }
  return null;
}

function findCanonicalEvidence(args: {
  rootDir: string;
  slug: string;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
  listDir: (abs: string) => string[];
}): { path: string | null; row: ApAgentEvidenceRowV1 | null; validationOk: boolean } {
  const slug = normalizeSlug(args.slug);
  for (const dirRel of AP_EVIDENCE_RESULTS_DIR_RELS_V1) {
    const absDir = path.join(args.rootDir, dirRel);
    if (!args.fileExists(absDir)) continue;
    let files: string[] = [];
    try {
      files = args.listDir(absDir).filter((f) => f.endsWith(".json"));
    } catch {
      continue;
    }
    for (const file of files) {
      const rel = path.posix.join(dirRel, file);
      const abs = path.join(args.rootDir, rel);
      let raw: unknown;
      try {
        raw = JSON.parse(args.readText(abs));
      } catch {
        continue;
      }
      const parsed = parseAgentResultFileContentV1(raw, rel);
      for (const candidate of parsed.rows) {
        const rowSlug =
          typeof candidate === "object" && candidate !== null && "slug" in candidate
            ? normalizeSlug(String((candidate as { slug?: string }).slug ?? ""))
            : typeof candidate === "object" &&
                candidate !== null &&
                "filter_slug" in candidate
              ? normalizeSlug(String((candidate as { filter_slug?: string }).filter_slug ?? ""))
              : "";
        if (rowSlug !== slug) continue;
        const validated = validateAgentEvidenceRowV1(candidate, rel);
        if (!validated.ok) continue;
        return { path: rel, row: validated.row, validationOk: true };
      }
    }
  }
  return { path: null, row: null, validationOk: false };
}

type ApplyPlanShape = {
  report_name?: string;
  plan_status?: string;
  owner_approval_required?: boolean;
  planned_changes?: { filter_slug?: string }[];
  planned_change_count?: number;
};

function slugScopedApplyPlanRelV1(slug: string): string {
  return path.posix.join(AP_APPLY_PLANS_DIR_REL_V1, `ap-apply-plan-${normalizeSlug(slug)}-v1.json`);
}

function isSlugScopedApplyPlanRelV1(rel: string, slug: string): boolean {
  return rel === slugScopedApplyPlanRelV1(slug);
}

function loadApplyPlanFromRel(args: {
  rootDir: string;
  rel: string;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): ApplyPlanShape | null {
  const abs = path.join(args.rootDir, args.rel);
  if (!args.fileExists(abs)) return null;
  try {
    return JSON.parse(args.readText(abs)) as ApplyPlanShape;
  } catch {
    return null;
  }
}

function findApplyPlanPath(args: {
  rootDir: string;
  slug: string;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
  listDir: (abs: string) => string[];
}): { path: string | null; plan: ApplyPlanShape | null; is_slug_scoped: boolean } {
  const slug = normalizeSlug(args.slug);
  const slugScopedRel = slugScopedApplyPlanRelV1(slug);
  const slugScopedPlan = loadApplyPlanFromRel({
    rootDir: args.rootDir,
    rel: slugScopedRel,
    fileExists: args.fileExists,
    readText: args.readText,
  });
  if (slugScopedPlan) {
    const slugs = (slugScopedPlan.planned_changes ?? [])
      .map((c) => normalizeSlug(c.filter_slug ?? ""))
      .filter(Boolean);
    if (slugs.includes(slug)) {
      return { path: slugScopedRel, plan: slugScopedPlan, is_slug_scoped: true };
    }
  }

  const absPlansDir = path.join(args.rootDir, AP_APPLY_PLANS_DIR_REL_V1);
  if (!args.fileExists(absPlansDir)) {
    return { path: null, plan: null, is_slug_scoped: false };
  }
  try {
    for (const file of args.listDir(absPlansDir)) {
      if (!file.endsWith(".json")) continue;
      const rel = path.posix.join(AP_APPLY_PLANS_DIR_REL_V1, file);
      if (isSlugScopedApplyPlanRelV1(rel, slug)) continue;
      const plan = loadApplyPlanFromRel({
        rootDir: args.rootDir,
        rel,
        fileExists: args.fileExists,
        readText: args.readText,
      });
      if (!plan) continue;
      const slugs = (plan.planned_changes ?? [])
        .map((c) => normalizeSlug(c.filter_slug ?? ""))
        .filter(Boolean);
      if (slugs.includes(slug)) {
        return { path: rel, plan, is_slug_scoped: false };
      }
    }
  } catch {
    // ignore
  }
  return { path: null, plan: null, is_slug_scoped: false };
}

function isSlugSpentInApplyPlanV1(args: {
  rootDir: string;
  slug: string;
  plan: ApplyPlanShape;
  readText: (abs: string) => string;
}): boolean {
  const slug = normalizeSlug(args.slug);
  const csvRows = loadApRetailerLinksCsvV1(args.rootDir, args.readText);
  const { spentSlugs } = countSpentPlannedRowsV1(
    args.plan as AirPurifierApplyPlannerReportV1,
    csvRows,
  );
  return spentSlugs.map(normalizeSlug).includes(slug);
}

type ApplyRunShape = {
  mode?: string;
  apply_status?: string;
  changed_slugs?: string[];
  blocked_reasons?: string[];
  post_apply_validation?: {
    only_target_slugs_changed?: boolean;
    all_direct_buyable?: boolean;
    no_search_urls_on_targets?: boolean;
    gate_by_slug?: Record<string, { gate_failure_kind?: string | null }>;
  } | null;
};

function findApplyRunPath(args: {
  rootDir: string;
  slug: string;
  mode: "dry_run" | "apply";
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): { path: string | null; run: ApplyRunShape | null } {
  const slug = normalizeSlug(args.slug);
  const suffix = args.mode === "apply" ? "-apply" : "";
  const preferred = path.posix.join(
    AP_APPLY_RUNS_DIR_REL_V1,
    `ap-apply-run-${slug}-v1${suffix}.json`,
  );
  const abs = path.join(args.rootDir, preferred);
  if (!args.fileExists(abs)) return { path: null, run: null };
  try {
    const run = JSON.parse(args.readText(abs)) as ApplyRunShape;
    const changed = (run.changed_slugs ?? []).map(normalizeSlug);
    if (args.mode === "apply" && !changed.includes(slug)) {
      return { path: preferred, run };
    }
    return { path: preferred, run };
  } catch {
    return { path: null, run: null };
  }
}

function findSupabaseCommitResultDoc(args: {
  rootDir: string;
  slug: string;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
  listDir: (abs: string) => string[];
}): string | null {
  const slug = normalizeSlug(args.slug);
  const absDir = path.join(args.rootDir, AP_SUPABASE_COMMIT_DOCS_DIR_REL_V1);
  if (!args.fileExists(absDir)) return null;
  let files: string[] = [];
  try {
    files = args.listDir(absDir).filter(
      (f) => f.startsWith("AP-SUPABASE-SQL-COMMIT-RESULT-") && f.endsWith(".md"),
    );
  } catch {
    return null;
  }
  for (const file of files) {
    const rel = path.posix.join(AP_SUPABASE_COMMIT_DOCS_DIR_REL_V1, file);
    const body = args.readText(path.join(args.rootDir, rel));
    if (!body.includes(slug)) continue;
    if (
      body.includes("filter_exists_after_commit") &&
      body.includes("ALREADY_APPLIED") &&
      (body.includes("SQL plan executed with `COMMIT`") ||
        body.includes("SQL COMMIT summary"))
    ) {
      return rel;
    }
  }
  return null;
}

function findProductionSmokeArtifact(args: {
  rootDir: string;
  slug: string;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
  listDir: (abs: string) => string[];
}): string | null {
  const slug = normalizeSlug(args.slug);
  const jsonCandidates = [
    path.posix.join(AP_PRODUCTION_SMOKE_DIR_REL_V1, `${slug}.json`),
    path.posix.join(AP_PRODUCTION_SMOKE_DIR_REL_V1, `ap-production-smoke-${slug}-v1.json`),
  ];
  for (const rel of jsonCandidates) {
    const abs = path.join(args.rootDir, rel);
    if (!args.fileExists(abs)) continue;
    try {
      const raw = JSON.parse(args.readText(abs)) as Record<string, unknown>;
      if (raw.smoke_status === "PASS" || raw.production_smoke_status === "PASS") {
        return rel;
      }
    } catch {
      // skip
    }
  }

  const docsDir = path.join(args.rootDir, AP_SUPABASE_COMMIT_DOCS_DIR_REL_V1);
  if (!args.fileExists(docsDir)) return null;
  try {
    for (const file of args.listDir(docsDir)) {
      if (!file.startsWith("AP-PRODUCTION-SMOKE-RESULT-") || !file.endsWith(".md")) continue;
      if (!file.toLowerCase().includes(slug.replace(/-/g, "-"))) continue;
      const rel = path.posix.join(AP_SUPABASE_COMMIT_DOCS_DIR_REL_V1, file);
      const body = args.readText(path.join(args.rootDir, rel));
      if (body.includes(slug) && /PROVEN.*pass|smoke.*PASS/i.test(body)) {
        return rel;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function resolveCurrentStageId(
  stages: ApSlugFactoryStageStatusV1[],
): ApSlugFactoryStageIdV1 | null {
  for (const stage of stages) {
    if (stage.status !== "complete") return stage.stage_id;
  }
  return null;
}

function resolveNextOwnerGate(
  stages: ApSlugFactoryStageStatusV1[],
): string | null {
  const current = stages.find((s) => s.status !== "complete");
  if (!current) return null;
  const gateByStage: Record<ApSlugFactoryStageIdV1, string> = {
    catalog_present: "catalog_ingest",
    discovery_validated: "discovery_validation",
    canonical_evidence_present: "evidence_write",
    aggregator_auto_apply_eligible: "aggregator_review",
    apply_plan_ready: "apply_plan_authorization",
    executor_dry_run_ready: "executor_dry_run_review",
    csv_apply_complete: "csv_apply",
    repo_validation_complete: "repo_validation_review",
    supabase_parity_applied: "supabase_mutation",
    production_smoke_complete: "production_smoke",
  };
  return gateByStage[current.stage_id];
}

function resolveNextMechanicalCommand(args: {
  slug: string;
  stages: ApSlugFactoryStageStatusV1[];
  artifact_paths: ApSlugFactoryStatusArtifactPathsV1;
}): string | null {
  const current = args.stages.find((s) => s.status !== "complete");
  if (!current) return null;
  const slug = normalizeSlug(args.slug);
  switch (current.stage_id) {
    case "catalog_present":
      return "npx tsx scripts/report-air-purifier-mapping-guardrails.ts";
    case "discovery_validated":
      return args.artifact_paths.discovery_packet_path
        ? `node --import tsx scripts/report-ap-hyperagent-chat-discovery-validation-v1.ts --packet=${args.artifact_paths.discovery_packet_path} --scope=${slug}`
        : `node --import tsx scripts/report-ap-hyperagent-chat-discovery-validation-v1.ts --packet=<discovery-packet> --scope=${slug}`;
    case "canonical_evidence_present":
      return `npx tsx scripts/report-air-purifier-agent-results-aggregator-v1.ts --results-dir data/air-purifier/batch-production/agent-results-batch-v2`;
    case "aggregator_auto_apply_eligible":
      return `npx tsx scripts/report-air-purifier-apply-planner-batch-v2-v1.ts --plan ${args.artifact_paths.apply_plan_path ?? `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-${slug}-v1.json`}`;
    case "apply_plan_ready":
      return args.artifact_paths.apply_plan_path
        ? `npx tsx scripts/report-air-purifier-apply-executor-v1.ts --plan ${args.artifact_paths.apply_plan_path}`
        : `npx tsx scripts/report-air-purifier-apply-executor-v1.ts --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-${slug}-v1.json`;
    case "executor_dry_run_ready":
      return args.artifact_paths.apply_plan_path
        ? `npx tsx scripts/report-air-purifier-apply-executor-v1.ts --apply --plan ${args.artifact_paths.apply_plan_path}`
        : null;
    case "csv_apply_complete":
      return args.artifact_paths.apply_plan_path
        ? `npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --plan ${args.artifact_paths.apply_plan_path}`
        : null;
    case "repo_validation_complete":
      return args.artifact_paths.apply_plan_path
        ? `npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --plan ${args.artifact_paths.apply_plan_path}`
        : null;
    case "supabase_parity_applied":
      return `node --import tsx scripts/report-ap-slug-factory-status-v1.ts --slug ${slug}`;
    case "production_smoke_complete":
      return `npm run buckparts:live-site-smoke:check`;
    default:
      return null;
  }
}

export function buildApSlugFactoryStatusV1(args: {
  rootDir: string;
  slug: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  listDir?: (abs: string) => string[];
}): ApSlugFactoryStatusV1 {
  const rootDir = args.rootDir;
  const slug = normalizeSlug(args.slug);
  const fileExists = args.fileExists ?? ((abs: string) => existsSync(abs));
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const listDir = args.listDir ?? ((abs: string) => readdirSync(abs));
  const generatedAt = (args.now ?? (() => new Date()))().toISOString();

  const proven_facts: string[] = [
    "PROVEN: ap_slug_factory_status_v1 is read-only — uses committed repo artifacts only.",
    "PROVEN: no live HTTP probes and no Supabase calls in this reporter.",
    "PROVEN: mutation_authorized=false.",
    "PROVEN: current_stage_id is a deprecated mirror of next_unresolved_stage_id (first incomplete stage).",
  ];
  const documented_facts: string[] = [];
  const unknown_facts: string[] = [
    "UNKNOWN: deployed_commit — not inferred from local artifacts.",
    "UNKNOWN: live public exposure — requires committed production_smoke result artifact.",
  ];

  const catalog = evaluateCatalogPresent({
    rootDir,
    slug,
    fileExists,
    readText,
  });

  const discoveryPacketPath = findDiscoveryPacketPath({
    rootDir,
    slug,
    fileExists,
    readText,
    listDir,
  });
  let discoveryStatus: ApSlugFactoryStageStatusValueV1 = "unknown";
  let discoveryProofKind: ApSlugFactoryStageProofKindV1 = "unknown";
  const discoveryEvidence: string[] = [];
  const discoveryBlockers: string[] = [];
  if (catalog.status === "blocked") {
    discoveryStatus = "unknown";
    discoveryEvidence.push("catalog blocked — discovery not evaluated");
  } else if (!discoveryPacketPath) {
    discoveryStatus = "unknown";
    discoveryEvidence.push("no hyperagent discovery packet found in fixtures");
    discoveryBlockers.push("missing discovery fixture/output for slug");
  } else {
    discoveryEvidence.push(`discovery_packet=${discoveryPacketPath}`);
    try {
      const packet = JSON.parse(
        readText(path.join(rootDir, discoveryPacketPath)),
      ) as ApHyperagentChatDiscoveryOutputV1;
      const validation = validateApHyperagentChatDiscoveryOutputV1({
        packet,
        approved_scope_slugs: [slug],
        rootDir,
      });
      const derived = deriveApHyperagentChatDiscoveryValidationStatusV1(
        validation.mechanical_checks,
      );
      discoveryEvidence.push(`validation_status=${derived}`);
      discoveryEvidence.push(`discovery_status=${packet.discovery_status}`);
      const slugRowPresent = packet.candidate_rows.some(
        (r) => normalizeSlug(r.filter_slug) === slug,
      );
      const failedChecks = validation.mechanical_checks.filter((c) => !c.passed);
      const onlyStaleCsvPrimaryUrlDrift =
        failedChecks.length > 0 &&
        failedChecks.every(
          (c) =>
            c.check_id.endsWith(":repo_csv_primary_url") ||
            c.message.includes("repo_csv_primary_url"),
        );
      if (
        packet.discovery_status === "DISCOVERY_COMPLETE" &&
        slugRowPresent &&
        (derived === "VALIDATION_PASS" || onlyStaleCsvPrimaryUrlDrift)
      ) {
        discoveryStatus = "complete";
        discoveryProofKind = "inferred";
        if (derived === "VALIDATION_PASS") {
          discoveryProofKind = "repo_artifact";
          proven_facts.push(
            `PROVEN: discovery_validated from ${discoveryPacketPath} (VALIDATION_PASS + DISCOVERY_COMPLETE).`,
          );
        } else {
          proven_facts.push(
            `PROVEN: discovery_validated from ${discoveryPacketPath} (DISCOVERY_COMPLETE; fixture predates CSV apply).`,
          );
          unknown_facts.push(
            "INFERRED: discovery mechanical re-validation fails repo_csv_primary_url check because retailer_links.csv advanced after discovery fixture — expected post csv_apply.",
          );
        }
      } else if (derived === "VALIDATION_FAIL") {
        discoveryStatus = "blocked";
        discoveryBlockers.push("hyperagent discovery mechanical validation failed");
        if (validation.findings.length > 0) {
          discoveryBlockers.push(...validation.findings.slice(0, 3));
        }
      } else {
        discoveryStatus = "pending";
        discoveryBlockers.push(
          `discovery validation=${derived}; discovery_status=${packet.discovery_status}`,
        );
      }
      if (packet.not_canonical_evidence) {
        unknown_facts.push(
          "INFERRED: discovery packet is not_canonical_evidence — canonical evidence is a separate stage.",
        );
      }
    } catch (e) {
      discoveryStatus = "blocked";
      discoveryBlockers.push(
        `failed to parse discovery packet: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  const evidence = findCanonicalEvidence({
    rootDir,
    slug,
    fileExists,
    readText,
    listDir,
  });
  let evidenceStageStatus: ApSlugFactoryStageStatusValueV1 = "unknown";
  let evidenceProofKind: ApSlugFactoryStageProofKindV1 = "unknown";
  const evidenceStageEvidence: string[] = [];
  const evidenceBlockers: string[] = [];
  if (catalog.status === "blocked") {
    evidenceStageStatus = "unknown";
    evidenceStageEvidence.push("catalog blocked — evidence not evaluated");
  } else if (!evidence.path || !evidence.row) {
    evidenceStageStatus = "unknown";
    evidenceStageEvidence.push("no validated canonical evidence row in agent-results");
    evidenceBlockers.push("missing air_purifier_agent_evidence_result_v1 row for slug");
  } else {
    evidenceStageEvidence.push(`evidence_result=${evidence.path}`);
    evidenceStageEvidence.push(`decision=${evidence.row.decision}`);
    evidenceStageStatus = "complete";
    evidenceProofKind = "repo_artifact";
    proven_facts.push(`PROVEN: canonical_evidence_present from ${evidence.path}.`);
  }

  let aggregatorStatus: ApSlugFactoryStageStatusValueV1 = "unknown";
  let aggregatorProofKind: ApSlugFactoryStageProofKindV1 = "unknown";
  const aggregatorEvidence: string[] = [];
  const aggregatorBlockers: string[] = [];
  if (!evidence.row) {
    aggregatorStatus = "unknown";
    aggregatorEvidence.push("no canonical evidence row — auto-apply eligibility not evaluated");
  } else if (isAutoApplyEligibleRow(evidence.row)) {
    aggregatorStatus = "complete";
    aggregatorProofKind = "repo_artifact";
    aggregatorEvidence.push("passes strict auto_apply_eligible checks (aggregator rules)");
    proven_facts.push("PROVEN: aggregator_auto_apply_eligible from evidence row validation.");
  } else {
    aggregatorStatus = "blocked";
    aggregatorEvidence.push(`decision=${evidence.row.decision}`);
    aggregatorBlockers.push("evidence row fails strict auto_apply_eligible checks");
  }

  const applyPlan = findApplyPlanPath({ rootDir, slug, fileExists, readText, listDir });
  let applyPlanStatus: ApSlugFactoryStageStatusValueV1 = "unknown";
  let applyPlanProofKind: ApSlugFactoryStageProofKindV1 = "unknown";
  const applyPlanEvidence: string[] = [];
  const applyPlanBlockers: string[] = [];
  if (!applyPlan.path || !applyPlan.plan) {
    applyPlanStatus = "unknown";
    applyPlanEvidence.push("no slug-scoped or batch apply plan artifact found");
    applyPlanBlockers.push("missing apply plan JSON with planned_changes for slug");
  } else {
    applyPlanEvidence.push(`apply_plan=${applyPlan.path}`);
    applyPlanEvidence.push(`plan_scope=${applyPlan.is_slug_scoped ? "slug_scoped" : "batch_only"}`);
    applyPlanEvidence.push(`plan_status=${applyPlan.plan.plan_status ?? "UNKNOWN"}`);
    const ready =
      applyPlan.plan.plan_status === "READY_FOR_OWNER_APPROVAL" &&
      applyPlan.plan.owner_approval_required === true &&
      (applyPlan.plan.planned_changes ?? []).some(
        (c) => normalizeSlug(c.filter_slug ?? "") === slug,
      );
    const spent = isSlugSpentInApplyPlanV1({
      rootDir,
      slug,
      plan: applyPlan.plan,
      readText,
    });
    if (spent && !applyPlan.is_slug_scoped) {
      applyPlanEvidence.push("plan_row_spent=true");
      applyPlanStatus = "unknown";
      applyPlanProofKind = "unknown";
      applyPlanBlockers.push(
        "batch apply plan row spent for slug — slug-scoped apply plan required for apply_plan_ready",
      );
    } else if (spent && applyPlan.is_slug_scoped) {
      applyPlanEvidence.push("plan_row_spent=true");
      if (ready) {
        applyPlanStatus = "complete";
        applyPlanProofKind = "repo_artifact";
        proven_facts.push(
          `PROVEN: apply_plan_ready from slug-scoped plan ${applyPlan.path} (row spent post-apply).`,
        );
      } else {
        applyPlanStatus = "pending";
        applyPlanProofKind = "unknown";
        applyPlanBlockers.push("slug-scoped apply plan row spent but plan no longer READY_FOR_OWNER_APPROVAL");
      }
    } else if (ready && applyPlan.is_slug_scoped) {
      applyPlanStatus = "complete";
      applyPlanProofKind = "repo_artifact";
      proven_facts.push(`PROVEN: apply_plan_ready from slug-scoped plan ${applyPlan.path}.`);
    } else if (ready) {
      applyPlanStatus = "complete";
      applyPlanProofKind = "repo_artifact";
      proven_facts.push(`PROVEN: apply_plan_ready from batch plan ${applyPlan.path} (row not spent).`);
    } else {
      applyPlanStatus = "pending";
      applyPlanProofKind = "unknown";
      applyPlanBlockers.push("apply plan not READY_FOR_OWNER_APPROVAL for slug");
    }
  }

  const dryRun = findApplyRunPath({
    rootDir,
    slug,
    mode: "dry_run",
    fileExists,
    readText,
  });
  let dryRunStatus: ApSlugFactoryStageStatusValueV1 = "unknown";
  let dryRunProofKind: ApSlugFactoryStageProofKindV1 = "unknown";
  const dryRunEvidence: string[] = [];
  const dryRunBlockers: string[] = [];
  if (!dryRun.path || !dryRun.run) {
    dryRunStatus = "unknown";
    dryRunEvidence.push("no executor dry-run artifact found");
    dryRunBlockers.push(`missing ${AP_APPLY_RUNS_DIR_REL_V1}/ap-apply-run-${slug}-v1.json`);
  } else {
    dryRunEvidence.push(`executor_dry_run=${dryRun.path}`);
    dryRunEvidence.push(`apply_status=${dryRun.run.apply_status ?? "UNKNOWN"}`);
    if (
      dryRun.run.apply_status === "DRY_RUN_READY" &&
      (dryRun.run.blocked_reasons ?? []).length === 0
    ) {
      dryRunStatus = "complete";
      dryRunProofKind = "repo_artifact";
      proven_facts.push(`PROVEN: executor_dry_run_ready from ${dryRun.path}.`);
    } else {
      dryRunStatus = "blocked";
      dryRunBlockers.push(
        `executor dry-run status=${dryRun.run.apply_status ?? "UNKNOWN"}`,
      );
    }
  }

  const applied = findApplyRunPath({
    rootDir,
    slug,
    mode: "apply",
    fileExists,
    readText,
  });
  let csvApplyStatus: ApSlugFactoryStageStatusValueV1 = "unknown";
  let csvApplyProofKind: ApSlugFactoryStageProofKindV1 = "unknown";
  const csvApplyEvidence: string[] = [];
  const csvApplyBlockers: string[] = [];
  if (!applied.path || !applied.run) {
    csvApplyStatus = "unknown";
    csvApplyEvidence.push("no executor apply artifact found");
    csvApplyBlockers.push(
      `missing ${AP_APPLY_RUNS_DIR_REL_V1}/ap-apply-run-${slug}-v1-apply.json`,
    );
  } else {
    csvApplyEvidence.push(`executor_apply=${applied.path}`);
    csvApplyEvidence.push(`apply_status=${applied.run.apply_status ?? "UNKNOWN"}`);
    const changed = (applied.run.changed_slugs ?? []).map(normalizeSlug);
    if (applied.run.apply_status === "APPLIED" && changed.includes(slug)) {
      csvApplyStatus = "complete";
      csvApplyProofKind = "repo_artifact";
      proven_facts.push(`PROVEN: csv_apply_complete from ${applied.path}.`);
    } else {
      csvApplyStatus = "pending";
      csvApplyBlockers.push("executor apply artifact not APPLIED for slug");
    }
  }

  let repoValidationStatus: ApSlugFactoryStageStatusValueV1 = "unknown";
  let repoValidationProofKind: ApSlugFactoryStageProofKindV1 = "unknown";
  const repoValidationEvidence: string[] = [];
  const repoValidationBlockers: string[] = [];
  const post = applied.run?.post_apply_validation;
  if (!applied.run || applied.run.apply_status !== "APPLIED") {
    repoValidationStatus = "unknown";
    repoValidationEvidence.push("no APPLIED executor artifact — post_apply_validation not evaluated");
    repoValidationBlockers.push("repo_validation requires committed apply-run with post_apply_validation");
  } else if (!post) {
    repoValidationStatus = "unknown";
    repoValidationEvidence.push("post_apply_validation missing on apply-run");
    repoValidationBlockers.push("post_apply_validation null on apply artifact");
  } else {
    repoValidationEvidence.push(`post_apply_validation present on ${applied.path}`);
    const gate = post.gate_by_slug?.[slug];
    const checks = [
      post.only_target_slugs_changed === true,
      post.all_direct_buyable === true,
      post.no_search_urls_on_targets === true,
      gate?.gate_failure_kind == null,
    ];
    repoValidationEvidence.push(
      `only_target_slugs_changed=${String(post.only_target_slugs_changed)}`,
    );
    repoValidationEvidence.push(`all_direct_buyable=${String(post.all_direct_buyable)}`);
    repoValidationEvidence.push(
      `no_search_urls_on_targets=${String(post.no_search_urls_on_targets)}`,
    );
    repoValidationEvidence.push(
      `gate_failure_kind=${gate?.gate_failure_kind ?? "missing_gate_entry"}`,
    );
    if (checks.every(Boolean)) {
      repoValidationStatus = "complete";
      repoValidationProofKind = "repo_artifact";
      proven_facts.push(
        `PROVEN: repo_validation_complete from ${applied.path} post_apply_validation.`,
      );
    } else {
      repoValidationStatus = "blocked";
      if (post.only_target_slugs_changed !== true) {
        repoValidationBlockers.push("only_target_slugs_changed !== true");
      }
      if (post.all_direct_buyable !== true) {
        repoValidationBlockers.push("all_direct_buyable !== true");
      }
      if (post.no_search_urls_on_targets !== true) {
        repoValidationBlockers.push("no_search_urls_on_targets !== true");
      }
      if (gate?.gate_failure_kind != null) {
        repoValidationBlockers.push(`gate_failure_kind=${gate.gate_failure_kind}`);
      }
      if (!gate) repoValidationBlockers.push(`gate_by_slug missing entry for ${slug}`);
    }
  }

  const supabaseDoc = findSupabaseCommitResultDoc({
    rootDir,
    slug,
    fileExists,
    readText,
    listDir,
  });
  let supabaseStatus: ApSlugFactoryStageStatusValueV1 = "unknown";
  let supabaseProofKind: ApSlugFactoryStageProofKindV1 = "unknown";
  const supabaseEvidence: string[] = [];
  const supabaseBlockers: string[] = [];
  if (!supabaseDoc) {
    supabaseStatus = "unknown";
    supabaseEvidence.push("no committed AP-SUPABASE-SQL-COMMIT-RESULT doc with COMMIT + ALREADY_APPLIED");
    supabaseBlockers.push(
      "missing docs/air-purifier/AP-SUPABASE-SQL-COMMIT-RESULT-* proving SQL COMMIT and parity ALREADY_APPLIED",
    );
    unknown_facts.push(
      "UNKNOWN: supabase_parity_applied — no committed SQL COMMIT + parity result doc for slug.",
    );
  } else {
    supabaseEvidence.push(`supabase_commit_result_doc=${supabaseDoc}`);
    supabaseStatus = "complete";
    supabaseProofKind = "documented_only";
    documented_facts.push(
      `DOCUMENTED: supabase_parity_applied from committed doc ${supabaseDoc} (operator-recorded SQL COMMIT + parity ALREADY_APPLIED).`,
    );
    unknown_facts.push(
      "INFERRED: supabase_parity_applied from docs-only operator record — not re-verified against live Supabase in this reporter.",
    );
  }

  const smokePath = findProductionSmokeArtifact({
    rootDir,
    slug,
    fileExists,
    readText,
    listDir,
  });
  let smokeStatus: ApSlugFactoryStageStatusValueV1 = "unknown";
  let smokeProofKind: ApSlugFactoryStageProofKindV1 = "unknown";
  const smokeEvidence: string[] = [];
  const smokeBlockers: string[] = [];
  if (!smokePath) {
    smokeStatus = "unknown";
    smokeEvidence.push("no committed production smoke result artifact for slug");
    smokeBlockers.push(
      `missing ${AP_PRODUCTION_SMOKE_DIR_REL_V1}/${slug}.json or AP-PRODUCTION-SMOKE-RESULT doc`,
    );
    unknown_facts.push(
      "UNKNOWN: production_smoke_complete — no committed slug-specific smoke result artifact.",
    );
  } else {
    smokeEvidence.push(`production_smoke_result=${smokePath}`);
    smokeStatus = "complete";
    smokeProofKind = "repo_artifact";
    proven_facts.push(`PROVEN: production_smoke_complete from ${smokePath}.`);
  }

  const catalogProofKind: ApSlugFactoryStageProofKindV1 =
    catalog.status === "complete" ? "repo_artifact" : "unknown";

  const stage_statuses: ApSlugFactoryStageStatusV1[] = [
    {
      stage_id: "catalog_present",
      status: catalog.status,
      proof_kind: catalogProofKind,
      evidence: catalog.evidence,
      blocker_reasons: catalog.blockers,
    },
    {
      stage_id: "discovery_validated",
      status: discoveryStatus,
      proof_kind: discoveryProofKind,
      evidence: discoveryEvidence,
      blocker_reasons: discoveryBlockers,
    },
    {
      stage_id: "canonical_evidence_present",
      status: evidenceStageStatus,
      proof_kind: evidenceProofKind,
      evidence: evidenceStageEvidence,
      blocker_reasons: evidenceBlockers,
    },
    {
      stage_id: "aggregator_auto_apply_eligible",
      status: aggregatorStatus,
      proof_kind: aggregatorProofKind,
      evidence: aggregatorEvidence,
      blocker_reasons: aggregatorBlockers,
    },
    {
      stage_id: "apply_plan_ready",
      status: applyPlanStatus,
      proof_kind: applyPlanProofKind,
      evidence: applyPlanEvidence,
      blocker_reasons: applyPlanBlockers,
    },
    {
      stage_id: "executor_dry_run_ready",
      status: dryRunStatus,
      proof_kind: dryRunProofKind,
      evidence: dryRunEvidence,
      blocker_reasons: dryRunBlockers,
    },
    {
      stage_id: "csv_apply_complete",
      status: csvApplyStatus,
      proof_kind: csvApplyProofKind,
      evidence: csvApplyEvidence,
      blocker_reasons: csvApplyBlockers,
    },
    {
      stage_id: "repo_validation_complete",
      status: repoValidationStatus,
      proof_kind: repoValidationProofKind,
      evidence: repoValidationEvidence,
      blocker_reasons: repoValidationBlockers,
    },
    {
      stage_id: "supabase_parity_applied",
      status: supabaseStatus,
      proof_kind: supabaseProofKind,
      evidence: supabaseEvidence,
      blocker_reasons: supabaseBlockers,
    },
    {
      stage_id: "production_smoke_complete",
      status: smokeStatus,
      proof_kind: smokeProofKind,
      evidence: smokeEvidence,
      blocker_reasons: smokeBlockers,
    },
  ];

  const artifact_paths: ApSlugFactoryStatusArtifactPathsV1 = {
    catalog_csv_paths: Object.values(AP_CATALOG_CSV_RELS_V1),
    discovery_packet_path: discoveryPacketPath,
    evidence_result_path: evidence.path,
    apply_plan_path: applyPlan.path,
    executor_dry_run_path: dryRun.path,
    executor_apply_path: applied.path,
    supabase_commit_result_doc_path: supabaseDoc,
    production_smoke_result_path: smokePath,
  };

  if (catalog.status === "complete") {
    proven_facts.push(`PROVEN: catalog_present — slug ${slug} in all four AP catalog CSVs.`);
  }

  const next_unresolved_stage_id = resolveCurrentStageId(stage_statuses);

  return {
    contract: AP_SLUG_FACTORY_STATUS_CONTRACT_V1,
    slug,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: generatedAt,
    next_unresolved_stage_id,
    current_stage_id: next_unresolved_stage_id,
    stage_statuses,
    artifact_paths,
    proven_facts,
    documented_facts,
    unknown_facts,
    next_owner_gate: resolveNextOwnerGate(stage_statuses),
    next_mechanical_command: resolveNextMechanicalCommand({
      slug,
      stages: stage_statuses,
      artifact_paths,
    }),
  };
}

export function parseApSlugFactoryStatusCliArgsV1(argv: string[]): { slug: string | null } {
  let slug: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--slug") {
      slug = argv[i + 1]?.trim() ?? null;
      i += 1;
      continue;
    }
    if (arg.startsWith("--slug=")) {
      slug = arg.slice("--slug=".length).trim() || null;
    }
  }
  return { slug: slug && slug.length > 0 ? slug : null };
}
