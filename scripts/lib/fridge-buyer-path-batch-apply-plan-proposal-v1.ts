/**
 * Read-only fridge buyer-path batch apply-plan proposal v1 — planned_changes only; no CSV/Supabase apply.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  buildFridgeBuyerPathBatchApprovalReportV1,
  type FridgeBuyerPathBatchApprovalReportV1,
} from "./fridge-buyer-path-batch-approval-v1";
import {
  buildFridgeBuyerPathBatchProposalV1,
  FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1,
  type BuildFridgeBuyerPathBatchProposalDepsV1,
  type FridgeBuyerPathBatchProposalReportV1,
} from "./fridge-buyer-path-batch-proposal-v1";
import {
  buildFridgeRunRegistryArtifactRelPathV1,
} from "./fridge-buyer-path-batch-run-registry-v1";
import {
  loadFridgePlanningRunRegistryAtPathV1,
  resolveFridgeRunRegistryStatusV1,
} from "./batch-run-registry-intake-v1";

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1 =
  "fridge_buyer_path_batch_apply_plan_proposal_v1" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_REPORT_NAME_V1 =
  "fridge_buyer_path_batch_apply_plan_proposal_v1" as const;

export const FRIDGE_BATCH_APPLY_PLANS_DIR_REL_V1 =
  "data/fridge/batch-production/apply-plans" as const;

export const FRIDGE_RETAILER_LINKS_CSV_REL_V1 = "data/retailer_links.csv" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1 =
  "propose_replace_search_placeholder_with_verified_direct_buyable" as const;

export type FridgeBuyerPathBatchApplyPlanStatusV1 = "READY_FOR_OWNER_REVIEW" | "BLOCKED";

export type FridgeBuyerPathBatchApplyPlanPlannedChangeV1 = {
  slug: string;
  oem_token: string;
  current_committed_buyer_path_status: string;
  proposed_destination_url: string;
  proposed_affiliate_url: string;
  proposed_retailer_key: string | null;
  proposed_retailer_slug: string | null;
  evidence_artifact_path: string | null;
  action: typeof FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1;
  mutation_authorized: false;
};

export type FridgeBuyerPathBatchApplyPlanBlockedRowV1 = {
  slug: string;
  blockers: string[];
};

export type FridgeBuyerPathBatchApplyPlanProposalMutationFlagsV1 = {
  apply_mutation_authorized: false;
  csv_apply_authorized: false;
  retailer_links_mutation_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
};

export type FridgeBuyerPathBatchApplyPlanProposalReportV1 =
  FridgeBuyerPathBatchApplyPlanProposalMutationFlagsV1 & {
    contract: typeof FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1;
    report_name: typeof FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_REPORT_NAME_V1;
    read_only: true;
    data_mutation: false;
    generated_at: string;
    wedge: "refrigerator_water";
    source_run_registry_rel_path: string;
    source_proposal_contract: typeof FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1;
    proposed_batch_id: string;
    run_id: string;
    plan_status: FridgeBuyerPathBatchApplyPlanStatusV1;
    plan_status_reasons: string[];
    planned_change_count: number;
    planned_changes: FridgeBuyerPathBatchApplyPlanPlannedChangeV1[];
    blocked_rows: FridgeBuyerPathBatchApplyPlanBlockedRowV1[];
    plan_artifact_rel_path: string;
    recommended_next_action: string;
    proven_facts: string[];
    unknown_facts: string[];
  };

export type BuildFridgeBuyerPathBatchApplyPlanProposalDepsV1 = {
  rootDir: string;
  now?: () => Date;
  buildProposal?: (deps: BuildFridgeBuyerPathBatchProposalDepsV1) => FridgeBuyerPathBatchProposalReportV1;
  buildApproval?: (deps: { rootDir: string; now?: () => Date }) => FridgeBuyerPathBatchApprovalReportV1;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
};

type RetailerLinksCsvRowV1 = Record<string, string>;

function defaultFileExists(absPath: string): boolean {
  return existsSync(absPath);
}

function defaultReadText(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

function planningMutationFlagsFalse(): FridgeBuyerPathBatchApplyPlanProposalMutationFlagsV1 {
  return {
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

export function buildFridgeApplyPlanArtifactRelPathV1(proposedBatchId: string): string {
  const trimmed = proposedBatchId.trim();
  const base = trimmed.startsWith("fridge-buyer-path-batch-proposal-v1-")
    ? trimmed.replace(/^fridge-buyer-path-batch-proposal-v1-/, "fridge-buyer-path-batch-apply-plan-v1-")
    : `fridge-buyer-path-batch-apply-plan-v1-${trimmed}`;
  return `${FRIDGE_BATCH_APPLY_PLANS_DIR_REL_V1}/${base}.json`;
}

export function assertFridgeApplyPlanOutPathAllowedV1(outPath: string, rootDir: string): void {
  const abs = path.resolve(rootDir, outPath);
  const allowedDir = path.resolve(rootDir, FRIDGE_BATCH_APPLY_PLANS_DIR_REL_V1);
  if (!abs.startsWith(`${allowedDir}${path.sep}`) && abs !== allowedDir) {
    throw new Error(
      `--plan-out must be under ${FRIDGE_BATCH_APPLY_PLANS_DIR_REL_V1}/ (got ${outPath})`,
    );
  }
}

function loadRetailerLinksBySlugV1(
  rootDir: string,
  fileExists: (absPath: string) => boolean,
  readText: (absPath: string) => string,
): Map<string, RetailerLinksCsvRowV1[]> {
  const abs = path.join(rootDir, FRIDGE_RETAILER_LINKS_CSV_REL_V1);
  const map = new Map<string, RetailerLinksCsvRowV1[]>();
  if (!fileExists(abs)) return map;
  const rows = parse(readText(abs), { columns: true, skip_empty_lines: true }) as RetailerLinksCsvRowV1[];
  for (const row of rows) {
    const slug = row.filter_slug?.trim().toLowerCase();
    if (!slug) continue;
    const list = map.get(slug) ?? [];
    list.push(row);
    map.set(slug, list);
  }
  return map;
}

function evidenceHasCommittedLiveRowV1(jsonText: string): boolean {
  try {
    const doc = JSON.parse(jsonText) as Record<string, unknown>;
    const row = doc.committed_live_row;
    return row != null && typeof row === "object" && !Array.isArray(row);
  } catch {
    return false;
  }
}

function sortedSlugSet(slugs: string[]): string[] {
  return Array.from(new Set(slugs.map((s) => s.trim().toLowerCase()))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function slugSetsEqual(a: string[], b: string[]): boolean {
  const sa = sortedSlugSet(a);
  const sb = sortedSlugSet(b);
  return sa.length === sb.length && sa.every((slug, i) => slug === sb[i]);
}

function buildRecommendedNextActionV1(args: {
  planStatus: FridgeBuyerPathBatchApplyPlanStatusV1;
  planArtifactRelPath: string;
  blockedCount: number;
}): string {
  if (args.planStatus === "READY_FOR_OWNER_REVIEW") {
    return (
      `Fridge buyer-path apply-plan proposal is READY_FOR_OWNER_REVIEW at \`${args.planArtifactRelPath}\` — ` +
      "owner review only; no CSV, retailer_links, Supabase, public UI, buy-link, evidence, deploy, or Netlify mutation is authorized. " +
      "Optional write via `npm run buckparts:fridge-buyer-path-batch-apply-plan-proposal -- --plan-out <canonical-path>`."
    );
  }
  return (
    `Fridge buyer-path apply-plan proposal is BLOCKED (${String(args.blockedCount)} row(s) or gate failure) — ` +
    "repair blockers before any plan artifact write; mutation remains unauthorized."
  );
}

export function buildFridgeBuyerPathBatchApplyPlanProposalV1(
  deps: BuildFridgeBuyerPathBatchApplyPlanProposalDepsV1,
): FridgeBuyerPathBatchApplyPlanProposalReportV1 {
  const now = deps.now ?? (() => new Date());
  const fileExists = deps.fileExists ?? defaultFileExists;
  const readText = deps.readText ?? defaultReadText;
  const buildProposal = deps.buildProposal ?? buildFridgeBuyerPathBatchProposalV1;
  const buildApproval = deps.buildApproval ?? buildFridgeBuyerPathBatchApprovalReportV1;

  const proposal = buildProposal({ rootDir: deps.rootDir, now: deps.now });
  const approval = buildApproval({ rootDir: deps.rootDir, now: deps.now });
  const planArtifactRelPath = buildFridgeApplyPlanArtifactRelPathV1(proposal.proposed_batch_id);
  const runRegistryRelPath = buildFridgeRunRegistryArtifactRelPathV1(proposal.proposed_batch_id);
  const registryLoad = loadFridgePlanningRunRegistryAtPathV1({
    rootDir: deps.rootDir,
    relPath: runRegistryRelPath,
    fileExists,
    readText,
  });
  const registryResolved = resolveFridgeRunRegistryStatusV1({
    proposal,
    approval,
    expectedRegistryLoad: registryLoad,
  });

  const plan_status_reasons: string[] = [];
  const blocked_rows: FridgeBuyerPathBatchApplyPlanBlockedRowV1[] = [];
  const proven_facts: string[] = [
    `PROVEN: contract=${FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1}; read_only=true; data_mutation=false; all mutation flags false.`,
    `PROVEN: committed CSV source=${FRIDGE_RETAILER_LINKS_CSV_REL_V1} (read-only).`,
  ];
  const unknown_facts: string[] = [
    "UNKNOWN: Whether live Supabase/public.retailer_links matches committed CSV — apply-plan reads CSV only.",
  ];

  if (approval.approval_status !== "owner_approved_for_next_planning_only") {
    plan_status_reasons.push(
      `approval_status must be owner_approved_for_next_planning_only (got ${approval.approval_status})`,
    );
  }
  if (registryResolved.status !== "PROVEN_PLANNING_RUN_REGISTRY") {
    plan_status_reasons.push(
      `run-registry status must be PROVEN_PLANNING_RUN_REGISTRY (got ${registryResolved.status})`,
    );
  }
  if (!registryLoad.valid || !registryLoad.doc) {
    plan_status_reasons.push(
      registryLoad.exists
        ? `run-registry failed validation: ${registryLoad.parse_errors.join("; ")}`
        : `run-registry missing at ${runRegistryRelPath}`,
    );
  }
  if (registryLoad.doc && registryLoad.doc.proposed_batch_id !== proposal.proposed_batch_id) {
    plan_status_reasons.push(
      `run-registry proposed_batch_id mismatch (registry=${registryLoad.doc.proposed_batch_id}; proposal=${proposal.proposed_batch_id})`,
    );
  }
  if (
    registryLoad.doc &&
    !slugSetsEqual(registryLoad.doc.proposed_slugs, proposal.proposed_rows.map((row) => row.slug))
  ) {
    plan_status_reasons.push("run-registry proposed_slugs must match proposal proposed_rows slug set");
  }

  const csvBySlug = loadRetailerLinksBySlugV1(deps.rootDir, fileExists, readText);
  const registrySlugs = new Set(
    (registryLoad.doc?.proposed_slugs ?? proposal.proposed_rows.map((row) => row.slug)).map((s) =>
      s.trim().toLowerCase(),
    ),
  );

  const planned_changes: FridgeBuyerPathBatchApplyPlanPlannedChangeV1[] = [];
  const gatesPassed = plan_status_reasons.length === 0;

  if (gatesPassed) {
    for (const row of proposal.proposed_rows) {
      const slugKey = row.slug.trim().toLowerCase();
      const rowBlockers: string[] = [];

      if (!registrySlugs.has(slugKey)) {
        rowBlockers.push("slug is not a member of run-registry proposed_slugs");
      }
      if (!row.destination_url?.trim()) {
        rowBlockers.push("missing destination_url on proposal row");
      }
      if (!row.affiliate_url?.trim()) {
        rowBlockers.push("missing affiliate_url on proposal row");
      }
      if (!row.evidence_artifact_path?.trim()) {
        rowBlockers.push("missing evidence_artifact_path on proposal row");
      } else {
        const evidenceAbs = path.join(deps.rootDir, row.evidence_artifact_path);
        if (!fileExists(evidenceAbs)) {
          rowBlockers.push(`evidence artifact missing at ${row.evidence_artifact_path}`);
        } else if (!evidenceHasCommittedLiveRowV1(readText(evidenceAbs))) {
          rowBlockers.push(`evidence artifact lacks committed_live_row at ${row.evidence_artifact_path}`);
        }
      }

      const csvRows = csvBySlug.get(slugKey) ?? [];
      if (csvRows.length === 0) {
        rowBlockers.push(`no committed retailer_links.csv rows for slug ${row.slug}`);
      }

      if (rowBlockers.length > 0) {
        blocked_rows.push({ slug: row.slug, blockers: rowBlockers });
        continue;
      }

      planned_changes.push({
        slug: row.slug,
        oem_token: row.oem_token,
        current_committed_buyer_path_status: row.committed_buyer_path_status,
        proposed_destination_url: row.destination_url,
        proposed_affiliate_url: row.affiliate_url,
        proposed_retailer_key: row.retailer_key,
        proposed_retailer_slug: row.retailer_key,
        evidence_artifact_path: row.evidence_artifact_path,
        action: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1,
        mutation_authorized: false,
      });
    }

    const extraProposalSlugs = proposal.proposed_rows
      .map((row) => row.slug.trim().toLowerCase())
      .filter((slug) => !registrySlugs.has(slug));
    if (extraProposalSlugs.length > 0) {
      plan_status_reasons.push(
        `proposal contains slugs outside run-registry scope: ${extraProposalSlugs.join(", ")}`,
      );
    }
  }

  const plan_status: FridgeBuyerPathBatchApplyPlanStatusV1 =
    plan_status_reasons.length > 0 || blocked_rows.length > 0 ? "BLOCKED" : "READY_FOR_OWNER_REVIEW";

  if (plan_status === "READY_FOR_OWNER_REVIEW") {
    proven_facts.push(
      `PROVEN: planned_change_count=${String(planned_changes.length)} limited to run-registry proposed slugs.`,
      `PROVEN: run-registry validated at ${runRegistryRelPath}; approval_status=${approval.approval_status}.`,
    );
  } else {
    proven_facts.push(
      `PROVEN: plan blocked — gate_reasons=${String(plan_status_reasons.length)}; blocked_rows=${String(blocked_rows.length)}.`,
    );
  }

  const runId = registryLoad.doc?.run_id ?? proposal.proposed_run_id;

  return {
    contract: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1,
    report_name: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    wedge: "refrigerator_water",
    source_run_registry_rel_path: runRegistryRelPath,
    source_proposal_contract: FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1,
    proposed_batch_id: proposal.proposed_batch_id,
    run_id: runId,
    plan_status,
    plan_status_reasons,
    planned_change_count: planned_changes.length,
    planned_changes,
    blocked_rows,
    plan_artifact_rel_path: planArtifactRelPath,
    recommended_next_action: buildRecommendedNextActionV1({
      planStatus: plan_status,
      planArtifactRelPath,
      blockedCount: blocked_rows.length,
    }),
    proven_facts,
    unknown_facts,
    ...planningMutationFlagsFalse(),
  };
}
