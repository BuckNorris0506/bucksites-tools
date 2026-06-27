/**
 * Manufacturer Safe Link Rescue Readiness Gate v1 — promotion contract between
 * Orchestrator/Director and Runner. READY_FOR_APPLY only when readiness is proven.
 * Read-only; no CSV/Supabase/SQL mutation; no browser automation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryRowV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { scanFounderDecisionRegistryJsonFilesV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-scan-v1";
import {
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
  type OwnerBrowserProofResultV1,
} from "./fridge-safe-link-owner-browser-proof-result-v1";
import {
  GE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1,
  type GeRefrigeratorRescueCohortRowV1,
} from "./ge-refrigerator-rescue-adapter-v1";
import { buildGeRefrigeratorRescueOwnerApprovalLaneV1 } from "./ge-refrigerator-rescue-owner-approval-packet-v1";
import {
  FRIGIDAIRE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1,
  type FrigidaireRefrigeratorRescueCohortRowV1,
} from "./frigidaire-refrigerator-rescue-adapter-v1";
import {
  FRIGIDAIRE_CONFUSION_FAMILY_REVIEW_SLUGS_V1,
  FRIGIDAIRE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1,
} from "./manufacturer-safe-link-rescue-frigidaire-config-v1";
import type { ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1 } from "./manufacturer-safe-link-rescue-director-command-center-v1";
import { buildManufacturerSafeLinkRescueDirectorCommandCenterLaneV1 } from "./manufacturer-safe-link-rescue-director-command-center-v1";
import {
  computeDirectorValueScoreV1,
  isManufacturerRescueGuardedApplyCandidateV1,
  loadManufacturerRescueOrchestratorInputV1,
} from "./manufacturer-safe-link-rescue-director-v1";
import {
  assessForbiddenTokensWrongFamily,
  READ_ONLY_MUTATION_FLAGS_V1,
  type WrongFamilyAssessmentV1,
} from "./manufacturer-safe-link-rescue-framework-v1";
import {
  assessManufacturerRescueBrowserProofFreshnessV1,
  loadManufacturerRescueOwnerBrowserProofArtifactV1,
  MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1,
  manufacturerRescueOwnerProofCheckedAtV1,
  manufacturerRescueOwnerProofOfficialPassV1,
} from "./manufacturer-safe-link-rescue-owner-browser-proof-evidence-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
  type ManufacturerRescueOrchestratorQueueRowV1,
  type ManufacturerRescueOrchestratorReportV1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";

export const MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1 =
  "manufacturer_safe_link_rescue_readiness_gate_v1" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-readiness-gate-v1.json" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_READINESS_WORK_QUEUE_MD_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-readiness-work-queue-v1.md" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_SOURCE_COMMAND_V1 =
  "npm run buckparts:manufacturer-safe-link-rescue-readiness-gate" as const;

export const MANUFACTURER_RESCUE_READINESS_STATUSES_V1 = [
  "READY_FOR_APPLY",
  "PENDING_BROWSER_REFRESH",
  "PENDING_CONFUSION_FAMILY_REVIEW",
  "PENDING_OWNER_APPROVAL",
  "PENDING_APPLY_PLAN",
  "BLOCKED_WRONG_FAMILY_RISK",
  "BLOCKED_MISSING_PROOF",
  "UNKNOWN_READINESS",
] as const;

export type ManufacturerRescueReadinessStatusV1 =
  (typeof MANUFACTURER_RESCUE_READINESS_STATUSES_V1)[number];

export { MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1 };

export const MANUFACTURER_RESCUE_READINESS_GATE_REGENERATE_COMMAND_V1 =
  MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_SOURCE_COMMAND_V1;

export const MANUFACTURER_RESCUE_READINESS_GATE_REGENERATE_ACTION_V1 =
  "Regenerate committed readiness gate: npm run buckparts:manufacturer-safe-link-rescue-readiness-gate" as const;

export type ManufacturerRescueReadinessGateArtifactStatusV1 = "loaded" | "missing" | "stale";

export type ManufacturerRescueReadinessGatePromotionLoadV1 =
  | {
      ok: true;
      artifact_status: "loaded";
      artifact_path: typeof MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_JSON_REL_V1;
      gate: ManufacturerRescueReadinessGateReportV1;
      stale_reason: null;
    }
  | {
      ok: false;
      artifact_status: "missing" | "stale";
      artifact_path: typeof MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_JSON_REL_V1;
      gate: null;
      stale_reason: string;
      recommended_regenerate_command: typeof MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_SOURCE_COMMAND_V1;
    };

export type ManufacturerRescueReadinessGatePromotionStatusV1 =
  | "LOADED"
  | "UNKNOWN_READINESS_GATE_STALE_OR_MISSING";

export type ManufacturerRescueReadinessCheckV1 = {
  check_id: string;
  status: "PASS" | "FAIL" | "UNKNOWN";
  notes: string;
};

export type ManufacturerRescueReadinessCandidateV1 = {
  filter_slug: string;
  manufacturer_key: string;
  oem_part_token: string;
  readiness_status: ManufacturerRescueReadinessStatusV1;
  ready_for_apply: boolean;
  director_value_score: number;
  checks: ManufacturerRescueReadinessCheckV1[];
  blocking_reasons: string[];
  source_paths_read: string[];
};

export type ManufacturerRescueReadinessDeployMarkerV1 = {
  marker: string | "UNKNOWN";
  marker_source_path: string | null;
  proof_after_marker_proven: boolean | "UNKNOWN";
};

export type ManufacturerRescueReadinessGateReportV1 = {
  contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  browser_automation_authorized: false;
  coverage_unlocked: false;
  generated_at: string;
  source_command: typeof MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_SOURCE_COMMAND_V1;
  orchestrator_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1;
  orchestrator_generated_at: string;
  director_generated_at: string;
  browser_proof_max_age_days: number;
  deploy_build_marker: ManufacturerRescueReadinessDeployMarkerV1;
  candidate_count: number;
  candidates: ManufacturerRescueReadinessCandidateV1[];
  ready_for_apply_slug: string | null;
  ready_for_apply_count: number;
  top_pending_work_item: {
    filter_slug: string;
    readiness_status: ManufacturerRescueReadinessStatusV1;
    recommended_next_action: string;
  } | null;
  readiness_summary: {
    by_status: Record<ManufacturerRescueReadinessStatusV1, number>;
    ready_for_apply_slugs: string[];
  };
  inspect_summary: {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary";
      command_center: ".command_center_v2.manufacturer_safe_link_rescue_runner_v1.readiness_gate_summary";
      ready_for_apply_slug: ".ready_for_apply_slug";
      top_pending_work_item: ".top_pending_work_item";
    };
    recommended_next_action: string;
  };
  proven_facts: string[];
  unknown_facts: string[];
};

function applyPlanCandidateRels(slug: string): string[] {
  return [
    `data/fridge/batch-production/drafts/fridge-safe-link-${slug}-apply-plan-proposal-v1.json`,
    `data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-${slug}-v1.json`,
    `data/fridge/batch-production/drafts/${slug}-manufacturer-rescue-apply-plan-v1.json`,
  ];
}

function loadOwnerProof(
  rootDir: string,
  slug: string,
  fileExists: (abs: string) => boolean,
  readText: (abs: string) => string,
): { artifact: OwnerBrowserProofResultV1 | null; rel: string | null } {
  const loaded = loadManufacturerRescueOwnerBrowserProofArtifactV1({
    rootDir,
    filter_slug: slug,
    fileExists,
    readText,
  });
  return { artifact: loaded.artifact, rel: loaded.artifact_rel };
}

function proofCheckedAt(artifact: OwnerBrowserProofResultV1 | null): string | null {
  return manufacturerRescueOwnerProofCheckedAtV1(artifact);
}

export function loadManufacturerRescueDeployBuildMarkerV1(args: {
  rootDir: string;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): ManufacturerRescueReadinessDeployMarkerV1 {
  const candidates = [
    "data/reports/deploy-live-site-monitor.json",
    "data/deploy/deploy-live-site-monitor-v1.json",
  ];
  for (const rel of candidates) {
    const abs = path.join(args.rootDir, rel);
    if (!args.fileExists(abs)) continue;
    try {
      const parsed = JSON.parse(args.readText(abs)) as Record<string, unknown>;
      const marker =
        (typeof parsed.live_deploy_commit === "string" && parsed.live_deploy_commit) ||
        (typeof parsed.deploy_commit === "string" && parsed.deploy_commit) ||
        (typeof parsed.repo_head_commit === "string" && parsed.repo_head_commit) ||
        null;
      if (marker) {
        return {
          marker,
          marker_source_path: rel,
          proof_after_marker_proven: "UNKNOWN",
        };
      }
    } catch {
      continue;
    }
  }
  return {
    marker: "UNKNOWN",
    marker_source_path: null,
    proof_after_marker_proven: "UNKNOWN",
  };
}

function loadFrigidaireAdapterRow(
  rootDir: string,
  slug: string,
  fileExists: (abs: string) => boolean,
  readText: (abs: string) => string,
): FrigidaireRefrigeratorRescueCohortRowV1 | null {
  const rel = "data/fridge/batch-production/drafts/frigidaire-refrigerator-rescue-adapter-v1.json";
  const abs = path.join(rootDir, rel);
  if (!fileExists(abs)) return null;
  try {
    const parsed = JSON.parse(readText(abs)) as {
      contract?: string;
      rows?: FrigidaireRefrigeratorRescueCohortRowV1[];
    };
    if (parsed.contract !== FRIGIDAIRE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1) return null;
    return parsed.rows?.find((r) => r.filter_slug === slug) ?? null;
  } catch {
    return null;
  }
}

function loadGeAdapterRow(
  rootDir: string,
  slug: string,
  fileExists: (abs: string) => boolean,
  readText: (abs: string) => string,
): GeRefrigeratorRescueCohortRowV1 | null {
  const rel = "data/fridge/batch-production/drafts/ge-refrigerator-rescue-adapter-v1.json";
  const abs = path.join(rootDir, rel);
  if (!fileExists(abs)) return null;
  try {
    const parsed = JSON.parse(readText(abs)) as {
      contract?: string;
      rows?: GeRefrigeratorRescueCohortRowV1[];
    };
    if (parsed.contract !== GE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1) return null;
    return parsed.rows?.find((r) => r.filter_slug === slug) ?? null;
  } catch {
    return null;
  }
}

function resolveOwnerApplyLaneEligible(args: {
  rootDir: string;
  slug: string;
  manufacturerKey: string;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): { eligible: boolean | "UNKNOWN"; source_note: string } {
  if (args.manufacturerKey === "frigidaire") {
    const row = loadFrigidaireAdapterRow(args.rootDir, args.slug, args.fileExists, args.readText);
    if (!row) return { eligible: "UNKNOWN", source_note: "frigidaire adapter row missing" };
    return {
      eligible: (row.owner_apply_lane_eligible as boolean) === true,
      source_note: `frigidaire adapter owner_apply_lane_eligible=${String(row.owner_apply_lane_eligible)}`,
    };
  }
  if (args.manufacturerKey === "ge_appliance_parts") {
    const row = loadGeAdapterRow(args.rootDir, args.slug, args.fileExists, args.readText);
    if (!row) return { eligible: "UNKNOWN", source_note: "ge adapter row missing" };
    const lane = buildGeRefrigeratorRescueOwnerApprovalLaneV1({
      rootDir: args.rootDir,
      cohortRow: row,
      fileExists: args.fileExists,
      readTextFile: args.readText,
    });
    const eligible = lane.owner_apply_review_ready && lane.apply_plan_proposal_ready;
    return {
      eligible,
      source_note: `ge owner lane review_ready=${String(lane.owner_apply_review_ready)} apply_plan_proposal_ready=${String(lane.apply_plan_proposal_ready)}`,
    };
  }
  return { eligible: false, source_note: `no owner_apply_lane_eligible contract for ${args.manufacturerKey}` };
}

function findApplyPlanRel(
  rootDir: string,
  slug: string,
  fileExists: (abs: string) => boolean,
): string | null {
  for (const rel of applyPlanCandidateRels(slug)) {
    if (fileExists(path.join(rootDir, rel))) return rel;
  }
  return null;
}

function loadFounderDecisionRows(rootDir: string): FounderDecisionRegistryRowV1[] {
  const rows: FounderDecisionRegistryRowV1[] = [];
  for (const file of scanFounderDecisionRegistryJsonFilesV1(rootDir)) {
    if ("parseError" in file || !file.parsed || typeof file.parsed !== "object") continue;
    const doc = file.parsed as { rows?: unknown[] };
    if (!Array.isArray(doc.rows)) continue;
    for (const raw of doc.rows) {
      const validated = validateFounderDecisionRegistryRowV1(raw);
      if (validated.ok) rows.push(validated.row);
    }
  }
  return rows;
}

function hasOwnerApprovalForSlug(args: {
  slug: string;
  applyPlanRel: string | null;
  founderRows: FounderDecisionRegistryRowV1[];
}): { approved: boolean; source_path: string | null; notes: string } {
  const slug = args.slug.toLowerCase();
  for (const row of args.founderRows) {
    if (row.decision_status !== "approved") continue;
    if (row.allowed_next_scope !== "owner_mutation_approved") {
      continue;
    }
    const haystack = JSON.stringify(row).toLowerCase();
    const slugMatch = haystack.includes(slug);
    const planMatch = args.applyPlanRel ? haystack.includes(args.applyPlanRel.toLowerCase()) : false;
    if (slugMatch || planMatch) {
      return {
        approved: true,
        source_path: row.decision_id,
        notes: `founder decision ${row.decision_id} approved for slug or apply plan`,
      };
    }
  }
  return {
    approved: false,
    source_path: null,
    notes: "no founder decision row with owner_mutation_approved for slug/apply plan",
  };
}

function assessWrongFamily(args: {
  slug: string;
  oemPartToken: string;
  ownerProof: OwnerBrowserProofResultV1 | null;
}): WrongFamilyAssessmentV1 {
  const proofUrl = args.ownerProof?.owner_proof_urls?.[0];
  return assessForbiddenTokensWrongFamily({
    filterSlug: args.slug,
    oemPartToken: args.oemPartToken,
    forbiddenBySlug: FRIGIDAIRE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1,
    finalUrl: proofUrl?.url,
    title: args.oemPartToken,
    h1Text: args.oemPartToken,
    textSample: JSON.stringify(args.ownerProof?.owner_proof_urls ?? []),
  });
}

function classifyReadinessStatus(args: {
  checks: ManufacturerRescueReadinessCheckV1[];
  blockingReasons: string[];
  deployMarkerKnown: boolean;
}): ManufacturerRescueReadinessStatusV1 {
  const check = (id: string) => args.checks.find((c) => c.check_id === id)?.status ?? "UNKNOWN";
  const allPass = args.checks.every((c) => c.status === "PASS");
  if (allPass && args.blockingReasons.length === 0) return "READY_FOR_APPLY";

  if (check("wrong_family_safe") === "FAIL") return "BLOCKED_WRONG_FAMILY_RISK";
  if (check("browser_proof_exists") === "FAIL") return "BLOCKED_MISSING_PROOF";
  if (
    check("browser_proof_fresh") === "FAIL" ||
    check("browser_proof_after_deploy_marker") === "FAIL" ||
    (args.deployMarkerKnown && check("browser_proof_after_deploy_marker") === "UNKNOWN")
  ) {
    return "PENDING_BROWSER_REFRESH";
  }
  if (check("confusion_family_cleared") === "FAIL") return "PENDING_CONFUSION_FAMILY_REVIEW";
  if (check("owner_approval_exists") === "FAIL" || check("owner_apply_lane_eligible") === "FAIL") {
    return "PENDING_OWNER_APPROVAL";
  }
  if (check("apply_plan_exists") === "FAIL") return "PENDING_APPLY_PLAN";
  if (check("direct_buyable_exact_token_safe") === "FAIL") return "UNKNOWN_READINESS";
  if (check("no_unresolved_blockers") === "FAIL") return "UNKNOWN_READINESS";
  if (args.checks.some((c) => c.status === "UNKNOWN")) return "UNKNOWN_READINESS";
  return "UNKNOWN_READINESS";
}

function pendingPriority(status: ManufacturerRescueReadinessStatusV1): number {
  const order: Record<ManufacturerRescueReadinessStatusV1, number> = {
    READY_FOR_APPLY: 0,
    PENDING_BROWSER_REFRESH: 1,
    PENDING_CONFUSION_FAMILY_REVIEW: 2,
    PENDING_OWNER_APPROVAL: 3,
    PENDING_APPLY_PLAN: 4,
    BLOCKED_WRONG_FAMILY_RISK: 5,
    BLOCKED_MISSING_PROOF: 6,
    UNKNOWN_READINESS: 7,
  };
  return order[status];
}

function recommendedActionForStatus(
  status: ManufacturerRescueReadinessStatusV1,
  slug: string,
): string {
  switch (status) {
    case "READY_FOR_APPLY":
      return `Guarded single-slug apply executor may run for ${slug} only; re-audit after apply.`;
    case "PENDING_BROWSER_REFRESH":
      return `Refresh owner browser proof artifact for ${slug} (PASS required, within freshness window).`;
    case "PENDING_CONFUSION_FAMILY_REVIEW":
      return `Complete confusion-family owner review for ${slug} before apply.`;
    case "PENDING_OWNER_APPROVAL":
      return `Record founder owner_mutation_approved decision for ${slug} apply plan.`;
    case "PENDING_APPLY_PLAN":
      return `Author read-only apply-plan proposal artifact for ${slug}.`;
    case "BLOCKED_WRONG_FAMILY_RISK":
      return `Resolve wrong-family risk for ${slug} before any apply planning.`;
    case "BLOCKED_MISSING_PROOF":
      return `Capture owner browser proof for ${slug}.`;
    default:
      return `UNKNOWN readiness for ${slug} — resolve blocking checks.`;
  }
}

export function assessManufacturerRescueReadinessCandidateV1(args: {
  rootDir: string;
  row: ManufacturerRescueOrchestratorQueueRowV1;
  directorLane: ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1;
  deployMarker: ManufacturerRescueReadinessDeployMarkerV1;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  founderRows?: FounderDecisionRegistryRowV1[];
}): ManufacturerRescueReadinessCandidateV1 {
  const now = args.now ?? (() => new Date());
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const slug = args.row.filter_slug;
  const sourcePaths = new Set<string>();
  const blockingReasons: string[] = [];
  const checks: ManufacturerRescueReadinessCheckV1[] = [];

  const { artifact: ownerProof, rel: ownerProofRel } = loadOwnerProof(
    args.rootDir,
    slug,
    fileExists,
    readText,
  );
  if (ownerProofRel) sourcePaths.add(ownerProofRel);

  const proofExists = ownerProof !== null && manufacturerRescueOwnerProofOfficialPassV1(ownerProof);
  checks.push({
    check_id: "browser_proof_exists",
    status: proofExists ? "PASS" : "FAIL",
    notes: proofExists
      ? `owner browser proof PASS at ${ownerProofRel}`
      : `missing or non-PASS owner browser proof for ${slug}`,
  });
  if (!proofExists) blockingReasons.push("browser_proof_missing_or_not_pass");

  const checkedAt = proofCheckedAt(ownerProof);
  const freshness = assessManufacturerRescueBrowserProofFreshnessV1({
    artifact: ownerProof,
    now: args.now,
    max_age_days: MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1,
  });
  if (!checkedAt) {
    checks.push({
      check_id: "browser_proof_fresh",
      status: "FAIL",
      notes: freshness.notes,
    });
    blockingReasons.push("browser_proof_checked_at_missing");
  } else {
    checks.push({
      check_id: "browser_proof_fresh",
      status: freshness.fresh ? "PASS" : "FAIL",
      notes: freshness.notes,
    });
    if (!freshness.fresh) blockingReasons.push("browser_proof_stale_or_invalid_timestamp");
  }

  if (args.deployMarker.marker === "UNKNOWN" || !checkedAt) {
    checks.push({
      check_id: "browser_proof_after_deploy_marker",
      status: args.deployMarker.marker === "UNKNOWN" ? "PASS" : "UNKNOWN",
      notes:
        args.deployMarker.marker === "UNKNOWN"
          ? "deploy/build marker not provable in repo — requirement waived"
          : "proof timestamp missing — cannot prove proof-after-deploy ordering",
    });
    if (args.deployMarker.marker !== "UNKNOWN" && !checkedAt) {
      blockingReasons.push("browser_proof_after_deploy_marker_unknown");
    }
  } else {
    checks.push({
      check_id: "browser_proof_after_deploy_marker",
      status: "UNKNOWN",
      notes: `deploy marker ${args.deployMarker.marker} present but proof-vs-deploy ordering not committed in artifacts`,
    });
    blockingReasons.push("browser_proof_after_deploy_marker_not_proven");
  }

  const confusionRequired =
    FRIGIDAIRE_CONFUSION_FAMILY_REVIEW_SLUGS_V1.has(slug) ||
    args.row.blocked_reasons.includes("confusion_family_review_required");
  const confusionCleared = !confusionRequired;
  checks.push({
    check_id: "confusion_family_cleared",
    status: confusionCleared ? "PASS" : "FAIL",
    notes: confusionCleared
      ? "no confusion-family review required"
      : "Frigidaire confusion-family review required before apply",
  });
  if (!confusionCleared) blockingReasons.push("confusion_family_review_required");

  const applyPlanRel = findApplyPlanRel(args.rootDir, slug, fileExists);
  if (applyPlanRel) sourcePaths.add(applyPlanRel);
  checks.push({
    check_id: "apply_plan_exists",
    status: applyPlanRel ? "PASS" : "FAIL",
    notes: applyPlanRel ? `apply plan at ${applyPlanRel}` : "no apply-plan artifact on disk",
  });
  if (!applyPlanRel) blockingReasons.push("apply_plan_artifact_missing");

  const founderRows = args.founderRows ?? loadFounderDecisionRows(args.rootDir);
  const ownerApproval = hasOwnerApprovalForSlug({ slug, applyPlanRel, founderRows });
  checks.push({
    check_id: "owner_approval_exists",
    status: ownerApproval.approved ? "PASS" : "FAIL",
    notes: ownerApproval.notes,
  });
  if (!ownerApproval.approved) blockingReasons.push("owner_apply_approval_missing");

  const laneEligible = resolveOwnerApplyLaneEligible({
    rootDir: args.rootDir,
    slug,
    manufacturerKey: args.row.manufacturer_key,
    fileExists,
    readText,
  });
  checks.push({
    check_id: "owner_apply_lane_eligible",
    status: laneEligible.eligible === true ? "PASS" : laneEligible.eligible === false ? "FAIL" : "UNKNOWN",
    notes: laneEligible.source_note,
  });
  if (laneEligible.eligible !== true) blockingReasons.push("owner_apply_lane_eligible_false");

  const wrongFamily = assessWrongFamily({
    slug,
    oemPartToken: args.row.oem_part_token,
    ownerProof,
  });
  checks.push({
    check_id: "wrong_family_safe",
    status: wrongFamily.blocked ? "FAIL" : "PASS",
    notes: wrongFamily.notes,
  });
  if (wrongFamily.blocked) blockingReasons.push("wrong_family_token_detected");

  const directBuyable =
    isManufacturerRescueGuardedApplyCandidateV1(args.row) &&
    args.row.browser_truth_status === "PASS" &&
    args.row.csv_primary_is_search_placeholder === true;
  checks.push({
    check_id: "direct_buyable_exact_token_safe",
    status: directBuyable ? "PASS" : "FAIL",
    notes: directBuyable
      ? "orchestrator guarded-apply candidate with PASS browser truth and search placeholder primary"
      : "not a proven guarded-apply direct-buyable candidate",
  });
  if (!directBuyable) blockingReasons.push("not_guarded_apply_direct_buyable_candidate");

  const directorBlocked = args.directorLane.guarded_apply_queue.some(
    (q) => q.filter_slug === slug && q.blocked_reasons.length > 0,
  );
  const unresolved =
    args.row.blocked_reasons.filter(
      (r) =>
        !r.includes("csv_apply_not_authorized") &&
        !r.includes("supabase_mutation_not_authorized") &&
        !r.includes("owner_apply_approval_missing"),
    ).length > 0 || directorBlocked;
  checks.push({
    check_id: "no_unresolved_blockers",
    status: unresolved ? "FAIL" : "PASS",
    notes: unresolved
      ? `orchestrator/director blockers remain: ${args.row.blocked_reasons.join(", ")}`
      : "no unresolved orchestrator/director blockers beyond expected mutation gates",
  });
  if (unresolved) blockingReasons.push("unresolved_orchestrator_or_director_blockers");

  const readiness_status = classifyReadinessStatus({
    checks,
    blockingReasons,
    deployMarkerKnown: args.deployMarker.marker !== "UNKNOWN",
  });

  return {
    filter_slug: slug,
    manufacturer_key: args.row.manufacturer_key,
    oem_part_token: args.row.oem_part_token,
    readiness_status,
    ready_for_apply: readiness_status === "READY_FOR_APPLY",
    director_value_score: computeDirectorValueScoreV1(args.row),
    checks,
    blocking_reasons: blockingReasons,
    source_paths_read: Array.from(sourcePaths).sort(),
  };
}

export function selectReadyForApplySlugFromReadinessGateV1(
  candidates: readonly ManufacturerRescueReadinessCandidateV1[],
  directorLane: ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1,
): string | null {
  const ready = candidates.filter((c) => c.ready_for_apply);
  if (ready.length === 0) return null;
  const rankBySlug = new Map(
    directorLane.guarded_apply_queue.map((q) => [q.filter_slug, q.rank]),
  );
  ready.sort(
    (a, b) =>
      (rankBySlug.get(a.filter_slug) ?? 999) - (rankBySlug.get(b.filter_slug) ?? 999) ||
      b.director_value_score - a.director_value_score ||
      a.filter_slug.localeCompare(b.filter_slug),
  );
  return ready[0]!.filter_slug;
}

export function pickTopPendingWorkItemV1(
  candidates: readonly ManufacturerRescueReadinessCandidateV1[],
  directorLane: ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1,
): ManufacturerRescueReadinessGateReportV1["top_pending_work_item"] {
  const pending = candidates.filter((c) => !c.ready_for_apply);
  if (pending.length === 0) return null;
  const rankBySlug = new Map(
    directorLane.guarded_apply_queue.map((q) => [q.filter_slug, q.rank]),
  );
  pending.sort(
    (a, b) =>
      pendingPriority(a.readiness_status) - pendingPriority(b.readiness_status) ||
      (rankBySlug.get(a.filter_slug) ?? 999) - (rankBySlug.get(b.filter_slug) ?? 999) ||
      b.director_value_score - a.director_value_score,
  );
  const top = pending[0]!;
  return {
    filter_slug: top.filter_slug,
    readiness_status: top.readiness_status,
    recommended_next_action: recommendedActionForStatus(top.readiness_status, top.filter_slug),
  };
}

export function buildManufacturerSafeLinkRescueReadinessGateFromInputsV1(args: {
  orchestrator: ManufacturerRescueOrchestratorReportV1;
  directorLane: ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1;
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerRescueReadinessGateReportV1 {
  const now = args.now ?? (() => new Date());
  const deployMarker = loadManufacturerRescueDeployBuildMarkerV1({
    rootDir: args.rootDir,
    fileExists: args.fileExists ?? existsSync,
    readText: args.readText ?? ((abs: string) => readFileSync(abs, "utf8")),
  });
  const founderRows = loadFounderDecisionRows(args.rootDir);

  const candidateRows = args.orchestrator.unified_rescue_queue.filter(
    (row) =>
      row.cohort_lane !== "REFERENCE_ALREADY_APPLIED" &&
      (isManufacturerRescueGuardedApplyCandidateV1(row) ||
        args.directorLane.guarded_apply_queue.some((q) => q.filter_slug === row.filter_slug)),
  );

  const candidates = candidateRows.map((row) =>
    assessManufacturerRescueReadinessCandidateV1({
      rootDir: args.rootDir,
      row,
      directorLane: args.directorLane,
      deployMarker,
      now: args.now,
      fileExists: args.fileExists,
      readText: args.readText,
      founderRows,
    }),
  );

  candidates.sort(
    (a, b) => b.director_value_score - a.director_value_score || a.filter_slug.localeCompare(b.filter_slug),
  );

  const ready_for_apply_slug = selectReadyForApplySlugFromReadinessGateV1(candidates, args.directorLane);
  const ready_for_apply_count = candidates.filter((c) => c.ready_for_apply).length;
  const top_pending_work_item = pickTopPendingWorkItemV1(candidates, args.directorLane);

  const by_status = Object.fromEntries(
    MANUFACTURER_RESCUE_READINESS_STATUSES_V1.map((s) => [s, 0]),
  ) as Record<ManufacturerRescueReadinessStatusV1, number>;
  for (const c of candidates) {
    by_status[c.readiness_status] += 1;
  }

  const recommended_next_action =
    ready_for_apply_slug !== null
      ? `READY_FOR_APPLY proven for ${ready_for_apply_slug} — guarded apply executor only.`
      : top_pending_work_item
        ? `${top_pending_work_item.readiness_status}: ${top_pending_work_item.recommended_next_action}`
        : "UNKNOWN — no guarded-apply candidates in readiness gate scope.";

  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1,
    ...READ_ONLY_MUTATION_FLAGS_V1,
    browser_automation_authorized: false,
    generated_at: now().toISOString(),
    source_command: MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_SOURCE_COMMAND_V1,
    orchestrator_contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    orchestrator_generated_at: args.orchestrator.generated_at,
    director_generated_at: args.directorLane.generated_at,
    browser_proof_max_age_days: MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1,
    deploy_build_marker: deployMarker,
    candidate_count: candidates.length,
    candidates,
    ready_for_apply_slug,
    ready_for_apply_count,
    top_pending_work_item,
    readiness_summary: {
      by_status,
      ready_for_apply_slugs: candidates.filter((c) => c.ready_for_apply).map((c) => c.filter_slug),
    },
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        command_center:
          ".command_center_v2.manufacturer_safe_link_rescue_runner_v1.readiness_gate_summary",
        ready_for_apply_slug: ".ready_for_apply_slug",
        top_pending_work_item: ".top_pending_work_item",
      },
      recommended_next_action,
    },
    proven_facts: [
      "PROVEN: Readiness gate is read-only — no CSV, Supabase, SQL, or browser automation.",
      `PROVEN: ready_for_apply_count=${String(ready_for_apply_count)} (max 1 enforced by runner).`,
      `PROVEN: candidate_count=${String(candidates.length)} guarded-apply scoped slug(s).`,
    ],
    unknown_facts: [
      deployMarker.marker === "UNKNOWN"
        ? "UNKNOWN: deploy/build marker not found in committed repo artifacts."
        : "UNKNOWN: browser proof vs deploy marker ordering not provable from committed artifacts alone.",
      "UNKNOWN: Live production buyer-path parity until post-apply validation.",
    ],
  };
}

export function buildManufacturerSafeLinkRescueReadinessGateV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerRescueReadinessGateReportV1 {
  const directorLane = buildManufacturerSafeLinkRescueDirectorCommandCenterLaneV1({
    rootDir: args.rootDir,
    now: args.now,
    fileExists: args.fileExists,
    readTextFile: args.readText,
  });
  const { orchestrator } = loadManufacturerRescueOrchestratorInputV1({
    rootDir: args.rootDir,
    now: args.now,
    fileExists: args.fileExists,
    readTextFile: args.readText,
  });
  return buildManufacturerSafeLinkRescueReadinessGateFromInputsV1({
    rootDir: args.rootDir,
    orchestrator,
    directorLane,
    now: args.now,
    fileExists: args.fileExists,
    readText: args.readText,
  });
}

export function assessManufacturerRescueReadinessGateArtifactFreshnessV1(args: {
  gate: ManufacturerRescueReadinessGateReportV1;
  orchestrator_generated_at: string;
  director_generated_at: string;
}): { fresh: boolean; stale_reason: string | null } {
  if (args.gate.orchestrator_generated_at !== args.orchestrator_generated_at) {
    return {
      fresh: false,
      stale_reason: `readiness gate orchestrator_generated_at=${args.gate.orchestrator_generated_at} != current ${args.orchestrator_generated_at}`,
    };
  }
  if (args.gate.director_generated_at !== args.director_generated_at) {
    return {
      fresh: false,
      stale_reason: `readiness gate director_generated_at=${args.gate.director_generated_at} != current ${args.director_generated_at}`,
    };
  }
  return { fresh: true, stale_reason: null };
}

export function loadManufacturerSafeLinkRescueReadinessGateForPromotionV1(args: {
  rootDir: string;
  orchestrator_generated_at: string;
  director_generated_at: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerRescueReadinessGatePromotionLoadV1 {
  const artifact_path = MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_JSON_REL_V1;
  const gate = loadManufacturerSafeLinkRescueReadinessGateV1({
    rootDir: args.rootDir,
    fileExists: args.fileExists,
    readText: args.readText,
  });
  if (!gate) {
    return {
      ok: false,
      artifact_status: "missing",
      artifact_path,
      gate: null,
      stale_reason: `missing committed artifact ${artifact_path}`,
      recommended_regenerate_command: MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_SOURCE_COMMAND_V1,
    };
  }
  const freshness = assessManufacturerRescueReadinessGateArtifactFreshnessV1({
    gate,
    orchestrator_generated_at: args.orchestrator_generated_at,
    director_generated_at: args.director_generated_at,
  });
  if (!freshness.fresh) {
    return {
      ok: false,
      artifact_status: "stale",
      artifact_path,
      gate: null,
      stale_reason: freshness.stale_reason ?? "readiness gate artifact stale",
      recommended_regenerate_command: MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_SOURCE_COMMAND_V1,
    };
  }
  return {
    ok: true,
    artifact_status: "loaded",
    artifact_path,
    gate,
    stale_reason: null,
  };
}

export function buildReadinessGateRegenerateTopPendingWorkItemV1(): ManufacturerRescueReadinessGateReportV1["top_pending_work_item"] {
  return {
    filter_slug: "NONE",
    readiness_status: "UNKNOWN_READINESS",
    recommended_next_action: MANUFACTURER_RESCUE_READINESS_GATE_REGENERATE_ACTION_V1,
  };
}

export function loadManufacturerSafeLinkRescueReadinessGateV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerRescueReadinessGateReportV1 | null {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(args.rootDir, MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_JSON_REL_V1);
  if (!fileExists(abs)) return null;
  try {
    const parsed = JSON.parse(readText(abs)) as ManufacturerRescueReadinessGateReportV1;
    if (parsed.contract !== MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_CONTRACT_V1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildManufacturerSafeLinkRescueReadinessWorkQueueMarkdownV1(
  report: ManufacturerRescueReadinessGateReportV1,
): string {
  const lines = [
    "# Manufacturer safe-link rescue readiness work queue v1",
    "",
    `- generated_at: **${report.generated_at}**`,
    `- ready_for_apply_slug: **${report.ready_for_apply_slug ?? "NONE"}**`,
    `- ready_for_apply_count: **${String(report.ready_for_apply_count)}**`,
    `- browser_proof_max_age_days: **${String(report.browser_proof_max_age_days)}**`,
    "",
    "## Status counts",
    "",
    ...MANUFACTURER_RESCUE_READINESS_STATUSES_V1.map(
      (s) => `- ${s}: **${String(report.readiness_summary.by_status[s])}**`,
    ),
    "",
    "## Top pending work",
    "",
    report.top_pending_work_item
      ? `- **${report.top_pending_work_item.filter_slug}** — ${report.top_pending_work_item.readiness_status}\n  - ${report.top_pending_work_item.recommended_next_action}`
      : "- NONE",
    "",
    "## Candidates",
    "",
  ];

  for (const c of report.candidates) {
    lines.push(
      `### ${c.filter_slug}`,
      `- readiness: **${c.readiness_status}**`,
      `- ready_for_apply: **${String(c.ready_for_apply)}**`,
      `- blocking_reasons: ${c.blocking_reasons.length ? c.blocking_reasons.join(", ") : "none"}`,
      "",
    );
  }

  lines.push(`## Recommended next action`, "", report.inspect_summary.recommended_next_action, "");
  return lines.join("\n");
}

export function writeManufacturerSafeLinkRescueReadinessGateArtifactsV1(args: {
  rootDir: string;
  report: ManufacturerRescueReadinessGateReportV1;
}): { jsonRelPath: string; mdRelPath: string } {
  const jsonAbs = path.join(args.rootDir, MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, MANUFACTURER_SAFE_LINK_RESCUE_READINESS_WORK_QUEUE_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    `${buildManufacturerSafeLinkRescueReadinessWorkQueueMarkdownV1(args.report)}\n`,
    "utf8",
  );
  return {
    jsonRelPath: MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_JSON_REL_V1,
    mdRelPath: MANUFACTURER_SAFE_LINK_RESCUE_READINESS_WORK_QUEUE_MD_REL_V1,
  };
}

export function readinessStatusForSlugV1(
  report: ManufacturerRescueReadinessGateReportV1,
  slug: string,
): ManufacturerRescueReadinessStatusV1 | null {
  return report.candidates.find((c) => c.filter_slug === slug)?.readiness_status ?? null;
}
