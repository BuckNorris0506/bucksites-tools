/**
 * Frigidaire manufacturer rescue readiness unblockers v1.
 * Live owner-apply lane eligibility and orchestrator blocker normalization — no mutation authority.
 */

import { readdirSync } from "node:fs";
import path from "node:path";

import type { OwnerBrowserProofResultV1 } from "./fridge-safe-link-owner-browser-proof-result-v1";
import { isManufacturerRescueGuardedApplyCandidateV1 } from "./manufacturer-safe-link-rescue-director-v1";
import {
  FRIGIDAIRE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1,
  loadFrigidaireConfusionFamilyOwnerClearanceV1,
} from "./manufacturer-safe-link-rescue-frigidaire-config-v1";
import {
  assessForbiddenTokensWrongFamily,
  type WrongFamilyAssessmentV1,
} from "./manufacturer-safe-link-rescue-framework-v1";
import {
  assessManufacturerRescueBrowserProofFreshnessV1,
  manufacturerRescueOwnerProofOfficialPassV1,
} from "./manufacturer-safe-link-rescue-owner-browser-proof-evidence-v1";
import type { ManufacturerRescueOrchestratorQueueRowV1 } from "./manufacturer-safe-link-rescue-orchestrator-v1";
import { isExpectedPreApplyOrchestratorBlockerV1 } from "./manufacturer-safe-link-rescue-everydrop-readiness-unblockers-v1";

const MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1 =
  "manufacturer_safe_link_rescue_apply_plan_v1" as const;

const FRIGIDAIRE_COMMITTED_EVIDENCE_VERDICTS_V1 = new Set([
  "EXACT_PDP_PROVEN_FROM_OWNER_BROWSER",
]);

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

