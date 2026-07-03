/**
 * Customer-facing fridge filter PDP safety — hides quarantined model compat rows and
 * downgrades buy confidence when learned-failure BLOCK or WARN ambiguity is present.
 * Read-only; does not mutate Supabase or CSV catalog data.
 */

import {
  isFridgeModelSingleFilterFamilyAmbiguousV1,
} from "@/lib/fridge/fridge-single-filter-family-ambiguity-v1";
import {
  resolveFridgeCustomerSafetyV1,
  type FridgeCustomerSafetyEvidenceBasisV1,
} from "@/lib/fridge/fridge-learned-failure-customer-guard-v1";

const GSWF_FILTER_SLUGS_V1 = new Set(["gswf", "gswf2"]);

export const GSWF_FILTER_PAGE_CAUTION_NOTE_V1 =
  "BuckParts is reviewing GSWF compatibility for models on this page. Our reference data links multiple filter families without proven single-family proof — verify your model and filter housing before buying." as const;

export const GSWF2_FILTER_PAGE_VERIFY_HOUSING_NOTE_V1 =
  "GSWF2 may be a related GE cartridge. BuckParts treats GSWF2 as under review until housing fit and OEM supersession are verified — do not assume GSWF and GSWF2 are interchangeable." as const;

const ALL_QUARANTINED_FILTER_PAGE_NOTE_V1 =
  "Every refrigerator model currently linked to this filter is under compatibility review. Open your exact model page and compare part numbers before buying any replacement filter." as const;

const PARTIAL_QUARANTINED_FILTER_PAGE_NOTE_V1 =
  "Some refrigerator models linked to this filter are under compatibility review because our reference data maps conflicting part families (for example mixed Samsung DA29/DA97, GE MWF/XWFE/RPWFE, or LG LT generations). Verify your exact fridge model and part number before buying." as const;

export const SINGLE_FILTER_FAMILY_AMBIGUITY_FILTER_PAGE_NOTE_V1 =
  "Double-check before you buy: Some refrigerators can use more than one filter type. Match the part number on your old filter or refrigerator manual before ordering." as const;

export const FRIDGE_SEARCH_COMPAT_UNDER_REVIEW_V1 =
  "Compatibility under review — BuckParts is verifying water filter fit for this refrigerator model." as const;

export type FridgeFilterPdpCustomerSafetyV1<T extends { slug: string }> = {
  display_fridge_models: T[];
  hidden_quarantined_model_count: number;
  warn_ambiguous_model_count: number;
  filter_page_caution_note: string | null;
  force_suppress_buy: boolean;
  prefer_caution_buy: boolean;
  /** When every mapped model is quarantined and none remain visible for customers. */
  prefer_noindex: boolean;
  display_models_count: number;
  evidence_basis: FridgeCustomerSafetyEvidenceBasisV1;
};

function countWarnAmbiguousModelsV1<T extends { slug: string }>(
  models: T[],
  rootDir?: string,
): number {
  let count = 0;
  for (const model of models) {
    if (
      isFridgeModelSingleFilterFamilyAmbiguousV1({
        fridgeModelSlug: model.slug,
        rootDir,
      })
    ) {
      count += 1;
    }
  }
  return count;
}

function buildFilterPageCautionNoteV1(args: {
  filterSlug: string;
  hiddenQuarantinedCount: number;
  displayCount: number;
  warnAmbiguousCount: number;
}): string | null {
  const filterSlug = args.filterSlug.trim().toLowerCase();
  const notes: string[] = [];

  if (args.hiddenQuarantinedCount > 0) {
    const allQuarantined = args.displayCount === 0;
    if (allQuarantined) {
      notes.push(ALL_QUARANTINED_FILTER_PAGE_NOTE_V1);
    } else {
      notes.push(PARTIAL_QUARANTINED_FILTER_PAGE_NOTE_V1);
    }
  }

  if (args.warnAmbiguousCount > 0) {
    if (GSWF_FILTER_SLUGS_V1.has(filterSlug)) {
      notes.push(GSWF_FILTER_PAGE_CAUTION_NOTE_V1);
    } else {
      notes.push(SINGLE_FILTER_FAMILY_AMBIGUITY_FILTER_PAGE_NOTE_V1);
    }
    if (filterSlug === "gswf2") {
      notes.push(GSWF2_FILTER_PAGE_VERIFY_HOUSING_NOTE_V1);
    }
  }

  if (notes.length === 0) return null;
  return notes.join(" ");
}

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
  const warnAmbiguousCount = countWarnAmbiguousModelsV1(displayModels, args.rootDir);

  let force_suppress_buy = false;
  let prefer_noindex = false;
  let evidence_basis: FridgeCustomerSafetyEvidenceBasisV1 = "UNKNOWN";

  if (hiddenQuarantinedCount > 0) {
    evidence_basis = "PROVEN";
    const allQuarantined = displayCount === 0 && rawCount > 0;
    const majorityQuarantined = displayCount > 0 && hiddenQuarantinedCount > displayCount;

    if (allQuarantined) {
      force_suppress_buy = args.gatedRetailerLinkCount > 0;
      prefer_noindex = true;
    } else if (majorityQuarantined && args.gatedRetailerLinkCount > 0) {
      force_suppress_buy = true;
    }
  }

  if (warnAmbiguousCount > 0) {
    evidence_basis = "PROVEN";
  }

  const prefer_caution_buy =
    !force_suppress_buy &&
    warnAmbiguousCount > 0 &&
    args.gatedRetailerLinkCount > 0 &&
    displayCount > 0;

  const filter_page_caution_note = buildFilterPageCautionNoteV1({
    filterSlug: args.filterSlug,
    hiddenQuarantinedCount,
    displayCount,
    warnAmbiguousCount,
  });

  return {
    display_fridge_models: displayModels,
    hidden_quarantined_model_count: hiddenQuarantinedCount,
    warn_ambiguous_model_count: warnAmbiguousCount,
    filter_page_caution_note,
    force_suppress_buy,
    prefer_caution_buy,
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
  const warnAmbiguous = isFridgeModelSingleFilterFamilyAmbiguousV1({
    fridgeModelSlug: args.fridgeModelSlug,
    rootDir: args.rootDir,
  });
  if (safety.quarantine || warnAmbiguous) {
    return {
      show_typical_replacement: false,
      status_line: FRIDGE_SEARCH_COMPAT_UNDER_REVIEW_V1,
    };
  }
  return { show_typical_replacement: true, status_line: null };
}
