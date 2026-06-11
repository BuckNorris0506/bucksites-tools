/**
 * SEO opportunity registry v1 — read-only planning lane; no external APIs or automation.
 */

import {
  buildOpportunityRegistryLaneV1,
  loadOpportunityRegistryV1,
  parseOpportunityRecordBaseV1,
  type CommandCenterOpportunityRecordBaseV1,
  type OpportunityRegistryLaneV1,
} from "./command-center-opportunity-registry-shared-v1";

export const SEO_OPPORTUNITY_REGISTRY_CONTRACT_V1 = "seo_opportunity_registry_v1" as const;

export const SEO_OPPORTUNITY_REGISTRY_DIR_REL_V1 = "data/command-center/opportunities/seo" as const;

export const SEO_OPPORTUNITY_REGISTRY_CC_JQ_PATH_V1 =
  ".command_center_v2.seo_opportunity_registry_v1" as const;

export const SEO_OPPORTUNITY_TYPES_V1 = [
  "indexability_gap",
  "content_gap",
  "internal_link_opportunity",
  "structured_data_opportunity",
  "query_capture_opportunity",
] as const;

export type SeoOpportunityTypeV1 = (typeof SEO_OPPORTUNITY_TYPES_V1)[number];

export type SeoOpportunityRecordV1 = CommandCenterOpportunityRecordBaseV1 & {
  registry_kind: "seo";
  seo_surface: "organic" | "sitemap" | "structured_data" | "internal_links" | "unknown";
  target_queries: string[];
  indexability_hypothesis: string;
};

export type SeoOpportunityRegistryLaneV1 = OpportunityRegistryLaneV1<SeoOpportunityRecordV1>;

function isSeoSurface(value: unknown): value is SeoOpportunityRecordV1["seo_surface"] {
  return (
    typeof value === "string" &&
    (["organic", "sitemap", "structured_data", "internal_links", "unknown"] as readonly string[]).includes(
      value,
    )
  );
}

export function parseSeoOpportunityRecordV1(
  raw: unknown,
  sourceFile: string,
): { opportunity: SeoOpportunityRecordV1 | null; parse_errors: string[] } {
  const parsed = parseOpportunityRecordBaseV1({
    raw,
    sourceFile,
    registry_kind: "seo",
    opportunity_id_prefix: "SEO-",
    parseDomainFields: () => ({ fields: {}, errors: [] }),
  });
  if (!parsed.base) return { opportunity: null, parse_errors: parsed.parse_errors };

  const record = raw as Record<string, unknown>;
  const seo_surface = isSeoSurface(record.seo_surface) ? record.seo_surface : "unknown";

  return {
    opportunity: {
      ...parsed.base,
      registry_kind: "seo",
      seo_surface,
      target_queries: Array.isArray(record.target_queries)
        ? record.target_queries.filter((item): item is string => typeof item === "string")
        : [],
      indexability_hypothesis:
        typeof record.indexability_hypothesis === "string" ? record.indexability_hypothesis : "",
    },
    parse_errors: parsed.parse_errors,
  };
}

export function loadSeoOpportunityRegistryV1(args: {
  rootDir: string;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  listDir?: (absolutePath: string) => string[];
}) {
  return loadOpportunityRegistryV1<SeoOpportunityRecordV1>({
    ...args,
    registry_dir_rel: SEO_OPPORTUNITY_REGISTRY_DIR_REL_V1,
    parseRecord: parseSeoOpportunityRecordV1,
  });
}

export function buildSeoOpportunityRegistryLaneV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  listDir?: (absolutePath: string) => string[];
}): SeoOpportunityRegistryLaneV1 {
  const loaded = loadSeoOpportunityRegistryV1(args);
  return buildOpportunityRegistryLaneV1({
    contract: SEO_OPPORTUNITY_REGISTRY_CONTRACT_V1,
    recommended_jq_path: SEO_OPPORTUNITY_REGISTRY_CC_JQ_PATH_V1,
    registry_kind: "seo",
    loaded,
    now: args.now,
  });
}
