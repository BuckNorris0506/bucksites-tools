/**
 * Universal read-only batch run-registry intake v1 — wedge-neutral surface for proven runs + planning gaps.
 * PROVEN: no CSV, retailer_links, Supabase, public UI, evidence, deploy, or run-registry writes.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { BATCH_PRODUCTION_CHECKLIST_DEFAULT_REGISTRY_PATH_V1 } from "./buckparts-batch-production-operating-checklist-v1";
import {
  buildFridgeBuyerPathBatchApprovalReportV1,
  type FridgeBuyerPathBatchApprovalReportV1,
} from "./fridge-buyer-path-batch-approval-v1";
import {
  buildFridgeBuyerPathBatchProposalV1,
  type FridgeBuyerPathBatchProposalReportV1,
} from "./fridge-buyer-path-batch-proposal-v1";
import { FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1 } from "./fridge-buyer-path-owner-review-bridge-v1";

export const BATCH_RUN_REGISTRY_INTAKE_CONTRACT_V1 = "batch_run_registry_intake_v1" as const;

export const BATCH_RUN_REGISTRY_INTAKE_REPORT_NAME_V1 = "batch_run_registry_intake_v1" as const;

export const AP_RUN_REGISTRY_DEFAULT_REL_V1 = BATCH_PRODUCTION_CHECKLIST_DEFAULT_REGISTRY_PATH_V1;

export const AP_PROVEN_RUN_CONTRACT_V1 = "batch_production_proven_run_v1" as const;

export type ApRunRegistryStatusV1 =
  | "PROVEN_CLOSED"
  | "PROVEN_PRESENT_NOT_CLOSED"
  | "MISSING"
  | "PARSE_ERROR";

export type FridgeRunRegistryStatusV1 =
  | "APPROVED_FOR_PLANNING_BUT_RUN_REGISTRY_MISSING"
  | "PROVEN_RUN_REGISTRY_PRESENT"
  | "AWAITING_OWNER_APPROVAL"
  | "NO_OPEN_BATCH_PROPOSAL";

export type BatchRunRegistryIntakeWedgeRowV1 = {
  wedge: "air_purifier" | "refrigerator_water";
  run_registry_rel_path: string | null;
  run_registry_status: ApRunRegistryStatusV1 | FridgeRunRegistryStatusV1;
  closeout_complete: boolean | null;
  run_id: string | null;
};

export type BatchRunRegistryIntakeReportV1 = {
  contract: typeof BATCH_RUN_REGISTRY_INTAKE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  wedges: BatchRunRegistryIntakeWedgeRowV1[];
  ap_run_registry_status: ApRunRegistryStatusV1;
  ap_run_registry_rel_path: string;
  fridge_run_registry_status: FridgeRunRegistryStatusV1;
  fridge_approval_status: FridgeBuyerPathBatchApprovalReportV1["approval_status"];
  fridge_proposed_batch_id: string | null;
  fridge_next_required_artifact: string | null;
  mutation_authorized: false;
  recommended_next_action: string;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type BuildBatchRunRegistryIntakeDepsV1 = {
  rootDir: string;
  now?: () => Date;
  apRunRegistryRelPath?: string;
  buildFridgeProposal?: (deps: { rootDir: string; now?: () => Date }) => FridgeBuyerPathBatchProposalReportV1;
  buildFridgeApproval?: (deps: { rootDir: string; now?: () => Date }) => FridgeBuyerPathBatchApprovalReportV1;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
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

/** Deterministic fridge run-registry filename from proposal batch id (read-only path helper). */
export function buildFridgeRunRegistryArtifactRelPathV1(proposedBatchId: string): string {
  const trimmed = proposedBatchId.trim();
  const base = trimmed.startsWith("fridge-buyer-path-batch-proposal-")
    ? trimmed.replace(/^fridge-buyer-path-batch-proposal-/, "fridge-buyer-path-batch-run-")
    : `fridge-buyer-path-batch-run-${trimmed}`;
  return `${FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1}/${base}.json`;
}

type ApRunRegistryParse =
  | { ok: true; run_id: string; closeout_complete: boolean; contract: string }
  | { ok: false; reason: string };

export function parseApProvenRunRegistryV1(raw: unknown): ApRunRegistryParse {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "document must be a non-null object" };
  }
  const o = raw as Record<string, unknown>;
  if (o.contract !== AP_PROVEN_RUN_CONTRACT_V1) {
    return { ok: false, reason: `contract must be "${AP_PROVEN_RUN_CONTRACT_V1}"` };
  }
  if (typeof o.run_id !== "string" || !o.run_id.trim()) {
    return { ok: false, reason: "run_id must be a non-empty string" };
  }
  if (typeof o.closeout_complete !== "boolean") {
    return { ok: false, reason: "closeout_complete must be a boolean" };
  }
  return {
    ok: true,
    run_id: o.run_id.trim(),
    closeout_complete: o.closeout_complete,
    contract: AP_PROVEN_RUN_CONTRACT_V1,
  };
}

