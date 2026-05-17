/**
 * Batch Production Lane v1 — shared --source dispatch (read-only).
 */

import {
  BATCH_PRODUCTION_SOURCE_AMAZON_RESCUE_DEFAULT_V1,
  buildBatchProductionRowsFromAmazonRescueDefaultV1,
  type BuildAmazonRescueDefaultSourceDepsV1,
} from "./batch-production-amazon-rescue-source-v1";
import {
  BATCH_PRODUCTION_SOURCE_NON_AMAZON_PDP_CANDIDATES_V1,
  buildBatchProductionRowsFromNonAmazonPdpCandidatesV1,
  type BuildNonAmazonPdpSourceDepsV1,
} from "./batch-production-non-amazon-pdp-source-v1";
import {
  buildBatchProductionReviewReportV1,
  type BatchProductionLaneInputRowV1,
  type BatchProductionReviewReportV1,
} from "./batch-production-lane-v1";

export const BATCH_PRODUCTION_SUPPORTED_SOURCES_V1 = [
  BATCH_PRODUCTION_SOURCE_AMAZON_RESCUE_DEFAULT_V1,
  BATCH_PRODUCTION_SOURCE_NON_AMAZON_PDP_CANDIDATES_V1,
] as const;

export type BatchProductionSupportedSourceV1 =
  (typeof BATCH_PRODUCTION_SUPPORTED_SOURCES_V1)[number];

export function formatBatchProductionSupportedSourcesListV1(): string {
  return BATCH_PRODUCTION_SUPPORTED_SOURCES_V1.join(", ");
}

export type BuildBatchProductionRowsFromSourceDepsV1 = BuildAmazonRescueDefaultSourceDepsV1 &
  BuildNonAmazonPdpSourceDepsV1;

export function buildBatchProductionRowsFromSourceV1(
  source: string,
  repoRoot: string,
  deps: BuildBatchProductionRowsFromSourceDepsV1,
): { rows: BatchProductionLaneInputRowV1[] } {
  if (source === BATCH_PRODUCTION_SOURCE_AMAZON_RESCUE_DEFAULT_V1) {
    return { rows: buildBatchProductionRowsFromAmazonRescueDefaultV1(repoRoot, deps).rows };
  }
  if (source === BATCH_PRODUCTION_SOURCE_NON_AMAZON_PDP_CANDIDATES_V1) {
    return { rows: buildBatchProductionRowsFromNonAmazonPdpCandidatesV1(repoRoot, deps).rows };
  }
  throw new Error(
    `unknown --source ${source}; supported: ${formatBatchProductionSupportedSourcesListV1()}`,
  );
}

export function buildBatchProductionReviewFromSourceV1(
  source: string,
  repoRoot: string,
  deps: BuildBatchProductionRowsFromSourceDepsV1,
): BatchProductionReviewReportV1 {
  const { rows } = buildBatchProductionRowsFromSourceV1(source, repoRoot, deps);
  return buildBatchProductionReviewReportV1({
    rows,
    generated_at: new Date().toISOString(),
  });
}
