/**
 * Read-only candidate row source for Batch Production Lane v1.
 * PROVEN: no writes; builds input rows from repo files + constants only.
 */

import {
  BATCH_PRODUCTION_V1_BATCH_SIZE_CAP,
  type BatchProductionLaneInputRowV1,
} from "./batch-production-lane-v1";

export const BATCH_PRODUCTION_SOURCE_AMAZON_RESCUE_DEFAULT_V1 =
  "amazon-rescue-default" as const;

/**
 * Must match `scripts/lib/amazon-rescue-human-verification-packet-v1.ts`
 * `AMAZON_RESCUE_HUMAN_VERIFICATION_DEFAULT_TOKENS`.
 */
export const BATCH_AMAZON_RESCUE_DEFAULT_COHORT_TOKENS_V1 = [
  "ADQ75795101",
  "DA97-08006B",
  "DA97-17376A",
  "DA97-19467C",
  "W10413645A",
] as const;

export const BATCH_AMAZON_RESCUE_DEFAULT_SOURCE_MAX_ROWS_V1 = 5;

export const BATCH_AMAZON_RESCUE_DEFAULT_QUEUE_ROW_ID_V1 = "queue-amazon-agent";

type FilterCsvRow = { slug: string; oem_part_number: string; name: string };

type TokenControlEntry = {
  token: string;
  status: string;
  reason: string;
  next_action?: string;
  evidence_file?: string;
};

export type BuildAmazonRescueDefaultSourceDepsV1 = {
  readTextFile: (absolutePath: string) => string;
  listEvidenceFilenames: (evidenceDir: string) => string[];
  tokens?: readonly string[];
  maxRows?: number;
};

export type BuildAmazonRescueDefaultSourceResultV1 = {
  source: typeof BATCH_PRODUCTION_SOURCE_AMAZON_RESCUE_DEFAULT_V1;
  read_only: true;
  data_mutation: false;
  rows: BatchProductionLaneInputRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

/** Minimal CSV: first column + quoted fields; sufficient for repo filter/retailer_links exports. */
export function parseCsvRowsV1(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const fields: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        fields.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    fields.push(cur);
    rows.push(fields);
  }
  return rows;
}

function normalizeTokenKey(token: string): string {
  return token.trim().toUpperCase();
}

function loadFiltersByOemToken(
  csvText: string,
): Map<string, FilterCsvRow> {
  const parsed = parseCsvRowsV1(csvText);
  const header = parsed[0];
  if (!header) return new Map();
  const slugIdx = header.indexOf("slug");
  const oemIdx = header.indexOf("oem_part_number");
  const nameIdx = header.indexOf("name");
  if (slugIdx < 0 || oemIdx < 0 || nameIdx < 0) return new Map();

  const map = new Map<string, FilterCsvRow>();
  for (const row of parsed.slice(1)) {
    const oem = row[oemIdx]?.trim();
    const slug = row[slugIdx]?.trim().toLowerCase();
    if (!oem || !slug) continue;
    map.set(normalizeTokenKey(oem), {
      slug,
      oem_part_number: oem,
      name: row[nameIdx]?.trim() ?? oem,
    });
  }
  return map;
}

function loadOemCatalogUrlBySlug(csvText: string): Map<string, string> {
  const parsed = parseCsvRowsV1(csvText);
  const header = parsed[0];
  if (!header) return new Map();
  const slugIdx = header.indexOf("filter_slug");
  const urlIdx = header.indexOf("affiliate_url");
  const keyIdx = header.indexOf("retailer_key");
  if (slugIdx < 0 || urlIdx < 0) return new Map();

  const map = new Map<string, string>();
  for (const row of parsed.slice(1)) {
    const slug = row[slugIdx]?.trim().toLowerCase();
    const url = row[urlIdx]?.trim();
    const retailerKey = keyIdx >= 0 ? row[keyIdx]?.trim().toLowerCase() : "";
    if (!slug || !url) continue;
    if (retailerKey && retailerKey !== "oem-parts-catalog") continue;
    if (!map.has(slug)) map.set(slug, url);
  }
  return map;
}

function loadTokenControls(
  jsonText: string,
): Map<string, TokenControlEntry> {
  const map = new Map<string, TokenControlEntry>();
  try {
    const doc = JSON.parse(jsonText) as { entries?: TokenControlEntry[] };
    for (const e of doc.entries ?? []) {
      if (e?.token) map.set(normalizeTokenKey(e.token), e);
    }
  } catch {
    return map;
  }
  return map;
}

function hasSelfPrefixAmazonEvidence(
  evidenceFilenames: string[],
  slug: string,
): boolean {
  const prefix = `amazon-${slug.toLowerCase()}-`;
  return evidenceFilenames.some((f) => f.toLowerCase().startsWith(prefix));
}

