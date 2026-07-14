/**
 * Read-only research packet for NEEDS_EXTERNAL_RESEARCH buyer-path gaps (6 GE models).
 * Identifies missing evidence before any safe buyer path can be created. No links invented.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_JSON_REL_V1,
  analyzeCsvFilterBuyerPathEvidenceV1,
  loadRetailerLinksCsvRowsV1,
  type BuckpartsFridgeBuyerPathGapSlugRowV1,
  type BuckpartsFridgeModelPdpBuyerPathGapPlanV1,
  type RetailerLinksCsvRowV1,
} from "./buckparts-fridge-model-pdp-buyer-path-gap-plan-v1";

export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_buyer_path_research_packet_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-buyer-path-research-packet" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-buyer-path-research-packet-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_MD_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-buyer-path-research-packet-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_ALLOWED_WRITE_REL_PATHS_V1 = [
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_MD_REL_V1,
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_EXPECTED_SLUG_COUNT_V1 =
  6 as const;

/** Exact NEEDS_EXTERNAL_RESEARCH cohort from gap plan (excludes ge-gte18gsnrss REMAIN_NO_BUY). */
export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_SLUGS_V1 = [
  "ge-gfe24jgkww",
  "ge-gfe27jmkes",
  "ge-gne25jmkww",
  "ge-gne27jstss",
  "ge-gse25hskss",
  "ge-pvd28bymfs",
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_EXCLUDED_REMAIN_NO_BUY_SLUG_V1 =
  "ge-gte18gsnrss" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_FILTERS_V1 = [
  "smartwater-mwfp",
  "xwf",
  "xwfe",
] as const;

/** Known GE manufacturer-proof packets that may unlock owner browser capture next. */
export const BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_KNOWN_PROOF_RELS_BY_FILTER_V1: Record<
  string,
  string
> = {
  xwfe: "data/fridge/batch-production/drafts/manufacturer-browser-proof-ge-normalization-packet-xwfe-v1.json",
  xwf: "data/fridge/batch-production/drafts/manufacturer-browser-proof-ge-normalization-packet-xwf-v1.json",
  "smartwater-mwfp":
    "data/fridge/batch-production/drafts/manufacturer-browser-proof-ge-normalization-packet-smartwater-mwfp-v1.json",
};

export type BuckpartsFridgeBuyerPathResearchNextStatusV1 =
  | "NEEDS_OWNER_BROWSER_PROOF"
  | "NEEDS_EXTERNAL_RESEARCH"
  | "REMAIN_NO_BUY";

export type BuckpartsFridgeBuyerPathResearchFilterRowV1 = {
  filter_slug: string;
  csv_row_count: number;
  csv_primary_url: string | null;
  csv_browser_truth_classification: string | null;
  csv_gate_failure_kind: string | null;
  search_placeholder_only: boolean;
  approved_safe_direct_buy_evidence_present: boolean;
  csv_direct_buyable_safe: boolean;
  csv_go_resolvable: boolean;
  manufacturer_proof_packet_rel: string | null;
  manufacturer_proof_packet_present: boolean;
  manufacturer_normalization_status: string | null;
  manufacturer_prepared_verdict: string | null;
  evidence_gaps: string[];
  recommended_next_status: BuckpartsFridgeBuyerPathResearchNextStatusV1;
  exact_evidence_needed: string[];
};

export type BuckpartsFridgeBuyerPathResearchSlugRowV1 = {
  slug: string;
  cohort: string;
  mapped_filter_slugs: string[];
  gap_plan_recommended_action: "NEEDS_EXTERNAL_RESEARCH";
  buyer_path_failure_reasons: string[];
  cta_safe_cta_count: number;
  cta_go_resolvable_count: number;
  filters: BuckpartsFridgeBuyerPathResearchFilterRowV1[];
  recommended_next_status: BuckpartsFridgeBuyerPathResearchNextStatusV1;
  invent_link_authorized: false;
  auto_promote_authorized: false;
  notes: string[];
};

export type BuckpartsFridgeModelPdpBuyerPathResearchPacketV1 = {
  contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  supabase_mutation_authorized: false;
  csv_mutation_authorized: false;
  buy_cta_authorized: false;
  retailer_links_mutation_authorized: false;
  invent_link_authorized: false;
  auto_promote_authorized: false;
  sitemap_robots_mutation_authorized: false;
  product_json_ld_mutation_authorized: false;
  live_production_fetch_enabled: false;
  generated_at: string;
  source_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_SOURCE_COMMAND_V1;
  gap_plan_rel_path: typeof BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_JSON_REL_V1;
  scope: {
    slug_count: number;
    slugs: string[];
    filters: readonly string[];
    excluded_remain_no_buy_slug: typeof BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_EXCLUDED_REMAIN_NO_BUY_SLUG_V1;
  };
  summary: {
    NEEDS_OWNER_BROWSER_PROOF: number;
    NEEDS_EXTERNAL_RESEARCH: number;
    REMAIN_NO_BUY: number;
    search_placeholder_filter_instances: number;
    approved_safe_direct_buy_evidence_count: number;
  };
  rows: BuckpartsFridgeBuyerPathResearchSlugRowV1[];
  unique_filter_findings: BuckpartsFridgeBuyerPathResearchFilterRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type BuildBuckpartsFridgeModelPdpBuyerPathResearchPacketDepsV1 = {
  rootDir: string;
  now?: () => Date;
  loadGapPlan?: () => BuckpartsFridgeModelPdpBuyerPathGapPlanV1;
  loadRetailerLinksCsv?: () => RetailerLinksCsvRowV1[];
  evidenceExists?: (relPath: string) => boolean;
  readText?: (abs: string) => string;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeSlug).filter(Boolean))).sort();
}

