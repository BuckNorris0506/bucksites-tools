/**
 * Read-only buyer-path gap plan for SAFE_BUYER_PATH_FAIL fridge model PDP slugs.
 * Classifies closable-with-existing-evidence vs needs-research vs remain-no-buy.
 * Does not mutate CSV/Supabase/CTA/JSON-LD or invent retailer links.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  buyLinkGateFailureKind,
  isDirectBuyableSafeCtaRow,
} from "@/lib/retailers/launch-buy-links";
import { isAffiliateUrlSafeForGoRedirect } from "@/lib/retailers/go-redirect-gate";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1,
  type BuckpartsFridgeCtaGoLinkProofSlugRowV1,
  type BuckpartsFridgeModelPdpCtaGoLinkProofPackV1,
} from "./buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1";

export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_buyer_path_gap_plan_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-buyer-path-gap-plan" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-buyer-path-gap-plan-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_MD_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-buyer-path-gap-plan-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_ALLOWED_WRITE_REL_PATHS_V1 = [
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_MD_REL_V1,
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_EXPECTED_SLUG_COUNT_V1 = 7 as const;

/**
 * Exact open FAIL cohort from CTA/go proof pack after EDR4 buyer-path closable parity apply.
 * Closed (no longer in open FAIL scope): whirlpool-wrf540cwhz, whirlpool-wrx735sdhz.
 */
export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_FAIL_SLUGS_V1 = [
  "ge-gfe24jgkww",
  "ge-gfe27jmkes",
  "ge-gne25jmkww",
  "ge-gne27jstss",
  "ge-gse25hskss",
  "ge-gte18gsnrss",
  "ge-pvd28bymfs",
] as const;

/** Previously CLOSABLE duo closed by edr4rxd1 Supabase retailer_links parity apply. */
export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_CLOSED_BY_EDR4_PARITY_SLUGS_V1 = [
  "whirlpool-wrf540cwhz",
  "whirlpool-wrx735sdhz",
] as const;

export const BUCKPARTS_FRIDGE_RETAILER_LINKS_CSV_REL_V1 = "data/retailer_links.csv" as const;

/** Known repo evidence that may justify "existing evidence" without inventing links. */
export const BUCKPARTS_FRIDGE_BUYER_PATH_GAP_KNOWN_EVIDENCE_RELS_BY_FILTER_V1: Record<
  string,
  readonly string[]
> = {
  edr4rxd1: [
    "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-edr4rxd1-v1.json",
    "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-edr4rxd1-v1.json",
  ],
  "ge-gte18gsnrss": [
    "data/fridge/batch-production/drafts/gswf-gte18gsnrss-no-filter-suppression-apply-plan-owner-review-v1.json",
    "data/fridge/batch-production/drafts/gswf-gte18gsnrss-no-filter-supabase-compat-parity-owner-review-v1.json",
  ],
};

export type BuckpartsFridgeBuyerPathGapRecommendedActionV1 =
  | "CLOSABLE_WITH_EXISTING_EVIDENCE"
  | "NEEDS_EXTERNAL_RESEARCH"
  | "REMAIN_NO_BUY";

export type BuckpartsFridgeBuyerPathGapFailureClassV1 =
  | "expected_no_filter_suppression"
  | "missing_approved_safe_retailer_link"
  | "csv_has_safe_row_live_cta_still_fail";

export type BuckpartsFridgeBuyerPathGapCsvLinkEvidenceV1 = {
  filter_slug: string;
  csv_row_count: number;
  csv_primary_url: string | null;
  csv_browser_truth_classification: string | null;
  csv_gate_failure_kind: string | null;
  csv_direct_buyable_safe: boolean;
  csv_go_resolvable: boolean;
  evidence_artifacts_on_disk: string[];
};

