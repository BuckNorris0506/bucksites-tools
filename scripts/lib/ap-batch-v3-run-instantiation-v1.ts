/**
 * Read-only AP batch-v3 run instantiation — turns Command Center demand-to-coverage + lane
 * selection into a proposed run descriptor without mutating CSV, Supabase, or v2 artifacts.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  mergeFactoryAndSupplementalPackets,
} from "./air-purifier-agent-packets-v1";
import { AP_BATCH_V2_DIRECT_BUY_SLUGS_V1 } from "./air-purifier-apply-planner-batch-v2-v1";
import {
  buildAirPurifierBatchProductionLaneV1Report,
  type ApAgentWorkPacketV1,
  type ApBatchCandidateV1,
  type ApBatchProductionLaneStateV1,
  type AirPurifierBatchProductionLaneReportV1,
} from "./air-purifier-batch-production-lane-v1";
import type { BatchProductionOperatingChecklistV1 } from "./buckparts-batch-production-operating-checklist-v1";
import {
  DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1,
  type DemandToCoverageNextLaneReportV1,
} from "./demand-to-coverage-next-lane-v1";

export const AP_BATCH_V3_RUN_INSTANTIATION_CONTRACT_V1 = "ap_batch_v3_run_instantiation_v1" as const;

export const AP_BATCH_V3_RUN_INSTANTIATION_COMMAND_V1 =
  "npx tsx scripts/report-ap-batch-v3-run-instantiation-v1.ts" as const;

export const AP_BATCH_V3_SOURCE_PROVEN_RUN_ID_V1 = "ap-batch-v2-2026-05-24" as const;

export const AP_BATCH_V3_REGISTRY_REL_V1 =
  "data/air-purifier/batch-production/run-registry/ap-batch-v3-proposed-run-v1.json" as const;

export const AP_BATCH_V3_PACKETS_DIR_REL_V1 =
  "data/air-purifier/batch-production/agent-packets-batch-v3" as const;

export const AP_BATCH_V3_PACKETS_MANIFEST_REL_V1 =
  "data/air-purifier/batch-production/agent-packets-batch-v3/manifest.json" as const;

/** Run-registry JSON files that are run descriptors — not agent packet sources. */
export const AP_BATCH_V3_RUN_REGISTRY_DESCRIPTOR_BASENAMES_V1 = [
  "ap-batch-v3-proposed-run-v1.json",
  "ap-batch-v2-proven-run-v1.json",
] as const;

export const AP_BATCH_V3_RESULTS_DIR_REL_V1 =
  "data/air-purifier/batch-production/agent-results-batch-v3" as const;

export const AP_BATCH_V3_APPLY_PLAN_DIR_REL_V1 =
  "data/air-purifier/batch-production/apply-plans-batch-v3" as const;

export const AP_BATCH_V3_APPLY_RUN_DIR_REL_V1 =
  "data/air-purifier/batch-production/apply-runs-batch-v3" as const;

/** Read-only aggregator inspect for batch-v3 evidence rows (no CSV/Supabase mutation). */
export const AP_BATCH_V3_AGENT_RESULTS_AGGREGATOR_COMMAND_V1 =
  `npx tsx scripts/report-air-purifier-agent-results-aggregator-v1.ts --results-dir ${AP_BATCH_V3_RESULTS_DIR_REL_V1}` as const;

const CATALOG_REVIEW_PACKET_IDS_V1 = new Set(["ap-blueair-catalog-identity-v1"]);
const OWNER_REVIEW_PACKET_IDS_V1 = new Set(["ap-amazon-secondary-v1"]);

const ALWAYS_EXCLUDE_STATES_V1 = new Set<ApBatchProductionLaneStateV1>([
  "existing_direct_buyable",
  "existing_official_reference",
  "wrong_family_reject",
]);

const BUYER_PATH_ELIGIBLE_STATES_V1 = new Set<ApBatchProductionLaneStateV1>([
  "search_placeholder_rescue_needed",
  "direct_buy_candidate",
  "reference_candidate",
  "alias_or_redirect_gap",
  "no_safe_path_yet",
]);

export type ApBatchV3ExcludedCandidateV1 = {
  filter_slug: string;
  state: ApBatchProductionLaneStateV1;
  reason: string;
};

export type ApBatchV3PacketStageStatusV1 =
  | "COMPLETE"
  | "MISSING_REGISTRY"
  | "MISSING_MANIFEST"
  | "MISSING_PACKET_FILES"
  | "RUN_ID_MISMATCH"
  | "NOT_STARTED";

export type ApBatchV3ResultStageStatusV1 =
  | "COMPLETE"
  | "MISSING_RESULT_FILES"
  | "INVALID_RESULT_FILE"
  | "NOT_STARTED";

export type ApBatchV3ActiveRunIdSourceV1 = "committed_registry" | "proposed_daily";

