/**
 * Read-only AP demand-selected batch closeout / evidence-completeness / apply-readiness proof.
 *
 * Does not mutate CSV, Supabase, retailer_links, evidence files, owner decisions, or public guidance.
 * Proves posture only: closeout_complete remains false and apply_readiness remains NOT_PROVEN until
 * separate founder-authorized mutation lanes exist.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  AP_DEMAND_SELECTED_BATCH_RUN_REGISTRY_DIR_REL_V1,
  AP_DEMAND_SELECTED_EVIDENCE_RESULTS_DIR_REL_V1,
  loadApDemandSelectedBatchRunRegistryV1,
  validateApDemandSelectedBatchRunRegistryDocumentV1,
  type ApDemandSelectedOpenBatchProofStatusV1,
} from "./ap-demand-selected-batch-run-registry-v1";

export const AP_DEMAND_SELECTED_BATCH_CLOSEOUT_READINESS_PROOF_CONTRACT_V1 =
  "ap_demand_selected_batch_closeout_readiness_proof_v1" as const;

export const AP_DEMAND_SELECTED_BATCH_CLOSEOUT_READINESS_PROOF_EXACT_COMMAND_V1 =
  "npx tsx scripts/report-air-purifier-demand-selected-batch-closeout-readiness-proof-v1.ts" as const;

export type ApDemandSelectedEvidenceCompletenessStatusV1 =
  | "COMPLETE"
  | "INCOMPLETE"
  | "UNKNOWN";

export type ApDemandSelectedEvidenceCompletenessV1 = {
  status: ApDemandSelectedEvidenceCompletenessStatusV1;
  run_id: string | null;
  registry_stage: string | null;
  expected_evidence_artifact_rel_path: string | null;
  evidence_artifact_present: boolean;
  discovery_status: string | null;
  expected_slugs: string[];
  present_slugs: string[];
  missing_slugs: string[];
  missing_artifact_paths: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type ApDemandSelectedBatchCloseoutReadinessProofV1 = {
  contract: typeof AP_DEMAND_SELECTED_BATCH_CLOSEOUT_READINESS_PROOF_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  buy_cta_authorized: false;
  public_ui_mutation_authorized: false;
  pages_claimed_closed: false;
  conversion_claimed: false;
  conversion_or_revenue: "UNKNOWN";
  generated_at: string;
  source_command: typeof AP_DEMAND_SELECTED_BATCH_CLOSEOUT_READINESS_PROOF_EXACT_COMMAND_V1;
  run_id: string | null;
  run_registry_rel_path: string | null;
  registry_stage: string | null;
  evidence_completeness: ApDemandSelectedEvidenceCompletenessV1;
  open_batch_proof_v1: ApDemandSelectedOpenBatchProofStatusV1;
  batch_closeout: "NOT_PROVEN";
  apply_readiness: "NOT_PROVEN";
  hard_stop: true;
  next_safe_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

function defaultFileExists(abs: string): boolean {
  return existsSync(abs);
}

function defaultReadText(abs: string): string {
  return readFileSync(abs, "utf8");
}

export function expectedApDemandSelectedHyperagentDiscoveryArtifactRelV1(runId: string): string {
  return `${AP_DEMAND_SELECTED_EVIDENCE_RESULTS_DIR_REL_V1}/${runId}.hyperagent-chat-discovery-v1.json`;
}

export function assessApDemandSelectedEvidenceCompletenessV1(args: {
  rootDir: string;
  run_id: string | null;
  registry_stage?: string | null;
  proposed_slugs?: string[];
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ApDemandSelectedEvidenceCompletenessV1 {
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const runId = args.run_id;
  const stage = args.registry_stage ?? null;

  if (!runId) {
    return {
      status: "UNKNOWN",
      run_id: null,
      registry_stage: stage,
      expected_evidence_artifact_rel_path: null,
      evidence_artifact_present: false,
      discovery_status: null,
      expected_slugs: [],
      present_slugs: [],
      missing_slugs: [],
      missing_artifact_paths: [
        `${AP_DEMAND_SELECTED_BATCH_RUN_REGISTRY_DIR_REL_V1}/<ap-demand-selected-run>.json`,
      ],
      proven_facts: [],
      unknown_facts: ["UNKNOWN: demand-selected run_id unavailable; cannot assess evidence completeness."],
    };
  }

  let expectedSlugs = [...(args.proposed_slugs ?? [])];
  if (expectedSlugs.length === 0) {
    const registryRel = `${AP_DEMAND_SELECTED_BATCH_RUN_REGISTRY_DIR_REL_V1}/${runId}.json`;
    const registryAbs = path.join(args.rootDir, registryRel);
    if (fileExists(registryAbs)) {
      try {
        const parsed = validateApDemandSelectedBatchRunRegistryDocumentV1(
          JSON.parse(readText(registryAbs)) as unknown,
        );
        if (parsed.ok) expectedSlugs = [...parsed.doc.proposed_slugs];
      } catch {
        // fall through to UNKNOWN/incomplete below
      }
    }
  }

  const artifactRel = expectedApDemandSelectedHyperagentDiscoveryArtifactRelV1(runId);
  const artifactAbs = path.join(args.rootDir, artifactRel);
  const artifactPresent = fileExists(artifactAbs);

  if (!artifactPresent) {
    return {
      status: "INCOMPLETE",
      run_id: runId,
      registry_stage: stage,
      expected_evidence_artifact_rel_path: artifactRel,
      evidence_artifact_present: false,
      discovery_status: null,
      expected_slugs: expectedSlugs,
      present_slugs: [],
      missing_slugs: expectedSlugs,
      missing_artifact_paths: [artifactRel],
      proven_facts: [
        `PROVEN: expected HyperAgent chat discovery artifact missing at ${artifactRel}.`,
        ...(expectedSlugs.length > 0
          ? [`PROVEN: missing evidence coverage for slugs: ${expectedSlugs.join(", ")}.`]
          : []),
      ],
      unknown_facts:
        expectedSlugs.length === 0
          ? ["UNKNOWN: proposed_slugs unavailable while evidence artifact is missing."]
          : [],
    };
  }

  try {
    const packet = JSON.parse(readText(artifactAbs)) as {
      contract?: string;
      run_id?: string;
      discovery_status?: string;
      candidate_rows?: Array<{ filter_slug?: string }>;
    };
    if (packet.contract !== "ap_hyperagent_chat_discovery_output_v1") {
      return {
        status: "UNKNOWN",
        run_id: runId,
        registry_stage: stage,
        expected_evidence_artifact_rel_path: artifactRel,
        evidence_artifact_present: true,
        discovery_status: packet.discovery_status ?? null,
        expected_slugs: expectedSlugs,
        present_slugs: [],
        missing_slugs: expectedSlugs,
        missing_artifact_paths: [],
        proven_facts: [`PROVEN: evidence artifact present at ${artifactRel}.`],
        unknown_facts: [
          `UNKNOWN: evidence artifact contract mismatch (got ${String(packet.contract)}).`,
        ],
      };
    }

    const present = Array.from(
      new Set(
        (packet.candidate_rows ?? [])
          .map((row) => (typeof row.filter_slug === "string" ? row.filter_slug.trim() : ""))
          .filter(Boolean),
      ),
    ).sort();
    const expected = [...expectedSlugs].sort();
    const missing =
      expected.length > 0 ? expected.filter((slug) => !present.includes(slug)) : [];
    const discoveryStatus = typeof packet.discovery_status === "string" ? packet.discovery_status : null;
    const stageComplete = stage === "read_only_evidence_collection_complete";
    const discoveryComplete = discoveryStatus === "DISCOVERY_COMPLETE";
    const slugsComplete = expected.length > 0 && missing.length === 0;

    if (slugsComplete && (discoveryComplete || stageComplete)) {
      return {
        status: "COMPLETE",
        run_id: runId,
        registry_stage: stage,
        expected_evidence_artifact_rel_path: artifactRel,
        evidence_artifact_present: true,
        discovery_status: discoveryStatus,
        expected_slugs: expected,
        present_slugs: present,
        missing_slugs: [],
        missing_artifact_paths: [],
        proven_facts: [
          `PROVEN: HyperAgent chat discovery artifact present at ${artifactRel}.`,
          `PROVEN: discovery_status=${String(discoveryStatus)}; registry_stage=${String(stage)}.`,
          `PROVEN: evidence covers all ${String(expected.length)} proposed demand-selected slugs.`,
          "PROVEN: do not re-run HyperAgent chat discovery for this run unless the evidence artifact is removed or slugs go missing.",
        ],
        unknown_facts: [
          "UNKNOWN: conversion/revenue impact of this read-only discovery packet.",
          "UNKNOWN: whether a future founder-authorized apply plan will exist (apply_readiness remains NOT_PROVEN).",
        ],
      };
    }

    return {
      status: expected.length === 0 ? "UNKNOWN" : "INCOMPLETE",
      run_id: runId,
      registry_stage: stage,
      expected_evidence_artifact_rel_path: artifactRel,
      evidence_artifact_present: true,
      discovery_status: discoveryStatus,
      expected_slugs: expected,
      present_slugs: present,
      missing_slugs: missing,
      missing_artifact_paths: [],
      proven_facts: [
        `PROVEN: evidence artifact present at ${artifactRel}.`,
        `PROVEN: present_slugs=${String(present.length)}; expected_slugs=${String(expected.length)}.`,
        ...(missing.length > 0
          ? [`PROVEN: missing evidence for slugs: ${missing.join(", ")}.`]
          : []),
      ],
      unknown_facts:
        expected.length === 0
          ? ["UNKNOWN: proposed_slugs unavailable; evidence completeness cannot be proven."]
          : discoveryComplete
            ? []
            : [`UNKNOWN: discovery_status=${String(discoveryStatus)} is not DISCOVERY_COMPLETE.`],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "UNKNOWN",
      run_id: runId,
      registry_stage: stage,
      expected_evidence_artifact_rel_path: artifactRel,
      evidence_artifact_present: true,
      discovery_status: null,
      expected_slugs: expectedSlugs,
      present_slugs: [],
      missing_slugs: expectedSlugs,
      missing_artifact_paths: [],
      proven_facts: [`PROVEN: evidence artifact path exists at ${artifactRel}.`],
      unknown_facts: [`UNKNOWN: evidence artifact unreadable (${message}).`],
    };
  }
}

export function buildApDemandSelectedBatchCloseoutReadinessProofV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ApDemandSelectedBatchCloseoutReadinessProofV1 {
  const now = args.now ?? (() => new Date());
  const registry = loadApDemandSelectedBatchRunRegistryV1({
    rootDir: args.rootDir,
    fileExists: args.fileExists,
    readText: args.readText,
  });
  const evidence_completeness = assessApDemandSelectedEvidenceCompletenessV1({
    rootDir: args.rootDir,
    run_id: registry.run_id,
    registry_stage: registry.stage,
    fileExists: args.fileExists,
    readText: args.readText,
  });

  const open_batch_proof_v1: ApDemandSelectedOpenBatchProofStatusV1 = {
    open_batch_existence:
      registry.status === "PROVEN" && registry.evidence_collection_started === true
        ? "PROVEN"
        : "NOT_PROVEN",
    batch_closeout: "NOT_PROVEN",
    apply_readiness: "NOT_PROVEN",
  };

  const next_safe_action =
    evidence_completeness.status === "COMPLETE"
      ? "Hard-stop: read-only evidence is complete for this demand-selected run, but batch_closeout and apply_readiness remain NOT_PROVEN. Do not mutate CSV/Supabase/retailer_links/public guidance; conversion/revenue UNKNOWN."
      : evidence_completeness.status === "INCOMPLETE"
        ? `Evidence incomplete — missing artifact/slugs: ${[
            ...evidence_completeness.missing_artifact_paths,
            ...evidence_completeness.missing_slugs,
          ].join(", ") || "UNKNOWN"}. Do not claim closeout or apply readiness.`
        : "Evidence completeness UNKNOWN — resolve registry/evidence readability before closeout or apply readiness claims.";

  return {
    contract: AP_DEMAND_SELECTED_BATCH_CLOSEOUT_READINESS_PROOF_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    buy_cta_authorized: false,
    public_ui_mutation_authorized: false,
    pages_claimed_closed: false,
    conversion_claimed: false,
    conversion_or_revenue: "UNKNOWN",
    generated_at: now().toISOString(),
    source_command: AP_DEMAND_SELECTED_BATCH_CLOSEOUT_READINESS_PROOF_EXACT_COMMAND_V1,
    run_id: registry.run_id,
    run_registry_rel_path: registry.run_registry_rel_path,
    registry_stage: registry.stage,
    evidence_completeness,
    open_batch_proof_v1,
    batch_closeout: "NOT_PROVEN",
    apply_readiness: "NOT_PROVEN",
    hard_stop: true,
    next_safe_action,
    proven_facts: [
      "PROVEN: closeout/readiness proof is read_only=true and data_mutation=false.",
      "PROVEN: batch_closeout=NOT_PROVEN; apply_readiness=NOT_PROVEN; mutation unauthorized.",
      "PROVEN: pages_claimed_closed=false; conversion_claimed=false; conversion_or_revenue=UNKNOWN.",
      ...evidence_completeness.proven_facts,
    ],
    unknown_facts: [
      ...evidence_completeness.unknown_facts,
      "UNKNOWN: conversion/revenue; do not claim buyer-path closure from this proof.",
    ],
  };
}
