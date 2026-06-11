/**
 * Revenue opportunity registry v1 — read-only planning lane; no external APIs or automation.
 */

import {
  buildOpportunityRegistryLaneV1,
  loadOpportunityRegistryV1,
  parseOpportunityRecordBaseV1,
  type CommandCenterOpportunityRecordBaseV1,
  type OpportunityRegistryLaneV1,
} from "./command-center-opportunity-registry-shared-v1";

export const REVENUE_OPPORTUNITY_REGISTRY_CONTRACT_V1 = "revenue_opportunity_registry_v1" as const;

export const REVENUE_OPPORTUNITY_REGISTRY_DIR_REL_V1 =
  "data/command-center/opportunities/revenue" as const;

export const REVENUE_OPPORTUNITY_REGISTRY_CC_JQ_PATH_V1 =
  ".command_center_v2.revenue_opportunity_registry_v1" as const;

export const REVENUE_OPPORTUNITY_TYPES_V1 = [
  "affiliate_lane_expansion",
  "ad_slot_readiness",
  "referral_program_gate",
  "commission_capture_gap",
  "proof_slice_monetization",
] as const;

export type RevenueOpportunityTypeV1 = (typeof REVENUE_OPPORTUNITY_TYPES_V1)[number];

export type RevenueOpportunityRecordV1 = CommandCenterOpportunityRecordBaseV1 & {
  registry_kind: "revenue";
  revenue_lane: string;
  monetization_gate: string;
  revenue_hypothesis: string;
};

export type RevenueOpportunityRegistryLaneV1 = OpportunityRegistryLaneV1<RevenueOpportunityRecordV1>;

export function parseRevenueOpportunityRecordV1(
  raw: unknown,
  sourceFile: string,
): { opportunity: RevenueOpportunityRecordV1 | null; parse_errors: string[] } {
  const parsed = parseOpportunityRecordBaseV1({
    raw,
    sourceFile,
    registry_kind: "revenue",
    opportunity_id_prefix: "REV-",
    parseDomainFields: () => ({ fields: {}, errors: [] }),
  });
  if (!parsed.base) return { opportunity: null, parse_errors: parsed.parse_errors };

  const record = raw as Record<string, unknown>;
  return {
    opportunity: {
      ...parsed.base,
      registry_kind: "revenue",
      revenue_lane: typeof record.revenue_lane === "string" ? record.revenue_lane : "",
      monetization_gate: typeof record.monetization_gate === "string" ? record.monetization_gate : "",
      revenue_hypothesis:
        typeof record.revenue_hypothesis === "string" ? record.revenue_hypothesis : "",
    },
    parse_errors: parsed.parse_errors,
  };
}

export function loadRevenueOpportunityRegistryV1(args: {
  rootDir: string;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  listDir?: (absolutePath: string) => string[];
}) {
  return loadOpportunityRegistryV1<RevenueOpportunityRecordV1>({
    ...args,
    registry_dir_rel: REVENUE_OPPORTUNITY_REGISTRY_DIR_REL_V1,
    parseRecord: parseRevenueOpportunityRecordV1,
  });
}

export function buildRevenueOpportunityRegistryLaneV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  listDir?: (absolutePath: string) => string[];
}): RevenueOpportunityRegistryLaneV1 {
  const loaded = loadRevenueOpportunityRegistryV1(args);
  return buildOpportunityRegistryLaneV1({
    contract: REVENUE_OPPORTUNITY_REGISTRY_CONTRACT_V1,
    recommended_jq_path: REVENUE_OPPORTUNITY_REGISTRY_CC_JQ_PATH_V1,
    registry_kind: "revenue",
    loaded,
    now: args.now,
  });
}