export function loadApRunRegistryStatusV1(args: {
  rootDir: string;
  relPath: string;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
}): {
  status: ApRunRegistryStatusV1;
  run_id: string | null;
  closeout_complete: boolean | null;
  parse_error: string | null;
} {
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const abs = path.join(args.rootDir, args.relPath);
  if (!fileExists(abs)) {
    return { status: "MISSING", run_id: null, closeout_complete: null, parse_error: null };
  }
  try {
    const parsed = parseApProvenRunRegistryV1(JSON.parse(readText(abs)) as unknown);
    if (!parsed.ok) {
      return { status: "PARSE_ERROR", run_id: null, closeout_complete: null, parse_error: parsed.reason };
    }
    return {
      status: parsed.closeout_complete ? "PROVEN_CLOSED" : "PROVEN_PRESENT_NOT_CLOSED",
      run_id: parsed.run_id,
      closeout_complete: parsed.closeout_complete,
      parse_error: null,
    };
  } catch (e) {
    return {
      status: "PARSE_ERROR",
      run_id: null,
      closeout_complete: null,
      parse_error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function resolveFridgeRunRegistryStatusV1(args: {
  proposal: FridgeBuyerPathBatchProposalReportV1;
  approval: FridgeBuyerPathBatchApprovalReportV1;
  runRegistryJsonNames: string[];
}): {
  status: FridgeRunRegistryStatusV1;
  nextRequiredArtifact: string | null;
} {
  const proposedBatchId = args.proposal.proposed_batch_id;
  const nextRequiredArtifact = buildFridgeRunRegistryArtifactRelPathV1(proposedBatchId);

  if (args.proposal.proposed_row_count === 0) {
    return { status: "NO_OPEN_BATCH_PROPOSAL", nextRequiredArtifact: null };
  }

  const expectedName = path.basename(nextRequiredArtifact);
  const hasRunRegistry = args.runRegistryJsonNames.length > 0;
  const hasExpectedRegistry = args.runRegistryJsonNames.includes(expectedName);

  if (hasRunRegistry || hasExpectedRegistry) {
    return { status: "PROVEN_RUN_REGISTRY_PRESENT", nextRequiredArtifact };
  }

  if (args.approval.approval_status === "owner_approved_for_next_planning_only") {
    return {
      status: "APPROVED_FOR_PLANNING_BUT_RUN_REGISTRY_MISSING",
      nextRequiredArtifact,
    };
  }

  return { status: "AWAITING_OWNER_APPROVAL", nextRequiredArtifact };
}

export function buildBatchRunRegistryIntakeRecommendedNextActionV1(args: {
  apStatus: ApRunRegistryStatusV1;
  fridgeStatus: FridgeRunRegistryStatusV1;
  fridgeNextRequiredArtifact: string | null;
  fridgeProposedBatchId: string | null;
}): string {
  if (args.fridgeStatus === "APPROVED_FOR_PLANNING_BUT_RUN_REGISTRY_MISSING" && args.fridgeNextRequiredArtifact) {
    return (
      `Fridge buyer-path batch is owner-approved for planning only — next safe artifact is a read-only run-registry JSON at \`${args.fridgeNextRequiredArtifact}\` ` +
      `(proposal \`${args.fridgeProposedBatchId ?? "UNKNOWN"}\`). ` +
      "Author that file manually or via a future dedicated proposal command; verify with `npm run buckparts:batch-run-registry-intake`. " +
      "This intake does not write run-registry files and does not authorize CSV, retailer_links, Supabase, public UI, buy-link, evidence, git, deploy, or Netlify mutation."
    );
  }
  if (args.fridgeStatus === "AWAITING_OWNER_APPROVAL") {
    return (
      "Complete fridge buyer-path batch owner approval via `npm run buckparts:fridge-buyer-path-batch-approval` " +
      "(checklist + optional `--registry-out data/owner-decisions/fridge-buyer-path-batch-approval-v1.json`) before run-registry intake can advance."
    );
  }
  if (args.apStatus === "PROVEN_CLOSED") {
    return (
      "AP batch-v2 proven run-registry is closed on disk — use demand-to-coverage / batch dispatch read models for next wedge batch candidate (read-only planning first)."
    );
  }
  return "Run `npm run buckparts:batch-run-registry-intake` after wedge batch artifacts change; no mutation from this lane.";
}

export function buildBatchRunRegistryIntakeReportV1(
  deps: BuildBatchRunRegistryIntakeDepsV1,
): BatchRunRegistryIntakeReportV1 {
  const now = deps.now ?? (() => new Date());
  const fileExists = deps.fileExists ?? defaultFileExists;
  const readText = deps.readText ?? defaultReadText;
  const apRel = deps.apRunRegistryRelPath ?? AP_RUN_REGISTRY_DEFAULT_REL_V1;

  const buildProposal = deps.buildFridgeProposal ?? buildFridgeBuyerPathBatchProposalV1;
  const buildApproval = deps.buildFridgeApproval ?? buildFridgeBuyerPathBatchApprovalReportV1;

  const proposal = buildProposal({ rootDir: deps.rootDir, now: deps.now });
  const approval = buildApproval({ rootDir: deps.rootDir, now: deps.now });

  const apLoaded = loadApRunRegistryStatusV1({
    rootDir: deps.rootDir,
    relPath: apRel,
    fileExists,
    readText,
  });

  const fridgeRegistryDirAbs = path.join(deps.rootDir, FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1);
  const listRunRegistryJson = deps.listRunRegistryJson ?? defaultListRunRegistryJson;
  const fridgeRegistryNames = listRunRegistryJson(fridgeRegistryDirAbs);

  const fridgeResolved = resolveFridgeRunRegistryStatusV1({
    proposal,
    approval,
    runRegistryJsonNames: fridgeRegistryNames,
  });

  const proven_facts: string[] = [
    `PROVEN: contract=${BATCH_RUN_REGISTRY_INTAKE_CONTRACT_V1}; read_only=true; data_mutation=false; mutation_authorized=false always.`,
    `PROVEN: AP run-registry path=${apRel}; status=${apLoaded.status}.`,
    `PROVEN: Fridge run-registry dir=${FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1}; json_count=${String(fridgeRegistryNames.length)}.`,
    `PROVEN: Fridge proposal proposed_batch_id=${proposal.proposed_batch_id}; approval_status=${approval.approval_status}.`,
  ];
  if (apLoaded.run_id) {
    proven_facts.push(`PROVEN: AP run_id=${apLoaded.run_id}; closeout_complete=${String(apLoaded.closeout_complete)}.`);
  }
  if (fridgeResolved.nextRequiredArtifact) {
    proven_facts.push(`PROVEN: Fridge next_required_artifact=${fridgeResolved.nextRequiredArtifact}.`);
  }

  const inferred_facts: string[] = [
    "INFERRED: Universal intake replaces wedge-local formal_batch_exists probes for AP+fridge run-registry visibility only — apply/checklist wiring remains wedge-specific until generalized.",
  ];

  const unknown_facts: string[] = [
    "UNKNOWN: Whether a future run-registry author command will reuse batch_production_proven_run_v1 for fridge or introduce a fridge-specific contract variant.",
  ];
  if (apLoaded.status === "PARSE_ERROR") {
    unknown_facts.push(`UNKNOWN: Repair AP run-registry parse error: ${apLoaded.parse_error ?? "unknown"}.`);
  }

  const wedges: BatchRunRegistryIntakeWedgeRowV1[] = [
    {
      wedge: "air_purifier",
      run_registry_rel_path: apLoaded.status === "MISSING" ? null : apRel,
      run_registry_status: apLoaded.status,
      closeout_complete: apLoaded.closeout_complete,
      run_id: apLoaded.run_id,
    },
    {
      wedge: "refrigerator_water",
      run_registry_rel_path:
        fridgeResolved.status === "PROVEN_RUN_REGISTRY_PRESENT"
          ? fridgeResolved.nextRequiredArtifact
          : fridgeRegistryNames.length > 0
            ? `${FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1}/${fridgeRegistryNames[0]!}`
            : null,
      run_registry_status: fridgeResolved.status,
      closeout_complete: null,
      run_id: proposal.proposed_batch_id,
    },
  ];

  return {
    contract: BATCH_RUN_REGISTRY_INTAKE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    wedges,
    ap_run_registry_status: apLoaded.status,
    ap_run_registry_rel_path: apRel,
    fridge_run_registry_status: fridgeResolved.status,
    fridge_approval_status: approval.approval_status,
    fridge_proposed_batch_id: proposal.proposed_row_count > 0 ? proposal.proposed_batch_id : null,
    fridge_next_required_artifact: fridgeResolved.nextRequiredArtifact,
    mutation_authorized: false,
    recommended_next_action: buildBatchRunRegistryIntakeRecommendedNextActionV1({
      apStatus: apLoaded.status,
      fridgeStatus: fridgeResolved.status,
      fridgeNextRequiredArtifact: fridgeResolved.nextRequiredArtifact,
      fridgeProposedBatchId: proposal.proposed_batch_id,
    }),
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
