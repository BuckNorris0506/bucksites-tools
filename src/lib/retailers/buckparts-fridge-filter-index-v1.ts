/**
 * Read-only refrigerator filter slug / OEM / alias index from repo CSVs.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { compactPartTokenKey } from "@/lib/retailers/waterdrop-linksynergy-parse-v1";

export type BuckpartsFridgeFilterRowV1 = {
  brand_slug: string;
  slug: string;
  oem_part_number: string;
  name: string;
  aliases: string[];
};

export type BuckpartsFridgeFilterIndexV1 = {
  contract: "buckparts_fridge_filter_index_v1";
  filters: BuckpartsFridgeFilterRowV1[];
  by_slug: Map<string, BuckpartsFridgeFilterRowV1>;
  by_compact_token: Map<string, { slug: string; match_kind: "oem" | "alias" }>;
};

type FilterCsvRow = {
  brand_slug: string;
  slug: string;
  oem_part_number: string;
  name: string;
};

type AliasCsvRow = {
  filter_slug: string;
  alias: string;
};

function parseCsv<T>(csvText: string): T[] {
  return parse(csvText, { columns: true, skip_empty_lines: true }) as T[];
}

/** Load `data/filters.csv` + `data/filter_aliases.csv` (refrigerator wedge catalog). */
export function loadBuckpartsFridgeFilterIndexFromRepo(rootDir: string): BuckpartsFridgeFilterIndexV1 {
  const filtersPath = path.join(rootDir, "data/filters.csv");
  const aliasesPath = path.join(rootDir, "data/filter_aliases.csv");
  const filterRows = parseCsv<FilterCsvRow>(readFileSync(filtersPath, "utf8"));
  const aliasRows = existsSync(aliasesPath)
    ? parseCsv<AliasCsvRow>(readFileSync(aliasesPath, "utf8"))
    : [];

  const aliasesBySlug = new Map<string, string[]>();
  for (const row of aliasRows) {
    const slug = row.filter_slug?.trim().toLowerCase();
    const alias = row.alias?.trim();
    if (!slug || !alias) continue;
    const list = aliasesBySlug.get(slug) ?? [];
    list.push(alias);
    aliasesBySlug.set(slug, list);
  }

  const filters: BuckpartsFridgeFilterRowV1[] = filterRows.map((row) => ({
    brand_slug: row.brand_slug.trim(),
    slug: row.slug.trim().toLowerCase(),
    oem_part_number: row.oem_part_number.trim().toUpperCase(),
    name: row.name.trim(),
    aliases: aliasesBySlug.get(row.slug.trim().toLowerCase()) ?? [],
  }));

  const by_slug = new Map(filters.map((f) => [f.slug, f]));
  const by_compact_token = new Map<string, { slug: string; match_kind: "oem" | "alias" }>();
  for (const f of filters) {
    by_compact_token.set(compactPartTokenKey(f.oem_part_number), { slug: f.slug, match_kind: "oem" });
    for (const a of f.aliases) {
      const key = compactPartTokenKey(a);
      if (!by_compact_token.has(key)) {
        by_compact_token.set(key, { slug: f.slug, match_kind: "alias" });
      }
    }
  }

  return {
    contract: "buckparts_fridge_filter_index_v1",
    filters,
    by_slug,
    by_compact_token,
  };
}

export type TokenMatchConfidenceV1 =
  | "EXACT_OEM_PART_NUMBER"
  | "ALIAS_TOKEN"
  | "URL_OR_TITLE_INFERRED"
  | "NO_MATCH";

export type TokenToSlugMatchV1 = {
  matched_slug: string | null;
  matched_oem_part_number: string | null;
  match_confidence: TokenMatchConfidenceV1;
  matched_token: string | null;
};

export function matchInferredTokensToBuckpartsSlug(
  index: BuckpartsFridgeFilterIndexV1,
  inferredTokens: string[],
): TokenToSlugMatchV1 {
  let best: TokenToSlugMatchV1 = {
    matched_slug: null,
    matched_oem_part_number: null,
    match_confidence: "NO_MATCH",
    matched_token: null,
  };

  for (const raw of inferredTokens) {
    const hit = index.by_compact_token.get(compactPartTokenKey(raw));
    if (!hit) continue;
    const row = index.by_slug.get(hit.slug);
    if (!row) continue;
    const confidence: TokenMatchConfidenceV1 =
      hit.match_kind === "oem" ? "EXACT_OEM_PART_NUMBER" : "ALIAS_TOKEN";
    const rank = confidence === "EXACT_OEM_PART_NUMBER" ? 3 : 2;
    const bestRank =
      best.match_confidence === "EXACT_OEM_PART_NUMBER"
        ? 3
        : best.match_confidence === "ALIAS_TOKEN"
          ? 2
          : 0;
    if (rank > bestRank) {
      best = {
        matched_slug: row.slug,
        matched_oem_part_number: row.oem_part_number,
        match_confidence: confidence,
        matched_token: raw.toUpperCase(),
      };
    }
  }

  if (best.match_confidence === "NO_MATCH" && inferredTokens.length > 0) {
    const slugHit = inferredTokens
      .map((t) => t.trim().toLowerCase())
      .find((t) => index.by_slug.has(t));
    if (slugHit) {
      const row = index.by_slug.get(slugHit)!;
      return {
        matched_slug: row.slug,
        matched_oem_part_number: row.oem_part_number,
        match_confidence: "URL_OR_TITLE_INFERRED",
        matched_token: slugHit,
      };
    }
  }

  return best;
}
