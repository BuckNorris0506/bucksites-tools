/**
 * Read-only loader for AP demand-selected batch run-registry visibility.
 * PROVEN: does not write run-registry, CSV, Supabase, or evidence artifacts.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import { AP_PROVEN_RUN_CONTRACT_V1 } from "./batch-run-registry-intake-v1";

export const AP_DEMAND_SELECTED_BATCH_CANDIDATE_ID_V1 =
  "air_purifier_demand_selected_batch_candidate" as const;

export const AP_DEMAND_SELECTED_BATCH_RUN_REGISTRY_DIR_REL_V1 =
  "data/air-purifier/batch-production/run-registry" as const;

export const AP_DEMAND_SELECTED_OWNER_APPROVAL_ARTIFACT_REL_V1 =
  "data/owner-decisions/ap-demand-selected-batch-read-only-evidence-collection-approval-v1.json" as const;

export const AP_DEMAND_SELECTED_EVIDENCE_RESULTS_DIR_REL_V1 =
  "data/air-purifier/batch-production/agent-results-demand-selected-v1" as const;

export type ApDemandSelectedOwnerReadOnlyEvidenceApprovalV1 = {
  status: "approved";
  approved_at: string;
  approved_by: "founder";
  run_id: string;
  scope: "read_only_browser_discovery_only";
  evidence_write_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  netlify_api_authorized: false;
  owner_approval_artifact_rel_path: typeof AP_DEMAND_SELECTED_OWNER_APPROVAL_ARTIFACT_REL_V1;
};

export type ApDemandSelectedBatchRunRegistryDocumentV1 = {
  contract: typeof AP_PROVEN_RUN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  run_id: string;
  wedge: typeof HOMEKEEP_WEDGE_CATALOG.air_purifier;
  closeout_complete: false;
  proposed_batch_id: typeof AP_DEMAND_SELECTED_BATCH_CANDIDATE_ID_V1;
  proposed_slugs: string[];
  excluded_slugs?: string[];
  stage?: string;
  batch_start_mode?: string;
  created_at?: string;
  owner_read_only_evidence_collection_approval?: ApDemandSelectedOwnerReadOnlyEvidenceApprovalV1;
};

export type ApDemandSelectedBatchRunRegistryVisibilityV1 = {
  status: "PROVEN" | "MISSING" | "PARSE_ERROR";
  run_registry_rel_path: string | null;
  run_id: string | null;
  stage: string | null;
  batch_start_mode: string | null;
  proposed_slug_count: number | null;
  excluded_slug_count: number | null;
  read_only_evidence_collection_authorized: boolean;
  owner_approval_artifact_rel_path: string | null;
  evidence_collection_started: boolean;
  parse_error: string | null;
};

export type LoadApDemandSelectedBatchRunRegistryDepsV1 = {
  rootDir: string;
  fileExists?: (absolutePath: string) => boolean;
  readText?: (absolutePath: string) => string;
  listRunRegistryJson?: (dirAbs: string) => string[];
};

function defaultFileExists(absPath: string): boolean {
  return existsSync(absPath);
}

function defaultReadText(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

function defaultListRunRegistryJson(dirAbs: string): string[] {
  if (!existsSync(dirAbs)) return [];
  return readdirSync(dirAbs).filter((name) => name.endsWith(".json"));
}

function parseOwnerReadOnlyEvidenceApprovalV1(
  input: unknown,
  runId: string,
): { ok: true; approval: ApDemandSelectedOwnerReadOnlyEvidenceApprovalV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["owner_read_only_evidence_collection_approval must be an object"] };
  }
  const o = input as Record<string, unknown>;
  if (o.status !== "approved") errors.push('approval status must be "approved"');
  if (o.approved_by !== "founder") errors.push('approved_by must be "founder"');
  if (typeof o.approved_at !== "string" || Number.isNaN(Date.parse(o.approved_at))) {
    errors.push("approved_at must be a parseable ISO 8601 string");
  }
  if (o.run_id !== runId) errors.push("approval run_id must match registry run_id");
  if (o.scope !== "read_only_browser_discovery_only") {
    errors.push('scope must be "read_only_browser_discovery_only"');
  }
  for (const flag of [
    "evidence_write_authorized",
    "csv_apply_authorized",
    "supabase_mutation_authorized",
    "public_ui_mutation_authorized",
    "buy_link_mutation_authorized",
    "netlify_api_authorized",
  ] as const) {
    if (o[flag] !== false) errors.push(`${flag} must be false`);
  }
  if (o.owner_approval_artifact_rel_path !== AP_DEMAND_SELECTED_OWNER_APPROVAL_ARTIFACT_REL_V1) {
    errors.push(`owner_approval_artifact_rel_path must be "${AP_DEMAND_SELECTED_OWNER_APPROVAL_ARTIFACT_REL_V1}"`);
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    approval: o as ApDemandSelectedOwnerReadOnlyEvidenceApprovalV1,
  };
}

export function loadApDemandSelectedEvidenceCollectionStartedV1(
  deps: Pick<LoadApDemandSelectedBatchRunRegistryDepsV1, "rootDir" | "fileExists" | "listRunRegistryJson"> & {
    listEvidenceResultsJson?: (dirAbs: string) => string[];
  },
): boolean {
  const fileExists = deps.fileExists ?? defaultFileExists;
  const listEvidenceResultsJson =
    deps.listEvidenceResultsJson ??
    ((dirAbs: string) => {
      if (!fileExists(dirAbs)) return [];
      return readdirSync(dirAbs).filter((name) => name.endsWith(".json"));
    });
  const dirAbs = path.join(deps.rootDir, AP_DEMAND_SELECTED_EVIDENCE_RESULTS_DIR_REL_V1);
  return listEvidenceResultsJson(dirAbs).length > 0;
}

export function validateApDemandSelectedBatchRunRegistryDocumentV1(
  input: unknown,
): { ok: true; doc: ApDemandSelectedBatchRunRegistryDocumentV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["document must be a non-null object"] };
  }
  const o = input as Record<string, unknown>;
  if (o.contract !== AP_PROVEN_RUN_CONTRACT_V1) {
    errors.push(`contract must be "${AP_PROVEN_RUN_CONTRACT_V1}"`);
  }
  if (o.read_only !== true) errors.push("read_only must be true");
  if (o.data_mutation !== false) errors.push("data_mutation must be false");
  if (o.wedge !== HOMEKEEP_WEDGE_CATALOG.air_purifier) {
    errors.push(`wedge must be "${HOMEKEEP_WEDGE_CATALOG.air_purifier}"`);
  }
  if (o.closeout_complete !== false) {
    errors.push("closeout_complete must be false for open demand-selected run-registry");
  }
  if (o.proposed_batch_id !== AP_DEMAND_SELECTED_BATCH_CANDIDATE_ID_V1) {
    errors.push(`proposed_batch_id must be "${AP_DEMAND_SELECTED_BATCH_CANDIDATE_ID_V1}"`);
  }
  if (typeof o.run_id !== "string" || !o.run_id.trim()) {
    errors.push("run_id must be a non-empty string");
  }
  if (!Array.isArray(o.proposed_slugs) || o.proposed_slugs.length === 0) {
    errors.push("proposed_slugs must be a non-empty array");
  } else if (!o.proposed_slugs.every((slug) => typeof slug === "string" && slug.trim().length > 0)) {
    errors.push("proposed_slugs entries must be non-empty strings");
  }
  if (errors.length > 0) return { ok: false, errors };

  let ownerApproval: ApDemandSelectedOwnerReadOnlyEvidenceApprovalV1 | undefined;
  if (o.owner_read_only_evidence_collection_approval !== undefined) {
    const approvalParsed = parseOwnerReadOnlyEvidenceApprovalV1(
      o.owner_read_only_evidence_collection_approval,
      (o.run_id as string).trim(),
    );
    if (!approvalParsed.ok) {
      return { ok: false, errors: approvalParsed.errors.map((e) => `approval: ${e}`) };
    }
    ownerApproval = approvalParsed.approval;
  }

  return {
    ok: true,
    doc: {
      contract: AP_PROVEN_RUN_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      run_id: (o.run_id as string).trim(),
      wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
      closeout_complete: false,
      proposed_batch_id: AP_DEMAND_SELECTED_BATCH_CANDIDATE_ID_V1,
      proposed_slugs: o.proposed_slugs as string[],
      excluded_slugs: Array.isArray(o.excluded_slugs)
        ? (o.excluded_slugs as string[]).filter((slug) => typeof slug === "string" && slug.trim().length > 0)
        : [],
      stage: typeof o.stage === "string" ? o.stage : undefined,
      batch_start_mode: typeof o.batch_start_mode === "string" ? o.batch_start_mode : undefined,
      created_at: typeof o.created_at === "string" ? o.created_at : undefined,
      owner_read_only_evidence_collection_approval: ownerApproval,
    },
  };
}

function visibilityFromDoc(
  relPath: string,
  doc: ApDemandSelectedBatchRunRegistryDocumentV1,
  evidenceCollectionStarted: boolean,
): ApDemandSelectedBatchRunRegistryVisibilityV1 {
  const approval = doc.owner_read_only_evidence_collection_approval;
  return {
    status: "PROVEN",
    run_registry_rel_path: relPath,
    run_id: doc.run_id,
    stage: doc.stage ?? null,
    batch_start_mode: doc.batch_start_mode ?? null,
    proposed_slug_count: doc.proposed_slugs.length,
    excluded_slug_count: doc.excluded_slugs?.length ?? 0,
    read_only_evidence_collection_authorized: approval?.status === "approved" && approval.run_id === doc.run_id,
    owner_approval_artifact_rel_path: approval?.owner_approval_artifact_rel_path ?? null,
    evidence_collection_started: evidenceCollectionStarted,
    parse_error: null,
  };
}

export function loadApDemandSelectedBatchRunRegistryV1(
  deps: LoadApDemandSelectedBatchRunRegistryDepsV1,
): ApDemandSelectedBatchRunRegistryVisibilityV1 {
  const fileExists = deps.fileExists ?? defaultFileExists;
  const readText = deps.readText ?? defaultReadText;
  const listRunRegistryJson = deps.listRunRegistryJson ?? defaultListRunRegistryJson;
  const dirAbs = path.join(deps.rootDir, AP_DEMAND_SELECTED_BATCH_RUN_REGISTRY_DIR_REL_V1);
  const registryNames = listRunRegistryJson(dirAbs);

  let best: { relPath: string; doc: ApDemandSelectedBatchRunRegistryDocumentV1; sortKey: string } | null =
    null;
  let lastParseError: string | null = null;

  for (const name of registryNames) {
    const relPath = `${AP_DEMAND_SELECTED_BATCH_RUN_REGISTRY_DIR_REL_V1}/${name}`;
    const abs = path.join(deps.rootDir, relPath);
    if (!fileExists(abs)) continue;
    try {
      const parsed = validateApDemandSelectedBatchRunRegistryDocumentV1(
        JSON.parse(readText(abs)) as unknown,
      );
      if (!parsed.ok) {
        lastParseError = parsed.errors.join("; ");
        continue;
      }
      const sortKey = parsed.doc.created_at ?? parsed.doc.run_id;
      if (!best || sortKey.localeCompare(best.sortKey) > 0) {
        best = { relPath, doc: parsed.doc, sortKey };
      }
    } catch (error: unknown) {
      lastParseError = error instanceof Error ? error.message : String(error);
    }
  }

  if (best) {
    return visibilityFromDoc(
      best.relPath,
      best.doc,
      loadApDemandSelectedEvidenceCollectionStartedV1(deps),
    );
  }

  return {
    status: "MISSING",
    run_registry_rel_path: null,
    run_id: null,
    stage: null,
    batch_start_mode: null,
    proposed_slug_count: null,
    excluded_slug_count: null,
    read_only_evidence_collection_authorized: false,
    owner_approval_artifact_rel_path: null,
    evidence_collection_started: false,
    parse_error: lastParseError,
  };
}
