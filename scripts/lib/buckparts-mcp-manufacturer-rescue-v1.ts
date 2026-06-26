/**
 * BuckParts Truth MCP v2 — manufacturer safe-link rescue intelligence (read-only).
 * Reuses manufacturer-safe-link-rescue-framework-v1 cohort adapters; no PDP inference.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  buyLinkGateFailureKind,
  passesDirectBuyableGate,
} from "@/lib/retailers/launch-buy-links";

import type { BuckPartsMcpDepsV1 } from "./buckparts-mcp-truth-context-v1";
import {
  BUCKPARTS_MCP_TOOLS_CONTRACT_V2,
  type McpToolEnvelopeV2,
} from "./buckparts-mcp-tools-v2";
import {
  buildGeRefrigeratorRescueAdapterReportV1,
  GE_RESCUE_COHORT_SLUGS_V1,
  GE_RESCUE_REFERENCE_APPLIED_SLUG_V1,
  GE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1,
} from "./ge-refrigerator-rescue-adapter-v1";
import {
  buildFrigidaireRefrigeratorRescueAdapterReportV1,
  FRIGIDAIRE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1,
} from "./frigidaire-refrigerator-rescue-adapter-v1";
import {
  buildOwnerBrowserChecklistOnlyProofForSlugV1,
  EVERYDROP_WHIRLPOOL_RESCUE_COHORT_SLUGS_V1,
  loadRepoProvenOfficialTargetUrlV1,
  type EverydropWhirlpoolOfficialProofRowV1,
} from "./fridge-safe-link-everydrop-whirlpool-official-browser-capture-v1";
import {
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_ARTIFACT_RELS_V1,
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
  type OwnerBrowserProofResultV1,
} from "./fridge-safe-link-owner-browser-proof-result-v1";
import { MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1 } from "./manufacturer-safe-link-rescue-framework-v1";
import { normManufacturerToken } from "./manufacturer-safe-link-rescue-framework-v1";

export const BUCKPARTS_MCP_MANUFACTURER_RESCUE_CONTRACT_V1 =
  "buckparts_mcp_manufacturer_rescue_v1" as const;

export const SUPPORTED_MANUFACTURER_KEYS_V1 = [
  "ge_appliance_parts",
  "everydrop_whirlpool",
  "frigidaire",
] as const;

export type SupportedManufacturerKeyV1 = (typeof SUPPORTED_MANUFACTURER_KEYS_V1)[number];

const RETAILER_LINKS_CSV_REL = "data/retailer_links.csv" as const;
const FILTERS_CSV_REL = "data/filters.csv" as const;

const OWNER_PROOF_REL_BY_SLUG_V1: Readonly<Record<string, string>> = Object.fromEntries(
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_ARTIFACT_RELS_V1.map((rel) => {
    const match = rel.match(/owner-browser-proof-result-([a-z0-9-]+)-v1\.json$/);
    const slug = match?.[1] ?? "";
    return [slug, rel];
  }),
);

const GE_SLUGS = new Set<string>(GE_RESCUE_COHORT_SLUGS_V1.map((s) => s.toLowerCase()));
const FRIGIDAIRE_SLUGS = new Set<string>(
  FRIGIDAIRE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1.map((s) => s.toLowerCase()),
);
const EVERYDROP_SLUGS = new Set<string>(
  EVERYDROP_WHIRLPOOL_RESCUE_COHORT_SLUGS_V1.map((s) => s.toLowerCase()),
);

export type ManufacturerRescueStatusResultV1 = McpToolEnvelopeV2 & {
  contract: typeof BUCKPARTS_MCP_MANUFACTURER_RESCUE_CONTRACT_V1;
  framework_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1;
  tool: "manufacturer_rescue_status";
  filter_slug: string;
  manufacturer_key: SupportedManufacturerKeyV1 | "UNKNOWN";
  truth_status: "PROVEN" | "UNKNOWN";
  oem_part_token: string | "UNKNOWN";
  csv_primary_is_search_placeholder: boolean | "UNKNOWN";
  current_primary_affiliate_url: string | "UNKNOWN";
  repo_proven_official_pdp_url: string | null;
  adapter_discovery_url: string | null;
  adapter_discovery_provenance: string | "UNKNOWN";
  manufacturer_pdp_pattern_status: "UNKNOWN" | "PROVEN_PARTIAL" | string;
  adapter_ready_for_browser_capture: boolean | "UNKNOWN";
  browser_truth_status: "PASS" | "FAIL" | "UNKNOWN";
  direct_buyable_proven: boolean;
  direct_buyable_detail: string;
  confusion_or_supersession_review_required: boolean | "UNKNOWN";
  validation_gates: Array<{ gate_id: string; status: string; notes: string }>;
  wrong_family_forbidden_tokens: string[];
  coverage_unlocked: false;
  owner_apply_lane_eligible: boolean | "UNKNOWN";
  repo_paths_read: string[];
  truth_note: string;
};

export type ManufacturerRescueCohortResultV1 = McpToolEnvelopeV2 & {
  contract: typeof BUCKPARTS_MCP_MANUFACTURER_RESCUE_CONTRACT_V1;
  framework_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1;
  tool: "manufacturer_rescue_cohort";
  manufacturer_key: SupportedManufacturerKeyV1 | "UNKNOWN";
  truth_status: "PROVEN" | "UNKNOWN";
  manufacturer_pdp_pattern_status: "UNKNOWN" | "PROVEN_PARTIAL" | string;
  cohort_summary: Record<string, number | string | boolean>;
  rows: Array<Record<string, unknown>>;
  proven_facts: string[];
  unknown_facts: string[];
  coverage_unlocked: false;
  repo_paths_read: string[];
  truth_note: string;
};

export type ManufacturerBrowserProofUrlRowV1 = {
  url: string;
  retailer: string | "UNKNOWN";
  path_type: string | "UNKNOWN";
  browser_proof_status: string | "UNKNOWN";
  direct_buyable_proven: boolean;
  assessment: string | "UNKNOWN";
};

export type ManufacturerBrowserProofStatusResultV1 = McpToolEnvelopeV2 & {
  contract: typeof BUCKPARTS_MCP_MANUFACTURER_RESCUE_CONTRACT_V1;
  tool: "manufacturer_browser_proof_status";
  filter_slug: string;
  manufacturer_key: SupportedManufacturerKeyV1 | "UNKNOWN";
  truth_status: "PROVEN" | "UNKNOWN";
  owner_proof_artifact_rel_path: string | null;
  verdict: string | "UNKNOWN";
  oem_part_token: string | "UNKNOWN";
  proof_urls: ManufacturerBrowserProofUrlRowV1[];
  direct_buyable_proven: boolean;
  direct_buyable_detail: string;
  amazon_or_retailer_only_proof: boolean;
  coverage_unlocked: false;
  repo_paths_read: string[];
  truth_note: string;
};

function envelope(): McpToolEnvelopeV2 & {
  contract: typeof BUCKPARTS_MCP_MANUFACTURER_RESCUE_CONTRACT_V1;
} {
  return {
    contract: BUCKPARTS_MCP_MANUFACTURER_RESCUE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
  };
}

export function normalizeManufacturerKeyV1(
  manufacturer: string,
): SupportedManufacturerKeyV1 | "UNKNOWN" {
  const key = manufacturer.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "ge" || key === "ge_appliance_parts" || key === "ge_appliances") {
    return "ge_appliance_parts";
  }
  if (
    key === "everydrop" ||
    key === "whirlpool" ||
    key === "everydrop_whirlpool" ||
    key === "everydrop/whirlpool"
  ) {
    return "everydrop_whirlpool";
  }
  if (key === "frigidaire") return "frigidaire";
  return "UNKNOWN";
}

export function resolveManufacturerKeyForSlugV1(slug: string): SupportedManufacturerKeyV1 | "UNKNOWN" {
  const s = slug.trim().toLowerCase();
  if (GE_SLUGS.has(s)) return "ge_appliance_parts";
  if (FRIGIDAIRE_SLUGS.has(s)) return "frigidaire";
  if (EVERYDROP_SLUGS.has(s)) return "everydrop_whirlpool";
  return "UNKNOWN";
}

type RetailerLinkRow = {
  filter_slug?: string;
  retailer_key?: string;
  affiliate_url?: string;
  is_primary?: string;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
};

function loadRetailerRows(rootDir: string): RetailerLinkRow[] {
  const abs = path.join(rootDir, RETAILER_LINKS_CSV_REL);
  if (!existsSync(abs)) return [];
  return parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as RetailerLinkRow[];
}

function primaryRowForSlug(rows: RetailerLinkRow[], slug: string): RetailerLinkRow | null {
  const matches = rows.filter((r) => r.filter_slug?.trim().toLowerCase() === slug);
  return (
    matches.find((r) => (r.is_primary ?? "").trim().toLowerCase() === "true") ?? matches[0] ?? null
  );
}

/** PROVEN direct_buyable only when committed CSV passes launch-buy-links gates — never inferred. */
export function committedCsvDirectBuyableProvenV1(
  row: RetailerLinkRow | null,
): { proven: boolean; detail: string } {
  if (!row) {
    return { proven: false, detail: "No retailer_links.csv row — direct_buyable UNKNOWN." };
  }
  const passes = passesDirectBuyableGate({
    browser_truth_classification: row.browser_truth_classification ?? "",
    browser_truth_buyable_subtype: row.browser_truth_buyable_subtype ?? null,
  });
  const gate = buyLinkGateFailureKind({
    retailer_key: row.retailer_key ?? null,
    affiliate_url: row.affiliate_url ?? "",
    browser_truth_classification: row.browser_truth_classification ?? null,
    browser_truth_buyable_subtype: row.browser_truth_buyable_subtype ?? null,
  });
  if (passes && row.browser_truth_classification?.trim() === "direct_buyable") {
    return {
      proven: true,
      detail: "PROVEN: committed CSV primary row passes direct_buyable gate.",
    };
  }
  if (gate === "search_placeholder") {
    return {
      proven: false,
      detail: "NOT_PROVEN: primary row is search placeholder — never treated as direct_buyable.",
    };
  }
  return {
    proven: false,
    detail: `NOT_PROVEN: CSV browser_truth=${row.browser_truth_classification ?? "UNKNOWN"} gate=${gate ?? "none"}.`,
  };
}