function isSearchPlaceholderUrl(url: string | null): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return (
    u.includes("search.jsp") ||
    u.includes("searchkeyword=") ||
    u.includes("/catalog/search") ||
    u.includes("?search=")
  );
}

function defaultLoadGapPlan(rootDir: string): BuckpartsFridgeModelPdpBuyerPathGapPlanV1 {
  const abs = path.join(rootDir, BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_JSON_REL_V1);
  if (!existsSync(abs)) {
    throw new Error(`missing gap plan: ${BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_JSON_REL_V1}`);
  }
  return JSON.parse(readFileSync(abs, "utf8")) as BuckpartsFridgeModelPdpBuyerPathGapPlanV1;
}

export function loadResearchRowsFromGapPlanV1(
  plan: BuckpartsFridgeModelPdpBuyerPathGapPlanV1,
): BuckpartsFridgeBuyerPathGapSlugRowV1[] {
  const expected = new Set(
    BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_SLUGS_V1.map(normalizeSlug),
  );
  const rows = plan.rows.filter(
    (row) =>
      row.recommended_action === "NEEDS_EXTERNAL_RESEARCH" &&
      expected.has(normalizeSlug(row.slug)),
  );
  rows.sort((a, b) => a.slug.localeCompare(b.slug));
  return rows;
}

function readManufacturerProofMetaV1(args: {
  rootDir: string;
  rel: string | null;
  evidenceExists: (rel: string) => boolean;
  readText: (abs: string) => string;
}): {
  present: boolean;
  normalization_status: string | null;
  prepared_verdict: string | null;
} {
  if (!args.rel || !args.evidenceExists(args.rel)) {
    return { present: false, normalization_status: null, prepared_verdict: null };
  }
  try {
    const raw = JSON.parse(args.readText(path.join(args.rootDir, args.rel))) as {
      normalization_status?: string;
      prepared_verdict?: string;
    };
    return {
      present: true,
      normalization_status: raw.normalization_status ?? null,
      prepared_verdict: raw.prepared_verdict ?? null,
    };
  } catch {
    return { present: true, normalization_status: "UNKNOWN_PARSE", prepared_verdict: null };
  }
}