export type ApBatchV3CommittedRunRegistryV1 = {
  contract?: string;
  run_id?: string;
  wedge?: string;
  lane_label?: string;
  proposed?: boolean;
  artifact_paths?: {
    packets_dir?: string;
    results_dir?: string;
  };
  may_proceed_to_packet_write?: boolean;
};

export type ApBatchV3CommittedPacketManifestV1 = {
  contract?: string;
  run_id?: string;
  packet_ids?: string[];
  packet_count?: number;
};

export type ApBatchV3CommittedRunArtifactV1 = {
  registry_rel: string;
  manifest_rel: string;
  run_id: string;
  packet_ids: string[];
  packet_files_rel: string[];
  expected_result_artifact_paths_rel: string[];
  packet_stage_status: ApBatchV3PacketStageStatusV1;
  missing_packet_files_rel: string[];
  proven_facts: string[];
};

export type ApBatchV3CommittedResultStageV1 = {
  result_stage_status: ApBatchV3ResultStageStatusV1;
  result_stage_complete: boolean;
  ready_result_files_rel: string[];
  missing_result_files_rel: string[];
  invalid_result_files: Array<{ path: string; reasons: string[] }>;
  has_proposed_csv_mutation: boolean;
  proven_facts: string[];
};

export type ApBatchV3RunInstantiationV1 = {
  contract: typeof AP_BATCH_V3_RUN_INSTANTIATION_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  run_id: string;
  lane_label: string;
  wedge: typeof HOMEKEEP_WEDGE_CATALOG.air_purifier;
  source_proven_run_id: string;
  source_recommendation_proof: {
    demand_report: typeof DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1;
    recommended_wedge: string;
    recommendation_status: string;
    next_action: string;
  };
  candidate_count: number;
  buyer_path_candidate_count: number;
  catalog_review_candidate_count: number;
  owner_review_candidate_count: number;
  excluded_candidate_count: number;
  candidates_by_task: {
    buyer_path: ApBatchCandidateV1[];
    catalog_review: ApBatchCandidateV1[];
    owner_review_required: ApBatchCandidateV1[];
    excluded: ApBatchV3ExcludedCandidateV1[];
  };
  packets_grouped_by_task: {
    buyer_path: ApAgentWorkPacketV1[];
    catalog_review: ApAgentWorkPacketV1[];
  };
  proposed_artifact_paths: {
    run_registry: string;
    packets_dir: string;
    results_dir: string;
    apply_plan_dir: string;
    apply_run_dir: string;
    lane_report_command: string;
    packets_command: string;
  };
  preflight_blockers: string[];
  may_proceed_to_packet_write: boolean;
  /** True when committed registry + manifest + all packet JSON files exist on disk. */
  packets_stage_complete: boolean;
  packet_stage_status: ApBatchV3PacketStageStatusV1;
  active_run_id_source: ApBatchV3ActiveRunIdSourceV1;
  committed_run_artifact: ApBatchV3CommittedRunArtifactV1 | null;
  ready_packet_files_rel: string[];
  missing_packet_files_rel: string[];
  expected_result_artifact_paths_rel: string[];
  result_stage_status: ApBatchV3ResultStageStatusV1;
  result_stage_complete: boolean;
  ready_result_files_rel: string[];
  missing_result_files_rel: string[];
  invalid_result_files: Array<{ path: string; reasons: string[] }>;
  result_stage_has_proposed_csv_mutation: boolean;
  next_command_center_step: string;
  notes: string[];
  files_written: string[];
};

export type BuildApBatchV3RunInstantiationDepsV1 = {
  rootDir: string;
  /** Defaults to rootDir — lane CSVs use rootDir; committed artifacts use this when set. */
  artifactRootDir?: string;
  now?: () => Date;
  demandToCoverageNextLane: DemandToCoverageNextLaneReportV1;
  checklist?: BatchProductionOperatingChecklistV1 | null;
  laneReport?: AirPurifierBatchProductionLaneReportV1;
  write?: boolean;
  writePackets?: boolean;
  outDir?: string | null;
  fileExists?: (absPath: string) => boolean;
  readTextFile?: (absPath: string) => string;
};

function allLaneCandidates(lane: AirPurifierBatchProductionLaneReportV1): ApBatchCandidateV1[] {
  const bySlug = new Map<string, ApBatchCandidateV1>();
  for (const pool of [
    lane.top_candidates,
    lane.direct_buy_candidates,
    lane.reference_link_candidates,
    lane.blocked_or_rejected,
  ]) {
    for (const c of pool) {
      if (!bySlug.has(c.filter_slug)) bySlug.set(c.filter_slug, c);
    }
  }
  return Array.from(bySlug.values()).sort((a, b) => a.rank - b.rank);
}

function classifyCandidateForV3(
  candidate: ApBatchCandidateV1,
  v2AppliedSlugs: ReadonlySet<string>,
): "buyer_path" | "catalog_review" | "owner_review" | "excluded" {
  const slug = candidate.filter_slug;
  if (v2AppliedSlugs.has(slug)) return "excluded";
  if (ALWAYS_EXCLUDE_STATES_V1.has(candidate.state)) return "excluded";
  if (candidate.state === "owner_review") return "owner_review";
  if (candidate.state === "catalog_identity_gap") return "catalog_review";
  if (BUYER_PATH_ELIGIBLE_STATES_V1.has(candidate.state)) return "buyer_path";
  return "excluded";
}

