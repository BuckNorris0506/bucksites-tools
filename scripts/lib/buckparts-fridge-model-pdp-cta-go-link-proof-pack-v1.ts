/**
 * Read-only fridge model PDP CTA / go-link proof pack v1.
 * Scope: exactly the 28 MATCH + frontend_safe_promoted slugs from the rendered-truth pack.
 * Excludes QUARANTINED_SUPPRESSED and PARTIAL 3. Does not mutate buyer paths or inventory.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getFridgeBySlug, type FridgeWithFilters } from "@/lib/data/fridges";
import { resolveFridgeCustomerSafetyV1 } from "@/lib/fridge/fridge-learned-failure-customer-guard-v1";
import { isAffiliateUrlSafeForGoRedirect } from "@/lib/retailers/go-redirect-gate";
import {
  canEmitRefrigeratorFilterProductJsonLdV1,
  resolveRefrigeratorFilterProductJsonLdV1,
} from "@/lib/seo/structured-data";
import { buildPartPageTrust } from "@/lib/trust/part-trust";

import { resolveArtifactProvenanceV1 } from "./buckparts-artifact-provenance-v1";
import { GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1 } from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1,
  type BuckpartsFridgePdpRenderedTruthProofPackV1,
  type BuckpartsFridgePdpRenderedTruthSlugRowV1,
} from "./buckparts-fridge-model-pdp-rendered-truth-proof-pack-v1";

export const BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_cta_go_link_proof_pack_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-cta-go-link-proof-pack" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_MD_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_ALLOWED_WRITE_REL_PATHS_V1 = [
  BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_MD_REL_V1,
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_EXPECTED_SLUG_COUNT_V1 = 28 as const;

export type BuckpartsFridgeCtaGoBuyerPathVerdictV1 =
  | "SAFE_BUYER_PATH_PASS"
  | "SAFE_BUYER_PATH_FAIL"
  | "SAFE_BUYER_PATH_UNKNOWN";

export type BuckpartsFridgeCtaGoJsonLdStatusV1 =
  | "PROVEN_SUPPRESSED"
  | "UNKNOWN"
  | "UNSAFE_EMISSION_RISK";

export type BuckpartsFridgeCtaGoLinkProofSlugRowV1 = {
  slug: string;
  cohort: string;
  rendered_truth_classification: "MATCH";
  rendered_filter_slugs: string[];
  mapped_filter_count: number;
  safe_cta_count: number;
  go_resolvable_count: number;
  cta_eligible: boolean;
  buyer_path_state: "show_confident_buy" | "show_caution_buy" | "suppress_buy" | "UNKNOWN";
  quarantine: boolean;
  product_json_ld_status: BuckpartsFridgeCtaGoJsonLdStatusV1;
  verdict: BuckpartsFridgeCtaGoBuyerPathVerdictV1;
  missing_reasons: string[];
  safe_go_link_ids: string[];
  notes: string[];
};

export type BuckpartsFridgeModelPdpCtaGoLinkProofPackV1 = {
  contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  supabase_mutation_authorized: false;
  csv_mutation_authorized: false;
  buy_cta_authorized: false;
  retailer_links_mutation_authorized: false;
  sitemap_robots_mutation_authorized: false;
  product_json_ld_mutation_authorized: false;
  live_production_fetch_enabled: false;
  generated_at: string;
  base_commit: string | "UNKNOWN";
  source_commit: string | null;
  provenance_status: "BOUND_TO_SOURCE_COMMIT" | "DIRTY_WORKTREE" | "UNKNOWN";
  worktree_clean: boolean | null;
  source_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_SOURCE_COMMAND_V1;
  rendered_truth_pack_rel_path: typeof BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1;
  scope: {
    slug_count: number;
    slugs: string[];
    excluded_quarantined_slugs: string[];
    excluded_partial_slugs: readonly string[];
  };
  summary: {
    SAFE_BUYER_PATH_PASS: number;
    SAFE_BUYER_PATH_FAIL: number;
    SAFE_BUYER_PATH_UNKNOWN: number;
    product_json_ld_proven_suppressed_count: number;
  };
  rows: BuckpartsFridgeCtaGoLinkProofSlugRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type FridgeCtaGoProofFridgeLoadV1 =
  | { status: "CHECKED"; fridge: FridgeWithFilters }
  | { status: "MISSING" | "UNKNOWN"; reason: string };

export type BuildBuckpartsFridgeModelPdpCtaGoLinkProofDepsV1 = {
  rootDir: string;
  now?: () => Date;
  loadRenderedTruthPack?: () => BuckpartsFridgePdpRenderedTruthProofPackV1;
  loadFridge?: (slug: string) => Promise<FridgeCtaGoProofFridgeLoadV1> | FridgeCtaGoProofFridgeLoadV1;
  resolveQuarantine?: (slug: string) => { quarantine: boolean; reason: string | null };
};

/** Test-only deps: provenance injection. Not used by CLI/production paths. */
export type BuildBuckpartsFridgeModelPdpCtaGoLinkProofForTestsDepsV1 =
  BuildBuckpartsFridgeModelPdpCtaGoLinkProofDepsV1 & {
    worktreeClean?: boolean | null;
    baseCommit?: string | "UNKNOWN";
  };

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeSlug).filter(Boolean))).sort();
}