export type BuckpartsFridgeBuyerPathGapSlugRowV1 = {
  slug: string;
  cohort: string;
  mapped_filter_slugs: string[];
  mapped_filter_count: number;
  cta_go_missing_reasons: string[];
  cta_safe_cta_count: number;
  cta_go_resolvable_count: number;
  failure_class: BuckpartsFridgeBuyerPathGapFailureClassV1;
  recommended_action: BuckpartsFridgeBuyerPathGapRecommendedActionV1;
  existing_approved_retailer_links_could_safely_close: boolean;
  external_research_required: boolean;
  owner_approval_required_to_close_live_path: boolean;
  remain_no_buy: boolean;
  auto_promote_authorized: false;
  invent_link_authorized: false;
  filter_evidence: BuckpartsFridgeBuyerPathGapCsvLinkEvidenceV1[];
  recommended_next_step: string;
  notes: string[];
};

export type BuckpartsFridgeModelPdpBuyerPathGapPlanV1 = {
  contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  supabase_mutation_authorized: false;
  csv_mutation_authorized: false;
  buy_cta_authorized: false;
  retailer_links_mutation_authorized: false;
  sitemap_robots_mutation_authorized: false;
  product_json_ld_mutation_authorized: false;
  auto_promote_authorized: false;
  invent_link_authorized: false;
  live_production_fetch_enabled: false;
  generated_at: string;
  source_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_SOURCE_COMMAND_V1;
  cta_go_proof_pack_rel_path: typeof BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1;
  retailer_links_csv_rel_path: typeof BUCKPARTS_FRIDGE_RETAILER_LINKS_CSV_REL_V1;
  scope: {
    slug_count: number;
    slugs: string[];
  };
  summary: {
    CLOSABLE_WITH_EXISTING_EVIDENCE: number;
    NEEDS_EXTERNAL_RESEARCH: number;
    REMAIN_NO_BUY: number;
  };
  rows: BuckpartsFridgeBuyerPathGapSlugRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type BuildBuckpartsFridgeModelPdpBuyerPathGapPlanDepsV1 = {
  rootDir: string;
  now?: () => Date;
  loadCtaGoProofPack?: () => BuckpartsFridgeModelPdpCtaGoLinkProofPackV1;
  loadRetailerLinksCsv?: () => RetailerLinksCsvRowV1[];
  evidenceExists?: (relPath: string) => boolean;
};

export type RetailerLinksCsvRowV1 = {
  filter_slug: string;
  retailer_name: string;
  affiliate_url: string;
  is_primary: boolean;
  retailer_key: string;
  browser_truth_classification: string;
  browser_truth_notes: string;
  browser_truth_checked_at: string;
  browser_truth_buyable_subtype?: string;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeSlug).filter(Boolean))).sort();
}

export function loadFailRowsFromCtaGoProofPackV1(
  pack: BuckpartsFridgeModelPdpCtaGoLinkProofPackV1,
): BuckpartsFridgeCtaGoLinkProofSlugRowV1[] {
  const expected = new Set(
    BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_FAIL_SLUGS_V1.map(normalizeSlug),
  );
  const failRows = pack.rows.filter((row) => row.verdict === "SAFE_BUYER_PATH_FAIL");
  const scoped = failRows.filter((row) => expected.has(normalizeSlug(row.slug)));
  scoped.sort((a, b) => a.slug.localeCompare(b.slug));
  return scoped;
}

function defaultLoadCtaGoProofPack(rootDir: string): BuckpartsFridgeModelPdpCtaGoLinkProofPackV1 {
  const abs = path.join(rootDir, BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1);
  if (!existsSync(abs)) {
    throw new Error(`missing CTA/go proof pack: ${BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1}`);
  }
  return JSON.parse(readFileSync(abs, "utf8")) as BuckpartsFridgeModelPdpCtaGoLinkProofPackV1;
}

export function loadRetailerLinksCsvRowsV1(rootDir: string): RetailerLinksCsvRowV1[] {
  const abs = path.join(rootDir, BUCKPARTS_FRIDGE_RETAILER_LINKS_CSV_REL_V1);
  if (!existsSync(abs)) {
    throw new Error(`missing retailer_links csv: ${BUCKPARTS_FRIDGE_RETAILER_LINKS_CSV_REL_V1}`);
  }
  const raw = parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Record<string, string>[];
  return raw.map((row) => ({
    filter_slug: normalizeSlug(row.filter_slug ?? ""),
    retailer_name: (row.retailer_name ?? "").trim(),
    affiliate_url: (row.affiliate_url ?? row.destination_url ?? "").trim(),
    is_primary: String(row.is_primary ?? "").trim().toLowerCase() === "true",
    retailer_key: (row.retailer_key ?? "").trim(),
    browser_truth_classification: (row.browser_truth_classification ?? "").trim(),
    browser_truth_notes: (row.browser_truth_notes ?? "").trim(),
    browser_truth_checked_at: (row.browser_truth_checked_at ?? "").trim(),
    browser_truth_buyable_subtype: (row.browser_truth_buyable_subtype ?? "").trim() || undefined,
  }));
}

