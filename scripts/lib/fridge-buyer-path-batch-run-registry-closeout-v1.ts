/**
 * Owner-authorized refrigerator_water run-registry closeout writer v1.
 * Records durable closeout truth after APPLIED_PARITY_PROVEN — no buyer-path / CSV / Supabase mutation.
 */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1 } from "./fridge-buyer-path-batch-proposal-v1";
import {
  FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1,
  validateFridgeBuyerPathBatchPlanningRunRegistryDocumentV1,
  type FridgeBuyerPathBatchPlanningRunRegistryDocumentV1,
} from "./fridge-buyer-path-batch-run-registry-v1";
import type { UniversalBatchLifecycleGuardedCsvApplyExecutorStatusV1 } from "./universal-batch-lifecycle-guarded-csv-apply-executor-v1";

const requireFromCloseout = createRequire(import.meta.url);

export const FRIDGE_BUYER_PATH_BATCH_CLOSED_RUN_REGISTRY_CONTRACT_V1 =
  "fridge_buyer_path_batch_closed_run_registry_v1" as const;

export const FRIDGE_BUYER_PATH_BATCH_CLOSED_RUN_REGISTRY_STAGE_V1 =
  "batch_closeout_recorded" as const;

export const FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_RUN_ID_V1 =
  "fridge-buyer-path-batch-run-v1-0fec4a7b623a" as const;

export const FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1 =
  "data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json" as const;

export const FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_LEARNING_PACKET_REL_V1 =
  "data/fridge/batch-production/closeout/fridge-buyer-path-batch-closeout-learning-packet-v1-0fec4a7b623a.json" as const;

export const FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_POST_APPLY_PARITY_STATUS_V1 =
  "APPLIED_PARITY_PROVEN" as const;

export const FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_PRODUCTION_GO_STATUS_V1 =
  "UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH" as const;

export const FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_PRODUCTION_GO_REASON_V1 =
  "successful production /go GET logs click_events; no safe no-click production first-hop path exists" as const;

export const FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_LEARNING_PACKET_CONTRACT_V1 =
  "fridge_buyer_path_batch_closeout_learning_packet_v1" as const;

export const FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-buyer-path-batch-run-registry-closeout" as const;

export const FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_OWNER_CONFIRM_FLAG_V1 =
  "--owner-confirm-closeout" as const;

export const FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_FORBIDDEN_PRODUCTION_GO_FLAG_V1 =
  "--allow-production-go-click-logging" as const;

const MUTATION_FLAG_KEYS = [
  "apply_mutation_authorized",
  "csv_apply_authorized",
  "retailer_links_mutation_authorized",
  "supabase_mutation_authorized",
  "public_ui_mutation_authorized",
  "buy_link_mutation_authorized",
  "evidence_write_authorized",
  "netlify_api_authorized",
] as const;

export type FridgeBuyerPathBatchClosedRunRegistryMutationFlagsV1 = {
  apply_mutation_authorized: false;
  csv_apply_authorized: false;
  retailer_links_mutation_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
};

export type FridgeBuyerPathBatchClosedRunRegistryDocumentV1 =
  FridgeBuyerPathBatchClosedRunRegistryMutationFlagsV1 & {
    contract: typeof FRIDGE_BUYER_PATH_BATCH_CLOSED_RUN_REGISTRY_CONTRACT_V1;
    read_only: true;
    data_mutation: false;
    run_id: typeof FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_RUN_ID_V1;
    wedge: "refrigerator_water";
    stage: typeof FRIDGE_BUYER_PATH_BATCH_CLOSED_RUN_REGISTRY_STAGE_V1;
    closeout_complete: true;
    closed_at: string;
    post_apply_parity_status: typeof FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_POST_APPLY_PARITY_STATUS_V1;
    production_go_first_hop_validation_status: typeof FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_PRODUCTION_GO_STATUS_V1;
    production_go_first_hop_validation_reason: typeof FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_PRODUCTION_GO_REASON_V1;
    closeout_policy_artifact_rel_path: typeof FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_LEARNING_PACKET_REL_V1;
    source_planning_contract: typeof FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1;
    closeout_source_command: typeof FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_SOURCE_COMMAND_V1;
    proposed_batch_id: string;
    proposed_row_count: number;
    proposed_slugs: string[];
    owner_approval_artifact_rel_path: string;
    source_proposal_contract: typeof FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1;
    created_at: string;
  };