export function loadMatchSlugsFromRenderedTruthPackV1(
  pack: BuckpartsFridgePdpRenderedTruthProofPackV1,
): {
  match_rows: BuckpartsFridgePdpRenderedTruthSlugRowV1[];
  quarantined_slugs: string[];
} {
  const match_rows = pack.rows.filter(
    (row) => row.classification === "MATCH" && row.frontend_safe_promoted === true,
  );
  const quarantined_slugs = pack.rows
    .filter((row) => row.classification === "QUARANTINED_SUPPRESSED")
    .map((row) => normalizeSlug(row.slug))
    .sort();
  return { match_rows, quarantined_slugs };
}

function defaultLoadRenderedTruthPack(rootDir: string): BuckpartsFridgePdpRenderedTruthProofPackV1 {
  const abs = path.join(rootDir, BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1);
  if (!existsSync(abs)) {
    throw new Error(`missing rendered truth pack: ${BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1}`);
  }
  return JSON.parse(readFileSync(abs, "utf8")) as BuckpartsFridgePdpRenderedTruthProofPackV1;
}

async function defaultLoadFridge(slug: string): Promise<FridgeCtaGoProofFridgeLoadV1> {
  try {
    const { loadEnv } = await import("./load-env");
    loadEnv();
    const fridge = await getFridgeBySlug(slug);
    if (!fridge) return { status: "MISSING", reason: `getFridgeBySlug returned null for ${slug}` };
    return { status: "CHECKED", fridge };
  } catch (err) {
    return { status: "UNKNOWN", reason: err instanceof Error ? err.message : String(err) };
  }
}

function proveProductJsonLdSuppressed(): {
  status: BuckpartsFridgeCtaGoJsonLdStatusV1;
  notes: string[];
} {
  const canEmit = canEmitRefrigeratorFilterProductJsonLdV1({
    hasTruthfulOfferJsonLd: false,
  });
  const resolved = resolveRefrigeratorFilterProductJsonLdV1({
    name: "proof-pack",
    slug: "proof-pack",
    description: "proof",
    brandName: "proof",
    oemPartNumber: "proof",
    hasTruthfulOfferJsonLd: false,
  });
  if (canEmit === false && resolved === null) {
    return {
      status: "PROVEN_SUPPRESSED",
      notes: [
        "PROVEN: Product JSON-LD remains suppressed without truthful Offer (fridge PDP emits none; filter PDP gate returns null)",
      ],
    };
  }
  if (canEmit === true || resolved != null) {
    return {
      status: "UNSAFE_EMISSION_RISK",
      notes: ["Product JSON-LD gate would emit without truthful Offer — fail closed"],
    };
  }
  return { status: "UNKNOWN", notes: ["Product JSON-LD suppression could not be proven"] };
}

