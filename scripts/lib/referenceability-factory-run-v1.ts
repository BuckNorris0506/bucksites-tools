/**
 * Read-only run orchestrator for buckparts_referenceability_factory_v1 Slice 1.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { HOMEKEEP_WEDGE_CATALOG, type HomekeepWedgeCatalog } from "@/lib/catalog/identity";

import {
  ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_CONTRACT_V1,
  buildAllProductSafeBuyerPathCensusV1,
  type AllProductCensusProductRowV1,
  type AllProductSafeBuyerPathCensusV1,
} from "./all-product-safe-buyer-path-census-v1";
import {
  buildBuckpartsMarketingIntelligenceEngineV1Report,
  type MarketingOpportunityV1,
  type MarketingPublishabilityStatusV1,
  type MarketingWrongPartRiskV1,
} from "./buckparts-marketing-intelligence-engine-v1";
import { buildDemandToCoverageNextLaneV1Report } from "./demand-to-coverage-next-lane-v1";
import {
  buildReferenceabilityPageContextV1,
  type ReferenceabilityWorkItemV1,
} from "./referenceability-factory-gap-detectors-v1";
import {
  buildReferenceabilityPagePacketV1,
  type ReferenceabilityPagePacketV1,
} from "./referenceability-factory-page-packet-v1";
import {
  buildRepoRuntimeConvergenceGateReportV1,
  type RepoRuntimeConvergenceGateReportV1,
  type RepoRuntimeConvergenceGateStateV1,
} from "./repo-runtime-convergence-gate-v1";

export const REFERENCEABILITY_FACTORY_CONTRACT_V1 = "referenceability_factory_run_v1" as const;

export const REFERENCEABILITY_FACTORY_SOURCE_COMMAND_V1 =
  "npm run buckparts:referenceability:factory" as const;

export const REFERENCEABILITY_FACTORY_SCOPED_WEDGES_V1 = [
  HOMEKEEP_WEDGE_CATALOG.air_purifier,
  HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
] as const satisfies readonly HomekeepWedgeCatalog[];

export type ReferenceabilityFactorySkippedRowV1 = {
  wedge: AllProductCensusProductRowV1["wedge"];
  slug: string;
  public_route: string;
  page_classification: AllProductCensusProductRowV1["page_classification"];
  skip_reasons: string[];
  recommendation_count: 0;
};

export type ReferenceabilityFactoryRunV1 = {
  contract: typeof REFERENCEABILITY_FACTORY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  artifact_write_authorized: false;
  source_command: typeof REFERENCEABILITY_FACTORY_SOURCE_COMMAND_V1;
  generated_at: string;
  scoped_wedges: typeof REFERENCEABILITY_FACTORY_SCOPED_WEDGES_V1;
  census_contract: typeof ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_CONTRACT_V1;
  eligible_packet_count: number;
  skipped_row_count: number;
  recommendation_count: number;
  work_item_count: number;
  packets: ReferenceabilityPagePacketV1[];
  work_items: ReferenceabilityWorkItemV1[];
  skipped_rows: ReferenceabilityFactorySkippedRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

type WedgeCsvPathsV1 = {
  filters: string;
  compatibility: string;
  retailer_links: string;
  page_template: string;
};

const WEDGE_CSV_PATHS: Record<(typeof REFERENCEABILITY_FACTORY_SCOPED_WEDGES_V1)[number], WedgeCsvPathsV1> =
  {
    [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: {
      filters: "data/filters.csv",
      compatibility: "data/compatibility_mappings.csv",
      retailer_links: "data/retailer_links.csv",
      page_template: "src/app/filter/[slug]/page.tsx",
    },
    [HOMEKEEP_WEDGE_CATALOG.air_purifier]: {
      filters: "data/air-purifier/filters.csv",
      compatibility: "data/air-purifier/compatibility_mappings.csv",
      retailer_links: "data/air-purifier/retailer_links.csv",
      page_template: "src/app/air-purifier/filter/[slug]/page.tsx",
    },
  };

export type MarketingRiskBySlugV1 = Map<
  string,
  { wrong_part_risk: MarketingWrongPartRiskV1; publishability_status: MarketingPublishabilityStatusV1 }
>;

export type BuildReferenceabilityFactoryRunDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  census?: AllProductSafeBuyerPathCensusV1;
  marketingRiskBySlug?: MarketingRiskBySlugV1 | null;
  apRuntimeGate?: RepoRuntimeConvergenceGateReportV1 | null;
  loadMarketing?: boolean;
};

function defaultFileExists(abs: string): boolean {
  return existsSync(abs);
}

function defaultReadText(abs: string): string {
  return readFileSync(abs, "utf8");
}

function readCsv(
  rootDir: string,
  rel: string,
  fileExists: (abs: string) => boolean,
  readText: (abs: string) => string,
): Record<string, string>[] {
  const abs = path.join(rootDir, rel);
  if (!fileExists(abs)) return [];
  return parse(readText(abs), { columns: true, skip_empty_lines: true, trim: true }) as Record<
    string,
    string
  >[];
}

function worstWrongPartRisk(
  a: MarketingWrongPartRiskV1,
  b: MarketingWrongPartRiskV1,
): MarketingWrongPartRiskV1 {
  const rank = { HIGH: 3, MEDIUM: 2, LOW: 1 } as const;
  return rank[a] >= rank[b] ? a : b;
}

function worstPublishability(
  a: MarketingPublishabilityStatusV1,
  b: MarketingPublishabilityStatusV1,
): MarketingPublishabilityStatusV1 {
  const blocked: MarketingPublishabilityStatusV1[] = ["DO_NOT_PUBLISH"];
  if (blocked.includes(a) || blocked.includes(b)) return "DO_NOT_PUBLISH";
  return a;
}

export function buildMarketingRiskIndexFromOpportunitiesV1(
  opportunities: MarketingOpportunityV1[],
): MarketingRiskBySlugV1 {
  const index: MarketingRiskBySlugV1 = new Map();
  for (const opp of opportunities) {
    const slugKey = opp.evidence_keys.find((k) => k.startsWith("slug:"));
    if (!slugKey) continue;
    const slug = slugKey.slice("slug:".length);
    const existing = index.get(slug);
    if (!existing) {
      index.set(slug, {
        wrong_part_risk: opp.wrong_part_risk,
        publishability_status: opp.publishability_status,
      });
      continue;
    }
    index.set(slug, {
      wrong_part_risk: worstWrongPartRisk(existing.wrong_part_risk, opp.wrong_part_risk),
      publishability_status: worstPublishability(
        existing.publishability_status,
        opp.publishability_status,
      ),
    });
  }
  return index;
}

type SlugCsvContextV1 = {
  compat_model_count: number;
  filter_row_present: boolean;
  oem_part_number: string | null;
  browser_truth_checked_at: string | null;
  browser_truth_classification: string | null;
};

function buildSlugCsvContextIndexV1(args: {
  rootDir: string;
  wedge: (typeof REFERENCEABILITY_FACTORY_SCOPED_WEDGES_V1)[number];
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): Map<string, SlugCsvContextV1> {
  const paths = WEDGE_CSV_PATHS[args.wedge];
  const filters = readCsv(args.rootDir, paths.filters, args.fileExists, args.readText);
  const compat = readCsv(args.rootDir, paths.compatibility, args.fileExists, args.readText);
  const retailer = readCsv(args.rootDir, paths.retailer_links, args.fileExists, args.readText);

  const filterBySlug = new Map<string, Record<string, string>>();
  for (const row of filters) {
    const slug = row.slug?.trim();
    if (slug) filterBySlug.set(slug, row);
  }

  const compatCountBySlug = new Map<string, number>();
  for (const row of compat) {
    const slug = (row.filter_slug ?? row.filter_id ?? "").trim();
    if (!slug) continue;
    compatCountBySlug.set(slug, (compatCountBySlug.get(slug) ?? 0) + 1);
  }

  const retailerBySlug = new Map<string, Record<string, string>>();
  for (const row of retailer) {
    const slug = row.filter_slug?.trim();
    if (!slug) continue;
    const isPrimary = row.is_primary?.toLowerCase() === "true";
    if (!retailerBySlug.has(slug) || isPrimary) {
      retailerBySlug.set(slug, row);
    }
  }

  const slugs = new Set<string>([
    ...Array.from(filterBySlug.keys()),
    ...Array.from(compatCountBySlug.keys()),
    ...Array.from(retailerBySlug.keys()),
  ]);

  const index = new Map<string, SlugCsvContextV1>();
  for (const slug of Array.from(slugs)) {
    const filterRow = filterBySlug.get(slug);
    const retailerRow = retailerBySlug.get(slug);
    index.set(slug, {
      compat_model_count: compatCountBySlug.get(slug) ?? 0,
      filter_row_present: Boolean(filterRow),
      oem_part_number: filterRow?.oem_part_number?.trim() || null,
      browser_truth_checked_at: retailerRow?.browser_truth_checked_at?.trim() || null,
      browser_truth_classification: retailerRow?.browser_truth_classification?.trim() || null,
    });
  }
  return index;
}

function sortWorkItemsDeterministicV1(items: ReferenceabilityWorkItemV1[]): ReferenceabilityWorkItemV1[] {
  return [...items].sort((a, b) => {
    const score = b.priority_score - a.priority_score;
    if (score !== 0) return score;
    return a.work_item_id.localeCompare(b.work_item_id);
  });
}

export async function buildReferenceabilityFactoryRunV1(
  deps: BuildReferenceabilityFactoryRunDepsV1,
): Promise<ReferenceabilityFactoryRunV1> {
  const now = deps.now ?? (() => new Date());
  const fileExists = deps.fileExists ?? defaultFileExists;
  const readText = deps.readText ?? defaultReadText;
  const generatedAt = now().toISOString();

  const census = deps.census ?? buildAllProductSafeBuyerPathCensusV1({ rootDir: deps.rootDir, now });

  const unknown_facts: string[] = [...census.unknown_facts];
  const proven_facts: string[] = [
    `PROVEN: read_only=true data_mutation=false mutation_authorized=false`,
    `PROVEN: scoped_wedges=${REFERENCEABILITY_FACTORY_SCOPED_WEDGES_V1.join(",")}`,
    `PROVEN: census_contract=${ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_CONTRACT_V1}`,
  ];

  let marketingRiskBySlug: MarketingRiskBySlugV1 = deps.marketingRiskBySlug ?? new Map();
  if (deps.marketingRiskBySlug === undefined && deps.loadMarketing !== false) {
    try {
      const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: deps.rootDir });
      const marketing = await buildBuckpartsMarketingIntelligenceEngineV1Report({
        rootDir: deps.rootDir,
        demandToCoverageNextLane: demand,
      });
      marketingRiskBySlug = buildMarketingRiskIndexFromOpportunitiesV1(marketing.opportunities);
      if (demand.source_status === "UNKNOWN") {
        unknown_facts.push(
          "GSC demand join unavailable — demand weighting omitted from priority (factory continues).",
        );
      }
      unknown_facts.push(...marketing.unknown_facts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      unknown_facts.push(`marketing_intelligence_engine_v1 unavailable: ${message}`);
    }
  }

  let apGateState: RepoRuntimeConvergenceGateStateV1 | null = null;
  if (deps.apRuntimeGate) {
    apGateState = deps.apRuntimeGate.state;
    proven_facts.push(`PROVEN: ap_runtime_gate_state=${apGateState}`);
  } else {
    try {
      const gate = await buildRepoRuntimeConvergenceGateReportV1({
        rootDir: deps.rootDir,
        enforce: false,
      });
      apGateState = gate.state;
      proven_facts.push(`PROVEN: ap_runtime_gate_state=${gate.state}`);
      unknown_facts.push(...gate.unknown_facts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      unknown_facts.push(`repo_runtime_convergence_gate_v1 unavailable: ${message}`);
    }
  }

  const templateSources = new Map<string, string | null>();
  for (const wedge of REFERENCEABILITY_FACTORY_SCOPED_WEDGES_V1) {
    const rel = WEDGE_CSV_PATHS[wedge].page_template;
    const abs = path.join(deps.rootDir, rel);
    templateSources.set(wedge, fileExists(abs) ? readText(abs) : null);
  }

  const csvContextByWedge = new Map<
    (typeof REFERENCEABILITY_FACTORY_SCOPED_WEDGES_V1)[number],
    Map<string, SlugCsvContextV1>
  >();
  for (const wedge of REFERENCEABILITY_FACTORY_SCOPED_WEDGES_V1) {
    csvContextByWedge.set(
      wedge,
      buildSlugCsvContextIndexV1({ rootDir: deps.rootDir, wedge, fileExists, readText }),
    );
  }

  const scopedSet = new Set<string>(REFERENCEABILITY_FACTORY_SCOPED_WEDGES_V1);
  const scopedProducts = census.products
    .filter((p) => scopedSet.has(p.wedge))
    .sort((a, b) => {
      const wedgeCmp = a.wedge.localeCompare(b.wedge);
      if (wedgeCmp !== 0) return wedgeCmp;
      return a.slug.localeCompare(b.slug);
    });

  const packets: ReferenceabilityPagePacketV1[] = [];
  const skipped_rows: ReferenceabilityFactorySkippedRowV1[] = [];

  for (const row of scopedProducts) {
    const inScope = scopedSet.has(row.wedge);
    const wedge = row.wedge as (typeof REFERENCEABILITY_FACTORY_SCOPED_WEDGES_V1)[number];
    const csvCtx = csvContextByWedge.get(wedge)?.get(row.slug) ?? {
      compat_model_count: 0,
      filter_row_present: false,
      oem_part_number: null,
      browser_truth_checked_at: null,
      browser_truth_classification: null,
    };

    const context = buildReferenceabilityPageContextV1({
      wedge: row.wedge,
      slug: row.slug,
      compat_model_count: csvCtx.compat_model_count,
      filter_row_present: csvCtx.filter_row_present,
      oem_part_number: csvCtx.oem_part_number,
      browser_truth_checked_at: csvCtx.browser_truth_checked_at,
      browser_truth_classification: csvCtx.browser_truth_classification,
      page_template_source: templateSources.get(row.wedge) ?? null,
      marketing_risk: marketingRiskBySlug.get(row.slug) ?? null,
      ap_runtime_gate_state: row.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier ? apGateState : null,
    });

    const packet = buildReferenceabilityPagePacketV1({
      row,
      context,
      inScope,
      now: now(),
    });
    packets.push(packet);

    if (packet.eligibility !== "ELIGIBLE_SAFE_PROVEN") {
      skipped_rows.push({
        wedge: row.wedge,
        slug: row.slug,
        public_route: row.public_route,
        page_classification: row.page_classification,
        skip_reasons: packet.eligibility_block_reasons,
        recommendation_count: 0,
      });
    }
  }

  const work_items = sortWorkItemsDeterministicV1(packets.flatMap((p) => p.work_items));
  const recommendation_count = packets.reduce((sum, p) => sum + p.recommendations.length, 0);
  const eligible_packet_count = packets.filter((p) => p.eligibility === "ELIGIBLE_SAFE_PROVEN").length;

  return {
    contract: REFERENCEABILITY_FACTORY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    artifact_write_authorized: false,
    source_command: REFERENCEABILITY_FACTORY_SOURCE_COMMAND_V1,
    generated_at: generatedAt,
    scoped_wedges: REFERENCEABILITY_FACTORY_SCOPED_WEDGES_V1,
    census_contract: ALL_PRODUCT_SAFE_BUYER_PATH_CENSUS_CONTRACT_V1,
    eligible_packet_count,
    skipped_row_count: skipped_rows.length,
    recommendation_count,
    work_item_count: work_items.length,
    packets,
    work_items,
    skipped_rows,
    proven_facts,
    unknown_facts: Array.from(new Set(unknown_facts)),
  };
}