function exclusionReason(
  candidate: ApBatchCandidateV1,
  v2AppliedSlugs: ReadonlySet<string>,
): string {
  if (v2AppliedSlugs.has(candidate.filter_slug)) {
    return "Already direct_buyable from ap-batch-v2 apply — excluded from v3 buyer-path work.";
  }
  if (candidate.state === "existing_direct_buyable") {
    return "Existing direct_buyable — no buyer-path mutation task.";
  }
  if (candidate.state === "existing_official_reference") {
    return "Existing official reference — excluded from v3 buyer-path batch.";
  }
  if (candidate.state === "wrong_family_reject") {
    return "Wrong-family reject — hard excluded from buyer-path packets.";
  }
  if (candidate.state === "owner_review") {
    return "Owner review required — separated; not auto-promoted to direct-buy work.";
  }
  if (candidate.state === "catalog_identity_gap") {
    return "Catalog identity gap — routed to catalog-review tasks only.";
  }
  return `State ${candidate.state} is not eligible for ap-batch-v3 buyer-path instantiation.`;
}

function filterPacketSlugs(
  packet: ApAgentWorkPacketV1,
  allowedSlugs: ReadonlySet<string>,
): ApAgentWorkPacketV1 | null {
  const candidate_slugs = packet.candidate_slugs.filter((s) => allowedSlugs.has(s));
  if (candidate_slugs.length === 0) return null;
  return {
    ...packet,
    candidate_slugs,
    max_rows: Math.min(packet.max_rows, candidate_slugs.length),
  };
}

function proposedRunId(now: () => Date): string {
  const d = now().toISOString().slice(0, 10);
  return `ap-batch-v3-proposed-${d}`;
}

function defaultFileExists(absolutePath: string): boolean {
  return existsSync(absolutePath);
}

function defaultReadText(absolutePath: string): string {
  return readFileSync(absolutePath, "utf8");
}

export function apBatchV3PacketFileRelV1(packetId: string): string {
  return `${AP_BATCH_V3_PACKETS_DIR_REL_V1}/${packetId}.json`;
}

export function apBatchV3ResultFileRelV1(packetId: string): string {
  return `${AP_BATCH_V3_RESULTS_DIR_REL_V1}/${packetId}.results.json`;
}

function validateCommittedResultFileV1(args: {
  relPath: string;
  expectedRunId: string;
  expectedPacketId: string;
  rootDir: string;
  readTextFile: (absolutePath: string) => string;
}): { valid: boolean; reasons: string[]; hasProposedCsvMutation: boolean } {
  const reasons: string[] = [];
  let hasProposedCsvMutation = false;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(args.readTextFile(path.join(args.rootDir, args.relPath))) as Record<string, unknown>;
  } catch {
    return { valid: false, reasons: ["invalid_json"], hasProposedCsvMutation: false };
  }

  if (parsed.read_only !== true) reasons.push("read_only_not_true");
  if (parsed.data_mutation !== false) reasons.push("data_mutation_not_false");
  if (parsed.run_id !== args.expectedRunId) reasons.push("run_id_mismatch");
  if (parsed.packet_id !== args.expectedPacketId) reasons.push("packet_id_mismatch");
  if (typeof parsed.report_name !== "string" || parsed.report_name.length === 0) {
    reasons.push("report_name_missing");
  }
  if (!Array.isArray(parsed.candidate_results)) {
    reasons.push("candidate_results_missing");
  } else {
    for (const row of parsed.candidate_results as Array<Record<string, unknown>>) {
      if (row.recommended_csv_mutation && row.recommended_csv_mutation !== null) {
        hasProposedCsvMutation = true;
        break;
      }
    }
  }
  return { valid: reasons.length === 0, reasons, hasProposedCsvMutation };
}

