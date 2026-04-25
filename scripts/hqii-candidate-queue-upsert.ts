import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalAmazonDpUrl } from "./lib/discovery-candidate-enrichment";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

type CandidateState =
  | "candidate_found"
  | "token_verified"
  | "browser_truth_checked"
  | "direct_buyable"
  | "likely_valid"
  | "rejected";

const CATALOG_WEDGES = [
  "refrigerator_water",
  "air_purifier",
  "vacuum",
  "humidifier",
  "whole_house_water",
  "appliance_air",
] as const;

type CatalogWedge = (typeof CATALOG_WEDGES)[number];

const WEDGE_TABLE_FK: Record<CatalogWedge, { table: string; fkColumn: QueueFkColumn }> = {
  refrigerator_water: { table: "filters", fkColumn: "refrigerator_filter_id" },
  air_purifier: { table: "air_purifier_filters", fkColumn: "air_purifier_filter_id" },
  vacuum: { table: "vacuum_filters", fkColumn: "vacuum_filter_id" },
  humidifier: { table: "humidifier_filters", fkColumn: "humidifier_filter_id" },
  whole_house_water: {
    table: "whole_house_water_parts",
    fkColumn: "whole_house_water_part_id",
  },
  appliance_air: { table: "appliance_air_parts", fkColumn: "appliance_air_part_id" },
};

const NULL_FK_COLUMNS = {
  refrigerator_filter_id: null as string | null,
  air_purifier_filter_id: null as string | null,
  vacuum_filter_id: null as string | null,
  humidifier_filter_id: null as string | null,
  whole_house_water_part_id: null as string | null,
  appliance_air_part_id: null as string | null,
};
type QueueFkColumn = keyof typeof NULL_FK_COLUMNS;

type QueueInputRow = {
  /** Catalog part slug within the wedge table (e.g. filters.slug). */
  filter_slug: string;
  /**
   * Which vertical catalog row to attach to. Defaults to refrigerator_water
   * (public.filters) for existing HQII fridge JSON.
   */
  wedge?: CatalogWedge;
  retailer_name?: string;
  url: string;
  token_required?: string[];
  token_evidence_ok?: boolean;
  token_evidence_notes?: string;
};

type QueueRowDraft = {
  filter_slug: string;
  retailer_key: "amazon";
  retailer_name: string;
  offer_url: string;
  canonical_url: string;
  asin: string;
  source_kind: string;
  validation_status: "pending" | "rejected";
  candidate_state: CandidateState;
  token_required: string[] | null;
  token_evidence_ok: boolean | null;
  token_evidence_notes: string | null;
  last_error: string | null;
  notes: string | null;
};

const SOURCE = "hqii_discovery_enrichment_phase1";

function argValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return null;
  const v = process.argv[idx + 1];
  return v && !v.startsWith("--") ? v : null;
}

function inferAsinFromCanonical(canonicalUrl: string): string | null {
  const m = canonicalUrl.match(/\/dp\/([A-Z0-9]{10})$/i);
  return m ? m[1].toUpperCase() : null;
}

export function catalogWedgeFromInput(wedge: string | undefined): CatalogWedge {
  const t = wedge?.trim();
  if (!t) return "refrigerator_water";
  if ((CATALOG_WEDGES as readonly string[]).includes(t)) return t as CatalogWedge;
  throw new Error(
    `Unknown wedge "${t}". Expected one of: ${CATALOG_WEDGES.join(", ")}`,
  );
}

export function buildQueueRowDraft(row: QueueInputRow): QueueRowDraft {
  const filterSlug = row.filter_slug?.trim() ?? "";
  const rawUrl = row.url?.trim() ?? "";
  const retailerName = row.retailer_name?.trim() || "Amazon";
  const tokenRequired =
    Array.isArray(row.token_required) && row.token_required.length > 0
      ? row.token_required.map((t) => t.trim()).filter(Boolean)
      : null;
  const tokenEvidenceOk =
    typeof row.token_evidence_ok === "boolean" ? row.token_evidence_ok : null;
  const tokenEvidenceNotes = row.token_evidence_notes?.trim() || null;

  const canonical = canonicalAmazonDpUrl(rawUrl);
  if (!canonical) {
    return {
      filter_slug: filterSlug,
      retailer_key: "amazon",
      retailer_name: retailerName,
      offer_url: rawUrl,
      canonical_url: rawUrl,
      asin: "",
      source_kind: SOURCE,
      validation_status: "rejected",
      candidate_state: "rejected",
      token_required: tokenRequired,
      token_evidence_ok: tokenEvidenceOk,
      token_evidence_notes: tokenEvidenceNotes,
      last_error: "non_amazon_dp_url",
      notes: "Rejected: only Amazon /dp/{ASIN} candidates are accepted.",
    };
  }

  const asin = inferAsinFromCanonical(canonical) ?? "";

  let candidate_state: CandidateState = "candidate_found";
  let validation_status: "pending" | "rejected" = "pending";
  let last_error: string | null = null;
  let notes: string | null = null;

  if (tokenEvidenceOk === true) {
    candidate_state = "token_verified";
    notes = "Token evidence verified from enrichment output.";
  } else if (tokenEvidenceOk === false) {
    candidate_state = "rejected";
    validation_status = "rejected";
    last_error = "token_evidence_missing";
    notes = "Rejected: required token evidence not found in candidate body.";
  } else {
    candidate_state = "candidate_found";
    notes = "Candidate found with no token verdict yet.";
  }

  return {
    filter_slug: filterSlug,
    retailer_key: "amazon",
    retailer_name: retailerName,
    offer_url: rawUrl,
    canonical_url: canonical,
    asin,
    source_kind: SOURCE,
    validation_status,
    candidate_state,
    token_required: tokenRequired,
    token_evidence_ok: tokenEvidenceOk,
    token_evidence_notes: tokenEvidenceNotes,
    last_error,
    notes,
  };
}