export type FridgeCloseoutLearningPacketV1 = {
  contract: typeof FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_LEARNING_PACKET_CONTRACT_V1;
  run_id: string;
  read_only?: boolean;
};

export type FridgeCloseoutWriterCliArgsV1 = {
  ownerConfirmCloseout: boolean;
  runId: string | null;
  registryOut: string | null;
  allowProductionGoClickLogging: boolean;
};

export type FridgeRunRegistryLoadResultV1 = {
  exists: boolean;
  planning: {
    valid: boolean;
    parse_errors: string[];
    doc: FridgeBuyerPathBatchPlanningRunRegistryDocumentV1 | null;
  } | null;
  closed: {
    valid: boolean;
    parse_errors: string[];
    doc: FridgeBuyerPathBatchClosedRunRegistryDocumentV1 | null;
  } | null;
};

export type FridgeBuyerPathBatchRunRegistryCloseoutAssessmentV1 = {
  contract: "fridge_buyer_path_batch_run_registry_closeout_assessment_v1";
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  would_write: boolean;
  closeout_ready: boolean;
  blockers: string[];
  closed_doc: FridgeBuyerPathBatchClosedRunRegistryDocumentV1 | null;
  executor_status: UniversalBatchLifecycleGuardedCsvApplyExecutorStatusV1 | "UNKNOWN";
  registry_rel_path: typeof FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1;
  source_command: typeof FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_SOURCE_COMMAND_V1;
};

function defaultFileExists(absPath: string): boolean {
  return existsSync(absPath);
}