function evidencePathsForFilterOrSlug(filterOrSlug: string): readonly string[] {
  return BUCKPARTS_FRIDGE_BUYER_PATH_GAP_KNOWN_EVIDENCE_RELS_BY_FILTER_V1[filterOrSlug] ?? [];
}

export function analyzeCsvFilterBuyerPathEvidenceV1(args: {
  filter_slug: string;
  csvRows: RetailerLinksCsvRowV1[];
  evidenceExists: (relPath: string) => boolean;
}): BuckpartsFridgeBuyerPathGapCsvLinkEvidenceV1 {
  const filter_slug = normalizeSlug(args.filter_slug);
  const rows = args.csvRows.filter((r) => r.filter_slug === filter_slug);
  const primary = rows.find((r) => r.is_primary) ?? rows[0] ?? null;
  const evidence_artifacts_on_disk = evidencePathsForFilterOrSlug(filter_slug).filter((rel) =>
    args.evidenceExists(rel),
  );

  if (!primary) {
    return {
      filter_slug,
      csv_row_count: 0,
      csv_primary_url: null,
      csv_browser_truth_classification: null,
      csv_gate_failure_kind: "missing_csv_row",
      csv_direct_buyable_safe: false,
      csv_go_resolvable: false,
      evidence_artifacts_on_disk,
    };
  }

  const gateLink = {
    retailer_key: primary.retailer_key,
    affiliate_url: primary.affiliate_url,
    browser_truth_classification: primary.browser_truth_classification || null,
    browser_truth_buyable_subtype: primary.browser_truth_buyable_subtype ?? null,
    browser_truth_checked_at: primary.browser_truth_checked_at || null,
    browser_truth_notes: primary.browser_truth_notes || null,
  };
  const gateKind = buyLinkGateFailureKind(gateLink);
  const csv_direct_buyable_safe = isDirectBuyableSafeCtaRow(gateLink);
  const csv_go_resolvable = isAffiliateUrlSafeForGoRedirect(
    gateLink.retailer_key,
    gateLink.affiliate_url,
    gateLink.browser_truth_classification ?? undefined,
    gateLink.browser_truth_buyable_subtype,
    gateLink.browser_truth_checked_at,
    gateLink.browser_truth_notes,
  );

  return {
    filter_slug,
    csv_row_count: rows.length,
    csv_primary_url: primary.affiliate_url || null,
    csv_browser_truth_classification: primary.browser_truth_classification || null,
    csv_gate_failure_kind: gateKind,
    csv_direct_buyable_safe,
    csv_go_resolvable,
    evidence_artifacts_on_disk,
  };
}

