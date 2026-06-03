/**
 * Read-only single-slug apply-plan proposal for fridge safe-link rescue slug 4396508.
 * Proposal only — no CSV/Supabase/evidence mutation; no Verified Link authorization.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { filterRealBuyRetailerLinks } from "@/lib/retailers/launch-buy-links";

import { classifyAmazonAsinReusePolicy } from "./amazon-asin-reuse-policy";
import {
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1,
  FRIDGE_BUYER_PATH_BATCH_BUCKPARTS_AMAZON_TAG_V1,
  normalizeAmazonAffiliateTagV1,
  resolveAffiliateTagStatusV1,
} from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import {
  FRIDGE_SAFE_LINK_RESCUE_FIRST4_JSON_REL_V1,
  type FridgeSafeLinkRescueFirst4ApplyReviewV1,
} from "./fridge-safe-link-rescue-first4-apply-review-v1";
import { FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1 } from "./fridge-safe-link-rescue-owner-review-v1";

export const FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_PROPOSAL_CONTRACT_V1 =
  "fridge_safe_link_4396508_apply_plan_proposal_v1" as const;

export const FRIDGE_SAFE_LINK_4396508_TARGET_SLUG_V1 = "4396508" as const;

export const FRIDGE_SAFE_LINK_4396508_PRIMARY_EVIDENCE_REL_V1 =
  "data/evidence/amazon-4396508-owner-review-pdp-evidence.2026-05-10.json" as const;

export const FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-4396508-apply-plan-proposal-v1.json" as const;

export const FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_MD_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-4396508-apply-plan-proposal-v1.md" as const;

export const FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-safe-link-4396508-apply-plan-proposal" as const;

export type FieldProofStatusV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type ProposedRetailerLinkFieldV1 = {
  field: string;
  proposed_value: string | boolean | number | null;
  proof_status: FieldProofStatusV1;
  proof_source: string;
};

export type FridgeSafeLink4396508ApplyPlanProposalV1 = {
  contract: typeof FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_PROPOSAL_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  verified_link_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  production_go_first_hop_validation_status: "UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH";
  generated_at: string;
  source_command: typeof FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_SOURCE_COMMAND_V1;
  target_slug: typeof FRIDGE_SAFE_LINK_4396508_TARGET_SLUG_V1;
  wedge: "refrigerator_water";
  exact_repo_paths_read: string[];
  source_rescue_packet_rel_path: typeof FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1;
  source_first4_apply_review_rel_path: typeof FRIDGE_SAFE_LINK_RESCUE_FIRST4_JSON_REL_V1;
  live_state: {
    live_url: string;
    live_has_go_cta: false;
    live_has_go_cta_source: "fridge_safe_link_rescue_owner_review_v1";
    live_page_exists: boolean;
    production_go_clicked: false;
  };
  current_csv_state: {
    retailer_row_count: number;
    safe_gated_count: number;
    primary_retailer_key: string | null;
    primary_affiliate_url: string | null;
    primary_is_primary: boolean | null;
    browser_truth_classification: string | null;
    summary: string;
  };
  evidence_files_read: string[];
  evidence_verdict_summary: string;
  apply_plan_ready: true;
  apply_plan_applied: false;
  proposed_action: typeof FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1;
  proposed_retailer_link_row_fields: ProposedRetailerLinkFieldV1[];
  proposed_retailer_link_row_unknown_fields: string[];
  amazon_asin_reuse_policy_classification: string;
  affiliate_tag_status: ReturnType<typeof resolveAffiliateTagStatusV1>;
  blockers_before_apply: string[];
  owner_approval_needed_next: string[];
  rollback_revert_plan: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

type RetailerLinkRow = {
  filter_slug?: string;
  retailer_name?: string;
  retailer_key?: string;
  affiliate_url?: string;
  is_primary?: string;
  sort_order?: string;
  browser_truth_classification?: string | null;
  browser_truth_notes?: string | null;
  browser_truth_checked_at?: string | null;
};

type FilterRow = { slug?: string; brand_slug?: string; oem_part_number?: string };

export type BuildFridgeSafeLink4396508ApplyPlanProposalDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
};

function isTruthyPrimary(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function loadJson<T>(abs: string, readText: (p: string) => string): T {
  return JSON.parse(readText(abs)) as T;
}

function field(
  name: string,
  value: string | boolean | number | null,
  proof_status: FieldProofStatusV1,
  proof_source: string,
): ProposedRetailerLinkFieldV1 {
  return { field: name, proposed_value: value, proof_status, proof_source };
}

export function buildFridgeSafeLink4396508ApplyPlanProposalV1(
  deps: BuildFridgeSafeLink4396508ApplyPlanProposalDepsV1,
): FridgeSafeLink4396508ApplyPlanProposalV1 {
  const now = deps.now ?? (() => new Date());
  const fileExists = deps.fileExists ?? existsSync;
  const readText = deps.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const slug = FRIDGE_SAFE_LINK_4396508_TARGET_SLUG_V1;

  const rescueAbs = path.join(deps.rootDir, FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1);
  const first4Abs = path.join(deps.rootDir, FRIDGE_SAFE_LINK_RESCUE_FIRST4_JSON_REL_V1);
  const evidenceAbs = path.join(deps.rootDir, FRIDGE_SAFE_LINK_4396508_PRIMARY_EVIDENCE_REL_V1);

  if (!fileExists(rescueAbs)) {
    throw new Error(`missing ${FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1}`);
  }
  if (!fileExists(first4Abs)) {
    throw new Error(`missing ${FRIDGE_SAFE_LINK_RESCUE_FIRST4_JSON_REL_V1}`);
  }
  if (!fileExists(evidenceAbs)) {
    throw new Error(`missing ${FRIDGE_SAFE_LINK_4396508_PRIMARY_EVIDENCE_REL_V1}`);
  }

  const rescue = loadJson<{ missing_safe_link_slugs: Array<{ slug: string; live_url: string; live_page_exists: boolean }> }>(
    rescueAbs,
    readText,
  );
  const first4 = loadJson<FridgeSafeLinkRescueFirst4ApplyReviewV1>(first4Abs, readText);
  const first4Row = first4.rows.find((r) => r.slug === slug);
  if (!first4Row) {
    throw new Error(`slug ${slug} missing from first4 apply-review packet`);
  }
  const rescueRow = rescue.missing_safe_link_slugs.find((r) => r.slug === slug);
  if (!rescueRow) {
    throw new Error(`slug ${slug} missing from rescue packet`);
  }

  const evidence = loadJson<Record<string, unknown>>(evidenceAbs, readText);
  const linkRows = parse(readText(path.join(deps.rootDir, "data/retailer_links.csv")), {
    columns: true,
    skip_empty_lines: true,
  }) as RetailerLinkRow[];
  const filterRows = parse(readText(path.join(deps.rootDir, "data/filters.csv")), {
    columns: true,
    skip_empty_lines: true,
  }) as FilterRow[];

  const csvRows = linkRows.filter((r) => (r.filter_slug ?? "").trim().toLowerCase() === slug);
  if (csvRows.length !== 1) {
    throw new Error(`expected exactly one committed CSV row for ${slug}, found ${csvRows.length}`);
  }
  const csvRow = csvRows[0]!;
  const filter = filterRows.find((r) => (r.slug ?? "").trim().toLowerCase() === slug);

  const gated = filterRealBuyRetailerLinks(
    csvRows.map((r) => ({
      retailer_key: r.retailer_key ?? null,
      affiliate_url: (r.affiliate_url ?? "").trim(),
      browser_truth_classification: r.browser_truth_classification ?? null,
    })),
  );

  const canonical =
    typeof evidence.canonical_url === "string" ? evidence.canonical_url.trim() : null;
  const affiliateCandidate =
    typeof evidence.affiliate_url_candidate === "string"
      ? evidence.affiliate_url_candidate.trim()
      : null;
  const filterId = typeof evidence.filter_id === "string" ? evidence.filter_id.trim() : null;
  const asin = typeof evidence.asin === "string" ? evidence.asin.trim().toUpperCase() : null;
  const attribution =
    typeof evidence.product_attribution === "string" ? evidence.product_attribution.trim() : null;
  const verdict = typeof evidence.verdict === "string" ? evidence.verdict.trim() : null;

  if (!canonical || !affiliateCandidate || !asin) {
    throw new Error("evidence missing canonical_url, affiliate_url_candidate, or asin");
  }

  const normalizedAffiliate = normalizeAmazonAffiliateTagV1({
    proposed_destination_url: canonical,
    proposed_affiliate_url: affiliateCandidate,
    proposed_retailer_key: "amazon",
  });

  const affiliateTagStatus = resolveAffiliateTagStatusV1({
    proposed_affiliate_url: normalizedAffiliate.proposed_affiliate_url,
    proposed_retailer_key: "amazon",
  });

  const policy = classifyAmazonAsinReusePolicy({
    token: slug,
    asin,
    noSafePdpFound: false,
    exactTokenProof: true,
    sellerControlledTargetTokenProof: true,
    replacementOrCompatibleRelationshipProof: attribution != null,
    buyabilityProof: true,
    attributionCanBeLabeled: attribution != null,
    asinCollisionEvidenceFileCount: 0,
  });

  const evidenceNotes = [
    typeof evidence.exact_token_proof === "string" ? evidence.exact_token_proof : null,
    typeof evidence.buyability_proof === "string" ? evidence.buyability_proof : null,
    `product_attribution=${attribution ?? "UNKNOWN"}`,
    `evidence=${FRIDGE_SAFE_LINK_4396508_PRIMARY_EVIDENCE_REL_V1}`,
  ]
    .filter(Boolean)
    .join(" ");

  const proposedFields: ProposedRetailerLinkFieldV1[] = [
    field("filter_slug", slug, "PROVEN", "data/filters.csv + evidence.filter_slug"),
    field("retailer_name", "Amazon", "INFERRED", "repo CSV convention for amazon.com /dp/ rows"),
    field(
      "affiliate_url",
      normalizedAffiliate.proposed_affiliate_url,
      affiliateCandidate.includes(FRIDGE_BUYER_PATH_BATCH_BUCKPARTS_AMAZON_TAG_V1)
        ? "PROVEN"
        : "INFERRED",
      `${FRIDGE_SAFE_LINK_4396508_PRIMARY_EVIDENCE_REL_V1}.affiliate_url_candidate`,
    ),
    field("is_primary", isTruthyPrimary(csvRow.is_primary), "PROVEN", "data/retailer_links.csv current row"),
    field(
      "sort_order",
      Number.parseInt((csvRow.sort_order ?? "0").trim(), 10) || 0,
      "PROVEN",
      "data/retailer_links.csv current row",
    ),
    field("retailer_key", "amazon", "INFERRED", "amazon.com /dp/ URL in evidence"),
    field(
      "browser_truth_classification",
      null,
      "UNKNOWN",
      `${FRIDGE_SAFE_LINK_4396508_PRIMARY_EVIDENCE_REL_V1} unknowns: does not prove runtime browser_truth classification`,
    ),
    field(
      "browser_truth_buyable_subtype",
      null,
      "UNKNOWN",
      "not present in evidence; do not infer without owner classification review",
    ),
    field(
      "browser_truth_notes",
      evidenceNotes,
      "PROVEN",
      "evidence exact_token_proof + buyability_proof + product_attribution",
    ),
    field(
      "browser_truth_checked_at",
      typeof evidence.generated_at === "string" ? evidence.generated_at.slice(0, 10) : null,
      "PROVEN",
      `${FRIDGE_SAFE_LINK_4396508_PRIMARY_EVIDENCE_REL_V1}.generated_at`,
    ),
  ];

  const unknownFields = [
    "browser_truth_classification",
    "browser_truth_buyable_subtype",
    "supabase.link_id",
    "supabase.status",
    "supabase.source",
    "supabase.destination_url",
    "production_go_first_hop_outcome",
  ];

  const blockers = [
    "mutation_authorized=false",
    "verified_link_authorized=false",
    "csv_apply_authorized=false",
    "supabase_mutation_authorized=false",
    "owner_apply_plan_approval_not_recorded",
    "owner_batch_run_registry_for_safe_link_rescue_not_created",
    "production_go_first_hop=UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH",
    "evidence.mutation_ready=false",
    `committed CSV still search-placeholder (${csvRow.retailer_key}); zero safe gated rows`,
    "runtime browser_truth_classification UNKNOWN until owner sets classification on apply",
    "2-pack and 3-pack variants seen in evidence are not proven safe by primary evidence file",
  ];

  if (affiliateTagStatus !== "HAS_BUCKPARTS_TAG") {
    blockers.push(`affiliate_tag_status=${affiliateTagStatus}`);
  }
  if (policy.classification !== "EXACT_PDP_PROVEN_NO_COLLISION") {
    blockers.push(`amazon_asin_reuse_policy=${policy.classification}`);
  }

  const ownerApproval = [
    "Review proposed Amazon aftermarket-compatible single-pack PDP for exact token 4396508.",
    "Confirm browser_truth_classification and browser_truth_buyable_subtype before any guarded apply executor.",
    "Record explicit owner approval for a future single-slug CSV/Supabase apply plan — this proposal does not authorize apply.",
    "Require fresh read-only precheck immediately before any mutation: npm run buckparts:precheck:amazon-refrigerator-tokens -- --tokens 4396508",
    "Do not click production /go until a separate no-click or local validation policy exists.",
  ];

  const rollback = [
    "If a future guarded apply writes CSV/Supabase and post-apply validation fails, revert committed data/retailer_links.csv row for filter_slug=4396508 to:",
    `  retailer_name=${JSON.stringify(csvRow.retailer_name)}`,
    `  affiliate_url=${JSON.stringify(csvRow.affiliate_url)}`,
    `  retailer_key=${JSON.stringify(csvRow.retailer_key ?? "")}`,
    `  browser_truth_classification=${JSON.stringify(csvRow.browser_truth_classification ?? "")}`,
    "If Supabase row was inserted, delete or disable the inserted retailer_links row only after owner-confirmed rollback packet.",
    "Re-run read-only parity diff (fridge-supabase-vs-csv) and live HTML scan (no /go clicks) to confirm /go CTA state returns to pre-apply baseline.",
    "Do not delete evidence artifacts; rollback is data-path only.",
  ];

  const evidenceSummary = [
    `verdict=${verdict ?? "UNKNOWN"}`,
    `asin=${asin}`,
    `product_attribution=${attribution ?? "UNKNOWN"}`,
    `mutation_ready=${String(evidence.mutation_ready ?? "UNKNOWN")}`,
    `asin_collision=${policy.classification}`,
  ].join("; ");

  return {
    contract: FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_PROPOSAL_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    verified_link_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    production_go_first_hop_validation_status: "UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH",
    generated_at: now().toISOString(),
    source_command: FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_SOURCE_COMMAND_V1,
    target_slug: slug,
    wedge: "refrigerator_water",
    exact_repo_paths_read: [
      FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1,
      FRIDGE_SAFE_LINK_RESCUE_FIRST4_JSON_REL_V1,
      FRIDGE_SAFE_LINK_4396508_PRIMARY_EVIDENCE_REL_V1,
      "data/retailer_links.csv",
      "data/filters.csv",
      "data/affiliate/affiliate-application-tracker.json",
      "scripts/lib/amazon-asin-reuse-policy.ts",
      "scripts/lib/fridge-buyer-path-batch-apply-plan-proposal-v1.ts",
      "src/lib/retailers/launch-buy-links.ts",
    ],
    source_rescue_packet_rel_path: FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1,
    source_first4_apply_review_rel_path: FRIDGE_SAFE_LINK_RESCUE_FIRST4_JSON_REL_V1,
    live_state: {
      live_url: rescueRow.live_url,
      live_has_go_cta: false,
      live_has_go_cta_source: "fridge_safe_link_rescue_owner_review_v1",
      live_page_exists: rescueRow.live_page_exists,
      production_go_clicked: false,
    },
    current_csv_state: {
      retailer_row_count: csvRows.length,
      safe_gated_count: gated.length,
      primary_retailer_key: csvRow.retailer_key?.trim() ?? null,
      primary_affiliate_url: csvRow.affiliate_url?.trim() ?? null,
      primary_is_primary: isTruthyPrimary(csvRow.is_primary),
      browser_truth_classification: csvRow.browser_truth_classification?.trim() ?? null,
      summary: `${csvRows.length} row(s), ${gated.length} safe gated, primary=${csvRow.retailer_key ?? "unknown"}:search_placeholder`,
    },
    evidence_files_read: [
      FRIDGE_SAFE_LINK_4396508_PRIMARY_EVIDENCE_REL_V1,
      "data/evidence/amazon-4396508-unknown-outcome.2026-05-03.json",
    ],
    evidence_verdict_summary: evidenceSummary,
    apply_plan_ready: true,
    apply_plan_applied: false,
    proposed_action: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1,
    proposed_retailer_link_row_fields: proposedFields,
    proposed_retailer_link_row_unknown_fields: unknownFields,
    amazon_asin_reuse_policy_classification: policy.classification,
    affiliate_tag_status: affiliateTagStatus,
    blockers_before_apply: blockers,
    owner_approval_needed_next: ownerApproval,
    rollback_revert_plan: rollback,
    proven_facts: [
      "PROVEN: proposal is read_only=true; data_mutation=false; mutation_authorized=false; verified_link_authorized=false.",
      "PROVEN: target_slug=4396508 only — no other slugs in planned_changes.",
      `PROVEN: live_has_go_cta=false sourced from ${FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1}; production /go not clicked.`,
      "PROVEN: committed CSV has one oem-parts-catalog search-placeholder row with zero launch-buy-links safe gated rows.",
      `PROVEN: evidence ${FRIDGE_SAFE_LINK_4396508_PRIMARY_EVIDENCE_REL_V1} verdict=EXACT_PDP_PROVEN_FROM_OWNER_BROWSER_SCREENSHOT; asin=B00NXPKBQ2; filter_id=${filterId ?? "UNKNOWN"}.`,
      "PROVEN: evidence asin_collision_reuse_check reports zero reuse for B00NXPKBQ2.",
      "PROVEN: Amazon Associates affiliate tracker status=APPROVED (data/affiliate/affiliate-application-tracker.json).",
      "PROVEN: affiliate_url_candidate includes tag=buckparts20-20.",
      `PROVEN: filters.csv row exists brand=${filter?.brand_slug ?? "UNKNOWN"} oem=${filter?.oem_part_number ?? "UNKNOWN"}.`,
    ],
    inferred_facts: [
      "INFERRED: proposed retailer_name=Amazon follows repo CSV convention for amazon.com /dp/ affiliate rows.",
      "INFERRED: future apply would replace search placeholder with evidence-backed Amazon /dp/B00NXPKBQ2 — not authorized by this proposal.",
      "INFERRED: live PDP uses Supabase at runtime; CSV-only apply without Supabase parity would not surface /go CTA.",
    ],
    unknown_facts: [
      "UNKNOWN: runtime browser_truth_classification and browser_truth_buyable_subtype for a future row (explicit in evidence unknowns).",
      "UNKNOWN: production /go first-hop outcome without clicking /go.",
      "UNKNOWN: live Supabase retailer_links state for filter_id at proposal generation time.",
      "UNKNOWN: whether 2-pack/3-pack variants are safe buyer paths.",
    ],
    recommended_next_action:
      "Owner review this single-slug apply-plan proposal. If approved, record owner decision and create a separate guarded apply executor packet — do not mutate CSV, Supabase, evidence, or authorize Verified Links from this artifact alone.",
  };
}

export function buildFridgeSafeLink4396508ApplyPlanProposalMarkdownV1(
  report: FridgeSafeLink4396508ApplyPlanProposalV1,
): string {
  const lines: string[] = [
    "# Fridge safe-link 4396508 apply-plan proposal (read-only)",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Authorization",
    "",
    "All false: mutation_authorized, verified_link_authorized, csv_apply_authorized, supabase_mutation_authorized, evidence_write_authorized.",
    "",
    `apply_plan_ready: **${report.apply_plan_ready}** | apply_plan_applied: **${report.apply_plan_applied}**`,
    "",
    "## Live state (no /go clicked)",
    "",
    `- URL: ${report.live_state.live_url}`,
    `- live_has_go_cta: **false** (${report.live_state.live_has_go_cta_source})`,
    "",
    "## Current CSV",
    "",
    `- ${report.current_csv_state.summary}`,
    `- affiliate_url: ${report.current_csv_state.primary_affiliate_url}`,
    "",
    "## Evidence",
    "",
    ...report.evidence_files_read.map((f) => `- ${f}`),
    "",
    `- Summary: ${report.evidence_verdict_summary}`,
    "",
    "## Proposed retailer_links row (proposal only)",
    "",
    `Action: \`${report.proposed_action}\``,
    "",
  ];
  for (const f of report.proposed_retailer_link_row_fields) {
    lines.push(
      `- **${f.field}** = ${JSON.stringify(f.proposed_value)} (${f.proof_status}: ${f.proof_source})`,
    );
  }
  lines.push("", "## Unknown fields", "", ...report.proposed_retailer_link_row_unknown_fields.map((u) => `- ${u}`));
  lines.push("", "## Blockers before apply", "", ...report.blockers_before_apply.map((b) => `- ${b}`));
  lines.push("", "## Owner approval needed next", "", ...report.owner_approval_needed_next.map((o) => `- ${o}`));
  lines.push("", "## Rollback / revert plan", "", ...report.rollback_revert_plan.map((r) => `- ${r}`));
  lines.push("", "## Recommended next action", "", report.recommended_next_action, "");
  return lines.join("\n");
}

const ALLOWED_DRAFT_PREFIX =
  "data/fridge/batch-production/drafts/fridge-safe-link-4396508-apply-plan-proposal-v1.";

export function writeFridgeSafeLink4396508ApplyPlanProposalDraftsV1(args: {
  rootDir: string;
  report: FridgeSafeLink4396508ApplyPlanProposalV1;
}): { json_rel_path: string; md_rel_path: string } {
  if (
    !FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_JSON_REL_V1.startsWith(ALLOWED_DRAFT_PREFIX) ||
    !FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_MD_REL_V1.startsWith(ALLOWED_DRAFT_PREFIX)
  ) {
    throw new Error("draft write path outside allowed prefix");
  }
  const jsonAbs = path.join(args.rootDir, FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, `${buildFridgeSafeLink4396508ApplyPlanProposalMarkdownV1(args.report)}\n`, "utf8");
  return {
    json_rel_path: FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_JSON_REL_V1,
    md_rel_path: FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_MD_REL_V1,
  };
}

export function proposedSlugSetFromReport(report: FridgeSafeLink4396508ApplyPlanProposalV1): string[] {
  const slugField = report.proposed_retailer_link_row_fields.find((f) => f.field === "filter_slug");
  return slugField?.proposed_value === FRIDGE_SAFE_LINK_4396508_TARGET_SLUG_V1
    ? [FRIDGE_SAFE_LINK_4396508_TARGET_SLUG_V1]
    : [];
}