export function loadApBatchV3CommittedResultStageV1(args: {
  rootDir: string;
  runArtifact: ApBatchV3CommittedRunArtifactV1;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
}): ApBatchV3CommittedResultStageV1 {
  const fileExists = args.fileExists ?? defaultFileExists;
  const readTextFile = args.readTextFile ?? defaultReadText;

  if (args.runArtifact.packet_stage_status !== "COMPLETE") {
    return {
      result_stage_status: "NOT_STARTED",
      result_stage_complete: false,
      ready_result_files_rel: [],
      missing_result_files_rel: [],
      invalid_result_files: [],
      has_proposed_csv_mutation: false,
      proven_facts: ["Result-stage validation skipped until packet stage is COMPLETE."],
    };
  }

  const ready_result_files_rel: string[] = [];
  const missing_result_files_rel: string[] = [];
  const invalid_result_files: Array<{ path: string; reasons: string[] }> = [];
  let has_proposed_csv_mutation = false;
  const proven_facts: string[] = [];

  const packetIds = args.runArtifact.packet_ids;
  for (let i = 0; i < packetIds.length; i += 1) {
    const packetId = packetIds[i]!;
    const rel = apBatchV3ResultFileRelV1(packetId);
    const abs = path.join(args.rootDir, rel);
    if (!fileExists(abs)) {
      missing_result_files_rel.push(rel);
      continue;
    }
    const validated = validateCommittedResultFileV1({
      relPath: rel,
      expectedRunId: args.runArtifact.run_id,
      expectedPacketId: packetId,
      rootDir: args.rootDir,
      readTextFile,
    });
    if (!validated.valid) {
      invalid_result_files.push({ path: rel, reasons: validated.reasons });
      continue;
    }
    if (validated.hasProposedCsvMutation) has_proposed_csv_mutation = true;
    ready_result_files_rel.push(rel);
  }

  if (missing_result_files_rel.length > 0) {
    return {
      result_stage_status: "MISSING_RESULT_FILES",
      result_stage_complete: false,
      ready_result_files_rel,
      missing_result_files_rel,
      invalid_result_files,
      has_proposed_csv_mutation,
      proven_facts: [
        ...proven_facts,
        `PARTIAL: missing result file(s): ${missing_result_files_rel.join(", ")}`,
      ],
    };
  }
  if (invalid_result_files.length > 0) {
    return {
      result_stage_status: "INVALID_RESULT_FILE",
      result_stage_complete: false,
      ready_result_files_rel,
      missing_result_files_rel,
      invalid_result_files,
      has_proposed_csv_mutation,
      proven_facts: [
        ...proven_facts,
        `BLOCKED: invalid result file(s): ${invalid_result_files.map((r) => r.path).join(", ")}`,
      ],
    };
  }
  return {
    result_stage_status: "COMPLETE",
    result_stage_complete: true,
    ready_result_files_rel,
    missing_result_files_rel,
    invalid_result_files,
    has_proposed_csv_mutation,
    proven_facts: [
      ...proven_facts,
      `PROVEN: all ${String(ready_result_files_rel.length)} result files exist, read_only=true, data_mutation=false, run_id/packet_id match manifest.`,
    ],
  };
}

