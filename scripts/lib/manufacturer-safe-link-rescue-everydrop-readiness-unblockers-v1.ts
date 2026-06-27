/**
 * Everydrop / Whirlpool manufacturer rescue readiness unblockers v1.
 * Shared orchestrator normalization and readiness-gate lane contracts — no mutation authority.
 */

import path from "node:path";

import type { OwnerBrowserProofResultV1 } from "./fridge-safe-link-owner-browser-proof-result-v1";
import { isManufacturerRescueGuardedApplyCandidateV1 } from "./manufacturer-safe-link-rescue-director-v1";
import { EVERYDROP_WRONG_FAMILY_FORBIDDEN_TOKENS_V1 } from "./manufacturer-safe-link-rescue-everydrop-whirlpool-config-v1";
import {
  assessForbiddenTokensWrongFamily,
  type WrongFamilyAssessmentV1,
} from "./manufacturer-safe-link-rescue-framework-v1";
import {
  assessManufacturerRescueBrowserProofFreshnessV1,
  manufacturerRescueOwnerProofOfficialPassV1,
} from "./manufacturer-safe-link-rescue-owner-browser-proof-evidence-v1";
import type { ManufacturerRescueOrchestratorQueueRowV1 } from "./manufacturer-safe-link-rescue-orchestrator-v1";

const MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1 =
  "manufacturer_safe_link_rescue_apply_plan_v1" as const;

export const EVERYDROP_STALE_CAPTURE_BLOCKERS_V1 = [
  "live_browser_capture_unavailable_or_failed",
  "exact_token_not_proven",
] as const;

export const EXPECTED_PRE_APPLY_ORCHESTRATOR_BLOCKERS_V1 = [
  "mutation_authorized=false",
  "verified_link_authorized=false",
  "csv_apply_not_authorized",
  "supabase_mutation_not_authorized",
] as const;

export function isEverydropStaleCaptureBlockerV1(reason: string): boolean {
  const normalized = reason.trim().toLowerCase();
  return EVERYDROP_STALE_CAPTURE_BLOCKERS_V1.some((blocker) =>
    normalized.includes(blocker.toLowerCase()),
  );
}

export function isExpectedPreApplyOrchestratorBlockerV1(reason: string): boolean {
  const normalized = reason.trim().toLowerCase();
  return EXPECTED_PRE_APPLY_ORCHESTRATOR_BLOCKERS_V1.some((flag) =>
    normalized.includes(flag.toLowerCase()),
  );
}

export function isOperationalOrchestratorBlockerV1(reason: string): boolean {
  return !isExpectedPreApplyOrchestratorBlockerV1(reason);
}

export function filterEverydropOrchestratorBlockedReasonsV1(args: {
  adapterBlockers: readonly string[];
  ownerProof: OwnerBrowserProofResultV1 | null;
  supersessionReviewRequired?: boolean;
  now?: () => Date;
}): string[] {
  const browserPass = manufacturerRescueOwnerProofOfficialPassV1(args.ownerProof);
  const freshness = assessManufacturerRescueBrowserProofFreshnessV1({
    artifact: args.ownerProof,
    now: args.now,
  });
  const passAndFresh = browserPass && freshness.fresh;

  const blocked: string[] = [];
  for (const reason of args.adapterBlockers) {
    if (isExpectedPreApplyOrchestratorBlockerV1(reason)) continue;
    if (passAndFresh && isEverydropStaleCaptureBlockerV1(reason)) continue;
    blocked.push(reason);
  }
  if (args.supersessionReviewRequired) blocked.push("supersession_review_required");
  return Array.from(new Set(blocked));
}