export function classifyFridgeModelPdpCtaGoLinkSlugV1(args: {
  match_row: BuckpartsFridgePdpRenderedTruthSlugRowV1;
  fridgeLoad: FridgeCtaGoProofFridgeLoadV1;
  quarantine: { quarantine: boolean; reason: string | null };
  jsonLd: { status: BuckpartsFridgeCtaGoJsonLdStatusV1; notes: string[] };
}): BuckpartsFridgeCtaGoLinkProofSlugRowV1 {
  const slug = normalizeSlug(args.match_row.slug);
  const rendered_filter_slugs = sortedUnique(args.match_row.rendered_filter_slugs ?? []);
  const missing_reasons: string[] = [];
  const notes: string[] = [
    "Scope: MATCH + frontend_safe_promoted from rendered-truth pack only",
    ...args.jsonLd.notes,
  ];

  if (args.fridgeLoad.status !== "CHECKED") {
    return {
      slug,
      cohort: args.match_row.cohort,
      rendered_truth_classification: "MATCH",
      rendered_filter_slugs,
      mapped_filter_count: 0,
      safe_cta_count: 0,
      go_resolvable_count: 0,
      cta_eligible: false,
      buyer_path_state: "UNKNOWN",
      quarantine: args.quarantine.quarantine,
      product_json_ld_status: args.jsonLd.status,
      verdict: "SAFE_BUYER_PATH_UNKNOWN",
      missing_reasons: [`fridge_load_${args.fridgeLoad.status.toLowerCase()}: ${args.fridgeLoad.reason}`],
      safe_go_link_ids: [],
      notes,
    };
  }

  if (args.quarantine.quarantine) {
    missing_reasons.push(
      `model_quarantined: ${args.quarantine.reason ?? "quarantine"} (excluded from frontend-safe buyer-path PASS)`,
    );
  }

  const fridge = args.fridgeLoad.fridge;
  const filters = fridge.filters ?? [];
  const mapped_filter_count = filters.length;

  if (mapped_filter_count === 0) {
    missing_reasons.push("no_mapped_filters_on_pdp_loader");
  }

  let safe_cta_count = 0;
  let go_resolvable_count = 0;
  const safe_go_link_ids: string[] = [];
  let anyTrustShowsBuy = false;
  let anyTrustSuppress = false;
  let bestBuyerPath: BuckpartsFridgeCtaGoLinkProofSlugRowV1["buyer_path_state"] = "suppress_buy";

  for (const filter of filters) {
    const gated = filter.retailer_links ?? [];
    safe_cta_count += gated.length;
    const trust = buildPartPageTrust({
      modelsCount: filter.compatible_fridge_model_count ?? 0,
      retailerLinks: gated.map((link) => ({
        id: link.id,
        affiliate_url: link.affiliate_url,
        retailer_name: link.retailer_name,
        retailer_key: link.retailer_key,
        is_primary: link.is_primary,
        browser_truth_checked_at: link.browser_truth_checked_at,
        browser_truth_classification: link.browser_truth_classification,
        browser_truth_buyable_subtype: link.browser_truth_buyable_subtype,
      })),
      oemPartNumber: filter.oem_part_number,
      alsoKnownAs: filter.also_known_as,
    });
    if (trust.buyer_path_state === "suppress_buy") {
      anyTrustSuppress = true;
    } else {
      anyTrustShowsBuy = true;
      if (
        trust.buyer_path_state === "show_confident_buy" ||
        bestBuyerPath !== "show_confident_buy"
      ) {
        bestBuyerPath = trust.buyer_path_state;
      }
    }

    for (const link of gated) {
      const goOk = isAffiliateUrlSafeForGoRedirect(
        link.retailer_key,
        link.affiliate_url,
        link.browser_truth_classification,
        link.browser_truth_buyable_subtype,
        link.browser_truth_checked_at,
        link.browser_truth_notes,
      );
      if (goOk && link.id) {
        go_resolvable_count += 1;
        safe_go_link_ids.push(String(link.id));
      }
    }
  }

  if (safe_cta_count === 0) missing_reasons.push("no_safe_direct_buyable_cta_after_gate");
  if (go_resolvable_count === 0) missing_reasons.push("no_go_resolvable_safe_retailer_link");
  if (!anyTrustShowsBuy) {
    missing_reasons.push(
      anyTrustSuppress || mapped_filter_count > 0
        ? "trust_buyer_path_suppress_buy_for_all_mapped_filters"
        : "trust_buyer_path_unavailable",
    );
  }
  if (args.jsonLd.status !== "PROVEN_SUPPRESSED") {
    missing_reasons.push(`product_json_ld_not_proven_suppressed:${args.jsonLd.status}`);
  }

  const cta_eligible = safe_cta_count > 0 && anyTrustShowsBuy && !args.quarantine.quarantine;
  const buyer_path_state =
    mapped_filter_count === 0 || !anyTrustShowsBuy ? ("suppress_buy" as const) : bestBuyerPath;

  const pass =
    !args.quarantine.quarantine &&
    mapped_filter_count > 0 &&
    safe_cta_count > 0 &&
    go_resolvable_count > 0 &&
    anyTrustShowsBuy &&
    args.jsonLd.status === "PROVEN_SUPPRESSED";

  return {
    slug,
    cohort: args.match_row.cohort,
    rendered_truth_classification: "MATCH",
    rendered_filter_slugs,
    mapped_filter_count,
    safe_cta_count,
    go_resolvable_count,
    cta_eligible,
    buyer_path_state,
    quarantine: args.quarantine.quarantine,
    product_json_ld_status: args.jsonLd.status,
    verdict: pass ? "SAFE_BUYER_PATH_PASS" : "SAFE_BUYER_PATH_FAIL",
    missing_reasons: pass ? [] : sortedUnique(missing_reasons),
    safe_go_link_ids: sortedUnique(safe_go_link_ids),
    notes: [
      ...notes,
      pass
        ? "PASS: all CTA + go-link + JSON-LD suppression gates proven (local data-path; not live HTML)"
        : "FAIL: buyer-path PASS requires mapped filters + safe CTA + go-resolvable link + non-quarantine + JSON-LD suppressed",
    ],
  };
}

