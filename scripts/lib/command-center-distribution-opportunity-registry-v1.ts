/**
 * Distribution opportunity registry v1 — read-only planning lane; no external APIs or automation.
 */

import {
  buildOpportunityRegistryLaneV1,
  loadOpportunityRegistryV1,
  parseOpportunityRecordBaseV1,
  type CommandCenterOpportunityRecordBaseV1,
  type OpportunityRegistryLaneV1,
} from "./command-center-opportunity-registry-shared-v1";

export const DISTRIBUTION_OPPORTUNITY_REGISTRY_CONTRACT_V1 =
  "distribution_opportunity_registry_v1" as const;

export const DISTRIBUTION_OPPORTUNITY_REGISTRY_DIR_REL_V1 =
  "data/command-center/opportunities/distribution" as const;

export const DISTRIBUTION_OPPORTUNITY_REGISTRY_CC_JQ_PATH_V1 =
  ".command_center_v2.distribution_opportunity_registry_v1" as const;

export const DISTRIBUTION_OPPORTUNITY_TYPES_V1 = [
  "channel_expansion",
  "syndication_readiness",
  "partner_outreach",
  "audience_segment_capture",
  "referral_surface_expansion",
] as const;

export type DistributionOpportunityTypeV1 = (typeof DISTRIBUTION_OPPORTUNITY_TYPES_V1)[number];

export type DistributionOpportunityRecordV1 = CommandCenterOpportunityRecordBaseV1 & {
  registry_kind: "distribution";
  distribution_channel: string;
  audience_segment: string;
  reach_hypothesis: string;
};

export type DistributionOpportunityRegistryLaneV1 =
  OpportunityRegistryLaneV1<DistributionOpportunityRecordV1>;

export function parseDistributionOpportunityRecordV1(
  raw: unknown,
  sourceFile: string,
): { opportunity: DistributionOpportunityRecordV1 | null; parse_errors: string[] } {
  const parsed = parseOpportunityRecordBaseV1({
    raw,
    sourceFile,
    registry_kind: "distribution",
    opportunity_id_prefix: "DIST-",
    parseDomainFields: () => ({ fields: {}, errors: [] }),
  });
  if (!parsed.base) return { opportunity: null, parse_errors: parsed.parse_errors };

  const record = raw as Record<string, unknown>;
  return {
    opportunity: {
      ...parsed.base,
      registry_kind: "distribution",
      distribution_channel:
        typeof record.distribution_channel === "string" ? record.distribution_channel : "",
      audience_segment: typeof record.audience_segment === "string" ? record.audience_segment : "",
      reach_hypothesis: typeof record.reach_hypothesis === "string" ? record.reach_hypothesis : "",
    },
    parse_errors: parsed.parse_errors,
  };
}

export function loadDistributionOpportunityRegistryV1(args: {
  rootDir: string;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  listDir?: (absolutePath: string) => string[];
}) {
  return loadOpportunityRegistryV1<DistributionOpportunityRecordV1>({
    ...args,
    registry_dir_rel: DISTRIBUTION_OPPORTUNITY_REGISTRY_DIR_REL_V1,
    parseRecord: parseDistributionOpportunityRecordV1,
  });
}

export function buildDistributionOpportunityRegistryLaneV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  listDir?: (absolutePath: string) => string[];
}): DistributionOpportunityRegistryLaneV1 {
  const loaded = loadDistributionOpportunityRegistryV1(args);
  return buildOpportunityRegistryLaneV1({
    contract: DISTRIBUTION_OPPORTUNITY_REGISTRY_CONTRACT_V1,
    recommended_jq_path: DISTRIBUTION_OPPORTUNITY_REGISTRY_CC_JQ_PATH_V1,
    registry_kind: "distribution",
    loaded,
    now: args.now,
  });
}