function assessEverydropWrongFamily(args: {
  slug: string;
  oemPartToken: string;
  ownerProof: OwnerBrowserProofResultV1 | null;
}): WrongFamilyAssessmentV1 {
  const proofUrl = args.ownerProof?.owner_proof_urls?.[0];
  return assessForbiddenTokensWrongFamily({
    filterSlug: args.slug,
    oemPartToken: args.oemPartToken,
    forbiddenBySlug: EVERYDROP_WRONG_FAMILY_FORBIDDEN_TOKENS_V1,
    finalUrl: proofUrl?.url,
    title: args.oemPartToken,
    h1Text: args.oemPartToken,
    textSample: JSON.stringify(args.ownerProof?.owner_proof_urls ?? []),
  });
}

function loadApplyPlanStatusV1(args: {
  rootDir: string;
  applyPlanRel: string;
  readText: (abs: string) => string;
}): "READY_FOR_OWNER_REVIEW" | "OTHER" | "UNKNOWN" {
  try {
    const raw = JSON.parse(args.readText(path.join(args.rootDir, args.applyPlanRel))) as {
      contract?: string;
      plan_status?: string;
    };
    if (raw.contract !== MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1) return "UNKNOWN";
    if (raw.plan_status === "READY_FOR_OWNER_REVIEW") return "READY_FOR_OWNER_REVIEW";
    if (typeof raw.plan_status === "string") return "OTHER";
    return "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

export function resolveEverydropWhirlpoolOwnerApplyLaneEligibleV1(args: {
  rootDir: string;
  row: ManufacturerRescueOrchestratorQueueRowV1;
  ownerProof: OwnerBrowserProofResultV1 | null;
  applyPlanRel: string | null;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
  now?: () => Date;
}): { eligible: boolean | "UNKNOWN"; source_note: string } {
  if (!isManufacturerRescueGuardedApplyCandidateV1(args.row)) {
    return { eligible: false, source_note: "everydrop lane requires guarded-apply candidate" };
  }

  const proofPass = manufacturerRescueOwnerProofOfficialPassV1(args.ownerProof);
  const freshness = assessManufacturerRescueBrowserProofFreshnessV1({
    artifact: args.ownerProof,
    now: args.now,
  });
  if (!proofPass || !freshness.fresh) {
    return {
      eligible: false,
      source_note: `everydrop lane requires fresh PASS owner proof (pass=${String(proofPass)}, fresh=${String(freshness.fresh)})`,
    };
  }

  if (
    args.row.blocked_reasons.includes("confusion_family_review_required") ||
    args.row.blocked_reasons.includes("supersession_review_required")
  ) {
    return {
      eligible: false,
      source_note: "everydrop lane blocked by confusion-family or supersession review",
    };
  }

  const wrongFamily = assessEverydropWrongFamily({
    slug: args.row.filter_slug,
    oemPartToken: args.row.oem_part_token,
    ownerProof: args.ownerProof,
  });
  if (wrongFamily.blocked) {
    return { eligible: false, source_note: "everydrop lane blocked by wrong-family risk" };
  }

  const directBuyable =
    args.row.browser_truth_status === "PASS" && args.row.csv_primary_is_search_placeholder === true;
  if (!directBuyable) {
    return {
      eligible: false,
      source_note: "everydrop lane requires PASS browser truth with search-placeholder primary CSV row",
    };
  }

  if (!args.applyPlanRel || !args.fileExists(path.join(args.rootDir, args.applyPlanRel))) {
    return { eligible: false, source_note: "everydrop lane requires apply plan artifact on disk" };
  }

  const planStatus = loadApplyPlanStatusV1({
    rootDir: args.rootDir,
    applyPlanRel: args.applyPlanRel,
    readText: args.readText,
  });
  if (planStatus === "UNKNOWN") {
    return { eligible: "UNKNOWN", source_note: "everydrop lane apply plan unreadable or wrong contract" };
  }
  if (planStatus === "OTHER") {
    return {
      eligible: false,
      source_note: "everydrop lane requires apply plan READY_FOR_OWNER_REVIEW",
    };
  }

  return {
    eligible: true,
    source_note:
      "everydrop guarded-apply lane: fresh PASS proof, direct_buyable evidence, apply plan READY_FOR_OWNER_REVIEW; no mutation authorization",
  };
}
