/**
 * Optional search-intent proof load for Wedge Completion Evaluator — isolated from alignment upstream.
 */

import {
  buildSearchIntentFactoryProofExperimentReportV1,
  type SearchIntentFactoryProofExperimentReportV1,
} from "./buckparts-search-intent-factory-proof-experiment-v1";
import type { ReferenceabilityFactoryRunV1 } from "./referenceability-factory-run-v1";

export type WedgeCompletionSearchIntentLoadResultV1 = {
  searchIntentVerdict: string | null;
  searchIntentManufacturedCount: number | null;
  searchIntentError: string | null;
};

export async function loadWedgeCompletionSearchIntentV1(args: {
  rootDir: string;
  now?: () => Date;
  referenceability?: ReferenceabilityFactoryRunV1 | null;
}): Promise<WedgeCompletionSearchIntentLoadResultV1> {
  try {
    const report: SearchIntentFactoryProofExperimentReportV1 =
      await buildSearchIntentFactoryProofExperimentReportV1({
        rootDir: args.rootDir,
        now: args.now,
        referenceabilityFactory: args.referenceability ?? undefined,
      });
    const moduleMissing = report.unknown_facts.some((f) => f.includes("MODULE_MISSING"));
    if (moduleMissing) {
      return {
        searchIntentVerdict: report.experiment_verdict,
        searchIntentManufacturedCount: report.manufactured_work_item_count,
        searchIntentError: report.unknown_facts.find((f) => f.includes("MODULE_MISSING")) ?? null,
      };
    }
    return {
      searchIntentVerdict: report.experiment_verdict,
      searchIntentManufacturedCount: report.manufactured_work_item_count,
      searchIntentError: null,
    };
  } catch (error: unknown) {
    return {
      searchIntentVerdict: null,
      searchIntentManufacturedCount: null,
      searchIntentError: error instanceof Error ? error.message : String(error),
    };
  }
}