export function classifyFridgeModelPdpBuyerPathGapSlugV1(args: {
  fail_row: BuckpartsFridgeCtaGoLinkProofSlugRowV1;
  csvRows: RetailerLinksCsvRowV1[];
  evidenceExists: (relPath: string) => boolean;
}): BuckpartsFridgeBuyerPathGapSlugRowV1 {
  const slug = normalizeSlug(args.fail_row.slug);
  const mapped_filter_slugs = sortedUnique(args.fail_row.rendered_filter_slugs ?? []);
  const notes: string[] = [
    "Source: SAFE_BUYER_PATH_FAIL row from CTA/go proof pack (local data-path).",
    "Recommendation only — auto_promote_authorized=false; invent_link_authorized=false.",
  ];

  const filter_evidence = mapped_filter_slugs.map((filter_slug) =>
    analyzeCsvFilterBuyerPathEvidenceV1({
      filter_slug,
      csvRows: args.csvRows,
      evidenceExists: args.evidenceExists,
    }),
  );

  const noMappedFilters =
    mapped_filter_slugs.length === 0 ||
    args.fail_row.missing_reasons.includes("no_mapped_filters_on_pdp_loader");

  if (noMappedFilters || slug === "ge-gte18gsnrss") {
    const gte18Evidence = evidencePathsForFilterOrSlug("ge-gte18gsnrss").filter((rel) =>
      args.evidenceExists(rel),
    );
    notes.push(
      "Expected no-filter / suppress-buy posture (GSWF PROVEN_NO_FILTER / empty mappings).",
    );
    if (gte18Evidence.length > 0) {
      notes.push(`Repo no-filter evidence present: ${gte18Evidence.join(", ")}`);
    }
    return {
      slug,
      cohort: args.fail_row.cohort,
      mapped_filter_slugs,
      mapped_filter_count: mapped_filter_slugs.length,
      cta_go_missing_reasons: [...args.fail_row.missing_reasons],
      cta_safe_cta_count: args.fail_row.safe_cta_count,
      cta_go_resolvable_count: args.fail_row.go_resolvable_count,
      failure_class: "expected_no_filter_suppression",
      recommended_action: "REMAIN_NO_BUY",
      existing_approved_retailer_links_could_safely_close: false,
      external_research_required: false,
      owner_approval_required_to_close_live_path: false,
      remain_no_buy: true,
      auto_promote_authorized: false,
      invent_link_authorized: false,
      filter_evidence,
      recommended_next_step:
        "Keep no-buy / no filter CTA. Do not re-map GSWF or invent retailer links for this slug.",
      notes,
    };
  }

  const anyClosableCsv = filter_evidence.some(
    (e) => e.csv_direct_buyable_safe && e.csv_go_resolvable,
  );
  const closableWithEvidenceOnDisk = filter_evidence.some(
    (e) =>
      e.csv_direct_buyable_safe &&
      e.csv_go_resolvable &&
      e.evidence_artifacts_on_disk.length > 0,
  );

  if (anyClosableCsv) {
    const closableFilters = filter_evidence
      .filter((e) => e.csv_direct_buyable_safe && e.csv_go_resolvable)
      .map((e) => e.filter_slug);
    notes.push(
      `CSV already has gate-passable direct_buyable+go-safe row(s) for: ${closableFilters.join(", ")}.`,
    );
    notes.push(
      "Live CTA/go FAIL means customer path (Supabase-gated) still lacks that safe row — not an invent-new-URL lane.",
    );
    if (closableWithEvidenceOnDisk) {
      notes.push("Supporting owner-browser / apply-plan evidence artifacts exist on disk.");
    }
    return {
      slug,
      cohort: args.fail_row.cohort,
      mapped_filter_slugs,
      mapped_filter_count: mapped_filter_slugs.length,
      cta_go_missing_reasons: [...args.fail_row.missing_reasons],
      cta_safe_cta_count: args.fail_row.safe_cta_count,
      cta_go_resolvable_count: args.fail_row.go_resolvable_count,
      failure_class: "csv_has_safe_row_live_cta_still_fail",
      recommended_action: "CLOSABLE_WITH_EXISTING_EVIDENCE",
      existing_approved_retailer_links_could_safely_close: true,
      external_research_required: false,
      owner_approval_required_to_close_live_path: true,
      remain_no_buy: false,
      auto_promote_authorized: false,
      invent_link_authorized: false,
      filter_evidence,
      recommended_next_step: closableWithEvidenceOnDisk
        ? "Founder-gated scoped retailer_links CSV↔Supabase parity/sync for existing direct_buyable evidence (no new URL invent). Then re-run CTA/go proof."
        : "CSV gate-passable row exists; verify live Supabase parity before any founder-gated sync. Do not invent a new destination.",
      notes,
    };
  }

  notes.push(
    "Mapped filters present, but no CSV retailer_links row passes direct_buyable CTA + /go gates.",
  );
  for (const e of filter_evidence) {
    notes.push(
      `${e.filter_slug}: classification=${e.csv_browser_truth_classification ?? "(blank)"}; gate=${e.csv_gate_failure_kind ?? "null"}; rows=${String(e.csv_row_count)}`,
    );
  }

  return {
    slug,
    cohort: args.fail_row.cohort,
    mapped_filter_slugs,
    mapped_filter_count: mapped_filter_slugs.length,
    cta_go_missing_reasons: [...args.fail_row.missing_reasons],
    cta_safe_cta_count: args.fail_row.safe_cta_count,
    cta_go_resolvable_count: args.fail_row.go_resolvable_count,
    failure_class: "missing_approved_safe_retailer_link",
    recommended_action: "NEEDS_EXTERNAL_RESEARCH",
    existing_approved_retailer_links_could_safely_close: false,
    external_research_required: true,
    owner_approval_required_to_close_live_path: true,
    remain_no_buy: false,
    auto_promote_authorized: false,
    invent_link_authorized: false,
    filter_evidence,
    recommended_next_step:
      "Owner/browser manufacturer-rescue: capture official PDP (not search placeholder), then founder-gated retailer_links review. Do not invent PDPs or auto-promote.",
    notes,
  };
}