export async function buildBuckpartsFridgeModelPdpCtaGoLinkProofPackV1(
  deps: BuildBuckpartsFridgeModelPdpCtaGoLinkProofDepsV1,
): Promise<BuckpartsFridgeModelPdpCtaGoLinkProofPackV1> {
  // Fresh allowlisted object only — never forward caller object (blocks runtime provenance forgery).
  return buildBuckpartsFridgeModelPdpCtaGoLinkProofPackInternalV1({
    rootDir: deps.rootDir,
    now: deps.now,
    loadRenderedTruthPack: deps.loadRenderedTruthPack,
    loadFridge: deps.loadFridge,
    resolveQuarantine: deps.resolveQuarantine,
  });
}

/**
 * Test-only builder: may inject provenance overrides.
 * Not called by CLI or production runtime paths.
 */
export async function buildBuckpartsFridgeModelPdpCtaGoLinkProofPackForTestsV1(
  deps: BuildBuckpartsFridgeModelPdpCtaGoLinkProofForTestsDepsV1,
): Promise<BuckpartsFridgeModelPdpCtaGoLinkProofPackV1> {
  return buildBuckpartsFridgeModelPdpCtaGoLinkProofPackInternalV1({
    rootDir: deps.rootDir,
    now: deps.now,
    loadRenderedTruthPack: deps.loadRenderedTruthPack,
    loadFridge: deps.loadFridge,
    resolveQuarantine: deps.resolveQuarantine,
    worktreeClean: deps.worktreeClean,
    baseCommit: deps.baseCommit,
  });
}

