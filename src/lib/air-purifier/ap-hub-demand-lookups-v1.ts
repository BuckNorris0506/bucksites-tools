import { isAirPurifierModelUnderOwnerReview } from "@/lib/air-purifier/air-purifier-model-review-overrides";
import { getAirPurifierModelBySlug } from "@/lib/data/air-purifier/models";

export type ApHubDemandLookup = {
  slug: string;
  modelNumber: string;
  brandName: string;
  title: string;
};

/**
 * Repo-proven slugs from `data/air-purifier/models.csv`, ordered by GSC steering priority.
 * GSC window 2026-06-04..2026-07-03 (founder artifact): `/air-purifier/model/shark-hp150` leads AP model demand.
 */
export const AP_HUB_DEMAND_LOOKUP_CANDIDATE_SLUGS_V1 = [
  "shark-hp150",
  "shark-hp300",
] as const;

/** Resolve indexable AP model pages safe to link from the hub (mapped filters, not under owner review). */
export async function resolveApHubDemandLookupsForHub(): Promise<ApHubDemandLookup[]> {
  const resolved: ApHubDemandLookup[] = [];
  for (const slug of AP_HUB_DEMAND_LOOKUP_CANDIDATE_SLUGS_V1) {
    if (isAirPurifierModelUnderOwnerReview(slug)) continue;
    const model = await getAirPurifierModelBySlug(slug);
    if (!model || model.filters.length === 0) continue;
    resolved.push({
      slug: model.slug,
      modelNumber: model.model_number,
      brandName: model.brand.name,
      title: model.title,
    });
  }
  return resolved;
}
