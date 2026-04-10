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

function extractOemTokens(query: string): string[] {
  return query
    .toUpperCase()
    .split(/[^A-Z0-9/-]+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 4)
    .filter((x) => /^(XWFE|RPWFE|XWF|MWF|ULTRAWF|HAF-QIN\/EXP|UKF|LT|EDR|HAF|DA|WF|CF)/.test(x) || (/[A-Z]/.test(x) && /\d/.test(x)));
}

async function resolveModelByInference(payload: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const modelNumber =
    asText(payload.inferred_model_number) ??
    asText(payload.proposed_model_number);
  const brandSlug = asText(payload.inferred_brand_slug);
  if (!modelNumber) return null;

  const { data, error } = await supabase
    .from("fridge_models")
    .select("id, model_number, brands:brand_id(slug)")
    .ilike("model_number", modelNumber)
    .limit(20);
  if (error) throw error;
  let rows = (data ?? []) as Array<{ id: string; model_number: string; brands?: { slug: string } | null }>;
  rows = rows.filter((r) => r.model_number.toUpperCase() === modelNumber.toUpperCase());
  if (brandSlug) {
    const byBrand = rows.filter((r) => (r.brands?.slug ?? "").toLowerCase() === brandSlug.toLowerCase());
    if (byBrand.length > 0) rows = byBrand;
  }
  return rows.length === 1 ? rows[0]!.id : null;
}

async function resolvePartForModel(modelId: string, payload: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const sourceQuery = asText(payload.source_query) ?? "";
  const brandSlug = asText(payload.inferred_brand_slug);

  const tokens = extractOemTokens(sourceQuery);
  for (const token of tokens) {
    const { data: direct, error: dErr } = await supabase
      .from("filters")
      .select("id, oem_part_number, brands:brand_id(slug)")
      .ilike("oem_part_number", token)
      .limit(20);
    if (dErr) throw dErr;
    let matches = (direct ?? []).filter(
      (r) => String((r as { oem_part_number: string }).oem_part_number).toUpperCase() === token,
    ) as Array<{ id: string; brands?: { slug: string } | null }>;
    if (brandSlug) {
      const byBrand = matches.filter((m) => (m.brands?.slug ?? "").toLowerCase() === brandSlug.toLowerCase());
      if (byBrand.length > 0) matches = byBrand;
    }
    if (matches.length === 1) return matches[0]!.id;

    const { data: aliasRows, error: aErr } = await supabase
      .from("filter_aliases")
      .select("filter_id, alias")
      .ilike("alias", token)
      .limit(20);
    if (aErr) throw aErr;
    const unique = Array.from(
      new Set(
        (aliasRows ?? [])
          .filter((a) => String((a as { alias: string }).alias).toUpperCase() === token)
          .map((a) => (a as { filter_id: string }).filter_id),
      ),
    );
    if (unique.length === 1) return unique[0]!;
  }

  const { data: maps, error: mErr } = await supabase
    .from("compatibility_mappings")
    .select("filter_id")
    .eq("fridge_model_id", modelId);
  if (mErr) throw mErr;
  const mapped = Array.from(new Set((maps ?? []).map((m) => (m as { filter_id: string }).filter_id)));
  return mapped.length === 1 ? mapped[0]! : null;
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

  const rows = (data ?? []) as Array<{
    id: number;
    status: "queued" | "reviewing";
    compat_table: string;
    model_id: string;
    part_id: string;
    payload_json: Record<string, unknown>;
  }>;

  let modelNowExists = 0;
  let resolvedReady = 0;
  let modelResolvedPartPending = 0;
  const details: Array<Record<string, unknown>> = [];

  for (const row of rows) {
    if (row.compat_table !== "compatibility_mappings") {
      details.push({ id: row.id, action: "skip", reason: "unsupported_compat_table" });
      continue;
    }
    const existingModelId = isUuid(row.model_id) ? row.model_id : null;
    const modelId = existingModelId ?? (await resolveModelByInference(row.payload_json));
    if (modelId && !existingModelId) modelNowExists += 1;
    if (!modelId) {
      details.push({ id: row.id, action: "unchanged", reason: "model_not_resolved" });
      continue;
    }
    const existingPartId = isUuid(row.part_id) ? row.part_id : null;
    const partId = existingPartId ?? (await resolvePartForModel(modelId, row.payload_json));
    if (!partId) {
      details.push({
        id: row.id,
        action: "model_resolved_part_pending",
        reason: "part_not_resolved",
        model_id: modelId,
      });
      modelResolvedPartPending += 1;
      if (write && (!existingModelId || row.model_id !== modelId)) {
        const { error: upErr } = await supabase
          .from("staged_compatibility_mapping_additions")
          .update({
            model_id: modelId,
            part_id: "pending_part_lookup",
            status: "reviewing",
          })
          .eq("id", row.id)
          .in("status", ["queued", "reviewing"]);
        if (upErr) throw upErr;
      }
      continue;
    }

    details.push({
      id: row.id,
      action: "fully_resolved_ready",
      model_id: modelId,
      part_id: partId,
    });
    resolvedReady += 1;
    if (write) {
      const { error: upErr } = await supabase
        .from("staged_compatibility_mapping_additions")
        .update({ model_id: modelId, part_id: partId, status: "ready" })
        .eq("id", row.id)
        .in("status", ["queued", "reviewing"]);
      if (upErr) throw upErr;
    }
  }

  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        dry_run: !write,
        scope: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
        rows_seen: rows.length,
        model_now_exists: modelNowExists,
        model_resolved_part_pending: modelResolvedPartPending,
        resolved_to_ready: resolvedReady,
        details,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[reprocess-compat-after-models-refrigerator] failed", err);
  process.exit(1);
});