/** Read committed run descriptor + packet manifest from repo; validate packet files on disk. */
export function loadApBatchV3CommittedRunArtifactV1(args: {
  rootDir: string;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
}): ApBatchV3CommittedRunArtifactV1 {
  const fileExists = args.fileExists ?? defaultFileExists;
  const readTextFile = args.readTextFile ?? defaultReadText;
  const proven_facts: string[] = [];
  const registry_rel = AP_BATCH_V3_REGISTRY_REL_V1;
  const manifest_rel = AP_BATCH_V3_PACKETS_MANIFEST_REL_V1;
  const registryAbs = path.join(args.rootDir, registry_rel);

  if (!fileExists(registryAbs)) {
    return {
      registry_rel,
      manifest_rel,
      run_id: "UNKNOWN",
      packet_ids: [],
      packet_files_rel: [],
      expected_result_artifact_paths_rel: [],
      packet_stage_status: "MISSING_REGISTRY",
      missing_packet_files_rel: [],
      proven_facts,
    };
  }

  let registry: ApBatchV3CommittedRunRegistryV1;
  try {
    registry = JSON.parse(readTextFile(registryAbs)) as ApBatchV3CommittedRunRegistryV1;
  } catch {
    return {
      registry_rel,
      manifest_rel,
      run_id: "UNKNOWN",
      packet_ids: [],
      packet_files_rel: [],
      expected_result_artifact_paths_rel: [],
      packet_stage_status: "MISSING_REGISTRY",
      missing_packet_files_rel: [registry_rel],
      proven_facts: [`INVALID: ${registry_rel} is not valid JSON.`],
    };
  }

  const run_id = typeof registry.run_id === "string" ? registry.run_id.trim() : "";
  if (!run_id) {
    return {
      registry_rel,
      manifest_rel,
      run_id: "UNKNOWN",
      packet_ids: [],
      packet_files_rel: [],
      expected_result_artifact_paths_rel: [],
      packet_stage_status: "MISSING_REGISTRY",
      missing_packet_files_rel: [],
      proven_facts: [`INVALID: ${registry_rel} missing run_id.`],
    };
  }

  proven_facts.push(`PROVEN: committed run registry ${registry_rel} run_id=${run_id}.`);

  const manifestAbs = path.join(args.rootDir, manifest_rel);
  if (!fileExists(manifestAbs)) {
    return {
      registry_rel,
      manifest_rel,
      run_id,
      packet_ids: [],
      packet_files_rel: [],
      expected_result_artifact_paths_rel: [],
      packet_stage_status: "MISSING_MANIFEST",
      missing_packet_files_rel: [manifest_rel],
      proven_facts,
    };
  }

  let manifest: ApBatchV3CommittedPacketManifestV1;
  try {
    manifest = JSON.parse(readTextFile(manifestAbs)) as ApBatchV3CommittedPacketManifestV1;
  } catch {
    return {
      registry_rel,
      manifest_rel,
      run_id,
      packet_ids: [],
      packet_files_rel: [],
      expected_result_artifact_paths_rel: [],
      packet_stage_status: "MISSING_MANIFEST",
      missing_packet_files_rel: [manifest_rel],
      proven_facts: [...proven_facts, `INVALID: ${manifest_rel} is not valid JSON.`],
    };
  }

  const manifestRunId = typeof manifest.run_id === "string" ? manifest.run_id.trim() : "";
  if (manifestRunId && manifestRunId !== run_id) {
    return {
      registry_rel,
      manifest_rel,
      run_id,
      packet_ids: [],
      packet_files_rel: [],
      expected_result_artifact_paths_rel: [],
      packet_stage_status: "RUN_ID_MISMATCH",
      missing_packet_files_rel: [],
      proven_facts: [
        ...proven_facts,
        `BLOCKED: manifest run_id=${manifestRunId} does not match registry run_id=${run_id}.`,
      ],
    };
  }

  const packet_ids = Array.isArray(manifest.packet_ids)
    ? manifest.packet_ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  if (packet_ids.length === 0) {
    return {
      registry_rel,
      manifest_rel,
      run_id,
      packet_ids: [],
      packet_files_rel: [],
      expected_result_artifact_paths_rel: [],
      packet_stage_status: "MISSING_MANIFEST",
      missing_packet_files_rel: [manifest_rel],
      proven_facts: [...proven_facts, `INVALID: ${manifest_rel} has no packet_ids.`],
    };
  }

  proven_facts.push(
    `PROVEN: packet manifest ${manifest_rel} lists ${String(packet_ids.length)} packet(s).`,
  );

  const packet_files_rel: string[] = [];
  const missing_packet_files_rel: string[] = [];
  for (const packetId of packet_ids) {
    const rel = apBatchV3PacketFileRelV1(packetId);
    if (fileExists(path.join(args.rootDir, rel))) {
      packet_files_rel.push(rel);
    } else {
      missing_packet_files_rel.push(rel);
    }
  }

  const expected_result_artifact_paths_rel = packet_ids.map((id) => apBatchV3ResultFileRelV1(id));

  if (missing_packet_files_rel.length > 0) {
    return {
      registry_rel,
      manifest_rel,
      run_id,
      packet_ids,
      packet_files_rel,
      expected_result_artifact_paths_rel,
      packet_stage_status: "MISSING_PACKET_FILES",
      missing_packet_files_rel,
      proven_facts: [
        ...proven_facts,
        `PARTIAL: missing packet file(s): ${missing_packet_files_rel.join(", ")}`,
      ],
    };
  }

  proven_facts.push(
    `PROVEN: all ${String(packet_ids.length)} packet JSON files exist under ${AP_BATCH_V3_PACKETS_DIR_REL_V1}.`,
  );

  return {
    registry_rel,
    manifest_rel,
    run_id,
    packet_ids,
    packet_files_rel,
    expected_result_artifact_paths_rel,
    packet_stage_status: "COMPLETE",
    missing_packet_files_rel: [],
    proven_facts,
  };
}

/** Resolve registry vs packet paths. `--out-dir` is a sandbox root mirroring batch-production layout. */
export function resolveApBatchV3ArtifactPathsV1(args: {
  rootDir: string;
  sandboxRoot?: string | null;
}): {
  registryAbs: string;
  packetsDirAbs: string;
  manifestAbs: string;
} {
  const sandbox = args.sandboxRoot?.trim()
    ? path.isAbsolute(args.sandboxRoot)
      ? args.sandboxRoot
      : path.join(args.rootDir, args.sandboxRoot)
    : null;

  const registryAbs = sandbox
    ? path.join(sandbox, "run-registry", path.basename(AP_BATCH_V3_REGISTRY_REL_V1))
    : path.join(args.rootDir, AP_BATCH_V3_REGISTRY_REL_V1);

  const packetsDirAbs = sandbox
    ? path.join(sandbox, "agent-packets-batch-v3")
    : path.join(args.rootDir, AP_BATCH_V3_PACKETS_DIR_REL_V1);

  return {
    registryAbs,
    packetsDirAbs,
    manifestAbs: path.join(packetsDirAbs, "manifest.json"),
  };
}

/** True when a run-registry filename is a misplaced agent packet (not a run descriptor). */
export function isApBatchV3RunRegistryPacketMisplacementV1(filename: string): boolean {
  if (filename === "manifest.json") return true;
  if (
    (AP_BATCH_V3_RUN_REGISTRY_DESCRIPTOR_BASENAMES_V1 as readonly string[]).includes(filename)
  ) {
    return false;
  }
  return /^ap-.+-v\d+\.json$/i.test(filename);
}