export function classifyBuyerPathResearchFilterV1(args: {
  rootDir: string;
  filter_slug: string;
  csvRows: RetailerLinksCsvRowV1[];
  evidenceExists: (relPath: string) => boolean;
  readText: (abs: string) => string;
}): BuckpartsFridgeBuyerPathResearchFilterRowV1 {
  const filter_slug = normalizeSlug(args.filter_slug);
  const csv = analyzeCsvFilterBuyerPathEvidenceV1({
    filter_slug,
    csvRows: args.csvRows,
    evidenceExists: args.evidenceExists,
  });
  const manufacturer_proof_packet_rel =
    BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_KNOWN_PROOF_RELS_BY_FILTER_V1[filter_slug] ?? null;
  const proof = readManufacturerProofMetaV1({
    rootDir: args.rootDir,
    rel: manufacturer_proof_packet_rel,
    evidenceExists: args.evidenceExists,
    readText: args.readText,
  });

  const search_placeholder_only =
    csv.csv_gate_failure_kind === "search_placeholder" ||
    (isSearchPlaceholderUrl(csv.csv_primary_url) && !csv.csv_direct_buyable_safe);

  const approved_safe_direct_buy_evidence_present =
    csv.csv_direct_buyable_safe && csv.csv_go_resolvable;

  const evidence_gaps: string[] = [];
  if (approved_safe_direct_buy_evidence_present) {
    evidence_gaps.push("UNEXPECTED: gate-passable CSV present — re-run CTA/go before inventing research");
  } else {
    if (csv.csv_row_count === 0) evidence_gaps.push("missing_csv_retailer_links_row");
    if (search_placeholder_only) evidence_gaps.push("csv_primary_is_search_placeholder_not_official_pdp");
    if (!csv.csv_browser_truth_classification) {
      evidence_gaps.push("missing_browser_truth_classification_direct_buyable");
    }
    if (csv.csv_gate_failure_kind) {
      evidence_gaps.push(`buy_link_gate_failure:${csv.csv_gate_failure_kind}`);
    }
    if (!proof.present) {
      evidence_gaps.push("missing_manufacturer_browser_proof_packet");
    } else if (
      proof.normalization_status === "CAPTURE_REQUIRED_UNKNOWN" ||
      proof.prepared_verdict === "NEEDS_OWNER_BROWSER_REVIEW"
    ) {
      evidence_gaps.push("manufacturer_browser_capture_or_owner_pass_required");
    }
  }

  const exact_evidence_needed = [
    "Official manufacturer PDP URL for exact OEM token (not geapplianceparts search.jsp / searchKeyword).",
    "Owner browser proof PASS with exact token + official_pdp path type (no wrong-family).",
    "browser_truth_classification=direct_buyable with fresh browser_truth_checked_at.",
    "Founder-gated retailer_links review/apply for that filter only — not auto-promoted by this packet.",
  ];

  let recommended_next_status: BuckpartsFridgeBuyerPathResearchNextStatusV1 =
    "NEEDS_EXTERNAL_RESEARCH";
  if (approved_safe_direct_buy_evidence_present) {
    // Should not happen for this cohort; still never invent REMAIN_NO_BUY here.
    recommended_next_status = "NEEDS_EXTERNAL_RESEARCH";
  } else if (
    proof.present &&
    (proof.normalization_status === "CAPTURE_REQUIRED_UNKNOWN" ||
      proof.prepared_verdict === "NEEDS_OWNER_BROWSER_REVIEW" ||
      proof.prepared_verdict === "NEEDS_OWNER_BROWSER_PROOF")
  ) {
    recommended_next_status = "NEEDS_OWNER_BROWSER_PROOF";
  } else if (search_placeholder_only || csv.csv_row_count > 0) {
    recommended_next_status = "NEEDS_EXTERNAL_RESEARCH";
  }

  return {
    filter_slug,
    csv_row_count: csv.csv_row_count,
    csv_primary_url: csv.csv_primary_url,
    csv_browser_truth_classification: csv.csv_browser_truth_classification,
    csv_gate_failure_kind: csv.csv_gate_failure_kind,
    search_placeholder_only,
    approved_safe_direct_buy_evidence_present,
    csv_direct_buyable_safe: csv.csv_direct_buyable_safe,
    csv_go_resolvable: csv.csv_go_resolvable,
    manufacturer_proof_packet_rel,
    manufacturer_proof_packet_present: proof.present,
    manufacturer_normalization_status: proof.normalization_status,
    manufacturer_prepared_verdict: proof.prepared_verdict,
    evidence_gaps,
    recommended_next_status,
    exact_evidence_needed,
  };
}

function worstStatus(
  statuses: BuckpartsFridgeBuyerPathResearchNextStatusV1[],
): BuckpartsFridgeBuyerPathResearchNextStatusV1 {
  if (statuses.includes("NEEDS_OWNER_BROWSER_PROOF")) return "NEEDS_OWNER_BROWSER_PROOF";
  if (statuses.includes("NEEDS_EXTERNAL_RESEARCH")) return "NEEDS_EXTERNAL_RESEARCH";
  return "REMAIN_NO_BUY";
}

