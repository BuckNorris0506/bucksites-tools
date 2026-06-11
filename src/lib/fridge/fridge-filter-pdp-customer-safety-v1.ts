/**
 * Customer-facing fridge filter PDP safety — hides quarantined model compat rows and
 * downgrades buy confidence when learned-failure BLOCK models share a filter slug.
 * Read-only; does not mutate Supabase or CSV catalog data.
 */

import {
  resolveFridgeCustomerSafetyV1,
  type FridgeCustomerSafetyEvidenceBasisV1,
} from "@/lib/fridge/fridge-learned-failure-customer-guard-v1";

const ALL_QUARANTINED_FILTER_PAGE_NOTE_V1 =
  "Every refrigerator model currently linked to this filter is under compatibility review. Open your exact model page and compare part numbers before buying any replacement filter." as const;

const PARTIAL_QUARANTINED_FILTER_PAGE_NOTE_V1 =
  "Some refrigerator models linked to this filter are under compatibility review because our reference data maps conflicting part families (for example mixed Samsung DA29/DA97, GE MWF/XWFE/RPWFE, or LG LT generations). Verify your exact fridge model and part number before buying." as const;

export const FRIDGE_SEARCH_COMPAT_UNDER_REVIEW_V1 =
  "Compatibility under review — BuckParts is verifying water filter fit for this refrigerator model." as const;

export type FridgeFilterPdpCustomerSafetyV1<T extends { slug: string }> = {
  display_fridge_models: T[];
  hidden_quarantined_model_count: number;
  filter_page_caution_note: string | null;
  force_suppress_buy: boolean;
  /** When every mapped model is quarantined and none remain visible for customers. */
  prefer_noindex: boolean;
  display_models_count: number;
  evidence_basis: FridgeCustomerSafetyEvidenceBasisV1;
};

export function filterFridgeModelsForCustomerDisplayV1<T extends { slug: string }>(
  fridgeModels: T[],
  opts?: { rootDir?: string },
): { models: T[]; hiddenQuarantinedCount: number } {
  let hiddenQuarantinedCount = 0;
  const models = fridgeModels.filter((model) => {
    const safety = resolveFridgeCustomerSafetyV1({
      fridgeModelSlug: model.slug,
      rootDir: opts?.rootDir,
    });
    if (safety.quarantine) {
      hiddenQuarantinedCount += 1;
      return false;
    }
    return true;
  });
  return { models, hiddenQuarantinedCount };
}

/** Fridge filter PDP alias aligned with air-purifier `filterCompatModelsForCustomerDisplayV1`. */
export const filterCompatModelsForCustomerDisplayV1 = filterFridgeModelsForCustomerDisplayV1;

export function resolveFridgeFilterPdpCustomerSafetyV1<T extends { slug: string }>(args: {
  filterSlug: string;
  fridgeModels: T[];
  gatedRetailerLinkCount: number;
  rootDir?: string;
}): FridgeFilterPdpCustomerSafetyV1<T> {
  const { models: displayModels, hiddenQuarantinedCount } = filterFridgeModelsForCustomerDisplayV1(
    args.fridgeModels,
    { rootDir: args.rootDir },
  );
  const rawCount = args.fridgeModels.length;
  const displayCount = displayModels.length;

  let filter_page_caution_note: string | null = null;
  let force_suppress_buy = false;
  let prefer_noindex = false;
  let evidence_basis: FridgeCustomerSafetyEvidenceBasisV1 = "UNKNOWN";

  if (hiddenQuarantinedCount > 0) {
    evidence_basis = "PROVEN";
    const allQuarantined = displayCount === 0 && rawCount > 0;
    const majorityQuarantined = displayCount > 0 && hiddenQuarantinedCount > displayCount;

    if (allQuarantined) {
      filter_page_caution_note = ALL_QUARANTINED_FILTER_PAGE_NOTE_V1;
      force_suppress_buy = args.gatedRetailerLinkCount > 0;
      prefer_noindex = true;
    } else if (displayCount > 0) {
      filter_page_caution_note = PARTIAL_QUARANTINED_FILTER_PAGE_NOTE_V1;
      if (majorityQuarantined && args.gatedRetailerLinkCount > 0) {
        force_suppress_buy = true;
      }
    }
  }

  return {
    display_fridge_models: displayModels,
    hidden_quarantined_model_count: hiddenQuarantinedCount,
    filter_page_caution_note,
    force_suppress_buy,
    prefer_noindex,
    display_models_count: displayCount,
    evidence_basis,
  };
}

export function resolveFridgeSearchModelHitDisplayV1(args: {
  fridgeModelSlug: string;
  rootDir?: string;
}): { show_typical_replacement: boolean; status_line: string | null } {
  const safety = resolveFridgeCustomerSafetyV1({
    fridgeModelSlug: args.fridgeModelSlug,
    rootDir: args.rootDir,
  });
  if (safety.quarantine) {
    return {
      show_typical_replacement: false,
      status_line: FRIDGE_SEARCH_COMPAT_UNDER_REVIEW_V1,
    };
  }
  return { show_typical_replacement: true, status_line: null };
}