export function buildBuckpartsFridgeModelPdpBuyerPathGapPlanV1(
  deps: BuildBuckpartsFridgeModelPdpBuyerPathGapPlanDepsV1,
): BuckpartsFridgeModelPdpBuyerPathGapPlanV1 {
  const generated_at = (deps.now ?? (() => new Date()))().toISOString();
  const pack = deps.loadCtaGoProofPack?.() ?? defaultLoadCtaGoProofPack(deps.rootDir);
  const failRows = loadFailRowsFromCtaGoProofPackV1(pack);

  if (failRows.length !== BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_EXPECTED_SLUG_COUNT_V1) {
    throw new Error(
      `Buyer-path gap plan expects exactly ${String(BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_EXPECTED_SLUG_COUNT_V1)} FAIL slugs, got ${String(failRows.length)}`,
    );
  }

  const expectedSorted = [...BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_FAIL_SLUGS_V1].sort();
  const actualSorted = failRows.map((r) => normalizeSlug(r.slug)).sort();
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    throw new Error(
      `Buyer-path gap plan FAIL slug set mismatch. expected=${expectedSorted.join(",")} actual=${actualSorted.join(",")}`,
    );
  }

  const csvRows = deps.loadRetailerLinksCsv?.() ?? loadRetailerLinksCsvRowsV1(deps.rootDir);
  const evidenceExists =
    deps.evidenceExists ??
    ((relPath: string) => existsSync(path.join(deps.rootDir, relPath)));

  const rows = failRows.map((fail_row) =>
    classifyFridgeModelPdpBuyerPathGapSlugV1({
      fail_row,
      csvRows,
      evidenceExists,
    }),
  );
  rows.sort((a, b) => a.slug.localeCompare(b.slug));

  const summary = {
    CLOSABLE_WITH_EXISTING_EVIDENCE: 0,
    NEEDS_EXTERNAL_RESEARCH: 0,
    REMAIN_NO_BUY: 0,
  };
  for (const row of rows) {
    summary[row.recommended_action] += 1;
  }

  return {
    contract: BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    auto_promote_authorized: false,
    invent_link_authorized: false,
    live_production_fetch_enabled: false,
    generated_at,
    source_command: BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_SOURCE_COMMAND_V1,
    cta_go_proof_pack_rel_path: BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1,
    retailer_links_csv_rel_path: BUCKPARTS_FRIDGE_RETAILER_LINKS_CSV_REL_V1,
    scope: {
      slug_count: rows.length,
      slugs: expectedSorted,
    },
    summary,
    rows,
    proven_facts: [
      "PROVEN: read_only=true; data_mutation=false; auto_promote_authorized=false; invent_link_authorized=false.",
      `PROVEN: exact open FAIL scope=${String(BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_EXPECTED_SLUG_COUNT_V1)} SAFE_BUYER_PATH_FAIL slugs from CTA/go proof (post-EDR4 parity).`,
      `PROVEN: closed_by_edr4_parity=${BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_CLOSED_BY_EDR4_PARITY_SLUGS_V1.join(",")} (no longer in open FAIL scope).`,
      `PROVEN: summary=${JSON.stringify(summary)}.`,
      "PROVEN: CLOSABLE_WITH_EXISTING_EVIDENCE requires CSV direct_buyable CTA + /go gate pass (no invented destinations).",
      "PROVEN: NEEDS_EXTERNAL_RESEARCH only when mapped filters lack a gate-passable approved CSV retailer_links row.",
      "PROVEN: REMAIN_NO_BUY for expected no-filter suppression (ge-gte18gsnrss).",
    ],
    unknown_facts: [
      "UNKNOWN: Live production HTML CTA for these open FAIL PDPs (no production fetch in this plan).",
      "UNKNOWN: Exact Supabase retailer_links primary row parity field-diff for research-needed filters unless a separate parity lane is run.",
    ],
    risk_notes: [
      "This plan does not authorize retailer_links mutation, buy CTA promotion, or Product JSON-LD invents.",
      "Do not treat any recommendation as apply permission — founder approval + guarded sync still required.",
      "Do not invent manufacturer PDPs for XWFE/XWF/MWFP search placeholders.",
      "Do not re-open whirlpool-wrf540cwhz / whirlpool-wrx735sdhz as CLOSABLE — they are SAFE_BUYER_PATH_PASS after EDR4 parity apply.",
    ],
  };
}

