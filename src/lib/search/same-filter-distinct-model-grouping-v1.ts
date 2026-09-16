/**
 * Presentation-only grouping for Levoit Core 300 / Core 300S search hits.
 * Does not mutate catalog rows, aliases, or compatibility mappings.
 *
 * Core 300 and Core 300S stay distinct families. Color and "-P" listings
 * nest under those families. RF / RAC / RWM / SKU / other identifiers stay
 * ungrouped so unknown or distinct records are not treated as equivalent.
 */

export const SAME_FILTER_DISTINCT_MODEL_COPY_V1 = {
  originalReplacementLabel: "Typical original replacement",
  identityCheckLabel: "Confirm which machine you have",
  sharedFilterNote:
    "Several results currently list this original filter in our reference. That does not make the machines the same.",
  distinctMachineNote:
    "Core 300 and Core 300S are different machines. Color and “-P” names are extra listings for those machines, not extra filters.",
  alsoListedAsLabel: "Also listed as",
  openUnitLabel: "Open this unit",
  otherListingsLabel: "Other listings with this original filter",
  otherListingsNote:
    "These identifiers stay separate in our catalog. Confirm the name on your unit before opening one.",
} as const;

export type Core300SearchFamilyKeyV1 = "core-300" | "core-300s";

export type Core300IdentityClassV1 =
  | "ALIAS"
  | "SAME_FILTER_BUT_DISTINCT_MODEL"
  | "UNKNOWN";

export type GroupableSearchModelHitV1 = {
  kind: "model";
  slug: string;
  model_number: string;
  brand_name: string;
  compatible_filters?: { oem_part_number: string; slug: string }[];
};

export type GroupableSearchFilterHitV1 = {
  kind: "filter";
  slug: string;
  oem_part_number: string;
  name: string | null;
};

export type Core300IdentityClassificationV1 = {
  familyKey: Core300SearchFamilyKeyV1 | null;
  familyLabel: "Core 300" | "Core 300S" | null;
  isCanonical: boolean;
  classification: Core300IdentityClassV1 | null;
};

export type Core300SearchFamilyGroupV1<M extends GroupableSearchModelHitV1> = {
  familyKey: Core300SearchFamilyKeyV1;
  familyLabel: "Core 300" | "Core 300S";
  canonical: M | null;
  aliases: M[];
  members: M[];
};

export type Core300SameFilterSearchLayoutV1<
  M extends GroupableSearchModelHitV1,
  F extends GroupableSearchFilterHitV1,
> = {
  groupingApplied: boolean;
  sharedFilter: F | null;
  sharedFilterFromModels: { oem_part_number: string; slug: string } | null;
  families: Core300SearchFamilyGroupV1<M>[];
  ungroupedModels: M[];
  remainingFilters: F[];
};

const FAMILY_LABEL: Record<Core300SearchFamilyKeyV1, "Core 300" | "Core 300S"> = {
  "core-300": "Core 300",
  "core-300s": "Core 300S",
};