export function buildOfferCandidatePayload(
  fkColumn: QueueFkColumn,
  entityId: string,
  draft: QueueRowDraft,
) {
  const fkPayload = { ...NULL_FK_COLUMNS, [fkColumn]: entityId };
  return {
    ...fkPayload,
    retailer_key: draft.retailer_key,
    offer_url: draft.offer_url,
    retailer_name: draft.retailer_name,
    source_kind: draft.source_kind,
    validation_status: draft.validation_status,
    notes: draft.notes,
    candidate_state: draft.candidate_state,
    canonical_url: draft.canonical_url,
    asin: draft.asin,
    token_required: draft.token_required,
    token_evidence_ok: draft.token_evidence_ok,
    token_evidence_notes: draft.token_evidence_notes,
    browser_truth_classification: null,
    browser_truth_notes: null,
    browser_truth_checked_at: null,
    retry_after: null,
    retry_count: 0,
    last_error: draft.last_error,
  };
}

async function main() {
  loadEnv();
  const inputPath = argValue("--input");
  const write = process.argv.includes("--write");
  if (!inputPath) throw new Error("Missing --input <json-path>");

  const abs = path.resolve(process.cwd(), inputPath);
  const parsed = JSON.parse(fs.readFileSync(abs, "utf8")) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Input must be a JSON array.");
  }

  const rows = (parsed as QueueInputRow[]).map((row) => ({
    wedge: catalogWedgeFromInput(row.wedge),
    draft: buildQueueRowDraft(row),
  }));

  const idBySlugByWedge = new Map<CatalogWedge, Map<string, string>>();
  const supabase = getSupabaseAdmin();

  for (const w of CATALOG_WEDGES) {
    const slugs = [
      ...new Set(
        rows.filter((r) => r.wedge === w).map((r) => r.draft.filter_slug).filter(Boolean),
      ),
    ];
    if (slugs.length === 0) continue;
    const { table } = WEDGE_TABLE_FK[w];
    const { data, error } = await supabase.from(table).select("id, slug").in("slug", slugs);
    if (error) throw error;
    idBySlugByWedge.set(
      w,
      new Map((data ?? []).map((row) => [String(row.slug), String(row.id)])),
    );
  }

  const accepted: { wedge: CatalogWedge; draft: QueueRowDraft; entityId: string }[] = [];
  const rejectedUnknownSlug = rows
    .filter(({ wedge, draft }) => !idBySlugByWedge.get(wedge)?.has(draft.filter_slug))
    .map(({ draft }) => ({
      ...draft,
      candidate_state: "rejected" as const,
      review_status: "rejected" as const,
      last_error: "unknown_filter_slug",
    }));

  for (const { wedge, draft } of rows) {
    const entityId = idBySlugByWedge.get(wedge)?.get(draft.filter_slug);
    if (entityId) accepted.push({ wedge, draft, entityId });
  }

  let inserted = 0;
  let updated = 0;
  if (write && accepted.length > 0) {
    for (const { wedge, draft, entityId } of accepted) {
      const { fkColumn } = WEDGE_TABLE_FK[wedge];

      const { data: existing, error: existingErr } = await supabase
        .from("retailer_offer_candidates")
        .select("id")
        .eq(fkColumn, entityId)
        .eq("retailer_key", draft.retailer_key)
        .eq("validation_status", "pending")
        .limit(1);
      if (existingErr) throw existingErr;

      const payload = buildOfferCandidatePayload(fkColumn, entityId, draft);

      if ((existing ?? []).length > 0) {
        const id = String(existing![0]!.id);
        const { error: updateErr } = await supabase
          .from("retailer_offer_candidates")
          .update(payload)
          .eq("id", id);
        if (updateErr) throw updateErr;
        updated += 1;
      } else {
        const { error: insertErr } = await supabase.from("retailer_offer_candidates").insert(payload);
        if (insertErr) throw insertErr;
        inserted += 1;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        dry_run: !write,
        input_count: rows.length,
        matched_filter_slugs: accepted.length,
        unknown_filter_slugs: rejectedUnknownSlug.map((r) => r.filter_slug),
        state_counts: rows.reduce(
          (acc, { draft: d }) => {
            acc[d.candidate_state] = (acc[d.candidate_state] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
        inserted,
        updated,
        rows: rows.map((r) => r.draft),
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[hqii-candidate-queue-upsert] FAILED: ${message}`);
    process.exitCode = 1;
  });
}