function loadOwnerProofArtifact(
  rootDir: string,
  slug: string,
): { rel: string; artifact: OwnerBrowserProofResultV1 } | null {
  const rel = OWNER_PROOF_REL_BY_SLUG_V1[slug.trim().toLowerCase()];
  if (!rel) return null;
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) return null;
  try {
    const artifact = JSON.parse(readFileSync(abs, "utf8")) as OwnerBrowserProofResultV1;
    if (artifact.contract !== FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1) return null;
    return { rel, artifact };
  } catch {
    return null;
  }
}

function proofUrlDirectBuyableProven(row: {
  browser_proof_status?: string;
  path_type?: string;
  proven_observations?: string[];
}): boolean {
  if ((row.browser_proof_status ?? "").trim() !== "PASS") return false;
  const pathType = (row.path_type ?? "").trim();
  if (pathType === "retailer_direct_pdp") return false;
  if (pathType !== "official_manufacturer_pdp" && pathType !== "authorized_parts_distributor_pdp") {
    return false;
  }
  const blob = (row.proven_observations ?? []).join(" ").toLowerCase();
  return blob.includes("add to cart") || blob.includes("in stock");
}

function buildEverydropCohortReadOnlyV1(rootDir: string): {
  rows: EverydropWhirlpoolOfficialProofRowV1[];
  repo_paths_read: string[];
} {
  const filters = existsSync(path.join(rootDir, FILTERS_CSV_REL))
    ? (parse(readFileSync(path.join(rootDir, FILTERS_CSV_REL), "utf8"), {
        columns: true,
        skip_empty_lines: true,
      }) as Array<{ slug?: string; brand_slug?: string; oem_part_number?: string }>)
    : [];
  const links = loadRetailerRows(rootDir);
  const filterBySlug = new Map(
    filters.map((f) => [f.slug?.trim().toLowerCase() ?? "", f]),
  );
  const primaryBySlug = new Map<string, RetailerLinkRow>();
  for (const row of links) {
    const slug = row.filter_slug?.trim().toLowerCase();
    if (!slug) continue;
    const existing = primaryBySlug.get(slug);
    if (!existing || (row.is_primary ?? "").trim().toLowerCase() === "true") {
      primaryBySlug.set(slug, row);
    }
  }

  const rows: EverydropWhirlpoolOfficialProofRowV1[] = [];
  for (const slug of EVERYDROP_WHIRLPOOL_RESCUE_COHORT_SLUGS_V1) {
    const filter = filterBySlug.get(slug);
    const primary = primaryBySlug.get(slug);
    const oemToken = normManufacturerToken(filter?.oem_part_number ?? slug);
    const { url } = loadRepoProvenOfficialTargetUrlV1({ rootDir, slug });
    rows.push(
      buildOwnerBrowserChecklistOnlyProofForSlugV1({
        slug,
        oemToken,
        brandSlug: filter?.brand_slug?.trim() ?? null,
        csvPrimaryUrl: (primary?.affiliate_url ?? "").trim() || null,
        repoProvenTargetUrl: url,
      }),
    );
  }

  return {
    rows,
    repo_paths_read: [RETAILER_LINKS_CSV_REL, FILTERS_CSV_REL],
  };
}

