/**
 * Manufacturer Safe Link Rescue Apply Plan Factory v1 — read-only apply-plan proposals
 * from proven browser evidence. Does not mutate CSV, promote READY_FOR_APPLY, or auto-approve.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import { mapSignalsToRetailerLinkState, RETAILER_LINK_STATES } from "@/lib/retailers/retailer-link-state";

import {
  FRIGIDAIRE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1,
  frigidaireConfusionFamilyReviewIsUnresolvedV1,
} from "./manufacturer-safe-link-rescue-frigidaire-config-v1";
import { EVERYDROP_WRONG_FAMILY_FORBIDDEN_TOKENS_V1 } from "./manufacturer-safe-link-rescue-everydrop-whirlpool-config-v1";
import { GE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1 } from "./manufacturer-safe-link-rescue-ge-config-v1";
import { isManufacturerRescueGuardedApplyCandidateV1 } from "./manufacturer-safe-link-rescue-director-v1";
import {
  assessExactToken,
  assessForbiddenTokensWrongFamily,
  normManufacturerToken,
  READ_ONLY_MUTATION_FLAGS_V1,
  type WrongFamilyAssessmentV1,
} from "./manufacturer-safe-link-rescue-framework-v1";
import { loadManufacturerRescueOrchestratorInputV1 } from "./manufacturer-safe-link-rescue-director-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
  type ManufacturerRescueOrchestratorQueueRowV1,
  type ManufacturerRescueOrchestratorReportV1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";
import {
  assessManufacturerRescueBrowserProofFreshnessV1,
  loadManufacturerRescueOwnerBrowserProofArtifactV1,
  MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1,
  manufacturerRescueOwnerProofCheckedAtV1,
  manufacturerRescueOwnerProofOfficialPassV1,
  officialUrlFromManufacturerRescueOwnerProofV1,
} from "./manufacturer-safe-link-rescue-owner-browser-proof-evidence-v1";

export const MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_CONTRACT_V1 =
  "manufacturer_safe_link_rescue_apply_plan_factory_v1" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1 =
  "manufacturer_safe_link_rescue_apply_plan_v1" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-factory-v1.json" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_OWNER_REVIEW_PACKET_MD_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-owner-review-packet-v1.md" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_SOURCE_COMMAND_V1 =
  "npm run buckparts:manufacturer-safe-link-rescue-apply-plan-factory" as const;

export const RETAILER_LINKS_CSV_REL_V1 = "data/retailer_links.csv" as const;

export const MANUFACTURER_RESCUE_APPLY_PLAN_STATUSES_V1 = [
  "READY_FOR_OWNER_REVIEW",
  "BLOCKED_MISSING_BROWSER_PROOF",
  "BLOCKED_STALE_BROWSER_PROOF",
  "BLOCKED_CONFUSION_FAMILY_REVIEW",
  "BLOCKED_WRONG_FAMILY_RISK",
  "BLOCKED_MISSING_CURRENT_CSV_ROW",
  "BLOCKED_DESTINATION_URL_MISMATCH",
  "BLOCKED_SUPERSESSION_REVIEW",
  "BLOCKED_NOT_GUARDED_APPLY_CANDIDATE",
  "UNKNOWN",
] as const;

export type ManufacturerRescueApplyPlanStatusV1 =
  (typeof MANUFACTURER_RESCUE_APPLY_PLAN_STATUSES_V1)[number];

export type ManufacturerRescueRetailerLinksCsvRowSnapshotV1 = {
  filter_slug: string;
  retailer_name: string | null;
  affiliate_url: string | null;
  is_primary: boolean | null;
  sort_order: string | null;
  retailer_key: string | null;
  browser_truth_classification: string | null;
  browser_truth_notes: string | null;
  browser_truth_checked_at: string | null;
};

export type ManufacturerRescueApplyPlanProposedCsvRowV1 = ManufacturerRescueRetailerLinksCsvRowSnapshotV1 & {
  customer_visible_label: "BuckParts Verified Link";
  label_subtype: string;
};

export type ManufacturerRescueExactTokenEvidenceSummaryV1 = {
  mode: "title_h1_word_boundary" | "identity_blob_includes";
  proven: boolean | "UNKNOWN";
  notes: string;
};

export type ManufacturerRescueApplyPlanV1 = {
  contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  browser_automation_authorized: false;
  coverage_unlocked: false;
  generated_at: string;
  source_command: typeof MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_SOURCE_COMMAND_V1;
  filter_slug: string;
  manufacturer_key: string;
  oem_part_token: string;
  plan_status: ManufacturerRescueApplyPlanStatusV1;
  owner_approval_required: true;
  readiness_gate_required_after_owner_approval: true;
  proof_artifact_path: string | null;
  browser_proof_checked_at: string | null;
  official_destination_url: string | null;
  retailer_key: string;
  retailer_slug: string;
  browser_truth_classification: "direct_buyable";
  exact_token_evidence: ManufacturerRescueExactTokenEvidenceSummaryV1;
  wrong_family_evidence: WrongFamilyAssessmentV1;
  current_csv_row: ManufacturerRescueRetailerLinksCsvRowSnapshotV1 | null;
  proposed_csv_row: ManufacturerRescueApplyPlanProposedCsvRowV1 | null;
  blockers: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type ManufacturerRescueApplyPlanFactorySlugResultV1 = {
  filter_slug: string;
  manufacturer_key: string;
  plan_status: ManufacturerRescueApplyPlanStatusV1;
  apply_plan_artifact_rel_path: string | null;
  blockers: string[];
};

export type ManufacturerRescueApplyPlanFactoryReportV1 = {
  contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  browser_automation_authorized: false;
  coverage_unlocked: false;
  generated_at: string;
  source_command: typeof MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_SOURCE_COMMAND_V1;
  orchestrator_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1;
  orchestrator_generated_at: string;
  browser_proof_max_age_days: number;
  candidate_count: number;
  ready_for_owner_review_count: number;
  blocked_count: number;
  apply_plans_written: string[];
  slug_results: ManufacturerRescueApplyPlanFactorySlugResultV1[];
  inspect_summary: {
    recommended_next_action: string;
    readiness_gate_promotion_authority_note: string;
  };
  proven_facts: string[];
  unknown_facts: string[];
};

type RetailerLinkCsvRow = {
  filter_slug?: string;
  retailer_name?: string;
  affiliate_url?: string;
  is_primary?: string;
  sort_order?: string;
  retailer_key?: string;
  browser_truth_classification?: string;
  browser_truth_notes?: string;
  browser_truth_checked_at?: string;
};

type ManufacturerProposalMetaV1 = {
  retailer_name: string;
  retailer_key: "oem-parts-catalog";
  retailer_slug: "oem-parts-catalog";
  label_subtype: string;
  exact_token_mode: "title_h1_word_boundary" | "identity_blob_includes";
  forbidden_by_slug: Readonly<Record<string, readonly string[]>>;
};

const MANUFACTURER_PROPOSAL_META_V1: Readonly<Record<string, ManufacturerProposalMetaV1>> = {
  ge_appliance_parts: {
    retailer_name: "GE Appliance Parts",
    retailer_key: "oem-parts-catalog",
    retailer_slug: "oem-parts-catalog",
    label_subtype: "official_manufacturer_official_ge",
    exact_token_mode: "title_h1_word_boundary",
    forbidden_by_slug: GE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1,
  },
  everydrop_whirlpool: {
    retailer_name: "Whirlpool",
    retailer_key: "oem-parts-catalog",
    retailer_slug: "oem-parts-catalog",
    label_subtype: "official_manufacturer_official_whirlpool",
    exact_token_mode: "identity_blob_includes",
    forbidden_by_slug: EVERYDROP_WRONG_FAMILY_FORBIDDEN_TOKENS_V1,
  },
  frigidaire: {
    retailer_name: "Frigidaire",
    retailer_key: "oem-parts-catalog",
    retailer_slug: "oem-parts-catalog",
    label_subtype: "official_manufacturer_official_frigidaire",
    exact_token_mode: "title_h1_word_boundary",
    forbidden_by_slug: FRIGIDAIRE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1,
  },
};

export function manufacturerSafeLinkRescueApplyPlanRelV1(slug: string): string {
  return `data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-${slug.trim().toLowerCase()}-v1.json`;
}

function normalizeUrlForCompare(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, "");
  }
}

function snapshotCsvRow(row: RetailerLinkCsvRow): ManufacturerRescueRetailerLinksCsvRowSnapshotV1 {
  const slug = (row.filter_slug ?? "").trim().toLowerCase();
  return {
    filter_slug: slug,
    retailer_name: row.retailer_name?.trim() || null,
    affiliate_url: row.affiliate_url?.trim() || null,
    is_primary: row.is_primary?.trim().toLowerCase() === "true" ? true : null,
    sort_order: row.sort_order?.trim() || null,
    retailer_key: row.retailer_key?.trim() || null,
    browser_truth_classification: row.browser_truth_classification?.trim() || null,
    browser_truth_notes: row.browser_truth_notes?.trim() || null,
    browser_truth_checked_at: row.browser_truth_checked_at?.trim() || null,
  };
}

function loadPrimaryRetailerLinkRow(args: {
  rootDir: string;
  slug: string;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): ManufacturerRescueRetailerLinksCsvRowSnapshotV1 | null {
  const abs = path.join(args.rootDir, RETAILER_LINKS_CSV_REL_V1);
  if (!args.fileExists(abs)) return null;
  try {
    const rows = parse(args.readText(abs), {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as RetailerLinkCsvRow[];
    const slug = args.slug.trim().toLowerCase();
    const primary =
      rows.find(
        (r) =>
          r.filter_slug?.trim().toLowerCase() === slug &&
          r.is_primary?.trim().toLowerCase() === "true",
      ) ?? rows.find((r) => r.filter_slug?.trim().toLowerCase() === slug);
    return primary ? snapshotCsvRow(primary) : null;
  } catch {
    return null;
  }
}

function proofObservationBlob(
  artifact: NonNullable<ReturnType<typeof loadManufacturerRescueOwnerBrowserProofArtifactV1>["artifact"]>,
): string {
  const parts: string[] = [];
  for (const row of artifact.owner_proof_urls ?? []) {
    parts.push(row.url ?? "");
    for (const obs of row.proven_observations ?? []) parts.push(obs);
  }
  return parts.join("\n");
}

function assessWrongFamilyForSlug(args: {
  slug: string;
  oemPartToken: string;
  manufacturerKey: string;
  officialUrl: string | null;
  proofBlob: string;
}): WrongFamilyAssessmentV1 {
  const meta = MANUFACTURER_PROPOSAL_META_V1[args.manufacturerKey];
  const forbiddenBySlug = meta?.forbidden_by_slug ?? {};
  return assessForbiddenTokensWrongFamily({
    filterSlug: args.slug,
    oemPartToken: args.oemPartToken,
    forbiddenBySlug,
    finalUrl: args.officialUrl ?? undefined,
    title: args.oemPartToken,
    h1Text: args.oemPartToken,
    textSample: args.proofBlob,
  });
}

function assessExactTokenForSlug(args: {
  slug: string;
  oemPartToken: string;
  manufacturerKey: string;
  proofBlob: string;
}): ManufacturerRescueExactTokenEvidenceSummaryV1 {
  const meta = MANUFACTURER_PROPOSAL_META_V1[args.manufacturerKey];
  const mode = meta?.exact_token_mode ?? "title_h1_word_boundary";
  const proven = assessExactToken({
    mode,
    oemPartToken: args.oemPartToken,
    title: args.oemPartToken,
    h1Text: args.oemPartToken,
    textSample: args.proofBlob,
  });
  return {
    mode,
    proven,
    notes: proven
      ? `exact token ${args.oemPartToken} proven in owner browser proof observations`
      : `exact token ${args.oemPartToken} not proven in owner browser proof observations`,
  };
}

function hasUnresolvedConfusionFamilyReview(args: {
  row: ManufacturerRescueOrchestratorQueueRowV1;
  rootDir: string;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): boolean {
  return frigidaireConfusionFamilyReviewIsUnresolvedV1({
    rootDir: args.rootDir,
    filterSlug: args.row.filter_slug,
    blockedReasons: args.row.blocked_reasons,
    fileExists: args.fileExists,
    readText: args.readText,
  });
}

function hasUnresolvedSupersessionReview(row: ManufacturerRescueOrchestratorQueueRowV1): boolean {
  return (
    row.blocked_reasons.includes("supersession_review_required") ||
    (row.owner_review_readiness === "SUPERSESSION_REVIEW" &&
      row.blocked_reasons.some((r) => r.includes("supersession")))
  );
}

function buildProposedCsvRow(args: {
  slug: string;
  current: ManufacturerRescueRetailerLinksCsvRowSnapshotV1;
  officialUrl: string;
  checkedAt: string;
  meta: ManufacturerProposalMetaV1;
  proofRel: string;
}): ManufacturerRescueApplyPlanProposedCsvRowV1 {
  const notes = `Manufacturer rescue apply plan v1; owner browser proof ${args.proofRel}; BuckParts Verified Link (${args.meta.label_subtype}).`;
  return {
    filter_slug: args.slug,
    retailer_name: args.meta.retailer_name,
    affiliate_url: args.officialUrl,
    is_primary: true,
    sort_order: args.current.sort_order,
    retailer_key: args.meta.retailer_key,
    browser_truth_classification: "direct_buyable",
    browser_truth_notes: notes,
    browser_truth_checked_at: args.checkedAt,
    customer_visible_label: "BuckParts Verified Link",
    label_subtype: args.meta.label_subtype,
  };
}

export function buildManufacturerRescueApplyPlanForSlugV1(args: {
  row: ManufacturerRescueOrchestratorQueueRowV1;
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerRescueApplyPlanV1 {
  const now = args.now ?? (() => new Date());
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const slug = args.row.filter_slug;
  const blockers: string[] = [];
  const proven_facts: string[] = [];
  const unknown_facts: string[] = [];

  const proofLoad = loadManufacturerRescueOwnerBrowserProofArtifactV1({
    rootDir: args.rootDir,
    filter_slug: slug,
    fileExists,
    readText,
  });
  const ownerProof = proofLoad.artifact;
  const proofRel = proofLoad.artifact_rel;
  const proofPass = manufacturerRescueOwnerProofOfficialPassV1(ownerProof);
  const checkedAt = manufacturerRescueOwnerProofCheckedAtV1(ownerProof);
  const officialUrl = officialUrlFromManufacturerRescueOwnerProofV1(ownerProof);
  const proofBlob = ownerProof ? proofObservationBlob(ownerProof) : "";

  let plan_status: ManufacturerRescueApplyPlanStatusV1 = "UNKNOWN";

  if (!ownerProof || !proofPass) {
    plan_status = "BLOCKED_MISSING_BROWSER_PROOF";
    blockers.push("browser_proof_missing_or_not_pass");
    return finalizePlan({
      args,
      now,
      plan_status,
      blockers,
      proven_facts,
      unknown_facts,
      proofRel,
      checkedAt,
      officialUrl,
      current: null,
      proposed: null,
      exactToken: {
        mode: "title_h1_word_boundary",
        proven: "UNKNOWN",
        notes: "browser proof missing",
      },
      wrongFamily: {
        blocked: false,
        forbidden_tokens_checked: [],
        detected_forbidden_tokens: [],
        notes: "not assessed — browser proof missing",
      },
    });
  }

  const freshness = assessManufacturerRescueBrowserProofFreshnessV1({
    artifact: ownerProof,
    now: args.now,
  });
  if (!freshness.fresh) {
    plan_status = "BLOCKED_STALE_BROWSER_PROOF";
    blockers.push("browser_proof_stale_or_invalid_timestamp");
    return finalizePlan({
      args,
      now,
      plan_status,
      blockers,
      proven_facts,
      unknown_facts,
      proofRel,
      checkedAt,
      officialUrl,
      current: null,
      proposed: null,
      exactToken: assessExactTokenForSlug({
        slug,
        oemPartToken: args.row.oem_part_token,
        manufacturerKey: args.row.manufacturer_key,
        proofBlob,
      }),
      wrongFamily: assessWrongFamilyForSlug({
        slug,
        oemPartToken: args.row.oem_part_token,
        manufacturerKey: args.row.manufacturer_key,
        officialUrl,
        proofBlob,
      }),
    });
  }

  if (
    hasUnresolvedConfusionFamilyReview({
      row: args.row,
      rootDir: args.rootDir,
      fileExists,
      readText,
    })
  ) {
    plan_status = "BLOCKED_CONFUSION_FAMILY_REVIEW";
    blockers.push("confusion_family_review_required");
    return finalizePlan({
      args,
      now,
      plan_status,
      blockers,
      proven_facts,
      unknown_facts,
      proofRel,
      checkedAt,
      officialUrl,
      current: null,
      proposed: null,
      exactToken: assessExactTokenForSlug({
        slug,
        oemPartToken: args.row.oem_part_token,
        manufacturerKey: args.row.manufacturer_key,
        proofBlob,
      }),
      wrongFamily: assessWrongFamilyForSlug({
        slug,
        oemPartToken: args.row.oem_part_token,
        manufacturerKey: args.row.manufacturer_key,
        officialUrl,
        proofBlob,
      }),
    });
  }

  if (hasUnresolvedSupersessionReview(args.row)) {
    plan_status = "BLOCKED_SUPERSESSION_REVIEW";
    blockers.push("supersession_review_required");
    return finalizePlan({
      args,
      now,
      plan_status,
      blockers,
      proven_facts,
      unknown_facts,
      proofRel,
      checkedAt,
      officialUrl,
      current: null,
      proposed: null,
      exactToken: assessExactTokenForSlug({
        slug,
        oemPartToken: args.row.oem_part_token,
        manufacturerKey: args.row.manufacturer_key,
        proofBlob,
      }),
      wrongFamily: assessWrongFamilyForSlug({
        slug,
        oemPartToken: args.row.oem_part_token,
        manufacturerKey: args.row.manufacturer_key,
        officialUrl,
        proofBlob,
      }),
    });
  }

  const wrongFamily = assessWrongFamilyForSlug({
    slug,
    oemPartToken: args.row.oem_part_token,
    manufacturerKey: args.row.manufacturer_key,
    officialUrl,
    proofBlob,
  });
  if (wrongFamily.blocked) {
    plan_status = "BLOCKED_WRONG_FAMILY_RISK";
    blockers.push("wrong_family_token_detected");
    return finalizePlan({
      args,
      now,
      plan_status,
      blockers,
      proven_facts,
      unknown_facts,
      proofRel,
      checkedAt,
      officialUrl,
      current: null,
      proposed: null,
      exactToken: assessExactTokenForSlug({
        slug,
        oemPartToken: args.row.oem_part_token,
        manufacturerKey: args.row.manufacturer_key,
        proofBlob,
      }),
      wrongFamily,
    });
  }

  if (!isManufacturerRescueGuardedApplyCandidateV1(args.row)) {
    plan_status = "BLOCKED_NOT_GUARDED_APPLY_CANDIDATE";
    blockers.push("not_guarded_apply_direct_buyable_candidate");
    return finalizePlan({
      args,
      now,
      plan_status,
      blockers,
      proven_facts,
      unknown_facts,
      proofRel,
      checkedAt,
      officialUrl,
      current: null,
      proposed: null,
      exactToken: assessExactTokenForSlug({
        slug,
        oemPartToken: args.row.oem_part_token,
        manufacturerKey: args.row.manufacturer_key,
        proofBlob,
      }),
      wrongFamily,
    });
  }

  const exactToken = assessExactTokenForSlug({
    slug,
    oemPartToken: args.row.oem_part_token,
    manufacturerKey: args.row.manufacturer_key,
    proofBlob,
  });
  if (exactToken.proven !== true) {
    plan_status = "UNKNOWN";
    blockers.push("exact_token_not_proven_in_browser_proof");
    return finalizePlan({
      args,
      now,
      plan_status,
      blockers,
      proven_facts,
      unknown_facts,
      proofRel,
      checkedAt,
      officialUrl,
      current: null,
      proposed: null,
      exactToken,
      wrongFamily,
    });
  }

  if (!officialUrl) {
    plan_status = "UNKNOWN";
    blockers.push("official_destination_url_missing_from_browser_proof");
    return finalizePlan({
      args,
      now,
      plan_status,
      blockers,
      proven_facts,
      unknown_facts,
      proofRel,
      checkedAt,
      officialUrl,
      current: null,
      proposed: null,
      exactToken,
      wrongFamily,
    });
  }

  const repoUrl = args.row.repo_proven_official_target_url?.trim() || null;
  if (repoUrl && normalizeUrlForCompare(repoUrl) !== normalizeUrlForCompare(officialUrl)) {
    // Owner-proof official URL is authoritative. Only hard-block when the orchestrator
    // URL is also currently PASS in owner_proof_urls (true multi-official conflict).
    const repoAlsoProvenInOwnerProof = (ownerProof?.owner_proof_urls ?? []).some((row) => {
      const rowUrl = (row.url ?? "").trim();
      if (!rowUrl) return false;
      if ((row.browser_proof_status ?? "").trim() !== "PASS") return false;
      const pathType = (row.path_type ?? "").trim();
      if (
        pathType !== "official_manufacturer_pdp" &&
        pathType !== "official_manufacturer_accessory_pdp" &&
        pathType !== "authorized_parts_distributor_pdp"
      ) {
        return false;
      }
      return normalizeUrlForCompare(rowUrl) === normalizeUrlForCompare(repoUrl);
    });
    if (repoAlsoProvenInOwnerProof) {
      plan_status = "BLOCKED_DESTINATION_URL_MISMATCH";
      blockers.push("official_proof_url_mismatch_vs_orchestrator_repo_proven_url");
      return finalizePlan({
        args,
        now,
        plan_status,
        blockers,
        proven_facts,
        unknown_facts,
        proofRel,
        checkedAt,
        officialUrl,
        current: null,
        proposed: null,
        exactToken,
        wrongFamily,
      });
    }
    unknown_facts.push(
      `orchestrator repo_proven_official_target_url=${repoUrl} differs from owner-proof official URL; using owner-proof URL ${officialUrl}`,
    );
  }

  const current = loadPrimaryRetailerLinkRow({
    rootDir: args.rootDir,
    slug,
    fileExists,
    readText,
  });
  if (!current) {
    plan_status = "BLOCKED_MISSING_CURRENT_CSV_ROW";
    blockers.push("retailer_links_csv_primary_row_missing");
    return finalizePlan({
      args,
      now,
      plan_status,
      blockers,
      proven_facts,
      unknown_facts,
      proofRel,
      checkedAt,
      officialUrl,
      current: null,
      proposed: null,
      exactToken,
      wrongFamily,
    });
  }

  const meta = MANUFACTURER_PROPOSAL_META_V1[args.row.manufacturer_key];
  if (!meta) {
    plan_status = "UNKNOWN";
    blockers.push(`unsupported_manufacturer_key=${args.row.manufacturer_key}`);
    return finalizePlan({
      args,
      now,
      plan_status,
      blockers,
      proven_facts,
      unknown_facts,
      proofRel,
      checkedAt,
      officialUrl,
      current,
      proposed: null,
      exactToken,
      wrongFamily,
    });
  }

  if (
    current.browser_truth_classification === "direct_buyable" &&
    current.affiliate_url &&
    normalizeUrlForCompare(current.affiliate_url) === normalizeUrlForCompare(officialUrl)
  ) {
    plan_status = "UNKNOWN";
    blockers.push("repo_csv_already_direct_buyable_at_official_destination");
    return finalizePlan({
      args,
      now,
      plan_status,
      blockers,
      proven_facts,
      unknown_facts,
      proofRel,
      checkedAt,
      officialUrl,
      current,
      proposed: null,
      exactToken,
      wrongFamily,
    });
  }

  const proposed = buildProposedCsvRow({
    slug,
    current,
    officialUrl,
    checkedAt: checkedAt ?? now().toISOString(),
    meta,
    proofRel: proofRel ?? "UNKNOWN",
  });

  const gate = buyLinkGateFailureKind(
    {
      retailer_key: proposed.retailer_key,
      affiliate_url: proposed.affiliate_url ?? "",
      browser_truth_classification: proposed.browser_truth_classification,
      browser_truth_buyable_subtype: null,
      browser_truth_notes: proposed.browser_truth_notes,
      browser_truth_checked_at: proposed.browser_truth_checked_at,
    },
    { now: now() },
  );
  const linkState = mapSignalsToRetailerLinkState({
    browserTruthClassification: proposed.browser_truth_classification,
    gateFailureKind: gate,
  });
  if (gate !== null || linkState !== RETAILER_LINK_STATES.LIVE_DIRECT_BUYABLE) {
    plan_status = "UNKNOWN";
    blockers.push(
      `proposed_row_not_live_direct_buyable:${linkState}${gate ? `:gate=${gate}` : ""}`,
    );
    return finalizePlan({
      args,
      now,
      plan_status,
      blockers,
      proven_facts,
      unknown_facts,
      proofRel,
      checkedAt,
      officialUrl,
      current,
      proposed,
      exactToken,
      wrongFamily,
    });
  }

  plan_status = "READY_FOR_OWNER_REVIEW";
  proven_facts.push(
    `PROVEN: owner browser proof PASS with fresh checked_at=${checkedAt ?? "UNKNOWN"}.`,
    `PROVEN: official destination ${officialUrl} matches orchestrator repo truth when present.`,
    "PROVEN: apply plan is read-only — owner_approval_required=true; csv_apply_authorized=false.",
    "PROVEN: manufacturer_safe_link_rescue_readiness_gate_v1 remains sole READY_FOR_APPLY promotion authority.",
  );

  return finalizePlan({
    args,
    now,
    plan_status,
    blockers,
    proven_facts,
    unknown_facts,
    proofRel,
    checkedAt,
    officialUrl,
    current,
    proposed,
    exactToken,
    wrongFamily,
  });
}

function finalizePlan(args: {
  args: { row: ManufacturerRescueOrchestratorQueueRowV1 };
  now: () => Date;
  plan_status: ManufacturerRescueApplyPlanStatusV1;
  blockers: string[];
  proven_facts: string[];
  unknown_facts: string[];
  proofRel: string | null;
  checkedAt: string | null;
  officialUrl: string | null;
  current: ManufacturerRescueRetailerLinksCsvRowSnapshotV1 | null;
  proposed: ManufacturerRescueApplyPlanProposedCsvRowV1 | null;
  exactToken: ManufacturerRescueExactTokenEvidenceSummaryV1;
  wrongFamily: WrongFamilyAssessmentV1;
}): ManufacturerRescueApplyPlanV1 {
  const meta = MANUFACTURER_PROPOSAL_META_V1[args.args.row.manufacturer_key];
  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1,
    ...READ_ONLY_MUTATION_FLAGS_V1,
    browser_automation_authorized: false,
    generated_at: args.now().toISOString(),
    source_command: MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_SOURCE_COMMAND_V1,
    filter_slug: args.args.row.filter_slug,
    manufacturer_key: args.args.row.manufacturer_key,
    oem_part_token: normManufacturerToken(args.args.row.oem_part_token),
    plan_status: args.plan_status,
    owner_approval_required: true,
    readiness_gate_required_after_owner_approval: true,
    proof_artifact_path: args.proofRel,
    browser_proof_checked_at: args.checkedAt,
    official_destination_url: args.officialUrl,
    retailer_key: meta?.retailer_key ?? "oem-parts-catalog",
    retailer_slug: meta?.retailer_slug ?? "oem-parts-catalog",
    browser_truth_classification: "direct_buyable",
    exact_token_evidence: args.exactToken,
    wrong_family_evidence: args.wrongFamily,
    current_csv_row: args.current,
    proposed_csv_row: args.proposed,
    blockers: args.blockers,
    proven_facts: args.proven_facts,
    unknown_facts: args.unknown_facts,
  };
}

export function buildManufacturerSafeLinkRescueApplyPlanFactoryV1(args: {
  rootDir: string;
  orchestrator?: ManufacturerRescueOrchestratorReportV1;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerRescueApplyPlanFactoryReportV1 {
  const now = args.now ?? (() => new Date());
  const orchestrator =
    args.orchestrator ??
    loadManufacturerRescueOrchestratorInputV1({
      rootDir: args.rootDir,
      now: args.now,
      fileExists: args.fileExists,
      readTextFile: args.readText,
    }).orchestrator;

  const rescueRows = orchestrator.unified_rescue_queue.filter(
    (r) => r.cohort_lane !== "REFERENCE_ALREADY_APPLIED",
  );

  const slug_results: ManufacturerRescueApplyPlanFactorySlugResultV1[] = [];
  const apply_plans_written: string[] = [];

  for (const row of rescueRows) {
    const plan = buildManufacturerRescueApplyPlanForSlugV1({
      row,
      rootDir: args.rootDir,
      now: args.now,
      fileExists: args.fileExists,
      readText: args.readText,
    });
    const rel =
      plan.plan_status === "READY_FOR_OWNER_REVIEW"
        ? manufacturerSafeLinkRescueApplyPlanRelV1(row.filter_slug)
        : null;
    slug_results.push({
      filter_slug: row.filter_slug,
      manufacturer_key: row.manufacturer_key,
      plan_status: plan.plan_status,
      apply_plan_artifact_rel_path: rel,
      blockers: plan.blockers,
    });
    if (rel) apply_plans_written.push(rel);
  }

  const ready_for_owner_review_count = slug_results.filter(
    (r) => r.plan_status === "READY_FOR_OWNER_REVIEW",
  ).length;

  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_CONTRACT_V1,
    ...READ_ONLY_MUTATION_FLAGS_V1,
    browser_automation_authorized: false,
    generated_at: now().toISOString(),
    source_command: MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_SOURCE_COMMAND_V1,
    orchestrator_contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    orchestrator_generated_at: orchestrator.generated_at,
    browser_proof_max_age_days: MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1,
    candidate_count: rescueRows.length,
    ready_for_owner_review_count,
    blocked_count: slug_results.length - ready_for_owner_review_count,
    apply_plans_written,
    slug_results,
    inspect_summary: {
      recommended_next_action:
        ready_for_owner_review_count > 0
          ? `Owner review ${String(ready_for_owner_review_count)} manufacturer rescue apply-plan artifact(s); founder owner_mutation_approved required before guarded CSV apply; regenerate readiness gate after plans committed.`
          : "No READY_FOR_OWNER_REVIEW apply plans — resolve browser proof, confusion-family, or CSV blockers first.",
      readiness_gate_promotion_authority_note:
        "manufacturer_safe_link_rescue_readiness_gate_v1 remains sole READY_FOR_APPLY promotion authority — apply plans do not grant apply slots.",
    },
    proven_facts: [
      "PROVEN: Factory is read-only — no CSV, Supabase, SQL, or production mutation authorized.",
      "PROVEN: owner_approval_required=true on every apply plan artifact.",
      `PROVEN: evaluated ${String(rescueRows.length)} orchestrator rescue row(s).`,
      `PROVEN: ${String(ready_for_owner_review_count)} apply plan(s) READY_FOR_OWNER_REVIEW.`,
      "PROVEN: Readiness Gate remains sole READY_FOR_APPLY promotion authority.",
    ],
    unknown_facts: [
      "UNKNOWN: Live production buyer-path parity until post-apply census re-run.",
    ],
  };
}

export function buildManufacturerSafeLinkRescueApplyPlanOwnerReviewPacketMarkdownV1(args: {
  factory: ManufacturerRescueApplyPlanFactoryReportV1;
  plans: ManufacturerRescueApplyPlanV1[];
}): string {
  const lines = [
    "# Manufacturer safe-link rescue apply plan owner review packet v1",
    "",
    `- generated_at: **${args.factory.generated_at}**`,
    `- orchestrator_generated_at: **${args.factory.orchestrator_generated_at}**`,
    `- ready_for_owner_review_count: **${String(args.factory.ready_for_owner_review_count)}**`,
    `- blocked_count: **${String(args.factory.blocked_count)}**`,
    "",
    "## Authorization",
    "",
    "- mutation_authorized: **false**",
    "- csv_apply_authorized: **false**",
    "- owner_approval_required: **true**",
    "- readiness_gate_required_after_owner_approval: **true**",
    "",
    "## Promotion authority",
    "",
    args.factory.inspect_summary.readiness_gate_promotion_authority_note,
    "",
    "## Ready for owner review",
    "",
  ];

  const readyPlans = args.plans.filter((p) => p.plan_status === "READY_FOR_OWNER_REVIEW");
  if (readyPlans.length === 0) {
    lines.push("_No apply plans ready for owner review._", "");
  } else {
    for (const plan of readyPlans) {
      lines.push(
        `### ${plan.filter_slug}`,
        `- manufacturer: **${plan.manufacturer_key}**`,
        `- official_destination_url: ${plan.official_destination_url ?? "UNKNOWN"}`,
        `- proof_artifact_path: \`${plan.proof_artifact_path ?? "UNKNOWN"}\``,
        `- browser_proof_checked_at: **${plan.browser_proof_checked_at ?? "UNKNOWN"}**`,
        `- apply_plan_artifact: \`${manufacturerSafeLinkRescueApplyPlanRelV1(plan.filter_slug)}\``,
        `- current affiliate_url: ${plan.current_csv_row?.affiliate_url ?? "UNKNOWN"}`,
        `- proposed affiliate_url: ${plan.proposed_csv_row?.affiliate_url ?? "UNKNOWN"}`,
        `- exact_token_evidence: ${plan.exact_token_evidence.notes}`,
        `- wrong_family_evidence: ${plan.wrong_family_evidence.notes}`,
        "",
      );
    }
  }

  lines.push("## Blocked slugs", "");
  const blocked = args.factory.slug_results.filter((r) => r.plan_status !== "READY_FOR_OWNER_REVIEW");
  if (blocked.length === 0) {
    lines.push("_None._", "");
  } else {
    for (const row of blocked) {
      lines.push(
        `- **${row.filter_slug}** — ${row.plan_status}${
          row.blockers.length ? ` (${row.blockers.join(", ")})` : ""
        }`,
      );
    }
    lines.push("");
  }

  lines.push("## Recommended next action", "", args.factory.inspect_summary.recommended_next_action, "");
  return lines.join("\n");
}

export function writeManufacturerSafeLinkRescueApplyPlanFactoryArtifactsV1(args: {
  rootDir: string;
  factory: ManufacturerRescueApplyPlanFactoryReportV1;
  plans: ManufacturerRescueApplyPlanV1[];
}): {
  factoryJsonRelPath: string;
  ownerReviewMdRelPath: string;
  applyPlanRelPaths: string[];
} {
  const factoryAbs = path.join(args.rootDir, MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_JSON_REL_V1);
  const mdAbs = path.join(
    args.rootDir,
    MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_OWNER_REVIEW_PACKET_MD_REL_V1,
  );
  mkdirSync(path.dirname(factoryAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(factoryAbs, `${JSON.stringify(args.factory, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    `${buildManufacturerSafeLinkRescueApplyPlanOwnerReviewPacketMarkdownV1({
      factory: args.factory,
      plans: args.plans,
    })}\n`,
    "utf8",
  );

  const applyPlanRelPaths: string[] = [];
  for (const plan of args.plans) {
    if (plan.plan_status !== "READY_FOR_OWNER_REVIEW") continue;
    const rel = manufacturerSafeLinkRescueApplyPlanRelV1(plan.filter_slug);
    const abs = path.join(args.rootDir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    applyPlanRelPaths.push(rel);
  }

  return {
    factoryJsonRelPath: MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_JSON_REL_V1,
    ownerReviewMdRelPath: MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_OWNER_REVIEW_PACKET_MD_REL_V1,
    applyPlanRelPaths,
  };
}

export function buildManufacturerSafeLinkRescueApplyPlanFactoryPlansV1(args: {
  rootDir: string;
  orchestrator?: ManufacturerRescueOrchestratorReportV1;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): { factory: ManufacturerRescueApplyPlanFactoryReportV1; plans: ManufacturerRescueApplyPlanV1[] } {
  const orchestrator =
    args.orchestrator ??
    loadManufacturerRescueOrchestratorInputV1({
      rootDir: args.rootDir,
      now: args.now,
      fileExists: args.fileExists,
      readTextFile: args.readText,
    }).orchestrator;
  const rescueRows = orchestrator.unified_rescue_queue.filter(
    (r) => r.cohort_lane !== "REFERENCE_ALREADY_APPLIED",
  );
  const plans = rescueRows.map((row) =>
    buildManufacturerRescueApplyPlanForSlugV1({
      row,
      rootDir: args.rootDir,
      now: args.now,
      fileExists: args.fileExists,
      readText: args.readText,
    }),
  );
  const factory = buildManufacturerSafeLinkRescueApplyPlanFactoryV1({
    ...args,
    orchestrator,
  });
  return { factory, plans };
}

export function loadManufacturerSafeLinkRescueApplyPlanFactoryReportV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerRescueApplyPlanFactoryReportV1 | null {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(args.rootDir, MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_JSON_REL_V1);
  if (!fileExists(abs)) return null;
  try {
    const parsed = JSON.parse(readText(abs)) as ManufacturerRescueApplyPlanFactoryReportV1;
    if (parsed.contract !== MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_CONTRACT_V1) return null;
    return parsed;
  } catch {
    return null;
  }
}