export function buildApBatchV3UnknownV1(args: {
  generated_at: string;
  reason: string;
}): ApBatchV3RunInstantiationV1 {
  return {
    contract: AP_BATCH_V3_RUN_INSTANTIATION_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: args.generated_at,
    run_id: "UNKNOWN",
    lane_label: "AP batch-v3 (not instantiated)",
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    source_proven_run_id: AP_BATCH_V3_SOURCE_PROVEN_RUN_ID_V1,
    source_recommendation_proof: {
      demand_report: DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1,
      recommended_wedge: "UNKNOWN",
      recommendation_status: "UNKNOWN",
      next_action: args.reason,
    },
    candidate_count: 0,
    buyer_path_candidate_count: 0,
    catalog_review_candidate_count: 0,
    owner_review_candidate_count: 0,
    excluded_candidate_count: 0,
    candidates_by_task: {
      buyer_path: [],
      catalog_review: [],
      owner_review_required: [],
      excluded: [],
    },
    packets_grouped_by_task: { buyer_path: [], catalog_review: [] },
    proposed_artifact_paths: {
      run_registry: AP_BATCH_V3_REGISTRY_REL_V1,
      packets_dir: AP_BATCH_V3_PACKETS_DIR_REL_V1,
      results_dir: AP_BATCH_V3_RESULTS_DIR_REL_V1,
      apply_plan_dir: AP_BATCH_V3_APPLY_PLAN_DIR_REL_V1,
      apply_run_dir: AP_BATCH_V3_APPLY_RUN_DIR_REL_V1,
      lane_report_command: "npx tsx scripts/report-air-purifier-batch-production-lane-v1.ts",
      packets_command:
        "npx tsx scripts/report-air-purifier-agent-packets-v1.ts --out-dir data/air-purifier/batch-production/agent-packets-batch-v3",
    },
    preflight_blockers: [args.reason],
    may_proceed_to_packet_write: false,
    packets_stage_complete: false,
    packet_stage_status: "NOT_STARTED",
    active_run_id_source: "proposed_daily",
    committed_run_artifact: null,
    ready_packet_files_rel: [],
    missing_packet_files_rel: [],
    expected_result_artifact_paths_rel: [],
    result_stage_status: "NOT_STARTED",
    result_stage_complete: false,
    ready_result_files_rel: [],
    missing_result_files_rel: [],
    invalid_result_files: [],
    result_stage_has_proposed_csv_mutation: false,
    next_command_center_step: args.reason,
    notes: [args.reason],
    files_written: [],
  };
}