export function manufacturerRescueStatusV1(
  deps: BuckPartsMcpDepsV1,
  filterSlug: string,
): ManufacturerRescueStatusResultV1 {
  const slug = filterSlug.trim().toLowerCase();
  const manufacturerKey = resolveManufacturerKeyForSlugV1(slug);
  const retailerRows = loadRetailerRows(deps.rootDir);
  const primary = primaryRowForSlug(retailerRows, slug);
  const csvDirect = committedCsvDirectBuyableProvenV1(primary);

  if (manufacturerKey === "UNKNOWN") {
    return {
      ...envelope(),
      framework_contract: MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
      tool: "manufacturer_rescue_status",
      filter_slug: slug,
      manufacturer_key: "UNKNOWN",
      truth_status: "UNKNOWN",
      oem_part_token: "UNKNOWN",
      csv_primary_is_search_placeholder: "UNKNOWN",
      current_primary_affiliate_url: "UNKNOWN",
      repo_proven_official_pdp_url: null,
      adapter_discovery_url: null,
      adapter_discovery_provenance: "UNKNOWN",
      manufacturer_pdp_pattern_status: "UNKNOWN",
      adapter_ready_for_browser_capture: "UNKNOWN",
      browser_truth_status: "UNKNOWN",
      direct_buyable_proven: false,
      direct_buyable_detail: "Slug not in GE, EveryDrop/Whirlpool, or Frigidaire rescue cohorts.",
      confusion_or_supersession_review_required: "UNKNOWN",
      validation_gates: [],
      wrong_family_forbidden_tokens: [],
      coverage_unlocked: false,
      owner_apply_lane_eligible: "UNKNOWN",
      repo_paths_read: [RETAILER_LINKS_CSV_REL, FILTERS_CSV_REL],
      truth_note: "UNKNOWN — slug is not a committed manufacturer rescue cohort member.",
    };
  }

  if (manufacturerKey === "ge_appliance_parts") {
    const report = buildGeRefrigeratorRescueAdapterReportV1({ rootDir: deps.rootDir });
    const row = report.rows.find((r) => r.filter_slug === slug);
    if (!row) {
      return {
        ...envelope(),
        framework_contract: MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
        tool: "manufacturer_rescue_status",
        filter_slug: slug,
        manufacturer_key: manufacturerKey,
        truth_status: "UNKNOWN",
        oem_part_token: "UNKNOWN",
        csv_primary_is_search_placeholder: "UNKNOWN",
        current_primary_affiliate_url: "UNKNOWN",
        repo_proven_official_pdp_url: null,
        adapter_discovery_url: null,
        adapter_discovery_provenance: "UNKNOWN",
        manufacturer_pdp_pattern_status: "UNKNOWN",
        adapter_ready_for_browser_capture: "UNKNOWN",
        browser_truth_status: "UNKNOWN",
        direct_buyable_proven: csvDirect.proven,
        direct_buyable_detail: csvDirect.detail,
        confusion_or_supersession_review_required: "UNKNOWN",
        validation_gates: [],
        wrong_family_forbidden_tokens: [],
        coverage_unlocked: false,
        owner_apply_lane_eligible: "UNKNOWN",
        repo_paths_read: report.source_paths_read,
        truth_note: "GE cohort slug not found in adapter report — UNKNOWN.",
      };
    }

    const discoveryProv =
      row.discovered_spec_pdp_url && !row.discovered_spec_known_broken
        ? row.cohort_lane === "REFERENCE_ALREADY_APPLIED"
          ? "PROVEN_REPO_CSV_DIRECT_BUYABLE"
          : "INFERRED_GE_SPEC"
        : row.discovered_spec_known_broken
          ? "KNOWN_BROKEN_BLOCKED"
          : "UNKNOWN";

    const repoProvenPdpUrl =
      row.cohort_lane === "REFERENCE_ALREADY_APPLIED" && row.discovered_spec_pdp_url
        ? row.discovered_spec_pdp_url
        : null;
    const adapterDiscoveryUrl =
      row.cohort_lane !== "REFERENCE_ALREADY_APPLIED" ? row.discovered_spec_pdp_url : null;

    return {
      ...envelope(),
      framework_contract: MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
      tool: "manufacturer_rescue_status",
      filter_slug: slug,
      manufacturer_key: manufacturerKey,
      truth_status: "PROVEN",
      oem_part_token: row.oem_part_token,
      csv_primary_is_search_placeholder: row.csv_primary_is_search_placeholder,
      current_primary_affiliate_url: row.current_primary_affiliate_url ?? "UNKNOWN",
      repo_proven_official_pdp_url: repoProvenPdpUrl,
      adapter_discovery_url: adapterDiscoveryUrl,
      adapter_discovery_provenance: discoveryProv,
      manufacturer_pdp_pattern_status: "PROVEN_PARTIAL",
      adapter_ready_for_browser_capture: row.adapter_ready_for_browser_capture,
      browser_truth_status: "UNKNOWN",
      direct_buyable_proven: csvDirect.proven,
      direct_buyable_detail: csvDirect.detail,
      confusion_or_supersession_review_required: row.supersession_review_required,
      validation_gates: row.validation_gates.map((g) => ({
        gate_id: g.gate_id,
        status: g.status,
        notes: g.notes,
      })),
      wrong_family_forbidden_tokens: row.wrong_family_forbidden_tokens,
      coverage_unlocked: false,
      owner_apply_lane_eligible: row.owner_apply_packet_lane_eligible,
      repo_paths_read: report.source_paths_read,
      truth_note:
        slug === GE_RESCUE_REFERENCE_APPLIED_SLUG_V1
          ? "GE reference lane — repo CSV direct_buyable only when launch-buy-links gate passes. No inferred PDP for rescue slugs."
          : "GE rescue lane — inferred spec URL is discovery aid only; browser PASS required before apply. direct_buyable never inferred from search placeholder.",
    };
  }

  if (manufacturerKey === "frigidaire") {
    const report = buildFrigidaireRefrigeratorRescueAdapterReportV1({ rootDir: deps.rootDir });
    const row = report.rows.find((r) => r.filter_slug === slug);
    if (!row) {
      return {
        ...envelope(),
        framework_contract: MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
        tool: "manufacturer_rescue_status",
        filter_slug: slug,
        manufacturer_key: manufacturerKey,
        truth_status: "UNKNOWN",
        oem_part_token: "UNKNOWN",
        csv_primary_is_search_placeholder: "UNKNOWN",
        current_primary_affiliate_url: "UNKNOWN",
        repo_proven_official_pdp_url: null,
        adapter_discovery_url: null,
        adapter_discovery_provenance: "UNKNOWN",
        manufacturer_pdp_pattern_status: "UNKNOWN",
        adapter_ready_for_browser_capture: "UNKNOWN",
        browser_truth_status: "UNKNOWN",
        direct_buyable_proven: false,
        direct_buyable_detail: csvDirect.detail,
        confusion_or_supersession_review_required: "UNKNOWN",
        validation_gates: [],
        wrong_family_forbidden_tokens: [],
        coverage_unlocked: false,
        owner_apply_lane_eligible: false,
        repo_paths_read: report.source_paths_read,
        truth_note: "Frigidaire cohort slug not found in adapter report — UNKNOWN.",
      };
    }

    return {
      ...envelope(),
      framework_contract: MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
      tool: "manufacturer_rescue_status",
      filter_slug: slug,
      manufacturer_key: manufacturerKey,
      truth_status: "PROVEN",
      oem_part_token: row.oem_part_token,
      csv_primary_is_search_placeholder: row.csv_primary_is_search_placeholder,
      current_primary_affiliate_url: row.current_primary_affiliate_url ?? "UNKNOWN",
      repo_proven_official_pdp_url: row.repo_proven_official_pdp_url,
      adapter_discovery_url: null,
      adapter_discovery_provenance: "UNKNOWN",
      manufacturer_pdp_pattern_status: row.manufacturer_pdp_pattern_status,
      adapter_ready_for_browser_capture: row.adapter_ready_for_browser_capture,
      browser_truth_status: "UNKNOWN",
      direct_buyable_proven: csvDirect.proven,
      direct_buyable_detail: csvDirect.detail,
      confusion_or_supersession_review_required: row.confusion_family_review_required,
      validation_gates: row.validation_gates.map((g) => ({
        gate_id: g.gate_id,
        status: g.status,
        notes: g.notes,
      })),
      wrong_family_forbidden_tokens: row.wrong_family_forbidden_tokens,
      coverage_unlocked: false,
      owner_apply_lane_eligible: row.owner_apply_lane_eligible,
      repo_paths_read: report.source_paths_read,
      truth_note:
        "Frigidaire PDP URLs are never inferred — only repo PASS owner browser proof official_manufacturer_pdp URLs.",
    };
  }

  const everydrop = buildEverydropCohortReadOnlyV1(deps.rootDir);
  const row = everydrop.rows.find((r) => r.filter_slug === slug);
  if (!row) {
    return {
      ...envelope(),
      framework_contract: MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
      tool: "manufacturer_rescue_status",
      filter_slug: slug,
      manufacturer_key: manufacturerKey,
      truth_status: "UNKNOWN",
      oem_part_token: "UNKNOWN",
      csv_primary_is_search_placeholder: "UNKNOWN",
      current_primary_affiliate_url: "UNKNOWN",
      repo_proven_official_pdp_url: null,
      adapter_discovery_url: null,
      adapter_discovery_provenance: "UNKNOWN",
      manufacturer_pdp_pattern_status: "UNKNOWN",
      adapter_ready_for_browser_capture: "UNKNOWN",
      browser_truth_status: "UNKNOWN",
      direct_buyable_proven: false,
      direct_buyable_detail: csvDirect.detail,
      confusion_or_supersession_review_required: "UNKNOWN",
      validation_gates: [],
      wrong_family_forbidden_tokens: [],
      coverage_unlocked: false,
      owner_apply_lane_eligible: false,
      repo_paths_read: everydrop.repo_paths_read,
      truth_note: "EveryDrop/Whirlpool cohort slug not found — UNKNOWN.",
    };
  }

  const browserBuyable =
    row.current_direct_buyability_proven === true && row.browser_truth_status === "PASS";

  return {
    ...envelope(),
    framework_contract: MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
    tool: "manufacturer_rescue_status",
    filter_slug: slug,
    manufacturer_key: manufacturerKey,
    truth_status: "PROVEN",
    oem_part_token: row.oem_part_token,
    csv_primary_is_search_placeholder: row.csv_primary_is_search_placeholder,
    current_primary_affiliate_url: row.current_primary_affiliate_url ?? "UNKNOWN",
    repo_proven_official_pdp_url: row.repo_proven_official_target_url,
    adapter_discovery_url: null,
    adapter_discovery_provenance: "UNKNOWN",
    manufacturer_pdp_pattern_status: row.repo_proven_official_target_url ? "PROVEN_PARTIAL" : "UNKNOWN",
    adapter_ready_for_browser_capture: row.repo_proven_official_target_url !== null,
    browser_truth_status: row.browser_truth_status,
    direct_buyable_proven: csvDirect.proven || browserBuyable,
    direct_buyable_detail: browserBuyable
      ? "PROVEN: browser capture PASS with direct buyability."
      : csvDirect.detail,
    confusion_or_supersession_review_required: row.supersession_review_required,
    validation_gates: [],
    wrong_family_forbidden_tokens: [],
    coverage_unlocked: false,
    owner_apply_lane_eligible: false,
    repo_paths_read: everydrop.repo_paths_read,
    truth_note:
      "EveryDrop/Whirlpool official PDP URLs from repo owner proof only — no token inference. MCP does not run Playwright.",
  };
}

