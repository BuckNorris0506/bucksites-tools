/**
 * Read-only quarantined fridge model summary for Command Center JSON.
 */

import { getFridgeBySlug } from "@/lib/data/fridges";
import {
  listFridgeModelReviewOverrides,
  type FridgeModelReviewOverride,
} from "@/lib/fridge/fridge-model-review-overrides";

type QuarantinedFridgeModelStats = {
  mapped_filter_count: number;
  safe_cta_count: number;
} | null;

export type OwnerQuarantinedFridgeModelSummary = Pick<
  FridgeModelReviewOverride,
  "fridge_model_slug" | "reason" | "public_status" | "internal_evidence_doc"
> & {
  mapped_filter_count: number | "UNKNOWN";
  safe_cta_count: number | "UNKNOWN";
  owner_action_required: true;
};

export type OwnerQuarantinedFridgeModelsReport = {
  data_mutation: false;
  models: OwnerQuarantinedFridgeModelSummary[];
};

export type OwnerQuarantinedFridgeModelsV1 = OwnerQuarantinedFridgeModelsReport & {
  contract: "owner_quarantined_fridge_models_v1";
  read_only: true;
};

export async function buildOwnerQuarantinedFridgeModelsSummary(args?: {
  resolveModelStats?: (slug: string) => Promise<QuarantinedFridgeModelStats>;
}): Promise<OwnerQuarantinedFridgeModelSummary[]> {
  const resolveModelStats =
    args?.resolveModelStats ??
    (async (slug: string): Promise<QuarantinedFridgeModelStats> => {
      const fridge = await getFridgeBySlug(slug);
      if (!fridge) return null;
      return {
        mapped_filter_count: fridge.filters.length,
        safe_cta_count: fridge.filters.reduce((n, f) => n + f.retailer_links.length, 0),
      };
    });

  const overrides = listFridgeModelReviewOverrides();
  const rows = await Promise.all(
    overrides.map(async (o): Promise<OwnerQuarantinedFridgeModelSummary> => {
      try {
        const stats = await resolveModelStats(o.fridge_model_slug);
        return {
          fridge_model_slug: o.fridge_model_slug,
          reason: o.reason,
          public_status: o.public_status,
          internal_evidence_doc: o.internal_evidence_doc,
          mapped_filter_count: stats?.mapped_filter_count ?? "UNKNOWN",
          safe_cta_count: stats?.safe_cta_count ?? "UNKNOWN",
          owner_action_required: true,
        };
      } catch {
        return {
          fridge_model_slug: o.fridge_model_slug,
          reason: o.reason,
          public_status: o.public_status,
          internal_evidence_doc: o.internal_evidence_doc,
          mapped_filter_count: "UNKNOWN",
          safe_cta_count: "UNKNOWN",
          owner_action_required: true,
        };
      }
    }),
  );
  rows.sort((a, b) => a.fridge_model_slug.localeCompare(b.fridge_model_slug));
  return rows;
}

export async function buildOwnerQuarantinedFridgeModelsV1(
  args?: Parameters<typeof buildOwnerQuarantinedFridgeModelsSummary>[0],
): Promise<OwnerQuarantinedFridgeModelsV1> {
  const models = await buildOwnerQuarantinedFridgeModelsSummary(args);
  return {
    contract: "owner_quarantined_fridge_models_v1",
    read_only: true,
    data_mutation: false,
    models,
  };
}