async function buildBuckpartsFridgeModelPdpCtaGoLinkProofPackInternalV1(
  deps: BuildBuckpartsFridgeModelPdpCtaGoLinkProofForTestsDepsV1,
): Promise<BuckpartsFridgeModelPdpCtaGoLinkProofPackV1> {
  const generated_at = (deps.now ?? (() => new Date()))().toISOString();
  const provenance = resolveArtifactProvenanceV1({
    rootDir: deps.rootDir,
    worktreeClean: deps.worktreeClean,
    baseCommit: deps.baseCommit,
  });
  const { source_commit, provenance_status, base_commit, worktree_clean } = provenance;
  const pack =
    deps.loadRenderedTruthPack?.() ?? defaultLoadRenderedTruthPack(deps.rootDir);
  const { match_rows, quarantined_slugs } = loadMatchSlugsFromRenderedTruthPackV1(pack);

  if (match_rows.length !== BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_EXPECTED_SLUG_COUNT_V1) {
    throw new Error(
      `CTA/go proof expects exactly ${String(BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_EXPECTED_SLUG_COUNT_V1)} MATCH+promoted slugs, got ${String(match_rows.length)}`,
    );
  }

  const matchSlugs = match_rows.map((r) => normalizeSlug(r.slug)).sort();
  for (const partial of GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1) {
    if (matchSlugs.includes(normalizeSlug(partial))) {
      throw new Error(`PARTIAL slug leaked into CTA/go proof scope: ${partial}`);
    }
  }
  for (const q of quarantined_slugs) {
    if (matchSlugs.includes(q)) {
      throw new Error(`QUARANTINED_SUPPRESSED slug leaked into CTA/go proof scope: ${q}`);
    }
  }

  const loadFridge = deps.loadFridge ?? defaultLoadFridge;
  const resolveQuarantine =
    deps.resolveQuarantine ??
    ((slug: string) => {
      const safety = resolveFridgeCustomerSafetyV1({
        fridgeModelSlug: slug,
        rootDir: deps.rootDir,
      });
      return { quarantine: safety.quarantine === true, reason: safety.reason };
    });

  const jsonLd = proveProductJsonLdSuppressed();
  const rows: BuckpartsFridgeCtaGoLinkProofSlugRowV1[] = [];
  for (const match_row of match_rows) {
    const slug = normalizeSlug(match_row.slug);
    const fridgeLoad = await loadFridge(slug);
    const quarantine = resolveQuarantine(slug);
    rows.push(
      classifyFridgeModelPdpCtaGoLinkSlugV1({
        match_row,
        fridgeLoad,
        quarantine,
        jsonLd,
      }),
    );
  }
  rows.sort((a, b) => a.slug.localeCompare(b.slug));

  const summary = {
    SAFE_BUYER_PATH_PASS: 0,
    SAFE_BUYER_PATH_FAIL: 0,
    SAFE_BUYER_PATH_UNKNOWN: 0,
    product_json_ld_proven_suppressed_count: 0,
  };
  for (const row of rows) {
    summary[row.verdict] += 1;
    if (row.product_json_ld_status === "PROVEN_SUPPRESSED") {
      summary.product_json_ld_proven_suppressed_count += 1;
    }
  }

  return {
    contract: BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    live_production_fetch_enabled: false,
    generated_at,
    base_commit,
    source_commit,
    provenance_status,
    worktree_clean,
    source_command: BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_SOURCE_COMMAND_V1,
    rendered_truth_pack_rel_path: BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1,
    scope: {
      slug_count: rows.length,
      slugs: matchSlugs,
      excluded_quarantined_slugs: quarantined_slugs,
      excluded_partial_slugs: GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
    },
    summary,
    rows,
    proven_facts: [
      "PROVEN: read_only=true; data_mutation=false; buy_cta_authorized=false; retailer_links_mutation_authorized=false.",
      `PROVEN: provenance_status=${provenance_status}; base_commit=${base_commit}; source_commit=${source_commit === null ? "null" : source_commit}.`,
      `PROVEN: exact scope=${String(BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_EXPECTED_SLUG_COUNT_V1)} MATCH+promoted slugs from rendered-truth pack.`,
      `PROVEN: excluded QUARANTINED_SUPPRESSED=${String(quarantined_slugs.length)}; PARTIAL=3.`,
      `PROVEN: summary=${JSON.stringify(summary)}.`,
      "PROVEN: SAFE_BUYER_PATH_PASS requires mapped filters + gated safe CTA + go-resolvable URL + non-quarantine + JSON-LD suppressed.",
    ],
    unknown_facts: [
      "UNKNOWN: Live production HTML CTA rendering for these 28 PDPs (no production fetch).",
      "UNKNOWN: Click analytics / real customer conversion on proven go links.",
    ],
    risk_notes: [
      "This pack does not authorize buy CTA promotion, retailer_links mutation, or Product JSON-LD invents.",
      "Mapping-layer frontend_safe ≠ monetizable SAFE_BUYER_PATH_PASS.",
      "Do not include quarantined or PARTIAL slugs in buyer-path PASS claims.",
    ],
  };
}