export function manufacturerRescueCohortV1(
  deps: BuckPartsMcpDepsV1,
  manufacturer: string,
): ManufacturerRescueCohortResultV1 {
  const manufacturerKey = normalizeManufacturerKeyV1(manufacturer);

  if (manufacturerKey === "UNKNOWN") {
    return {
      ...envelope(),
      framework_contract: MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
      tool: "manufacturer_rescue_cohort",
      manufacturer_key: "UNKNOWN",
      truth_status: "UNKNOWN",
      manufacturer_pdp_pattern_status: "UNKNOWN",
      cohort_summary: {},
      rows: [],
      proven_facts: [],
      unknown_facts: [
        `UNKNOWN manufacturer "${manufacturer}". Supported: ${SUPPORTED_MANUFACTURER_KEYS_V1.join(", ")}.`,
      ],
      coverage_unlocked: false,
      repo_paths_read: [],
      truth_note: "Pass ge_appliance_parts, everydrop_whirlpool, or frigidaire.",
    };
  }

  if (manufacturerKey === "ge_appliance_parts") {
    const report = buildGeRefrigeratorRescueAdapterReportV1({ rootDir: deps.rootDir });
    return {
      ...envelope(),
      framework_contract: MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
      tool: "manufacturer_rescue_cohort",
      manufacturer_key: manufacturerKey,
      truth_status: "PROVEN",
      manufacturer_pdp_pattern_status: "PROVEN_PARTIAL",
      cohort_summary: {
        ...report.cohort_summary,
        pdp_pattern_guessed_slug_count: 0,
        coverage_unlocked: false,
      },
      rows: report.rows.map((r) => ({
        filter_slug: r.filter_slug,
        cohort_lane: r.cohort_lane,
        oem_part_token: r.oem_part_token,
        csv_primary_is_search_placeholder: r.csv_primary_is_search_placeholder,
        repo_proven_official_pdp_url:
          r.cohort_lane === "REFERENCE_ALREADY_APPLIED" ? r.discovered_spec_pdp_url : null,
        adapter_discovery_url:
          r.cohort_lane !== "REFERENCE_ALREADY_APPLIED" ? r.discovered_spec_pdp_url : null,
        adapter_discovery_known_broken: r.discovered_spec_known_broken,
        adapter_ready_for_browser_capture: r.adapter_ready_for_browser_capture,
        in_fridge_rescue_queue: r.in_fridge_rescue_queue,
        supersession_review_required: r.supersession_review_required,
        wrong_family_forbidden_tokens: r.wrong_family_forbidden_tokens,
      })),
      proven_facts: report.proven_facts,
      unknown_facts: report.unknown_facts,
      coverage_unlocked: false,
      repo_paths_read: report.source_paths_read,
      truth_note:
        "GE cohort from ge-refrigerator-rescue-adapter-v1. Spec URL inference is discovery-only for rescue slugs — not apply authorization.",
    };
  }

  if (manufacturerKey === "frigidaire") {
    const report = buildFrigidaireRefrigeratorRescueAdapterReportV1({ rootDir: deps.rootDir });
    return {
      ...envelope(),
      framework_contract: MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
      tool: "manufacturer_rescue_cohort",
      manufacturer_key: manufacturerKey,
      truth_status: "PROVEN",
      manufacturer_pdp_pattern_status: report.manufacturer_pdp_pattern_status,
      cohort_summary: {
        ...report.cohort_summary,
        coverage_unlocked: false,
      },
      rows: report.rows.map((r) => ({
        filter_slug: r.filter_slug,
        oem_part_token: r.oem_part_token,
        repo_proven_official_pdp_url: r.repo_proven_official_pdp_url,
        repo_proven_pdp_source: r.repo_proven_pdp_source,
        adapter_ready_for_browser_capture: r.adapter_ready_for_browser_capture,
        confusion_family_review_required: r.confusion_family_review_required,
        wrong_family_forbidden_tokens: r.wrong_family_forbidden_tokens,
      })),
      proven_facts: report.proven_facts,
      unknown_facts: report.unknown_facts,
      coverage_unlocked: false,
      repo_paths_read: report.source_paths_read,
      truth_note:
        "Frigidaire cohort from frigidaire-refrigerator-rescue-adapter-v1. No PDP URL inference.",
    };
  }

  const everydrop = buildEverydropCohortReadOnlyV1(deps.rootDir);
  const repoProvenCount = everydrop.rows.filter((r) => r.repo_proven_official_target_url).length;

  return {
    ...envelope(),
    framework_contract: MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
    tool: "manufacturer_rescue_cohort",
    manufacturer_key: manufacturerKey,
    truth_status: "PROVEN",
    manufacturer_pdp_pattern_status: repoProvenCount > 0 ? "PROVEN_PARTIAL" : "UNKNOWN",
    cohort_summary: {
      everydrop_whirlpool_rescue_slug_count: everydrop.rows.length,
      repo_proven_official_target_url_count: repoProvenCount,
      browser_pass_count: everydrop.rows.filter((r) => r.browser_truth_status === "PASS").length,
      coverage_unlocked: false,
      pdp_pattern_guessed_slug_count: 0,
    },
    rows: everydrop.rows.map((r) => ({
      filter_slug: r.filter_slug,
      oem_part_token: r.oem_part_token,
      csv_primary_is_search_placeholder: r.csv_primary_is_search_placeholder,
      repo_proven_official_target_url: r.repo_proven_official_target_url,
      browser_truth_status: r.browser_truth_status,
      supersession_review_required: r.supersession_review_required,
      capture_method: r.capture_method,
    })),
    proven_facts: [
      `PROVEN: ${String(everydrop.rows.length)} EveryDrop/Whirlpool rescue slugs in committed cohort.`,
      `PROVEN: ${String(repoProvenCount)} slugs with repo-proven official Whirlpool accessory PDP URL.`,
      "PROVEN: MCP cohort read is checklist-only — no Playwright side effects.",
    ],
    unknown_facts: [
      "UNKNOWN: Live browser truth until owner completes checklist or separate capture run.",
      "UNKNOWN: Supabase parity.",
    ],
    coverage_unlocked: false,
    repo_paths_read: everydrop.repo_paths_read,
    truth_note:
      "EveryDrop/Whirlpool cohort from manufacturer-safe-link-rescue-everydrop-whirlpool-config-v1. No PDP inference.",
  };
}

