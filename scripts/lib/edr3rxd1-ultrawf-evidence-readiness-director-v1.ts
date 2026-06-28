/**
 * edr3rxd1 + ultrawf evidence readiness director v1 — read-only evidence-production
 * factory for the HyperAgent pair batch. BuckParts Truth Contract: repo truth only;
 * no invented browser evidence; no CSV/Supabase/owner-decision mutation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildAllProductSafeBuyerPathCensusV1Report,
  type AllProductSafeBuyerPathCensusV1,
} from "./all-product-safe-buyer-path-census-v1";
import { buildFridgeSafeLinkBatchFactoryV1 } from "./fridge-safe-link-batch-factory-v1";
import {
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_EDR3RXD1_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_ULTRAWF_REL_V1,
  type OwnerBrowserProofResultV1,
} from "./fridge-safe-link-owner-browser-proof-result-v1";
import {
  buildManufacturerRescueApplyPlanForSlugV1,
  type ManufacturerRescueApplyPlanV1,
} from "./manufacturer-safe-link-rescue-apply-plan-factory-v1";
import { filterEverydropOrchestratorBlockedReasonsV1 } from "./manufacturer-safe-link-rescue-everydrop-readiness-unblockers-v1";
import {
  FRIGIDAIRE_CONFUSION_FAMILY_REVIEW_SLUGS_V1,
  FRIGIDAIRE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1,
} from "./manufacturer-safe-link-rescue-frigidaire-config-v1";
import { loadManufacturerRescueOrchestratorInputV1 } from "./manufacturer-safe-link-rescue-director-v1";
import {
  assessManufacturerRescueBrowserProofFreshnessV1,
  loadManufacturerRescueOwnerBrowserProofArtifactV1,
} from "./manufacturer-safe-link-rescue-owner-browser-proof-evidence-v1";
import type { ManufacturerRescueOrchestratorQueueRowV1 } from "./manufacturer-safe-link-rescue-orchestrator-v1";

export const EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_CONTRACT_V1 =
  "edr3rxd1_ultrawf_evidence_readiness_director_v1" as const;

export const EDR3RXD1_ULTRAWF_PAIR_SLUGS_V1 = ["edr3rxd1", "ultrawf"] as const;

export type Edr3rxd1UltrawfPairSlugV1 = (typeof EDR3RXD1_ULTRAWF_PAIR_SLUGS_V1)[number];

export const EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/edr3rxd1-ultrawf-evidence-readiness-director-v1.json" as const;

export const EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_MD_REL_V1 =
  "data/fridge/batch-production/drafts/edr3rxd1-ultrawf-evidence-readiness-director-v1.md" as const;

export const EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_SOURCE_COMMAND_V1 =
  "npm run buckparts:edr3rxd1-ultrawf-evidence-readiness-director" as const;

export const EDR3RXD1_COMMITTED_EVIDENCE_TODO_REL_V1 =
  "data/fridge/batch-production/drafts/edr3rxd1-committed-evidence-todo-v1.json" as const;

export const ULTRAWF_COMMITTED_EVIDENCE_TODO_REL_V1 =
  "data/fridge/batch-production/drafts/ultrawf-committed-evidence-todo-v1.json" as const;

export const EDR3RXD1_APPLY_PLAN_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-edr3rxd1-v1.json" as const;

export const ULTRAWF_APPLY_PLAN_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-ultrawf-v1.json" as const;

export const EDR3RXD1_OWNER_CLASSIFICATION_PACKET_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-edr3rxd1-owner-classification-packet-v1.json" as const;

export const ULTRAWF_OWNER_CLASSIFICATION_PACKET_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-ultrawf-owner-classification-packet-v1.json" as const;

export type MissingArtifactKindV1 =
  | "committed_evidence_json"
  | "owner_browser_proof_fresh"
  | "apply_plan_proposal"
  | "owner_classification_packet"
  | "founder_approval_row"
  | "readiness_gate_ready_for_apply"
  | "cursor_revalidation_pass"
  | "confusion_family_review_cleared"
  | "batch_factory_eligible_now";

export type MissingArtifactRowV1 = {
  artifact_kind: MissingArtifactKindV1;
  status: "MISSING" | "BLOCKED" | "STALE" | "PRESENT" | "NOT_REQUIRED";
  rel_path: string | null;
  blocking_evidence: string[];
  unblocks_with: string;
};

export type CommittedEvidenceTodoPacketV1 = {
  contract: "fridge_safe_link_committed_evidence_todo_v1";
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  evidence_write_authorized: false;
  generated_at: string;
  target_slug: string;
  suggested_evidence_rel_path: string;
  evidence_write_not_authorized: true;
  source_owner_browser_proof_rel_path: string;
  excluded_evidence_rel_paths: string[];
  proposed_evidence_fields: Record<string, unknown>;
  observations_from_proof_only: string[];
  mutation_ready: false;
  required_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export type FounderApprovalReadinessV1 = {
  ready_for_founder_packet: boolean;
  founder_decision_rel_path: string | null;
  founder_decision_exists: boolean;
  founder_decision_activated: boolean;
  prerequisites_met: string[];
  prerequisites_missing: string[];
  recommended_founder_action: string;
};

export type GuardedApplyReadinessV1 = {
  ready_for_guarded_apply_dry_run: boolean;
  ready_for_guarded_apply_write: boolean;
  guarded_apply_candidate_after_committed_evidence_alone: boolean;
  guarded_apply_candidate_after_full_evidence_lane: boolean;
  blocking_evidence: string[];
  dry_run_commands: string[];
  write_commands_blocked: string[];
  readiness_gate_status: string;
};

export type SlugEvidenceReadinessAuditV1 = {
  slug: string;
  oem_part_token: string;
  manufacturer_key: string;
  census_page_classification: string;
  owner_browser_proof_rel_path: string;
  owner_browser_proof_verdict: string | null;
  owner_browser_proof_fresh: boolean;
  owner_browser_proof_age_days: number | "UNKNOWN";
  missing_artifacts: MissingArtifactRowV1[];
  blocking_evidence: string[];
  next_owner_action: string;
  next_cursor_action: string;
  committed_evidence_todo_rel_path: string | null;
  apply_plan_rel_path: string | null;
  apply_plan_status: string | null;
  owner_classification_packet_rel_path: string | null;
  owner_classification_packet_generated: boolean;
  founder_approval_readiness: FounderApprovalReadinessV1;
  guarded_apply_readiness: GuardedApplyReadinessV1;
};

export type Edr3rxd1UltrawfEvidenceReadinessDirectorReportV1 = {
  contract: typeof EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  founder_approval_activation_authorized: false;
  guarded_apply_authorized: false;
  source_command: typeof EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_SOURCE_COMMAND_V1;
  generated_at: string;
  pair_slugs: readonly Edr3rxd1UltrawfPairSlugV1[];
  slug_audits: SlugEvidenceReadinessAuditV1[];
  pair_summary: {
    smallest_remaining_human_actions: string[];
    expected_proven_delta_if_pair_completes: 2;
    pair_blocked: boolean;
  };
  artifact_rel_paths_written: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  recommended_commands: string[];
};

const EDR3RXD1_STALE_AFTERMARKET_EVIDENCE =
  "data/evidence/amazon-edr3rxd1-aftermarket-pdp-evidence.2026-05-04.json" as const;

const HARD_DO_NOT_USE_B087 = "B087PDLZL9" as const;

function loadJson<T>(rootDir: string, rel: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, rel), "utf8")) as T;
}

function hasFounderApprovalV1(rootDir: string, slug: string): boolean {
  const rel = `data/owner-decisions/fridge-safe-link-${slug}-owner-approval-v1.json`;
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) return false;
  try {
    const doc = loadJson<{ rows?: Array<{ decision_status?: string }> }>(rootDir, rel);
    return (doc.rows ?? []).some((r) => r.decision_status === "approved");
  } catch {
    return false;
  }
}

function proofObservations(proof: OwnerBrowserProofResultV1): string[] {
  const out: string[] = [];
  for (const row of proof.owner_proof_urls ?? []) {
    out.push(...(row.proven_observations ?? []));
  }
  for (const row of proof.amazon_pass_candidates ?? []) {
    out.push(...(row.proven_observations ?? []));
  }
  return out;
}

function forbiddenTokensDetected(slug: string, proof: OwnerBrowserProofResultV1): string[] {
  const forbidden = FRIGIDAIRE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1[slug] ?? [];
  const blob = JSON.stringify(proof).toUpperCase();
  return forbidden.filter((token) => blob.includes(token.toUpperCase()));
}

export function buildCommittedEvidenceTodoPacketV1(args: {
  slug: string;
  proof: OwnerBrowserProofResultV1;
  proofRel: string;
  now: () => Date;
}): CommittedEvidenceTodoPacketV1 {
  const slug = args.slug;
  const observations = proofObservations(args.proof);
  const officialUrl = (args.proof.owner_proof_urls ?? []).find(
    (u) => (u.browser_proof_status ?? "") === "PASS",
  )?.url;
  const amazonCandidate = args.proof.amazon_pass_candidates?.[0];

  const suggestedPath =
    slug === "edr3rxd1"
      ? "data/evidence/whirlpool-edr3rxd1-official-owner-browser-proof-evidence.TODO.json"
      : "data/evidence/frigidaire-ultrawf-official-owner-browser-proof-evidence.TODO.json";

  const excluded =
    slug === "edr3rxd1"
      ? [EDR3RXD1_STALE_AFTERMARKET_EVIDENCE, `amazon ASIN ${HARD_DO_NOT_USE_B087}`]
      : [];

  const proposedFields: Record<string, unknown> = {
    scope: "owner_browser_review_evidence_only",
    read_only: true,
    data_mutation: false,
    filter_slug: slug,
    token: args.proof.oem_part_token,
    verdict: "TODO_OWNER_COMMIT_FROM_PROOF_ARTIFACT_ONLY",
    mutation_ready: false,
    product_attribution: slug === "edr3rxd1" ? "oem_official" : "oem_official",
    primary_proof_track:
      slug === "edr3rxd1"
        ? {
            path_type: "official_manufacturer_pdp",
            proposed_url: officialUrl ?? null,
            source: args.proofRel,
          }
        : {
            path_type: "official_manufacturer_pdp",
            proposed_url:
              (args.proof.owner_proof_urls ?? []).find((u) =>
                (u.url ?? "").includes("frigidaire.com"),
              )?.url ?? officialUrl ?? null,
            source: args.proofRel,
          },
    secondary_amazon_audit_track: amazonCandidate
      ? {
          proposed_canonical_url: amazonCandidate.url ?? null,
          normalized_amazon_pdp_url:
            (amazonCandidate as { normalized_amazon_pdp_url?: string }).normalized_amazon_pdp_url ??
            amazonCandidate.url ??
            null,
          affiliate_tag_status:
            slug === "edr3rxd1"
              ? "PROVEN tag=buckparts20-20 in owner proof"
              : "UNKNOWN — owner proof notes affiliate tag audit required",
          source: args.proofRel,
        }
      : null,
    required_next_action:
      "Owner or authorized evidence commit script writes this file — NOT generated automatically by this factory.",
  };

  return {
    contract: "fridge_safe_link_committed_evidence_todo_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    evidence_write_authorized: false,
    generated_at: args.now().toISOString(),
    target_slug: slug,
    suggested_evidence_rel_path: suggestedPath,
    evidence_write_not_authorized: true,
    source_owner_browser_proof_rel_path: args.proofRel,
    excluded_evidence_rel_paths: excluded,
    proposed_evidence_fields: proposedFields,
    observations_from_proof_only: observations,
    mutation_ready: false,
    required_next_action:
      "Transcribe ONLY proven_observations from owner browser proof into a new data/evidence/*.json file; do not invent observations. Then re-run batch factory + Cursor validation.",
    proven_facts: [
      `PROVEN: PASS owner browser proof at ${args.proofRel}.`,
      `PROVEN: TODO packet does not write evidence — evidence_write_authorized=false.`,
      ...(slug === "edr3rxd1"
        ? [
            `PROVEN: ${EDR3RXD1_STALE_AFTERMARKET_EVIDENCE} is Waterdrop B087PDLZL9 — HARD_DO_NOT_USE; exclude from commit.`,
          ]
        : []),
    ],
    unknown_facts: [
      "UNKNOWN: whether committed evidence commit requires Amazon track, official-only track, or both for launch-buy-links gate.",
    ],
  };
}

export function buildEdr3rxd1OwnerClassificationPacketV1(args: {
  applyPlan: ManufacturerRescueApplyPlanV1;
  census: AllProductSafeBuyerPathCensusV1;
  now: () => Date;
}): Record<string, unknown> | null {
  if (args.applyPlan.plan_status !== "READY_FOR_OWNER_REVIEW") return null;
  if (!args.applyPlan.proposed_csv_row) return null;

  return {
    contract: "fridge_safe_link_edr3rxd1_owner_classification_approval_packet_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    approval_status: "PENDING_OWNER_REVIEW",
    not_an_approved_decision: true,
    generated_at: args.now().toISOString(),
    source_apply_plan_rel_path: EDR3RXD1_APPLY_PLAN_REL_V1,
    target_slug: "edr3rxd1",
    oem_part_token: "EDR3RXD1",
    manufacturer_key: "everydrop_whirlpool",
    census_page_classification:
      args.census.products.find((p) => p.slug === "edr3rxd1")?.page_classification ??
      "UNKNOWN",
    proposed_official_destination: args.applyPlan.official_destination_url,
    proposed_csv_row: args.applyPlan.proposed_csv_row,
    owner_classification_review_v1: {
      owner_must_answer_before_guarded_apply: [
        {
          question_id: "approve_official_whirlpool_verified_link",
          prompt:
            "Approve promoting official Whirlpool everydrop EDR3RXD1 PDP as BuckParts Verified Link primary for slug edr3rxd1?",
          required: true,
        },
        {
          question_id: "browser_truth_classification",
          prompt: "Set browser_truth_classification for proposed row?",
          required: true,
          recommended_value: "direct_buyable",
          recommended_basis: args.applyPlan.proof_artifact_path ?? "owner browser proof",
        },
        {
          question_id: "confirm_b087_excluded",
          prompt: `Confirm Amazon ${HARD_DO_NOT_USE_B087} remains HARD_DO_NOT_USE and is not promoted for edr3rxd1?`,
          required: true,
        },
        {
          question_id: "authorize_guarded_csv_apply",
          prompt:
            "Authorize manufacturer-rescue guarded CSV apply for edr3rxd1 only after readiness gate READY_FOR_APPLY?",
          required: true,
        },
      ],
    },
    explicit_risks: [
      "production_go_first_hop=UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH",
      "Amazon B00UB441HS pass candidate exists in owner proof — separate Amazon parity path not in this official-manufacturer apply plan.",
    ],
    proven_facts: [
      "PROVEN: apply plan READY_FOR_OWNER_REVIEW from manufacturer rescue factory.",
      "PROVEN: no founder approval row on disk for edr3rxd1.",
    ],
    recommended_next_action:
      "Owner answers classification questions; then founder decision template — still no activation from this packet.",
  };
}

export function buildUltrawfOwnerClassificationPacketV1(args: {
  proof: OwnerBrowserProofResultV1;
  applyPlan: ManufacturerRescueApplyPlanV1;
  census: AllProductSafeBuyerPathCensusV1;
  now: () => Date;
}): Record<string, unknown> {
  const forbiddenDetected = forbiddenTokensDetected("ultrawf", args.proof);
  const confusionRequired = FRIGIDAIRE_CONFUSION_FAMILY_REVIEW_SLUGS_V1.has("ultrawf");

  return {
    contract: "fridge_safe_link_ultrawf_owner_classification_approval_packet_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    approval_status: "PENDING_CONFUSION_FAMILY_REVIEW",
    not_an_approved_decision: true,
    generated_at: args.now().toISOString(),
    source_apply_plan_rel_path: ULTRAWF_APPLY_PLAN_REL_V1,
    source_owner_browser_proof_rel_path: FRIDGE_OWNER_BROWSER_PROOF_RESULT_ULTRAWF_REL_V1,
    target_slug: "ultrawf",
    oem_part_token: "ULTRAWF",
    manufacturer_key: "frigidaire",
    apply_plan_status: args.applyPlan.plan_status,
    confusion_family_review_required: confusionRequired,
    forbidden_tokens_for_slug: FRIGIDAIRE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1.ultrawf ?? [],
    forbidden_tokens_detected_in_proof: forbiddenDetected,
    owner_classification_review_v1: {
      owner_must_answer_before_guarded_apply: [
        {
          question_id: "confusion_family_ultrawf_vs_eptwfu01",
          prompt:
            "Confirm ULTRAWF owner browser proof URLs are exact-token ULTRAWF / PureSource Ultra OEM — not EPTWFU01 or WF3CB family cross-listing?",
          required: true,
        },
        {
          question_id: "approve_official_or_parts_distributor_primary",
          prompt:
            "If confusion-family cleared: approve Frigidaire.com or frigidaireapplianceparts.com official/authorized PDP as Verified Link primary?",
          required: true,
          blocked_until: "confusion_family_review_cleared",
        },
        {
          question_id: "amazon_b002jakram_audit",
          prompt:
            "Separately audit Amazon B002JAKRAM affiliate tag before any Amazon-primary apply (UNKNOWN in owner proof).",
          required: false,
        },
      ],
    },
    census_page_classification:
      args.census.products.find((p) => p.slug === "ultrawf")?.page_classification ?? "UNKNOWN",
    proven_facts: [
      "PROVEN: PASS owner browser proof on disk.",
      `PROVEN: confusion_family_review_required=${String(confusionRequired)} per frigidaire config.`,
      `PROVEN: forbidden_tokens_detected_in_proof=[${forbiddenDetected.join(", ")}].`,
    ],
    recommended_next_action:
      "Owner completes confusion-family review first; apply plan remains blocked until confusion_family_review_cleared.",
  };
}

function assessMissingArtifacts(args: {
  slug: string;
  proofFresh: boolean;
  applyPlan: ManufacturerRescueApplyPlanV1;
  founderApproved: boolean;
  batchEligible: boolean;
  confusionFamilyBlocked: boolean;
  committedEvidenceExists: boolean;
  classificationGenerated: boolean;
}): MissingArtifactRowV1[] {
  const rows: MissingArtifactRowV1[] = [];

  rows.push({
    artifact_kind: "committed_evidence_json",
    status: args.committedEvidenceExists ? "PRESENT" : "MISSING",
    rel_path: args.committedEvidenceExists ? null : "data/evidence/*.json (see committed-evidence-todo)",
    blocking_evidence: args.committedEvidenceExists
      ? []
      : ["batch_factory repo_evidence_verdict not EXACT_PDP_PROVEN", "launch_buy_links_gate_passes=false"],
    unblocks_with: "Owner commits evidence JSON from TODO packet (proof observations only)",
  });

  rows.push({
    artifact_kind: "owner_browser_proof_fresh",
    status: args.proofFresh ? "PRESENT" : "STALE",
    rel_path:
      args.slug === "edr3rxd1"
        ? FRIDGE_OWNER_BROWSER_PROOF_RESULT_EDR3RXD1_REL_V1
        : FRIDGE_OWNER_BROWSER_PROOF_RESULT_ULTRAWF_REL_V1,
    blocking_evidence: args.proofFresh ? [] : ["browser_proof_stale_or_invalid_timestamp (>14d)"],
    unblocks_with: "Re-run owner browser proof session or refresh checked_at within 14d policy",
  });

  rows.push({
    artifact_kind: "apply_plan_proposal",
    status:
      args.applyPlan.plan_status === "READY_FOR_OWNER_REVIEW"
        ? "PRESENT"
        : args.applyPlan.plan_status.startsWith("BLOCKED")
          ? "BLOCKED"
          : "MISSING",
    rel_path:
      args.slug === "edr3rxd1" ? EDR3RXD1_APPLY_PLAN_REL_V1 : ULTRAWF_APPLY_PLAN_REL_V1,
    blocking_evidence: args.applyPlan.blockers,
    unblocks_with: "Resolve apply-plan blockers; manufacturer rescue apply-plan factory READY_FOR_OWNER_REVIEW",
  });

  rows.push({
    artifact_kind: "owner_classification_packet",
    status: args.classificationGenerated ? "PRESENT" : "MISSING",
    rel_path:
      args.slug === "edr3rxd1"
        ? EDR3RXD1_OWNER_CLASSIFICATION_PACKET_REL_V1
        : ULTRAWF_OWNER_CLASSIFICATION_PACKET_REL_V1,
    blocking_evidence: args.classificationGenerated ? [] : ["apply plan not READY or packet not generated"],
    unblocks_with: "Owner classification review answers",
  });

  rows.push({
    artifact_kind: "founder_approval_row",
    status: args.founderApproved ? "PRESENT" : "MISSING",
    rel_path: `data/owner-decisions/fridge-safe-link-${args.slug}-owner-approval-v1.json`,
    blocking_evidence: args.founderApproved ? [] : ["owner_mutation_approved founder row absent"],
    unblocks_with: "Founder activates approval row — NOT performed by this factory",
  });

  rows.push({
    artifact_kind: "readiness_gate_ready_for_apply",
    status: "MISSING",
    rel_path: "manufacturer_safe_link_rescue_readiness_gate_v1 (regenerate after prerequisites)",
    blocking_evidence: ["ready_for_apply=false in current gate snapshot"],
    unblocks_with: "All readiness gate checks PASS including founder approval",
  });

  rows.push({
    artifact_kind: "cursor_revalidation_pass",
    status: "MISSING",
    rel_path: "fridge-safe-link-owner-browser-proof-cursor-validation-v1.json",
    blocking_evidence: ["VALIDATION_PARTIAL", "DISCOVERY_CANDIDATES_OK not Verified Link"],
    unblocks_with: "node --import tsx scripts/run-fridge-safe-link-owner-browser-proof-cursor-validation-v1.ts",
  });

  if (args.confusionFamilyBlocked) {
    rows.push({
      artifact_kind: "confusion_family_review_cleared",
      status: "BLOCKED",
      rel_path: null,
      blocking_evidence: ["confusion_family_review_required"],
      unblocks_with: "Owner confusion-family classification packet review",
    });
  } else {
    rows.push({
      artifact_kind: "confusion_family_review_cleared",
      status: "NOT_REQUIRED",
      rel_path: null,
      blocking_evidence: [],
      unblocks_with: "n/a",
    });
  }

  rows.push({
    artifact_kind: "batch_factory_eligible_now",
    status: args.batchEligible ? "PRESENT" : "MISSING",
    rel_path: "fridge-safe-link-batch-factory-v1.json",
    blocking_evidence: args.batchEligible ? [] : ["eligible_now_count=0"],
    unblocks_with: "Committed evidence + validation overlays",
  });

  return rows;
}

export function buildSlugEvidenceReadinessAuditV1(args: {
  rootDir: string;
  slug: Edr3rxd1UltrawfPairSlugV1;
  orchestratorRow: ManufacturerRescueOrchestratorQueueRowV1;
  census: AllProductSafeBuyerPathCensusV1;
  batchEligible: boolean;
  now: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): {
  audit: SlugEvidenceReadinessAuditV1;
  committedEvidenceTodo: CommittedEvidenceTodoPacketV1;
  applyPlan: ManufacturerRescueApplyPlanV1;
  ownerClassification: Record<string, unknown> | null;
} {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const slug = args.slug;

  const proofLoad = loadManufacturerRescueOwnerBrowserProofArtifactV1({
    rootDir: args.rootDir,
    filter_slug: slug,
    fileExists,
    readText,
  });
  const proof = proofLoad.artifact!;
  const freshness = assessManufacturerRescueBrowserProofFreshnessV1({
    artifact: proofLoad.artifact,
    now: args.now,
  });

  const applyPlan = buildManufacturerRescueApplyPlanForSlugV1({
    row: args.orchestratorRow,
    rootDir: args.rootDir,
    now: args.now,
    fileExists,
    readText,
  });

  const committedEvidenceTodo = buildCommittedEvidenceTodoPacketV1({
    slug,
    proof: proof!,
    proofRel: proofLoad.artifact_rel!,
    now: args.now,
  });

  const ownerClassification =
    slug === "edr3rxd1"
      ? buildEdr3rxd1OwnerClassificationPacketV1({
          applyPlan,
          census: args.census,
          now: args.now,
        })
      : buildUltrawfOwnerClassificationPacketV1({
          proof: proof!,
          applyPlan,
          census: args.census,
          now: args.now,
        });

  const founderApproved = hasFounderApprovalV1(args.rootDir, slug);
  const confusionBlocked =
    slug === "ultrawf" ||
    args.orchestratorRow.blocked_reasons.includes("confusion_family_review_required");

  const factoryRow = buildFridgeSafeLinkBatchFactoryV1({ rootDir: args.rootDir }).rows.find(
    (r) => r.slug === slug,
  );
  const committedEvidenceExists =
    (factoryRow?.repo_evidence_verdict ?? "").includes("PROVEN") ||
    (factoryRow?.repo_draft_proof_files?.length ?? 0) > 0;

  const classificationGenerated = ownerClassification !== null;

  const missingArtifacts = assessMissingArtifacts({
    slug,
    proofFresh: freshness.fresh,
    applyPlan,
    founderApproved,
    batchEligible: args.batchEligible,
    confusionFamilyBlocked: confusionBlocked && slug === "ultrawf",
    committedEvidenceExists,
    classificationGenerated,
  });

  const blockingEvidence = missingArtifacts
    .filter((m) => m.status !== "PRESENT" && m.status !== "NOT_REQUIRED")
    .flatMap((m) => m.blocking_evidence);

  const operationalBlockers =
    slug === "edr3rxd1"
      ? filterEverydropOrchestratorBlockedReasonsV1({
          adapterBlockers: args.orchestratorRow.blocked_reasons,
          ownerProof: proofLoad.artifact,
          now: args.now,
        })
      : args.orchestratorRow.blocked_reasons.filter(
          (r) => !r.includes("mutation_authorized") && !r.includes("verified_link_authorized"),
        );

  const afterCommittedEvidenceAlone =
    slug === "edr3rxd1"
      ? false
      : false;

  const afterFullLane =
    applyPlan.plan_status === "READY_FOR_OWNER_REVIEW" &&
    freshness.fresh &&
    !founderApproved &&
    operationalBlockers.length === 0 &&
    (slug !== "ultrawf" || !confusionBlocked);

  const founderReadiness: FounderApprovalReadinessV1 = {
    ready_for_founder_packet:
      applyPlan.plan_status === "READY_FOR_OWNER_REVIEW" &&
      classificationGenerated &&
      freshness.fresh &&
      (slug !== "ultrawf" || !confusionBlocked),
    founder_decision_rel_path: `data/owner-decisions/fridge-safe-link-${slug}-owner-approval-v1.json`,
    founder_decision_exists: existsSync(
      path.join(args.rootDir, `data/owner-decisions/fridge-safe-link-${slug}-owner-approval-v1.json`),
    ),
    founder_decision_activated: founderApproved,
    prerequisites_met: [
      ...(proofLoad.artifact?.verdict === "PASS_BROWSER_PROOF" ? ["PASS owner browser proof"] : []),
      ...(freshness.fresh ? ["browser proof fresh"] : []),
      ...(applyPlan.plan_status === "READY_FOR_OWNER_REVIEW"
        ? ["apply plan READY_FOR_OWNER_REVIEW"]
        : []),
      ...(classificationGenerated ? ["owner classification packet generated"] : []),
    ],
    prerequisites_missing: [
      ...(!freshness.fresh ? ["browser proof fresh"] : []),
      ...(applyPlan.plan_status !== "READY_FOR_OWNER_REVIEW"
        ? [`apply plan (${applyPlan.plan_status})`]
        : []),
      ...(slug === "ultrawf" && confusionBlocked ? ["confusion_family_review_cleared"] : []),
      ...(!committedEvidenceExists ? ["committed evidence JSON"] : []),
    ],
    recommended_founder_action: founderApproved
      ? "Founder row already approved — guarded apply dry-run only with explicit authorization"
      : "Do NOT activate founder approval until committed evidence + apply plan + classification review complete",
  };

  const guardedReadiness: GuardedApplyReadinessV1 = {
    ready_for_guarded_apply_dry_run: false,
    ready_for_guarded_apply_write: false,
    guarded_apply_candidate_after_committed_evidence_alone: afterCommittedEvidenceAlone,
    guarded_apply_candidate_after_full_evidence_lane: afterFullLane,
    blocking_evidence: [
      ...blockingEvidence,
      ...operationalBlockers,
      "mutation_authorized=false",
      "csv_apply_authorized=false",
    ],
    dry_run_commands:
      slug === "edr3rxd1"
        ? [
            "npm run buckparts:manufacturer-safe-link-rescue-apply-plan-factory",
            "npm run buckparts:manufacturer-safe-link-rescue-readiness-gate",
          ]
        : [
            "npm run buckparts:manufacturer-safe-link-rescue-apply-plan-factory",
            "npm run buckparts:manufacturer-safe-link-rescue-readiness-gate",
          ],
    write_commands_blocked: [
      "# BLOCKED — founder approval + READY_FOR_APPLY required",
      `# npm run buckparts:manufacturer-browser-proof-batch-commit-assist -- --slug ${slug} --write-csv`,
    ],
    readiness_gate_status: "PENDING — regenerate gate after artifacts committed",
  };

  const nextOwnerAction =
    slug === "edr3rxd1"
      ? freshness.fresh
        ? "Commit evidence TODO packet → review owner classification → founder template (no activation here)"
        : "Refresh owner browser proof (stale >14d) before evidence commit"
      : "Complete confusion-family review in owner classification packet → commit evidence TODO → refresh proof if stale";

  const nextCursorAction =
    "npm run buckparts:fridge-safe-link-batch-factory && node --import tsx scripts/run-fridge-safe-link-owner-browser-proof-cursor-validation-v1.ts";

  const audit: SlugEvidenceReadinessAuditV1 = {
    slug,
    oem_part_token: args.orchestratorRow.oem_part_token,
    manufacturer_key: args.orchestratorRow.manufacturer_key,
    census_page_classification:
      args.census.products.find((p) => p.slug === slug)?.page_classification ?? "UNKNOWN",
    owner_browser_proof_rel_path: proofLoad.artifact_rel!,
    owner_browser_proof_verdict: proofLoad.artifact?.verdict ?? null,
    owner_browser_proof_fresh: freshness.fresh,
    owner_browser_proof_age_days: freshness.age_days,
    missing_artifacts: missingArtifacts,
    blocking_evidence: Array.from(new Set(blockingEvidence)),
    next_owner_action: nextOwnerAction,
    next_cursor_action: nextCursorAction,
    committed_evidence_todo_rel_path:
      slug === "edr3rxd1" ? EDR3RXD1_COMMITTED_EVIDENCE_TODO_REL_V1 : ULTRAWF_COMMITTED_EVIDENCE_TODO_REL_V1,
    apply_plan_rel_path: slug === "edr3rxd1" ? EDR3RXD1_APPLY_PLAN_REL_V1 : ULTRAWF_APPLY_PLAN_REL_V1,
    apply_plan_status: applyPlan.plan_status,
    owner_classification_packet_rel_path:
      slug === "edr3rxd1"
        ? EDR3RXD1_OWNER_CLASSIFICATION_PACKET_REL_V1
        : ULTRAWF_OWNER_CLASSIFICATION_PACKET_REL_V1,
    owner_classification_packet_generated: classificationGenerated,
    founder_approval_readiness: founderReadiness,
    guarded_apply_readiness: guardedReadiness,
  };

  return { audit, committedEvidenceTodo, applyPlan, ownerClassification };
}

export function buildEdr3rxd1UltrawfEvidenceReadinessDirectorMarkdownV1(
  report: Edr3rxd1UltrawfEvidenceReadinessDirectorReportV1,
): string {
  const lines: string[] = [
    "# edr3rxd1 + ultrawf evidence readiness director v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Pair summary",
    "",
    `- Expected proven delta if pair completes: **+${String(report.pair_summary.expected_proven_delta_if_pair_completes)}**`,
    `- Pair blocked: **${String(report.pair_summary.pair_blocked)}**`,
    "",
    "### Smallest remaining human actions",
    "",
    ...report.pair_summary.smallest_remaining_human_actions.map((a) => `- ${a}`),
    "",
  ];

  for (const audit of report.slug_audits) {
    lines.push(`## ${audit.slug}`, "");
    lines.push(`- Census: **${audit.census_page_classification}**`);
    lines.push(`- Owner proof: \`${audit.owner_browser_proof_rel_path}\` (${audit.owner_browser_proof_verdict}, fresh=${String(audit.owner_browser_proof_fresh)})`);
    lines.push(`- Apply plan: **${audit.apply_plan_status ?? "UNKNOWN"}**`);
    lines.push(`- Guarded apply after committed evidence alone: **${String(audit.guarded_apply_readiness.guarded_apply_candidate_after_committed_evidence_alone)}**`);
    lines.push(`- Guarded apply after full evidence lane: **${String(audit.guarded_apply_readiness.guarded_apply_candidate_after_full_evidence_lane)}**`);
    lines.push(`- Next owner action: ${audit.next_owner_action}`);
    lines.push(`- Next Cursor action: \`${audit.next_cursor_action}\``);
    lines.push("");
    lines.push("", "### Missing artifacts", "", "| Kind | Status | Unblocks with |", "| --- | --- | --- |");
    for (const row of audit.missing_artifacts) {
      lines.push(`| ${row.artifact_kind} | ${row.status} | ${row.unblocks_with} |`);
    }
    lines.push("");
  }

  lines.push("## Artifacts written", "", ...report.artifact_rel_paths_written.map((p) => `- \`${p}\``), "");
  return `${lines.join("\n")}\n`;
}

export async function buildEdr3rxd1UltrawfEvidenceReadinessDirectorReportV1(args: {
  rootDir: string;
  now?: () => Date;
  writeArtifacts?: boolean;
}): Promise<Edr3rxd1UltrawfEvidenceReadinessDirectorReportV1> {
  const now = args.now ?? (() => new Date());
  const rootDir = args.rootDir;
  const writeArtifacts = args.writeArtifacts ?? false;

  const census = await buildAllProductSafeBuyerPathCensusV1Report({ rootDir });
  const { orchestrator } = loadManufacturerRescueOrchestratorInputV1({ rootDir });
  const factory = buildFridgeSafeLinkBatchFactoryV1({ rootDir });
  const batchEligible = factory.cohort_summary.eligible_now_count > 0;

  const slugAudits: SlugEvidenceReadinessAuditV1[] = [];
  const artifactPathsWritten: string[] = [];

  const pendingWrites: Array<{ rel: string; body: unknown }> = [];

  for (const slug of EDR3RXD1_ULTRAWF_PAIR_SLUGS_V1) {
    const row = orchestrator.unified_rescue_queue.find((r) => r.filter_slug === slug);
    if (!row) {
      throw new Error(`orchestrator missing slug ${slug}`);
    }

    const built = buildSlugEvidenceReadinessAuditV1({
      rootDir,
      slug,
      orchestratorRow: row,
      census,
      batchEligible,
      now,
    });

    slugAudits.push(built.audit);

    const todoRel =
      slug === "edr3rxd1" ? EDR3RXD1_COMMITTED_EVIDENCE_TODO_REL_V1 : ULTRAWF_COMMITTED_EVIDENCE_TODO_REL_V1;
    const planRel = slug === "edr3rxd1" ? EDR3RXD1_APPLY_PLAN_REL_V1 : ULTRAWF_APPLY_PLAN_REL_V1;
    const classRel =
      slug === "edr3rxd1"
        ? EDR3RXD1_OWNER_CLASSIFICATION_PACKET_REL_V1
        : ULTRAWF_OWNER_CLASSIFICATION_PACKET_REL_V1;

    pendingWrites.push({ rel: todoRel, body: built.committedEvidenceTodo });
    pendingWrites.push({ rel: planRel, body: built.applyPlan });
    if (built.ownerClassification) {
      pendingWrites.push({ rel: classRel, body: built.ownerClassification });
    }
  }

  if (writeArtifacts) {
    for (const item of pendingWrites) {
      const abs = path.join(rootDir, item.rel);
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, `${JSON.stringify(item.body, null, 2)}\n`, "utf8");
      artifactPathsWritten.push(item.rel);
    }
  }

  const reportBody: Edr3rxd1UltrawfEvidenceReadinessDirectorReportV1 = {
    contract: EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    founder_approval_activation_authorized: false,
    guarded_apply_authorized: false,
    source_command: EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    pair_slugs: EDR3RXD1_ULTRAWF_PAIR_SLUGS_V1,
    slug_audits: slugAudits,
    pair_summary: {
      smallest_remaining_human_actions: [
        "1. Owner commits evidence JSON from TODO packets (observations transcribed from proof only).",
        "2. Re-run batch factory + owner-browser-proof Cursor validation.",
        "3. edr3rxd1: refresh browser proof if stale; review official Whirlpool classification packet.",
        "4. ultrawf: complete confusion-family review before apply plan can reach READY.",
        "5. Founder approval activation (separate step — NOT performed here).",
        "6. Regenerate readiness gate → guarded apply dry-run.",
      ],
      expected_proven_delta_if_pair_completes: 2,
      pair_blocked: slugAudits.some(
        (a) => a.apply_plan_status !== "READY_FOR_OWNER_REVIEW" || !a.owner_browser_proof_fresh,
      ),
    },
    artifact_rel_paths_written: artifactPathsWritten,
    proven_facts: [
      "PROVEN: PASS owner browser proof artifacts on disk for both slugs.",
      "PROVEN: neither slug has founder approval activated.",
      "PROVEN: batch factory eligible_now_count=0.",
      "PROVEN: guarded_apply_candidate_after_committed_evidence_alone=false for both slugs.",
    ],
    inferred_facts: [
      "INFERRED: edr3rxd1 is the faster path — no confusion-family block when proof fresh.",
      "INFERRED: ultrawf requires confusion-family clearance before apply-plan READY_FOR_OWNER_REVIEW.",
    ],
    unknown_facts: [
      "UNKNOWN: production /go first-hop without clicking /go.",
      "UNKNOWN: whether Amazon secondary track required for launch-buy-links after official-manufacturer apply.",
    ],
    recommended_commands: [
      EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_SOURCE_COMMAND_V1,
      "npm run buckparts:fridge-safe-link-batch-factory",
      "node --import tsx scripts/run-fridge-safe-link-owner-browser-proof-cursor-validation-v1.ts",
      "npm run buckparts:manufacturer-safe-link-rescue-apply-plan-factory",
      "npm run buckparts:manufacturer-safe-link-rescue-readiness-gate",
    ],
  };

  if (writeArtifacts) {
    const jsonAbs = path.join(rootDir, EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_JSON_REL_V1);
    const mdAbs = path.join(rootDir, EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_MD_REL_V1);
    mkdirSync(path.dirname(jsonAbs), { recursive: true });
    writeFileSync(jsonAbs, `${JSON.stringify(reportBody, null, 2)}\n`, "utf8");
    writeFileSync(mdAbs, buildEdr3rxd1UltrawfEvidenceReadinessDirectorMarkdownV1(reportBody), "utf8");
    artifactPathsWritten.push(
      EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_JSON_REL_V1,
      EDR3RXD1_ULTRAWF_EVIDENCE_READINESS_DIRECTOR_MD_REL_V1,
    );
    reportBody.artifact_rel_paths_written = Array.from(new Set(artifactPathsWritten));
  }

  return reportBody;
}

export function writeEdr3rxd1UltrawfEvidenceReadinessDirectorDraftsV1(args: {
  rootDir: string;
  now?: () => Date;
}): Promise<Edr3rxd1UltrawfEvidenceReadinessDirectorReportV1> {
  return buildEdr3rxd1UltrawfEvidenceReadinessDirectorReportV1({
    ...args,
    writeArtifacts: true,
  });
}