export function classifyBuyerPathResearchSlugV1(args: {
  rootDir: string;
  gap_row: BuckpartsFridgeBuyerPathGapSlugRowV1;
  csvRows: RetailerLinksCsvRowV1[];
  evidenceExists: (relPath: string) => boolean;
  readText: (abs: string) => string;
}): BuckpartsFridgeBuyerPathResearchSlugRowV1 {
  const slug = normalizeSlug(args.gap_row.slug);
  if (slug === BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_EXCLUDED_REMAIN_NO_BUY_SLUG_V1) {
    throw new Error("ge-gte18gsnrss remain-no-buy must stay excluded from research packet scope");
  }

  const filters = sortedUnique(args.gap_row.mapped_filter_slugs).map((filter_slug) =>
    classifyBuyerPathResearchFilterV1({
      rootDir: args.rootDir,
      filter_slug,
      csvRows: args.csvRows,
      evidenceExists: args.evidenceExists,
      readText: args.readText,
    }),
  );

  return {
    slug,
    cohort: args.gap_row.cohort,
    mapped_filter_slugs: sortedUnique(args.gap_row.mapped_filter_slugs),
    gap_plan_recommended_action: "NEEDS_EXTERNAL_RESEARCH",
    buyer_path_failure_reasons: [...args.gap_row.cta_go_missing_reasons],
    cta_safe_cta_count: args.gap_row.cta_safe_cta_count,
    cta_go_resolvable_count: args.gap_row.cta_go_resolvable_count,
    filters,
    recommended_next_status: worstStatus(filters.map((f) => f.recommended_next_status)),
    invent_link_authorized: false,
    auto_promote_authorized: false,
    notes: [
      "Source: NEEDS_EXTERNAL_RESEARCH rows from buyer-path gap plan only.",
      "No retailer links invented or auto-promoted.",
      "ge-gte18gsnrss remain-no-buy is excluded from this packet.",
    ],
  };
}

export function buildBuckpartsFridgeModelPdpBuyerPathResearchPacketV1(
  deps: BuildBuckpartsFridgeModelPdpBuyerPathResearchPacketDepsV1,
): BuckpartsFridgeModelPdpBuyerPathResearchPacketV1 {
  const generated_at = (deps.now ?? (() => new Date()))().toISOString();
  const gap = deps.loadGapPlan?.() ?? defaultLoadGapPlan(deps.rootDir);
  const gapRows = loadResearchRowsFromGapPlanV1(gap);

  if (gapRows.length !== BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_EXPECTED_SLUG_COUNT_V1) {
    throw new Error(
      `Research packet expects exactly ${String(BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_EXPECTED_SLUG_COUNT_V1)} NEEDS_EXTERNAL_RESEARCH slugs, got ${String(gapRows.length)}`,
    );
  }

  const expectedSorted = [...BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_SLUGS_V1].sort();
  const actualSorted = gapRows.map((r) => normalizeSlug(r.slug)).sort();
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    throw new Error(
      `Research packet slug set mismatch. expected=${expectedSorted.join(",")} actual=${actualSorted.join(",")}`,
    );
  }
  if (
    actualSorted.includes(
      BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
    )
  ) {
    throw new Error("ge-gte18gsnrss leaked into research packet scope");
  }

  const csvRows = deps.loadRetailerLinksCsv?.() ?? loadRetailerLinksCsvRowsV1(deps.rootDir);
  const evidenceExists =
    deps.evidenceExists ?? ((rel) => existsSync(path.join(deps.rootDir, rel)));
  const readText = deps.readText ?? ((abs: string) => readFileSync(abs, "utf8"));

  const rows = gapRows.map((gap_row) =>
    classifyBuyerPathResearchSlugV1({
      rootDir: deps.rootDir,
      gap_row,
      csvRows,
      evidenceExists,
      readText,
    }),
  );
  rows.sort((a, b) => a.slug.localeCompare(b.slug));

  const filterBySlug = new Map<string, BuckpartsFridgeBuyerPathResearchFilterRowV1>();
  for (const filter_slug of BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_FILTERS_V1) {
    filterBySlug.set(
      filter_slug,
      classifyBuyerPathResearchFilterV1({
        rootDir: deps.rootDir,
        filter_slug,
        csvRows,
        evidenceExists,
        readText,
      }),
    );
  }
  const unique_filter_findings = [...filterBySlug.values()].sort((a, b) =>
    a.filter_slug.localeCompare(b.filter_slug),
  );

  const summary = {
    NEEDS_OWNER_BROWSER_PROOF: 0,
    NEEDS_EXTERNAL_RESEARCH: 0,
    REMAIN_NO_BUY: 0,
    search_placeholder_filter_instances: 0,
    approved_safe_direct_buy_evidence_count: 0,
  };
  for (const row of rows) {
    summary[row.recommended_next_status] += 1;
    for (const f of row.filters) {
      if (f.search_placeholder_only) summary.search_placeholder_filter_instances += 1;
      if (f.approved_safe_direct_buy_evidence_present) {
        summary.approved_safe_direct_buy_evidence_count += 1;
      }
    }
  }

  return {
    contract: BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    invent_link_authorized: false,
    auto_promote_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    live_production_fetch_enabled: false,
    generated_at,
    source_command: BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_SOURCE_COMMAND_V1,
    gap_plan_rel_path: BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_JSON_REL_V1,
    scope: {
      slug_count: rows.length,
      slugs: expectedSorted,
      filters: BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_FILTERS_V1,
      excluded_remain_no_buy_slug:
        BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
    },
    summary,
    rows,
    unique_filter_findings,
    proven_facts: [
      "PROVEN: read_only=true; invent_link_authorized=false; auto_promote_authorized=false.",
      `PROVEN: exact research scope=${String(BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_EXPECTED_SLUG_COUNT_V1)} NEEDS_EXTERNAL_RESEARCH slugs.`,
      "PROVEN: ge-gte18gsnrss excluded as REMAIN_NO_BUY.",
      `PROVEN: summary=${JSON.stringify(summary)}.`,
      "PROVEN: xwfe/xwf/smartwater-mwfp CSV primaries are search placeholders without direct_buyable.",
    ],
    unknown_facts: [
      "UNKNOWN: Official GE Appliance Parts PDP URLs for XWFE/XWF/MWFP until owner browser capture PASSes.",
      "UNKNOWN: Live HTML CTA render for these 6 PDPs (no production fetch).",
    ],
    risk_notes: [
      "This packet does not authorize retailer_links mutation, buy CTA, or Product JSON-LD invents.",
      "Do not invent destination URLs or promote search placeholders.",
      "Do not include ge-gte18gsnrss in research/apply lanes — remain no-buy.",
    ],
  };
}

