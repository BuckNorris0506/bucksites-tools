/**
 * Heuristic brand hints for refrigerator water filter OEM / SKU families.
 * Only suggests slugs that exist in `brands` (caller filters).
 */

export function compactAlnum(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type BrandRow = { id: string; slug: string; name: string };

export type FilterWithBrand = {
  id: string;
  slug: string;
  oem_part_number: string;
  brands?: { slug: string; name: string } | null;
};

export type FilterAliasRow = { filter_id: string; alias: string };

export type BrandCandidate = {
  brand_slug: string;
  brand_name: string;
  score: number;
  reasons: string[];
};

type OemPrefixRule = {
  test: (oemUpper: string) => boolean;
  brand_slugs: string[];
  note: string;
};

const OEM_PREFIX_RULES: OemPrefixRule[] = [
  {
    test: (o) => /^UKF\d/.test(o) || /^UKF$/.test(o),
    brand_slugs: ["whirlpool", "everydrop"],
    note: "OEM family UKF* commonly maps to Whirlpool / EveryDrop lines",
  },
  {
    test: (o) => /^EDR\d/.test(o) || o.startsWith("EDR"),
    brand_slugs: ["everydrop", "whirlpool"],
    note: "EDR* SKUs are the EveryDrop numbering system",
  },
  {
    test: (o) => /^XWFE|^RPWFE|^XWF|^MWF\b/.test(o),
    brand_slugs: ["ge"],
    note: "GE Appliances filter part numbering (XWFE/MWF family)",
  },
  {
    test: (o) => /^DA29|^DA97|^HAF-|^HAF\b/.test(o),
    brand_slugs: ["samsung"],
    note: "Samsung refrigerator filter prefixes",
  },
  {
    test: (o) => /^ULTRAWF/.test(o),
    brand_slugs: ["frigidaire", "electrolux"],
    note: "Frigidaire / Electrolux UltraWF style",
  },
  {
    test: (o) => /^LT\d|^ADQ/.test(o),
    brand_slugs: ["lg"],
    note: "LG / Kenmore Elite LT* and ADQ* SKUs",
  },
  {
    test: (o) => /^43968|^43967|^43965|^9085\b/.test(o),
    brand_slugs: ["whirlpool", "kitchenaid", "maytag"],
    note: "Whirlpool-corp numeric SKUs often used across Whirlpool brands",
  },
  {
    test: (o) => /^WF\d|^CF\d/.test(o),
    brand_slugs: ["bosch", "thermador"],
    note: "Bosch/Thermador-style compact codes (verify against catalog)",
  },
];

function asText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

export function extractPayloadSourceQuery(payload: Record<string, unknown> | null | undefined): string {
  if (!payload) return "";
  return (
    asText(payload.source_query) ??
    asText(payload.sample_raw_query) ??
    asText(payload.raw_query) ??
    ""
  );
}

export function extractPayloadInferredBrand(payload: Record<string, unknown> | null | undefined): string | null {
  if (!payload) return null;
  return asText(payload.inferred_brand_slug) ?? asText(payload.proposed_brand_slug);
}

/** True when staged row still needs a brand slug / id the promote pipeline can trust. */
export function needsBrandResolution(
  proposed_brand_id: string | null,
  proposed_brand_slug: string | null,
  brandById: Map<string, BrandRow>,
  brandSlugLower: Set<string>,
): boolean {
  if (proposed_brand_id && brandById.has(proposed_brand_id)) return false;
  const slug = proposed_brand_slug?.trim();
  if (slug && brandSlugLower.has(slug.toLowerCase())) return false;
  return true;
}

function addReason(
  map: Map<string, BrandCandidate>,
  slug: string,
  name: string,
  delta: number,
  reason: string,
): void {
  const key = slug.toLowerCase();
  const cur = map.get(key);
  if (!cur) {
    map.set(key, { brand_slug: slug, brand_name: name, score: delta, reasons: [reason] });
    return;
  }
  cur.score += delta;
  cur.reasons.push(reason);
}

export function buildBrandCandidates(args: {
  proposedOem: string | null;
  sampleRawQuery: string;
  normalizedQuery: string;
  stagedNormalizedQuery: string;
  payloadJson: Record<string, unknown> | null | undefined;
  filters: FilterWithBrand[];
  aliases: FilterAliasRow[];
  brands: BrandRow[];
}): BrandCandidate[] {
  const payload = args.payloadJson ?? {};
  const payloadSource = extractPayloadSourceQuery(payload);
  const inferred = extractPayloadInferredBrand(payload);

  const oemRaw = args.proposedOem?.trim() ?? "";
  const oemUpper = oemRaw.toUpperCase();
  const oemCompact = compactAlnum(oemRaw);

  const qPartsUnique = Array.from(
    new Set(
      [args.sampleRawQuery, args.normalizedQuery, args.stagedNormalizedQuery, payloadSource]
        .filter(Boolean)
        .map((s) => String(s).trim().toLowerCase()),
    ),
  );
  const queryBlob = qPartsUnique.join(" ");
  const qCompact = compactAlnum(queryBlob);

  const allowedSlugs = new Set(args.brands.map((b) => b.slug.toLowerCase()));
  const brandMeta = new Map(args.brands.map((b) => [b.slug.toLowerCase(), b] as const));

  const bySlug = new Map<string, BrandCandidate>();

  for (const f of args.filters) {
    const bslug = f.brands?.slug;
    const bname = f.brands?.name;
    if (!bslug || !bname) continue;
    if (!allowedSlugs.has(bslug.toLowerCase())) continue;

    const fo = f.oem_part_number.trim();
    const foUpper = fo.toUpperCase();
    const foCompact = compactAlnum(fo);

    if (oemUpper && foUpper === oemUpper) {
      addReason(bySlug, bslug, bname, 100, `filters.oem_part_number exact match (${foUpper})`);
    } else if (oemCompact && foCompact === oemCompact && oemCompact.length >= 4) {
      addReason(bySlug, bslug, bname, 95, `filters.oem_part_number compact match (${foCompact})`);
    }

    if (oemUpper && qCompact.includes(compactAlnum(fo)) && foCompact.length >= 5) {
      addReason(bySlug, bslug, bname, 40, `search text overlaps existing filter OEM ${foUpper} for same brand`);
    }
  }

  const aliasByFilter = new Map<string, FilterAliasRow[]>();
  for (const a of args.aliases) {
    const list = aliasByFilter.get(a.filter_id) ?? [];
    list.push(a);
    aliasByFilter.set(a.filter_id, list);
  }

  for (const f of args.filters) {
    const bslug = f.brands?.slug;
    const bname = f.brands?.name;
    if (!bslug || !bname) continue;
    if (!allowedSlugs.has(bslug.toLowerCase())) continue;

    const faList = aliasByFilter.get(f.id) ?? [];
    for (const { alias } of faList) {
      const al = alias.trim();
      if (!al) continue;
      const alUpper = al.toUpperCase();
      const alCompact = compactAlnum(al);
      if (oemUpper && alUpper === oemUpper) {
        addReason(bySlug, bslug, bname, 92, `filter_aliases exact match (${alUpper})`);
      } else if (oemCompact && alCompact === oemCompact && alCompact.length >= 4) {
        addReason(bySlug, bslug, bname, 88, `filter_aliases compact match (${alCompact})`);
      } else if (oemUpper && alUpper.includes(oemUpper) && oemUpper.length >= 4) {
        addReason(bySlug, bslug, bname, 55, `filter_aliases contains proposed OEM (${oemUpper} in ${alUpper})`);
      }
    }
  }

  if (oemUpper) {
    for (const rule of OEM_PREFIX_RULES) {
      if (!rule.test(oemUpper)) continue;
      for (const slug of rule.brand_slugs) {
        const low = slug.toLowerCase();
        if (!allowedSlugs.has(low)) continue;
        const b = brandMeta.get(low);
        if (!b) continue;
        addReason(bySlug, b.slug, b.name, 50, `oem_prefix_rule: ${rule.note}`);
      }
    }
  }

  if (inferred) {
    const low = inferred.toLowerCase();
    if (allowedSlugs.has(low)) {
      const b = brandMeta.get(low);
      if (b) addReason(bySlug, b.slug, b.name, 45, `payload inferred_brand_slug (${inferred})`);
    }
  }

  for (const b of args.brands) {
    const sCompact = compactAlnum(b.slug);
    if (sCompact.length >= 4 && qCompact.includes(sCompact)) {
      addReason(bySlug, b.slug, b.name, 38, `search/normalized text contains brand slug token (${b.slug})`);
    }
    const nameCompact = compactAlnum(b.name);
    if (nameCompact.length >= 5 && nameCompact.length <= 40 && qCompact.includes(nameCompact)) {
      addReason(bySlug, b.slug, b.name, 32, `search/normalized text contains brand name (${b.name})`);
    }
    const words = b.name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4);
    for (const w of words) {
      if (qCompact.includes(w)) {
        addReason(bySlug, b.slug, b.name, 22, `search text contains brand name word "${w}"`);
        break;
      }
    }
  }

  const ranked = Array.from(bySlug.values()).sort((a, b) => b.score - a.score);

  for (const c of ranked) {
    const seen = new Set<string>();
    c.reasons = c.reasons.filter((r) => {
      if (seen.has(r)) return false;
      seen.add(r);
      return true;
    });
  }

  return ranked;
}