export function buildBuckpartsFridgeModelPdpCtaGoLinkProofMarkdownV1(
  report: BuckpartsFridgeModelPdpCtaGoLinkProofPackV1,
): string {
  const lines: string[] = [
    "# BuckParts fridge model PDP CTA / go-link proof pack v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- read_only: **${String(report.read_only)}**`,
    `- data_mutation: **${String(report.data_mutation)}**`,
    `- buy_cta_authorized: **${String(report.buy_cta_authorized)}**`,
    `- slug_count: **${String(report.scope.slug_count)}**`,
    `- rendered_truth_pack: \`${report.rendered_truth_pack_rel_path}\``,
    "",
    "## Summary",
    "",
    `- SAFE_BUYER_PATH_PASS: ${String(report.summary.SAFE_BUYER_PATH_PASS)}`,
    `- SAFE_BUYER_PATH_FAIL: ${String(report.summary.SAFE_BUYER_PATH_FAIL)}`,
    `- SAFE_BUYER_PATH_UNKNOWN: ${String(report.summary.SAFE_BUYER_PATH_UNKNOWN)}`,
    `- product_json_ld_proven_suppressed_count: ${String(report.summary.product_json_ld_proven_suppressed_count)}`,
    "",
    "## Rows",
    "",
    "| slug | cohort | verdict | safe_cta | go_ok | json_ld | missing |",
    "|---|---|---|---:|---:|---|---|",
  ];
  for (const row of report.rows) {
    lines.push(
      `| ${row.slug} | ${row.cohort} | ${row.verdict} | ${String(row.safe_cta_count)} | ${String(row.go_resolvable_count)} | ${row.product_json_ld_status} | ${row.missing_reasons.join("; ") || "(none)"} |`,
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

export function writeBuckpartsFridgeModelPdpCtaGoLinkProofArtifactsV1(args: {
  rootDir: string;
  report: BuckpartsFridgeModelPdpCtaGoLinkProofPackV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1;
  const mdRel = BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_MD_REL_V1;
  const allowed = new Set<string>(BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_ALLOWED_WRITE_REL_PATHS_V1);
  if (!allowed.has(jsonRel) || !allowed.has(mdRel)) {
    throw new Error("CTA/go proof write paths must stay on allowlist");
  }
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildBuckpartsFridgeModelPdpCtaGoLinkProofMarkdownV1(args.report), "utf8");
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