function assessFrigidaireWrongFamily(args: {
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

/** Committed official evidence under data/evidence/ for the slug (not draft owner-browser-proof alone). */
export function findFrigidaireCommittedOfficialEvidenceRelV1(args: {
  rootDir: string;
  filterSlug: string;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): string | null {
  const slug = args.filterSlug.trim().toLowerCase();
  const evidenceDir = path.join(args.rootDir, "data/evidence");
  let names: string[] = [];
  try {
    names = readdirSync(evidenceDir)
      .filter((name) => name.toLowerCase().includes(slug) && name.endsWith(".json"))
      .sort();
  } catch {
    return null;
  }

  for (const name of names) {
    const rel = `data/evidence/${name}`;
    const abs = path.join(args.rootDir, rel);
    if (!args.fileExists(abs)) continue;
    try {
      const doc = JSON.parse(args.readText(abs)) as {
        filter_slug?: unknown;
        verdict?: unknown;
        product_attribution?: unknown;
        primary_proof_track?: { path_type?: unknown };
      };
      const filterSlug =
        typeof doc.filter_slug === "string" ? doc.filter_slug.trim().toLowerCase() : "";
      if (filterSlug && filterSlug !== slug) continue;
      const verdict = typeof doc.verdict === "string" ? doc.verdict.trim() : "";
      if (!FRIGIDAIRE_COMMITTED_EVIDENCE_VERDICTS_V1.has(verdict)) continue;
      const pathType =
        typeof doc.primary_proof_track?.path_type === "string"
          ? doc.primary_proof_track.path_type.trim()
          : "";
      const officialPath =
        pathType === "official_manufacturer_pdp" ||
        pathType === "authorized_parts_distributor_pdp" ||
        pathType === "official_manufacturer_accessory_pdp";
      const oemOfficial = doc.product_attribution === "oem_official";
      if (officialPath || oemOfficial) return rel;
    } catch {
      // ignore malformed evidence
    }
  }
  return null;
}

/**
 * Suppress stale orchestrator confusion-family blockers only when owner clearance is proven.
 * Confusion-family slugs without clearance remain blocked.
 */
export function filterFrigidaireOrchestratorBlockedReasonsV1(args: {
  adapterBlockers: readonly string[];
  rootDir: string;
  filterSlug: string;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): string[] {
  const clearance = loadFrigidaireConfusionFamilyOwnerClearanceV1({
    rootDir: args.rootDir,
    filterSlug: args.filterSlug,
    blockedReasons: args.adapterBlockers,
    fileExists: args.fileExists,
    readText: args.readText,
  });
  const clearanceProven = clearance.cleared && !clearance.unresolved;

  const blocked: string[] = [];
  for (const reason of args.adapterBlockers) {
    if (isExpectedPreApplyOrchestratorBlockerV1(reason)) continue;
    if (reason === "confusion_family_review_required" && clearanceProven) continue;
    blocked.push(reason);
  }
  return Array.from(new Set(blocked));
}

export function resolveFrigidaireOwnerApplyLaneEligibleV1(args: {
  rootDir: string;
  row: ManufacturerRescueOrchestratorQueueRowV1;
  ownerProof: OwnerBrowserProofResultV1 | null;
  applyPlanRel: string | null;
  ownerApprovalAccepted: boolean;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
  now?: () => Date;
}): { eligible: boolean | "UNKNOWN"; source_note: string } {
  if (!isManufacturerRescueGuardedApplyCandidateV1(args.row)) {
    return { eligible: false, source_note: "frigidaire lane requires guarded-apply candidate" };
  }

  const proofPass = manufacturerRescueOwnerProofOfficialPassV1(args.ownerProof);
  const freshness = assessManufacturerRescueBrowserProofFreshnessV1({
    artifact: args.ownerProof,
    now: args.now,
  });
  if (!proofPass || !freshness.fresh) {
    return {
      eligible: false,
      source_note: `frigidaire lane requires fresh PASS official/authorized owner proof (pass=${String(proofPass)}, fresh=${String(freshness.fresh)})`,
    };
  }

  const clearance = loadFrigidaireConfusionFamilyOwnerClearanceV1({
    rootDir: args.rootDir,
    filterSlug: args.row.filter_slug,
    blockedReasons: args.row.blocked_reasons,
    fileExists: args.fileExists,
    readText: args.readText,
  });
  if (clearance.unresolved) {
    return {
      eligible: false,
      source_note: "frigidaire lane blocked by unresolved confusion-family review",
    };
  }

  const wrongFamily = assessFrigidaireWrongFamily({
    slug: args.row.filter_slug,
    oemPartToken: args.row.oem_part_token,
    ownerProof: args.ownerProof,
  });
  if (wrongFamily.blocked) {
    return { eligible: false, source_note: "frigidaire lane blocked by wrong-family risk" };
  }

  const directBuyable =
    args.row.browser_truth_status === "PASS" && args.row.csv_primary_is_search_placeholder === true;
  if (!directBuyable) {
    return {
      eligible: false,
      source_note: "frigidaire lane requires PASS browser truth with search-placeholder primary CSV row",
    };
  }

  const evidenceRel = findFrigidaireCommittedOfficialEvidenceRelV1({
    rootDir: args.rootDir,
    filterSlug: args.row.filter_slug,
    fileExists: args.fileExists,
    readText: args.readText,
  });
  if (!evidenceRel) {
    return {
      eligible: false,
      source_note: "frigidaire lane requires committed official evidence under data/evidence/",
    };
  }

  if (!args.applyPlanRel || !args.fileExists(path.join(args.rootDir, args.applyPlanRel))) {
    return { eligible: false, source_note: "frigidaire lane requires apply plan artifact on disk" };
  }

  const planStatus = loadApplyPlanStatusV1({
    rootDir: args.rootDir,
    applyPlanRel: args.applyPlanRel,
    readText: args.readText,
  });
  if (planStatus === "UNKNOWN") {
    return { eligible: "UNKNOWN", source_note: "frigidaire lane apply plan unreadable or wrong contract" };
  }
  if (planStatus === "OTHER") {
    return {
      eligible: false,
      source_note: "frigidaire lane requires apply plan READY_FOR_OWNER_REVIEW",
    };
  }

  if (!args.ownerApprovalAccepted) {
    return {
      eligible: false,
      source_note: "frigidaire lane requires accepted founder owner_mutation_approved decision",
    };
  }

  return {
    eligible: true,
    source_note:
      `frigidaire guarded-apply lane: fresh PASS official/authorized proof, committed evidence ${evidenceRel}, confusion-family cleared when required, apply plan READY_FOR_OWNER_REVIEW, founder approval accepted; no mutation authorization`,
  };
}