export function buildBuckpartsFridgeModelPdpBuyerPathResearchPacketMarkdownV1(
  report: BuckpartsFridgeModelPdpBuyerPathResearchPacketV1,
): string {
  const lines: string[] = [
    "# BuckParts fridge model PDP buyer-path research packet v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- read_only: **true**`,
    `- invent_link_authorized: **false**`,
    `- auto_promote_authorized: **false**`,
    `- slug_count: **${String(report.scope.slug_count)}**`,
    `- excluded remain-no-buy: \`${report.scope.excluded_remain_no_buy_slug}\``,
    "",
    "## Summary",
    "",
    `- NEEDS_OWNER_BROWSER_PROOF: ${String(report.summary.NEEDS_OWNER_BROWSER_PROOF)}`,
    `- NEEDS_EXTERNAL_RESEARCH: ${String(report.summary.NEEDS_EXTERNAL_RESEARCH)}`,
    `- REMAIN_NO_BUY: ${String(report.summary.REMAIN_NO_BUY)}`,
    `- search_placeholder_filter_instances: ${String(report.summary.search_placeholder_filter_instances)}`,
    `- approved_safe_direct_buy_evidence_count: ${String(report.summary.approved_safe_direct_buy_evidence_count)}`,
    "",
    "## Unique filters",
    "",
    "| filter | search_placeholder | safe_csv | next | gate | proof_packet |",
    "|---|---|---|---|---|---|",
  ];
  for (const f of report.unique_filter_findings) {
    lines.push(
      `| ${f.filter_slug} | ${String(f.search_placeholder_only)} | ${String(f.approved_safe_direct_buy_evidence_present)} | ${f.recommended_next_status} | ${f.csv_gate_failure_kind ?? "(null)"} | ${f.manufacturer_proof_packet_present ? "yes" : "no"} |`,
    );
  }
  lines.push("", "## Slugs", "");
  lines.push("| slug | filters | next | failure reasons |");
  lines.push("|---|---|---|---|");
  for (const row of report.rows) {
    lines.push(
      `| ${row.slug} | ${row.mapped_filter_slugs.join(", ")} | ${row.recommended_next_status} | ${row.buyer_path_failure_reasons.join("; ") || "(none)"} |`,
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

export function writeBuckpartsFridgeModelPdpBuyerPathResearchPacketArtifactsV1(args: {
  rootDir: string;
  report: BuckpartsFridgeModelPdpBuyerPathResearchPacketV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_JSON_REL_V1;
  const mdRel = BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_MD_REL_V1;
  const allowed = new Set<string>(
    BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_ALLOWED_WRITE_REL_PATHS_V1,
  );
  if (!allowed.has(jsonRel) || !allowed.has(mdRel)) {
    throw new Error("research packet write paths must stay on allowlist");
  }
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildBuckpartsFridgeModelPdpBuyerPathResearchPacketMarkdownV1(args.report), "utf8");
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