export function buildBuckpartsFridgeModelPdpBuyerPathGapPlanMarkdownV1(
  report: BuckpartsFridgeModelPdpBuyerPathGapPlanV1,
): string {
  const lines: string[] = [
    "# BuckParts fridge model PDP buyer-path gap plan v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- read_only: **${String(report.read_only)}**`,
    `- data_mutation: **${String(report.data_mutation)}**`,
    `- auto_promote_authorized: **${String(report.auto_promote_authorized)}**`,
    `- invent_link_authorized: **${String(report.invent_link_authorized)}**`,
    `- slug_count: **${String(report.scope.slug_count)}**`,
    `- cta_go_proof: \`${report.cta_go_proof_pack_rel_path}\``,
    "",
    "## Summary",
    "",
    `- CLOSABLE_WITH_EXISTING_EVIDENCE: ${String(report.summary.CLOSABLE_WITH_EXISTING_EVIDENCE)}`,
    `- NEEDS_EXTERNAL_RESEARCH: ${String(report.summary.NEEDS_EXTERNAL_RESEARCH)}`,
    `- REMAIN_NO_BUY: ${String(report.summary.REMAIN_NO_BUY)}`,
    "",
    "## Rows",
    "",
    "| slug | filters | action | failure_class | csv_could_close | research | remain_no_buy | next_step |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const row of report.rows) {
    lines.push(
      `| ${row.slug} | ${row.mapped_filter_slugs.join(", ") || "(none)"} | ${row.recommended_action} | ${row.failure_class} | ${String(row.existing_approved_retailer_links_could_safely_close)} | ${String(row.external_research_required)} | ${String(row.remain_no_buy)} | ${row.recommended_next_step.replace(/\|/g, "/")} |`,
    );
  }
  lines.push("", "## Proven facts", "");
  for (const f of report.proven_facts) lines.push(`- ${f}`);
  lines.push("", "## Unknown facts", "");
  for (const f of report.unknown_facts) lines.push(`- ${f}`);
  lines.push("", "## Risk notes", "");
  for (const n of report.risk_notes) lines.push(`- ${n}`);
  lines.push("");
  return lines.join("\n");
}

export function writeBuckpartsFridgeModelPdpBuyerPathGapPlanArtifactsV1(args: {
  rootDir: string;
  report: BuckpartsFridgeModelPdpBuyerPathGapPlanV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_JSON_REL_V1;
  const mdRel = BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_MD_REL_V1;
  const allowed = new Set<string>(BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_ALLOWED_WRITE_REL_PATHS_V1);
  if (!allowed.has(jsonRel) || !allowed.has(mdRel)) {
    throw new Error("buyer-path gap plan write paths must stay on allowlist");
  }
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildBuckpartsFridgeModelPdpBuyerPathGapPlanMarkdownV1(args.report), "utf8");
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
