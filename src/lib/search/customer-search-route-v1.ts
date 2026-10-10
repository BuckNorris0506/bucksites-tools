import { CATALOG_REFRIGERATOR_WATER_FILTER } from "@/lib/catalog/constants";
import { catalogFilterPath, catalogModelPath } from "@/lib/catalog/paths";
import type { SearchHit, SearchHitFilter, SearchHitFridge } from "@/lib/data/search";
import { normalizeSearchCompact, trimSearchInput } from "@/lib/search/normalize";

export type CustomerSearchRouteV1 =
  | { kind: "too_short"; query: string }
  | { kind: "recovery"; query: string }
  | {
      kind: "direct_model";
      query: string;
      href: string;
      modelNumber: string;
      slug: string;
    }
  | {
      kind: "direct_part";
      query: string;
      href: string;
      partNumber: string;
      slug: string;
    }
  | { kind: "resolution"; query: string; hits: SearchHit[] };

function isFridgeModelHit(hit: SearchHit): hit is SearchHitFridge {
  return hit.kind === "fridge";
}

function isFridgeFilterHit(hit: SearchHit): hit is SearchHitFilter {
  return hit.kind === "filter" && hit.catalog === CATALOG_REFRIGERATOR_WATER_FILTER;
}

/** Exact refrigerator model identity — not fuzzy rank, not partial token overlap alone. */
export function isExactFridgeModelIdentityHit(
  hit: SearchHitFridge,
  queryCompact: string,
): boolean {
  const modelCompact = normalizeSearchCompact(hit.model_number);
  if (modelCompact === queryCompact) {
    return true;
  }
  if (hit.via === "alias" && hit.matchedAlias) {
    return normalizeSearchCompact(hit.matchedAlias) === queryCompact;
  }
  return false;
}

/** Exact refrigerator filter part identity on OEM token. */
export function isExactFridgeFilterIdentityHit(
  hit: SearchHitFilter,
  queryCompact: string,
): boolean {
  return normalizeSearchCompact(hit.oem_part_number) === queryCompact;
}

/**
 * Customer search routing for global `/search` — refrigerator-first launch scope.
 * Ambiguous or multi-candidate queries must not auto-navigate to a single page.
 */
export function resolveCustomerSearchRouteV1(
  rawQuery: string,
  hits: SearchHit[],
): CustomerSearchRouteV1 {
  const query = trimSearchInput(rawQuery);
  if (query.length < 2) {
    return { kind: "too_short", query };
  }
  if (hits.length === 0) {
    return { kind: "recovery", query };
  }

  const queryCompact = normalizeSearchCompact(query);
  const fridgeModels = hits.filter(isFridgeModelHit);
  const fridgeFilters = hits.filter(isFridgeFilterHit);
  const exactModels = fridgeModels.filter((h) => isExactFridgeModelIdentityHit(h, queryCompact));
  const exactFilters = fridgeFilters.filter((h) => isExactFridgeFilterIdentityHit(h, queryCompact));

  const nonFridgeHits = hits.filter((h) => !isFridgeModelHit(h) && !isFridgeFilterHit(h));
  const inexactFridgeHits =
    fridgeModels.filter((h) => !isExactFridgeModelIdentityHit(h, queryCompact)).length +
    fridgeFilters.filter((h) => !isExactFridgeFilterIdentityHit(h, queryCompact)).length;

  if (
    exactModels.length === 1 &&
    exactFilters.length === 0 &&
    inexactFridgeHits === 0 &&
    nonFridgeHits.length === 0
  ) {
    const hit = exactModels[0]!;
    return {
      kind: "direct_model",
      query,
      href: catalogModelPath(CATALOG_REFRIGERATOR_WATER_FILTER, hit.slug),
      modelNumber: hit.model_number,
      slug: hit.slug,
    };
  }

  if (
    exactFilters.length === 1 &&
    exactModels.length === 0 &&
    inexactFridgeHits === 0 &&
    nonFridgeHits.length === 0
  ) {
    const hit = exactFilters[0]!;
    return {
      kind: "direct_part",
      query,
      href: `${catalogFilterPath(CATALOG_REFRIGERATOR_WATER_FILTER, hit.slug)}?fromSearch=1`,
      partNumber: hit.oem_part_number,
      slug: hit.slug,
    };
  }

  return { kind: "resolution", query, hits };
}