export function manufacturerBrowserProofStatusV1(
  deps: BuckPartsMcpDepsV1,
  filterSlug: string,
): ManufacturerBrowserProofStatusResultV1 {
  const slug = filterSlug.trim().toLowerCase();
  const manufacturerKey = resolveManufacturerKeyForSlugV1(slug);
  const loaded = loadOwnerProofArtifact(deps.rootDir, slug);

  if (!loaded) {
    return {
      ...envelope(),
      tool: "manufacturer_browser_proof_status",
      filter_slug: slug,
      manufacturer_key: manufacturerKey,
      truth_status: "UNKNOWN",
      owner_proof_artifact_rel_path: OWNER_PROOF_REL_BY_SLUG_V1[slug] ?? null,
      verdict: "UNKNOWN",
      oem_part_token: "UNKNOWN",
      proof_urls: [],
      direct_buyable_proven: false,
      direct_buyable_detail: "No PASS owner browser proof artifact on disk for slug.",
      amazon_or_retailer_only_proof: false,
      coverage_unlocked: false,
      repo_paths_read: OWNER_PROOF_REL_BY_SLUG_V1[slug] ? [OWNER_PROOF_REL_BY_SLUG_V1[slug]] : [],
      truth_note:
        manufacturerKey === "UNKNOWN"
          ? "Slug not in manufacturer rescue cohort and no owner proof artifact."
          : "UNKNOWN — owner browser proof draft not on disk or slug has no mapped artifact.",
    };
  }

  const { rel, artifact } = loaded;
  const proofUrls: ManufacturerBrowserProofUrlRowV1[] = (artifact.owner_proof_urls ?? []).map(
    (row) => ({
      url: row.url,
      retailer: (row as { retailer?: string }).retailer ?? "UNKNOWN",
      path_type: (row as { path_type?: string }).path_type ?? "UNKNOWN",
      browser_proof_status: row.browser_proof_status ?? "UNKNOWN",
      direct_buyable_proven: proofUrlDirectBuyableProven(row as Parameters<typeof proofUrlDirectBuyableProven>[0]),
      assessment: (row as { assessment?: string }).assessment ?? "UNKNOWN",
    }),
  );

  const anyOfficialDirectBuyable = proofUrls.some(
    (u) =>
      u.direct_buyable_proven &&
      (u.path_type === "official_manufacturer_pdp" ||
        u.path_type === "authorized_parts_distributor_pdp"),
  );
  const amazonOrRetailerOnly =
    proofUrls.length > 0 &&
    !proofUrls.some((u) => u.path_type === "official_manufacturer_pdp") &&
    (artifact.amazon_pass_candidates?.length ?? 0) > 0;

  return {
    ...envelope(),
    tool: "manufacturer_browser_proof_status",
    filter_slug: slug,
    manufacturer_key: manufacturerKey === "UNKNOWN" ? resolveManufacturerKeyForSlugV1(slug) : manufacturerKey,
    truth_status: artifact.verdict === "PASS_BROWSER_PROOF" ? "PROVEN" : "UNKNOWN",
    owner_proof_artifact_rel_path: rel,
    verdict: artifact.verdict,
    oem_part_token: artifact.oem_part_token,
    proof_urls: proofUrls,
    direct_buyable_proven: anyOfficialDirectBuyable,
    direct_buyable_detail: anyOfficialDirectBuyable
      ? "PROVEN: official manufacturer or authorized parts distributor URL with PASS and purchase signal in owner observations."
      : "NOT_PROVEN: no official-path PASS URL with Add to Cart / In Stock in owner observations.",
    amazon_or_retailer_only_proof: amazonOrRetailerOnly,
    coverage_unlocked: false,
    repo_paths_read: [rel],
    truth_note:
      "Owner browser proof draft only — not CSV apply authorization. Retailer PDP PASS rows do not prove direct_buyable for BuckParts safe link.",
  };
}