export function compactModelNumberV1(modelNumber: string): string {
  return modelNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Classify a consumer-facing model_number for Core 300 search presentation.
 * Returns null familyKey when the record must stay ungrouped.
 */
export function classifyLevoitCore300IdentityV1(
  modelNumber: string,
): Core300IdentityClassificationV1 {
  const raw = modelNumber.trim();
  const compact = compactModelNumberV1(raw);

  if (!compact.startsWith("CORE300")) {
    return { familyKey: null, familyLabel: null, isCanonical: false, classification: null };
  }

  // Filter-named or revision-like records — do not nest under a consumer unit.
  if (/^CORE300(RF|RAC|RWM)P?$/.test(compact)) {
    return {
      familyKey: null,
      familyLabel: null,
      isCanonical: false,
      classification: compact.endsWith("RF") ? "UNKNOWN" : "SAME_FILTER_BUT_DISTINCT_MODEL",
    };
  }

  if (/^CORE300S(P)?(SMART)?(BLACK|WHITE)?$/.test(compact) || /^CORE300S(P)?(BLACK|WHITE)?(SMART)?$/.test(compact)) {
    return {
      familyKey: "core-300s",
      familyLabel: "Core 300S",
      isCanonical: /^Core 300S$/i.test(raw),
      classification: /^Core 300S$/i.test(raw) ? "SAME_FILTER_BUT_DISTINCT_MODEL" : "ALIAS",
    };
  }

  if (/^CORE300(P)?(BLACK|WHITE)?$/.test(compact)) {
    return {
      familyKey: "core-300",
      familyLabel: "Core 300",
      isCanonical: /^Core 300$/i.test(raw),
      classification: /^Core 300$/i.test(raw) ? "SAME_FILTER_BUT_DISTINCT_MODEL" : "ALIAS",
    };
  }

  return {
    familyKey: null,
    familyLabel: null,
    isCanonical: false,
    classification: "UNKNOWN",
  };
}

function singleSharedFilterSlug(
  models: GroupableSearchModelHitV1[],
): { oem_part_number: string; slug: string } | null {
  const slugs = new Set<string>();
  const bySlug = new Map<string, { oem_part_number: string; slug: string }>();
  for (const model of models) {
    const filters = model.compatible_filters ?? [];
    if (filters.length !== 1) return null;
    const filter = filters[0]!;
    slugs.add(filter.slug);
    bySlug.set(filter.slug, filter);
  }
  if (slugs.size !== 1) return null;
  const slug = [...slugs][0]!;
  return bySlug.get(slug) ?? null;
}

function pickCanonical<M extends GroupableSearchModelHitV1>(
  familyKey: Core300SearchFamilyKeyV1,
  members: M[],
): M | null {
  const wanted = FAMILY_LABEL[familyKey];
  const exact = members.find((m) => m.model_number.trim().toLowerCase() === wanted.toLowerCase());
  return exact ?? null;
}

function sortMembers<M extends GroupableSearchModelHitV1>(members: M[]): M[] {
  return [...members].sort((a, b) => {
    const byNumber = a.model_number.localeCompare(b.model_number);
    if (byNumber !== 0) return byNumber;
    return a.slug.localeCompare(b.slug);
  });
}

/**
 * Build a presentation layout for air-purifier search hits.
 * Returns groupingApplied=false when Core 300 family clustering would hide
 * distinctions or when there is nothing to collapse.
 */
export function layoutCore300SameFilterSearchHitsV1<
  M extends GroupableSearchModelHitV1,
  F extends GroupableSearchFilterHitV1,
>(args: {
  models: M[];
  filters: F[];
}): Core300SameFilterSearchLayoutV1<M, F> {
  const models = args.models;
  const filters = args.filters;
  const empty: Core300SameFilterSearchLayoutV1<M, F> = {
    groupingApplied: false,
    sharedFilter: null,
    sharedFilterFromModels: null,
    families: [],
    ungroupedModels: models,
    remainingFilters: filters,
  };

  if (models.length < 2) return empty;

  const sharedFromModels = singleSharedFilterSlug(models);
  const buckets = new Map<Core300SearchFamilyKeyV1, M[]>();
  const ungrouped: M[] = [];

  for (const model of models) {
    const identity = classifyLevoitCore300IdentityV1(model.model_number);
    if (!identity.familyKey) {
      ungrouped.push(model);
      continue;
    }
    const list = buckets.get(identity.familyKey) ?? [];
    list.push(model);
    buckets.set(identity.familyKey, list);
  }

  const families: Core300SearchFamilyGroupV1<M>[] = (["core-300", "core-300s"] as const)
    .filter((key) => (buckets.get(key)?.length ?? 0) > 0)
    .map((key) => {
      const members = sortMembers(buckets.get(key) ?? []);
      const canonical = pickCanonical(key, members) ?? members[0] ?? null;
      return {
        familyKey: key,
        familyLabel: FAMILY_LABEL[key],
        canonical,
        aliases: members.filter((m) => m !== canonical),
        members,
      };
    });

  const familyMemberCount = families.reduce((n, family) => n + family.members.length, 0);
  const hasAliasCollapse = families.some((family) => family.members.length >= 2);
  const hasBothMachines = families.length === 2;

  const shouldGroup =
    Boolean(sharedFromModels) &&
    familyMemberCount >= 2 &&
    (hasAliasCollapse || hasBothMachines);

  if (!shouldGroup) return empty;

  const sharedFilter =
    filters.find((filter) => filter.slug === sharedFromModels?.slug) ?? null;

  return {
    groupingApplied: true,
    sharedFilter,
    sharedFilterFromModels: sharedFromModels,
    families,
    ungroupedModels: ungrouped,
    remainingFilters: filters.filter((filter) => filter.slug !== sharedFromModels?.slug),
  };
}