function buildReadOnlyRationaleV1(input: {
  token: string;
  slug: string | null;
  control: TokenControlEntry | null;
  hasAmazonEvidence: boolean;
  catalogUrl: string | null;
}): string {
  const parts: string[] = [
    "PROVEN: cohort from BATCH_AMAZON_RESCUE_DEFAULT_COHORT_TOKENS_V1 (amazon-rescue-human-verification default).",
    `PROVEN: source_queue_row_id=${BATCH_AMAZON_RESCUE_DEFAULT_QUEUE_ROW_ID_V1}.`,
  ];
  if (input.control) {
    parts.push(
      `PROVEN: data/ops/amazon-rescue-token-controls.json status=${input.control.status}.`,
    );
  } else {
    parts.push(
      "INFERRED: token not listed in data/ops/amazon-rescue-token-controls.json (treat as operator-paced Amazon rescue).",
    );
  }
  if (input.slug) {
    if (input.hasAmazonEvidence) {
      parts.push(`PROVEN: data/evidence/amazon-${input.slug}-* present on disk.`);
    } else {
      parts.push(`PROVEN: no data/evidence/amazon-${input.slug}-*.json on disk.`);
    }
  } else {
    parts.push("UNKNOWN: filters.csv row not found for token.");
  }
  if (input.catalogUrl) {
    parts.push(
      "PROVEN: data/retailer_links.csv OEM catalog lookup URL (not Amazon PDP; buyer path unknown).",
    );
  } else {
    parts.push("UNKNOWN: no OEM catalog URL proven in data/retailer_links.csv for slug.");
  }
  return parts.join(" ");
}

/**
 * Build batch lane input rows from repo-owned Amazon rescue default cohort.
 */
export function buildBatchProductionRowsFromAmazonRescueDefaultV1(
  repoRoot: string,
  deps: BuildAmazonRescueDefaultSourceDepsV1,
): BuildAmazonRescueDefaultSourceResultV1 {
  const tokens = deps.tokens ?? BATCH_AMAZON_RESCUE_DEFAULT_COHORT_TOKENS_V1;
  const maxRows = deps.maxRows ?? BATCH_AMAZON_RESCUE_DEFAULT_SOURCE_MAX_ROWS_V1;
  const cap = Math.min(maxRows, tokens.length, BATCH_PRODUCTION_V1_BATCH_SIZE_CAP);

  const filtersPath = `${repoRoot}/data/filters.csv`;
  const linksPath = `${repoRoot}/data/retailer_links.csv`;
  const controlsPath = `${repoRoot}/data/ops/amazon-rescue-token-controls.json`;
  const evidenceDir = `${repoRoot}/data/evidence`;

  const filtersByToken = loadFiltersByOemToken(deps.readTextFile(filtersPath));
  const urlsBySlug = loadOemCatalogUrlBySlug(deps.readTextFile(linksPath));
  const controls = loadTokenControls(deps.readTextFile(controlsPath));
  const evidenceFiles = deps.listEvidenceFilenames(evidenceDir);

  const rows: BatchProductionLaneInputRowV1[] = [];
  const proven_facts: string[] = [
    "PROVEN: Rows built read-only from data/filters.csv, data/retailer_links.csv, data/ops/amazon-rescue-token-controls.json, and data/evidence/ listing.",
    `PROVEN: Cohort cap=${cap} (maxRows=${maxRows}, default cohort length=${tokens.length}).`,
  ];
  const unknown_facts: string[] = [
    "UNKNOWN: Live Amazon exact-token PDP / buyability (requires human browser evidence or Supabase read not used here).",
  ];

  for (const token of tokens.slice(0, cap)) {
    const key = normalizeTokenKey(token);
    const filter = filtersByToken.get(key) ?? null;
    const slug = filter?.slug ?? null;
    const control = controls.get(key) ?? null;
    const hasEvidence = slug ? hasSelfPrefixAmazonEvidence(evidenceFiles, slug) : false;
    const catalogUrl = slug ? (urlsBySlug.get(slug) ?? null) : null;

    rows.push({
      row_id: slug ?? `token-${key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      token: filter?.oem_part_number ?? token,
      slug,
      url: catalogUrl,
      source_queue_row_id: BATCH_AMAZON_RESCUE_DEFAULT_QUEUE_ROW_ID_V1,
      title: filter?.name ?? token,
      candidate_kind: "rescue_target",
      buyer_path_safety: "unknown",
      wrong_purchase_risk: "unknown",
      read_only_rationale: buildReadOnlyRationaleV1({
        token,
        slug,
        control,
        hasAmazonEvidence: hasEvidence,
        catalogUrl,
      }),
    });
  }

  return {
    source: BATCH_PRODUCTION_SOURCE_AMAZON_RESCUE_DEFAULT_V1,
    read_only: true,
    data_mutation: false,
    rows,
    proven_facts,
    unknown_facts,
  };
}
