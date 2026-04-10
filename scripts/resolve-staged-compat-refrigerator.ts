import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

function parseArgNumber(flag: string, fallback: number): number {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const raw = process.argv[idx + 1];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function asText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function isUuid(v: string | null): boolean {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function extractOemCandidateTokens(query: string): string[] {
  const tokens = query
    .toUpperCase()
    .split(/[^A-Z0-9/-]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return tokens.filter((t) => {
    if (/^(XWFE|RPWFE|XWF|MWF|ULTRAWF|HAF-QIN\/EXP)$/.test(t)) return true;
    if (/^(UKF|LT|EDR|HAF|DA|WF|CF)[A-Z0-9/-]{2,}$/.test(t)) return true;
    return /[A-Z]/.test(t) && /\d/.test(t) && t.length >= 5 && t.length <= 16;
  });
}

type StagedCompatRow = {
  id: number;
  status: "queued" | "reviewing" | "ready" | "promoted" | "rejected";
  catalog: string;
  compat_table: string;
  model_id: string;
  part_id: string;
  payload_json: Record<string, unknown>;
};

async function resolveModelId(row: StagedCompatRow): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (isUuid(row.model_id)) return row.model_id;

  const payload = row.payload_json ?? {};
  const modelNumber =
    asText(payload.inferred_model_number) ??
    asText(payload.proposed_model_number) ??
    (row.model_id.startsWith("inferred_model:") ? row.model_id.replace("inferred_model:", "") : null);
  if (!modelNumber) return null;
  const brandSlug = asText(payload.inferred_brand_slug);

  const { data, error } = await supabase
    .from("fridge_models")
    .select("id, model_number, brand_id, brands:brand_id(slug)")
    .ilike("model_number", modelNumber)
    .limit(20);
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    id: string;
    model_number: string;
    brand_id: string;
    brands?: { slug: string } | null;
  }>;
  let candidates = rows.filter((r) => r.model_number.toUpperCase() === modelNumber.toUpperCase());
  if (brandSlug) {
    const byBrand = candidates.filter((r) => (r.brands?.slug ?? "").toLowerCase() === brandSlug.toLowerCase());
    if (byBrand.length > 0) candidates = byBrand;
  }
  return candidates.length === 1 ? candidates[0]!.id : null;
}

async function resolvePartId(row: StagedCompatRow, modelId: string | null): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (isUuid(row.part_id)) return row.part_id;
  const payload = row.payload_json ?? {};
  const sourceQuery = asText(payload.source_query) ?? "";
  const brandSlug = asText(payload.inferred_brand_slug);

  // 1) Strongest signal: OEM-like token -> exact part/alias match.
  const oemTokens = extractOemCandidateTokens(sourceQuery);
  for (const token of oemTokens) {
    const { data: filters, error: fErr } = await supabase
      .from("filters")
      .select("id, oem_part_number, brand_id, brands:brand_id(slug)")
      .ilike("oem_part_number", token)
      .limit(20);
    if (fErr) throw fErr;
    let matches = ((filters ?? []) as Array<{
      id: string;
      oem_part_number: string;
      brands?: { slug: string } | null;
    }>).filter((f) => f.oem_part_number.toUpperCase() === token.toUpperCase());
    if (brandSlug) {
      const byBrand = matches.filter((f) => (f.brands?.slug ?? "").toLowerCase() === brandSlug.toLowerCase());
      if (byBrand.length > 0) matches = byBrand;
    }
    if (matches.length === 1) return matches[0]!.id;

    const { data: aliases, error: aErr } = await supabase
      .from("filter_aliases")
      .select("filter_id, alias")
      .ilike("alias", token)
      .limit(20);
    if (aErr) throw aErr;
    const aliasMatches = (aliases ?? []).filter(
      (a) => String((a as { alias: string }).alias).toUpperCase() === token.toUpperCase(),
    ) as Array<{ filter_id: string; alias: string }>;
    const uniqueIds = Array.from(new Set(aliasMatches.map((a) => a.filter_id)));
    if (uniqueIds.length === 1) return uniqueIds[0]!;
  }

  // 2) If model resolved, use existing mappings. If exactly one mapped filter, take it.
  if (modelId) {
    const { data: maps, error: mErr } = await supabase
      .from("compatibility_mappings")
      .select("filter_id")
      .eq("fridge_model_id", modelId);
    if (mErr) throw mErr;
    const mappedIds = Array.from(new Set((maps ?? []).map((m) => (m as { filter_id: string }).filter_id)));
    if (mappedIds.length === 1) return mappedIds[0]!;
  }

  return null;
}

async function main() {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const write = process.argv.includes("--write");
  const limit = parseArgNumber("--limit", 200);

  const { data, error } = await supabase
    .from("staged_compatibility_mapping_additions")
    .select("id, status, catalog, compat_table, model_id, part_id, payload_json")
    .eq("catalog", HOMEKEEP_WEDGE_CATALOG.refrigerator_water)
    .in("status", ["queued", "reviewing"])
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as StagedCompatRow[];

  let readyCount = 0;
  let reviewingCount = 0;
  const details: Array<Record<string, unknown>> = [];

  for (const row of rows) {
    if (row.compat_table !== "compatibility_mappings") {
      details.push({ id: row.id, action: "skip", reason: "unsupported_compat_table" });
      continue;
    }

    const modelId = await resolveModelId(row);
    const partId = await resolvePartId(row, modelId);
    const isResolved = Boolean(isUuid(modelId) && isUuid(partId));

    if (isResolved) {
      readyCount += 1;
      details.push({
        id: row.id,
        action: "resolved",
        model_id: modelId,
        part_id: partId,
      });
      if (write) {
        const { error: upErr } = await supabase
          .from("staged_compatibility_mapping_additions")
          .update({
            model_id: modelId,
            part_id: partId,
            status: "ready",
          })
          .eq("id", row.id)
          .in("status", ["queued", "reviewing"]);
        if (upErr) throw upErr;
      }
      continue;
    }

    details.push({
      id: row.id,
      action: "unresolved",
      reason: "insufficient_confidence_or_missing_matches",
      inferred_model: asText(row.payload_json?.inferred_model_number) ?? null,
      inferred_brand: asText(row.payload_json?.inferred_brand_slug) ?? null,
    });
    if (write && row.status === "queued") {
      const { error: upErr } = await supabase
        .from("staged_compatibility_mapping_additions")
        .update({ status: "reviewing" })
        .eq("id", row.id)
        .eq("status", "queued");
      if (upErr) throw upErr;
      reviewingCount += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        dry_run: !write,
        scope: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
        rows_seen: rows.length,
        resolved_to_ready: readyCount,
        moved_to_reviewing: reviewingCount,
        details,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[resolve-staged-compat-refrigerator] failed", err);
  process.exit(1);
});