export async function buildApBatchV3RunInstantiationV1Report(
  deps: BuildApBatchV3RunInstantiationDepsV1,
): Promise<ApBatchV3RunInstantiationV1> {
  const now = deps.now ?? (() => new Date());
  const generated_at = now().toISOString();
  const demand = deps.demandToCoverageNextLane;
  const checklist = deps.checklist ?? null;
  const v2AppliedSlugs = new Set<string>(AP_BATCH_V2_DIRECT_BUY_SLUGS_V1);

  const preflight_blockers: string[] = [];
  if (demand.recommended_wedge !== HOMEKEEP_WEDGE_CATALOG.air_purifier) {
    preflight_blockers.push(
      `Demand-to-coverage selected wedge ${demand.recommended_wedge} — AP batch-v3 only when air_purifier is recommended.`,
    );
  }
  if (demand.recommendation_status !== "RECOMMEND_REOPEN") {
    preflight_blockers.push(
      `Demand recommendation_status=${demand.recommendation_status} — AP batch-v3 expects RECOMMEND_REOPEN.`,
    );
  }
  if (
    checklist &&
    checklist.expansion_readiness.ready_to_add_products_or_wedges !== true
  ) {
    preflight_blockers.push(
      "Batch expansion readiness is not true — finish closeout before instantiating ap-batch-v3.",
    );
  }

  const lane =
    deps.laneReport ??
    (await buildAirPurifierBatchProductionLaneV1Report({
      rootDir: deps.rootDir,
      fileExists: deps.fileExists,
      readTextFile: deps.readTextFile,
    }));

  const buyer_path: ApBatchCandidateV1[] = [];
  const catalog_review: ApBatchCandidateV1[] = [];
  const owner_review_required: ApBatchCandidateV1[] = [];
  const excluded: ApBatchV3ExcludedCandidateV1[] = [];

  for (const candidate of allLaneCandidates(lane)) {
    const bucket = classifyCandidateForV3(candidate, v2AppliedSlugs);
    if (bucket === "buyer_path") buyer_path.push(candidate);
    else if (bucket === "catalog_review") catalog_review.push(candidate);
    else if (bucket === "owner_review") owner_review_required.push(candidate);
    else {
      excluded.push({
        filter_slug: candidate.filter_slug,
        state: candidate.state,
        reason: exclusionReason(candidate, v2AppliedSlugs),
      });
    }
  }

  const buyerSlugs = new Set(buyer_path.map((c) => c.filter_slug));
  const catalogSlugs = new Set(catalog_review.map((c) => c.filter_slug));
  const mergedPackets = mergeFactoryAndSupplementalPackets(lane);

  const buyer_path_packets: ApAgentWorkPacketV1[] = [];
  const catalog_review_packets: ApAgentWorkPacketV1[] = [];

  for (const packet of mergedPackets) {
    if (CATALOG_REVIEW_PACKET_IDS_V1.has(packet.packet_id)) {
      const filtered = filterPacketSlugs(packet, catalogSlugs);
      if (filtered) catalog_review_packets.push(filtered);
      continue;
    }
    if (OWNER_REVIEW_PACKET_IDS_V1.has(packet.packet_id)) {
      continue;
    }
    const filtered = filterPacketSlugs(packet, buyerSlugs);
    if (filtered) buyer_path_packets.push(filtered);
  }

  const candidate_count = buyer_path.length + catalog_review.length + owner_review_required.length;
  if (candidate_count === 0) {
    preflight_blockers.push("No eligible ap-batch-v3 candidates after exclusions.");
  }
  if (buyer_path.length > 0 && buyer_path.length <= 4) {
    preflight_blockers.push(
      `Only ${String(buyer_path.length)} buyer-path candidates — expected more than 4 when lane backlog exists.`,
    );
  }

  const may_proceed_to_packet_write =
    preflight_blockers.length === 0 && buyer_path.length > 4;

  const artifactRootDir = deps.artifactRootDir ?? deps.rootDir;
  const committed_run_artifact = loadApBatchV3CommittedRunArtifactV1({
    rootDir: artifactRootDir,
    fileExists: deps.fileExists,
    readTextFile: deps.readTextFile,
  });

  const active_run_id_source: ApBatchV3ActiveRunIdSourceV1 =
    committed_run_artifact.packet_stage_status !== "MISSING_REGISTRY"
      ? "committed_registry"
      : "proposed_daily";

  const run_id =
    active_run_id_source === "committed_registry"
      ? committed_run_artifact.run_id
      : proposedRunId(now);

  const packets_stage_complete = committed_run_artifact.packet_stage_status === "COMPLETE";
  const packet_stage_status: ApBatchV3PacketStageStatusV1 = packets_stage_complete
    ? "COMPLETE"
    : committed_run_artifact.packet_stage_status === "MISSING_REGISTRY"
      ? "NOT_STARTED"
      : committed_run_artifact.packet_stage_status;
  const committed_result_stage = loadApBatchV3CommittedResultStageV1({
    rootDir: artifactRootDir,
    runArtifact: committed_run_artifact,
    fileExists: deps.fileExists,
    readTextFile: deps.readTextFile,
  });

  const notes = [
    "Read-only run instantiation — does not mutate ap-batch-v2 plans, product CSV, or Supabase.",
    `Excluded ${String(excluded.length)} slugs including existing_direct_buyable and ap-batch-v2 applied slugs.`,
    `Owner-review rows (${String(owner_review_required.length)}) are listed separately — not in buyer-path packets.`,
    `Catalog-review rows (${String(catalog_review.length)}) are not buyer-path mutation tasks.`,
    ...committed_run_artifact.proven_facts,
    ...committed_result_stage.proven_facts,
  ];

  if (active_run_id_source === "committed_registry") {
    notes.push(`Active run_id locked from ${AP_BATCH_V3_REGISTRY_REL_V1}: ${run_id}.`);
  }
  if (packets_stage_complete) {
    notes.push("Packet stage COMPLETE — committed registry, manifest, and packet files on disk.");
    if (committed_result_stage.result_stage_complete) {
      notes.push("Result stage COMPLETE — all expected result files are valid and committed.");
    }
  } else if (
    may_proceed_to_packet_write &&
    packet_stage_status === "MISSING_MANIFEST"
  ) {
    notes.push(`Packet stage incomplete — write manifest to ${AP_BATCH_V3_PACKETS_MANIFEST_REL_V1}.`);
  } else if (packet_stage_status === "MISSING_PACKET_FILES") {
    notes.push(
      `Packet stage blocked — missing files: ${committed_run_artifact.missing_packet_files_rel.join(", ")}`,
    );
  }

  const next_command_center_step = packets_stage_complete
    ? committed_result_stage.result_stage_complete
      ? `All AP batch-v3 results committed for ${run_id}. Run read-only aggregation review from ${AP_BATCH_V3_RESULTS_DIR_REL_V1}.`
      : `Packets committed for ${run_id}. Collect external agent evidence into ${AP_BATCH_V3_RESULTS_DIR_REL_V1} (${committed_run_artifact.packet_ids.join(", ")}).`
    : may_proceed_to_packet_write
      ? "Review proposed ap-batch-v3 run descriptor; owner may write packets with --write --write-packets."
      : preflight_blockers[0] ?? "Resolve preflight blockers before ap-batch-v3 instantiation.";

  const report: ApBatchV3RunInstantiationV1 = {
    contract: AP_BATCH_V3_RUN_INSTANTIATION_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at,
    run_id,
    lane_label: "AP batch-v3",
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    source_proven_run_id: AP_BATCH_V3_SOURCE_PROVEN_RUN_ID_V1,
    source_recommendation_proof: {
      demand_report: DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1,
      recommended_wedge: demand.recommended_wedge,
      recommendation_status: demand.recommendation_status,
      next_action: demand.next_action,
    },
    candidate_count,
    buyer_path_candidate_count: buyer_path.length,
    catalog_review_candidate_count: catalog_review.length,
    owner_review_candidate_count: owner_review_required.length,
    excluded_candidate_count: excluded.length,
    candidates_by_task: {
      buyer_path,
      catalog_review,
      owner_review_required,
      excluded,
    },
    packets_grouped_by_task: {
      buyer_path: buyer_path_packets,
      catalog_review: catalog_review_packets,
    },
    proposed_artifact_paths: {
      run_registry: AP_BATCH_V3_REGISTRY_REL_V1,
      packets_dir: AP_BATCH_V3_PACKETS_DIR_REL_V1,
      results_dir: AP_BATCH_V3_RESULTS_DIR_REL_V1,
      apply_plan_dir: AP_BATCH_V3_APPLY_PLAN_DIR_REL_V1,
      apply_run_dir: AP_BATCH_V3_APPLY_RUN_DIR_REL_V1,
      lane_report_command: "npx tsx scripts/report-air-purifier-batch-production-lane-v1.ts",
      packets_command: `npx tsx scripts/report-air-purifier-agent-packets-v1.ts --out-dir ${AP_BATCH_V3_PACKETS_DIR_REL_V1}`,
    },
    preflight_blockers,
    may_proceed_to_packet_write,
    packets_stage_complete,
    packet_stage_status,
    active_run_id_source,
    committed_run_artifact,
    ready_packet_files_rel: committed_run_artifact.packet_files_rel,
    missing_packet_files_rel: committed_run_artifact.missing_packet_files_rel,
    expected_result_artifact_paths_rel: committed_run_artifact.expected_result_artifact_paths_rel,
    result_stage_status: committed_result_stage.result_stage_status,
    result_stage_complete: committed_result_stage.result_stage_complete,
    ready_result_files_rel: committed_result_stage.ready_result_files_rel,
    missing_result_files_rel: committed_result_stage.missing_result_files_rel,
    invalid_result_files: committed_result_stage.invalid_result_files,
    result_stage_has_proposed_csv_mutation: committed_result_stage.has_proposed_csv_mutation,
    next_command_center_step,
    notes,
    files_written: [],
  };

  if (deps.write) {
    const { registryAbs, packetsDirAbs, manifestAbs } = resolveApBatchV3ArtifactPathsV1({
      rootDir: deps.rootDir,
      sandboxRoot: deps.outDir,
    });

    mkdirSync(path.dirname(registryAbs), { recursive: true });

    const registryPayload = {
      contract: "batch_production_proven_run_v1",
      read_only: true,
      data_mutation: false,
      run_id,
      wedge: "air_purifier",
      lane_label: "AP batch-v3",
      proposed: true,
      source_proven_run_id: AP_BATCH_V3_SOURCE_PROVEN_RUN_ID_V1,
      source_recommendation_proof: report.source_recommendation_proof,
      expected_evidence_row_count: buyer_path_packets.reduce((n, p) => n + p.candidate_slugs.length, 0),
      expected_auto_apply_slugs: [],
      artifact_paths: report.proposed_artifact_paths,
      operator_lessons: report.notes,
      may_proceed_to_packet_write,
    };

    writeFileSync(registryAbs, `${JSON.stringify(registryPayload, null, 2)}\n`, "utf8");
    report.files_written.push(registryAbs);

    if (deps.writePackets) {
      mkdirSync(packetsDirAbs, { recursive: true });
      const allPackets = [...buyer_path_packets, ...catalog_review_packets];
      const manifest = {
        contract: "air_purifier_agent_packets_v1",
        generated_at,
        run_id,
        packet_count: allPackets.length,
        packet_ids: allPackets.map((p) => p.packet_id),
        read_only: true,
        data_mutation: false,
        proposed: true,
      };
      writeFileSync(manifestAbs, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
      report.files_written.push(manifestAbs);
      for (const packet of allPackets) {
        const packetPath = path.join(packetsDirAbs, `${packet.packet_id}.json`);
        writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
        report.files_written.push(packetPath);
      }
    }
  }

  return report;
}

export function parseApBatchV3RunInstantiationCliArgsV1(argv: string[]): {
  write: boolean;
  writePackets: boolean;
  outDir: string | null;
} {
  let write = false;
  let writePackets = false;
  let outDir: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--write") write = true;
    else if (arg === "--write-packets") writePackets = true;
    else if (arg === "--out-dir" && argv[i + 1]) {
      outDir = argv[i + 1]!;
      i += 1;
    }
  }
  return { write, writePackets, outDir };
}