function defaultReadText(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

export function parseFridgeCloseoutWriterCliArgsV1(argv: string[]): FridgeCloseoutWriterCliArgsV1 {
  const runIdIdx = argv.indexOf("--run-id");
  const registryOutIdx = argv.indexOf("--registry-out");
  return {
    ownerConfirmCloseout: argv.includes(FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_OWNER_CONFIRM_FLAG_V1),
    runId: runIdIdx >= 0 ? (argv[runIdIdx + 1] ?? null) : null,
    registryOut: registryOutIdx >= 0 ? (argv[registryOutIdx + 1] ?? null) : null,
    allowProductionGoClickLogging: argv.includes(
      FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_FORBIDDEN_PRODUCTION_GO_FLAG_V1,
    ),
  };
}

export function validateFridgeBuyerPathBatchClosedRunRegistryDocumentV1(
  input: unknown,
): { ok: true; doc: FridgeBuyerPathBatchClosedRunRegistryDocumentV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["document must be a non-null object"] };
  }
  const o = input as Record<string, unknown>;
  if (o.contract !== FRIDGE_BUYER_PATH_BATCH_CLOSED_RUN_REGISTRY_CONTRACT_V1) {
    errors.push(`contract must be "${FRIDGE_BUYER_PATH_BATCH_CLOSED_RUN_REGISTRY_CONTRACT_V1}"`);
  }
  if (o.read_only !== true) errors.push("read_only must be true");
  if (o.data_mutation !== false) errors.push("data_mutation must be false");
  if (o.closeout_complete !== true) {
    errors.push("closeout_complete must be true for closed run-registry");
  }
  if (o.stage !== FRIDGE_BUYER_PATH_BATCH_CLOSED_RUN_REGISTRY_STAGE_V1) {
    errors.push(`stage must be "${FRIDGE_BUYER_PATH_BATCH_CLOSED_RUN_REGISTRY_STAGE_V1}"`);
  }
  if (o.run_id !== FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_RUN_ID_V1) {
    errors.push(`run_id must be "${FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_RUN_ID_V1}"`);
  }
  if (o.wedge !== "refrigerator_water") errors.push('wedge must be "refrigerator_water"');
  if (typeof o.closed_at !== "string" || Number.isNaN(Date.parse(o.closed_at))) {
    errors.push("closed_at must be a parseable ISO 8601 string");
  }
  if (o.post_apply_parity_status !== FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_POST_APPLY_PARITY_STATUS_V1) {
    errors.push(
      `post_apply_parity_status must be "${FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_POST_APPLY_PARITY_STATUS_V1}"`,
    );
  }
  if (o.production_go_first_hop_validation_status !== FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_PRODUCTION_GO_STATUS_V1) {
    errors.push(
      `production_go_first_hop_validation_status must be "${FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_PRODUCTION_GO_STATUS_V1}"`,
    );
  }
  if (o.production_go_first_hop_validation_reason !== FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_PRODUCTION_GO_REASON_V1) {
    errors.push("production_go_first_hop_validation_reason must match the canonical closeout reason string");
  }
  if (o.closeout_policy_artifact_rel_path !== FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_LEARNING_PACKET_REL_V1) {
    errors.push(
      `closeout_policy_artifact_rel_path must be "${FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_LEARNING_PACKET_REL_V1}"`,
    );
  }
  if (o.source_planning_contract !== FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1) {
    errors.push(
      `source_planning_contract must be "${FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1}"`,
    );
  }
  if (o.closeout_source_command !== FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_SOURCE_COMMAND_V1) {
    errors.push(`closeout_source_command must be "${FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_SOURCE_COMMAND_V1}"`);
  }
  if (typeof o.proposed_batch_id !== "string" || !o.proposed_batch_id.trim()) {
    errors.push("proposed_batch_id must be a non-empty string");
  }
  if (typeof o.proposed_row_count !== "number" || !Number.isFinite(o.proposed_row_count) || o.proposed_row_count < 1) {
    errors.push("proposed_row_count must be a positive number");
  }
  if (!Array.isArray(o.proposed_slugs) || o.proposed_slugs.length === 0) {
    errors.push("proposed_slugs must be a non-empty array");
  }
  if (typeof o.owner_approval_artifact_rel_path !== "string" || !o.owner_approval_artifact_rel_path.trim()) {
    errors.push("owner_approval_artifact_rel_path must be a non-empty string");
  }
  if (o.source_proposal_contract !== FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1) {
    errors.push(`source_proposal_contract must be "${FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1}"`);
  }
  if (typeof o.created_at !== "string" || Number.isNaN(Date.parse(o.created_at))) {
    errors.push("created_at must be a parseable ISO 8601 string");
  }
  for (const key of MUTATION_FLAG_KEYS) {
    if (o[key] !== false) {
      errors.push(`${key} must be false`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  return { ok: true, doc: o as unknown as FridgeBuyerPathBatchClosedRunRegistryDocumentV1 };
}

export function loadFridgeRunRegistryAtPathV1(args: {
  rootDir: string;
  relPath: string;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
}): FridgeRunRegistryLoadResultV1 {
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const abs = path.join(args.rootDir, args.relPath);
  if (!fileExists(abs)) {
    return { exists: false, planning: null, closed: null };
  }
  try {
    const raw = JSON.parse(readText(abs)) as unknown;
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      return {
        exists: true,
        planning: { valid: false, parse_errors: ["document must be a non-null object"], doc: null },
        closed: { valid: false, parse_errors: ["document must be a non-null object"], doc: null },
      };
    }
    const contract = (raw as Record<string, unknown>).contract;
    if (contract === FRIDGE_BUYER_PATH_BATCH_CLOSED_RUN_REGISTRY_CONTRACT_V1) {
      const validated = validateFridgeBuyerPathBatchClosedRunRegistryDocumentV1(raw);
      return {
        exists: true,
        planning: null,
        closed: validated.ok
          ? { valid: true, parse_errors: [], doc: validated.doc }
          : { valid: false, parse_errors: validated.errors, doc: null },
      };
    }
    if (contract === FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1) {
      const validated = validateFridgeBuyerPathBatchPlanningRunRegistryDocumentV1(raw);
      return {
        exists: true,
        planning: validated.ok
          ? { valid: true, parse_errors: [], doc: validated.doc }
          : { valid: false, parse_errors: validated.errors, doc: null },
        closed: null,
      };
    }
    return {
      exists: true,
      planning: {
        valid: false,
        parse_errors: [`unsupported contract: ${String(contract)}`],
        doc: null,
      },
      closed: {
        valid: false,
        parse_errors: [`unsupported contract: ${String(contract)}`],
        doc: null,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      exists: true,
      planning: { valid: false, parse_errors: [msg], doc: null },
      closed: { valid: false, parse_errors: [msg], doc: null },
    };
  }
}

export function loadFridgeCloseoutLearningPacketV1(args: {
  rootDir: string;
  relPath?: string;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
}):
  | { ok: true; packet: FridgeCloseoutLearningPacketV1 }
  | { ok: false; errors: string[] } {
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const rel = args.relPath ?? FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_LEARNING_PACKET_REL_V1;
  const abs = path.join(args.rootDir, rel);
  if (!fileExists(abs)) {
    return { ok: false, errors: [`closeout_learning_packet_missing: ${rel}`] };
  }
  try {
    const raw = JSON.parse(readText(abs)) as unknown;
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, errors: ["closeout_learning_packet must be a non-null object"] };
    }
    const o = raw as Record<string, unknown>;
    const errors: string[] = [];
    if (o.contract !== FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_LEARNING_PACKET_CONTRACT_V1) {
      errors.push(
        `closeout_learning_packet contract must be "${FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_LEARNING_PACKET_CONTRACT_V1}"`,
      );
    }
    if (typeof o.run_id !== "string" || !o.run_id.trim()) {
      errors.push("closeout_learning_packet run_id must be a non-empty string");
    }
    if (errors.length > 0) return { ok: false, errors };
    return {
      ok: true,
      packet: {
        contract: FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_LEARNING_PACKET_CONTRACT_V1,
        run_id: (o.run_id as string).trim(),
        read_only: o.read_only === true ? true : undefined,
      },
    };
  } catch (e) {
    return {
      ok: false,
      errors: [`closeout_learning_packet_parse_error: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
}

export function buildFridgeBuyerPathBatchClosedRunRegistryDocumentV1(args: {
  planning: FridgeBuyerPathBatchPlanningRunRegistryDocumentV1;
  now?: () => Date;
}): FridgeBuyerPathBatchClosedRunRegistryDocumentV1 {
  const now = args.now ?? (() => new Date());
  return {
    contract: FRIDGE_BUYER_PATH_BATCH_CLOSED_RUN_REGISTRY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    run_id: FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_RUN_ID_V1,
    wedge: "refrigerator_water",
    stage: FRIDGE_BUYER_PATH_BATCH_CLOSED_RUN_REGISTRY_STAGE_V1,
    closeout_complete: true,
    closed_at: now().toISOString(),
    post_apply_parity_status: FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_POST_APPLY_PARITY_STATUS_V1,
    production_go_first_hop_validation_status: FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_PRODUCTION_GO_STATUS_V1,
    production_go_first_hop_validation_reason: FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_PRODUCTION_GO_REASON_V1,
    closeout_policy_artifact_rel_path: FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_LEARNING_PACKET_REL_V1,
    source_planning_contract: FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1,
    closeout_source_command: FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_SOURCE_COMMAND_V1,
    proposed_batch_id: args.planning.proposed_batch_id,
    proposed_row_count: args.planning.proposed_row_count,
    proposed_slugs: [...args.planning.proposed_slugs],
    owner_approval_artifact_rel_path: args.planning.owner_approval_artifact_rel_path,
    source_proposal_contract: args.planning.source_proposal_contract,
    created_at: args.planning.created_at,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
  };
}

export function assessFridgeBuyerPathBatchRunRegistryCloseoutV1(args: {
  rootDir: string;
  cli: FridgeCloseoutWriterCliArgsV1;
  now?: () => Date;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
  assessExecutor?: (input: { rootDir: string }) => {
    executor_status: UniversalBatchLifecycleGuardedCsvApplyExecutorStatusV1;
  };
}): FridgeBuyerPathBatchRunRegistryCloseoutAssessmentV1 {
  const blockers: string[] = [];
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const assessExecutor =
    args.assessExecutor ??
    ((input: { rootDir: string }) => {
      const { assessUniversalBatchLifecycleGuardedCsvApplyExecutorReadinessV1 } =
        requireFromCloseout("./universal-batch-lifecycle-guarded-csv-apply-executor-v1") as {
          assessUniversalBatchLifecycleGuardedCsvApplyExecutorReadinessV1: (opts: {
            rootDir: string;
            fileExists?: (absPath: string) => boolean;
            readText?: (absPath: string) => string;
          }) => { executor_status: UniversalBatchLifecycleGuardedCsvApplyExecutorStatusV1 };
        };
      const readiness = assessUniversalBatchLifecycleGuardedCsvApplyExecutorReadinessV1({
        rootDir: input.rootDir,
        fileExists,
        readText,
      });
      return { executor_status: readiness.executor_status };
    });

  if (args.cli.allowProductionGoClickLogging) {
    blockers.push(
      `forbidden_cli_flag: ${FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_FORBIDDEN_PRODUCTION_GO_FLAG_V1} must not be passed`,
    );
  }

  const wantsWrite = args.cli.registryOut != null;
  if (wantsWrite && !args.cli.ownerConfirmCloseout) {
    blockers.push(`missing_required_flag: ${FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_OWNER_CONFIRM_FLAG_V1}`);
  }

  if (args.cli.runId !== FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_RUN_ID_V1) {
    blockers.push(
      `run_id_mismatch: expected ${FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_RUN_ID_V1} got ${JSON.stringify(args.cli.runId)}`,
    );
  }

  if (wantsWrite) {
    const expectedAbs = path.join(args.rootDir, FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1);
    const outAbs = path.resolve(args.cli.registryOut!);
    if (outAbs !== expectedAbs) {
      blockers.push(
        `registry_out_mismatch: expected ${FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1}`,
      );
    }
  }

  const executor = assessExecutor({ rootDir: args.rootDir });
  if (executor.executor_status !== FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_POST_APPLY_PARITY_STATUS_V1) {
    blockers.push(`executor_status_not_applied_parity_proven: status=${executor.executor_status}`);
  }

  const packetLoad = loadFridgeCloseoutLearningPacketV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });
  if (!packetLoad.ok) {
    blockers.push(...packetLoad.errors);
  } else if (packetLoad.packet.run_id !== FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_RUN_ID_V1) {
    blockers.push(
      `closeout_learning_packet_run_id_mismatch: expected ${FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_RUN_ID_V1} got ${packetLoad.packet.run_id}`,
    );
  }

  const registryLoad = loadFridgeRunRegistryAtPathV1({
    rootDir: args.rootDir,
    relPath: FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1,
    fileExists,
    readText,
  });

  if (!registryLoad.exists) {
    blockers.push("planning_registry_missing");
  } else if (registryLoad.closed?.valid) {
    blockers.push("registry_already_closed");
  } else if (!registryLoad.planning?.valid || !registryLoad.planning.doc) {
    blockers.push(
      ...(registryLoad.planning?.parse_errors ?? registryLoad.closed?.parse_errors ?? [
        "planning_registry_invalid",
      ]),
    );
  } else if (registryLoad.planning.doc.run_id !== FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_RUN_ID_V1) {
    blockers.push("planning_registry_run_id_mismatch");
  }

  let closedDoc: FridgeBuyerPathBatchClosedRunRegistryDocumentV1 | null = null;
  if (blockers.length === 0 && registryLoad.planning?.doc) {
    closedDoc = buildFridgeBuyerPathBatchClosedRunRegistryDocumentV1({
      planning: registryLoad.planning.doc,
      now: args.now,
    });
    const validated = validateFridgeBuyerPathBatchClosedRunRegistryDocumentV1(closedDoc);
    if (!validated.ok) {
      blockers.push(...validated.errors.map((e) => `closed_doc_validation: ${e}`));
      closedDoc = null;
    } else {
      closedDoc = validated.doc;
    }
  }

  const closeoutReady = blockers.length === 0 && closedDoc != null;

  return {
    contract: "fridge_buyer_path_batch_run_registry_closeout_assessment_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    would_write: wantsWrite && closeoutReady && args.cli.ownerConfirmCloseout,
    closeout_ready: closeoutReady,
    blockers,
    closed_doc: closedDoc,
    executor_status: executor.executor_status,
    registry_rel_path: FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1,
    source_command: FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_SOURCE_COMMAND_V1,
  };
}
