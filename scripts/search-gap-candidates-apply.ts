import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

type CandidateType =
  | "alias"
  | "model"
  | "filter_part"
  | "compatibility_mapping"
  | "help_page";

type CandidateRow = {
  id: number;
  search_gap_id: number;
  catalog: string;
  normalized_query: string;
  candidate_type: CandidateType;
  candidate_payload_json: Record<string, unknown>;
  confidence_score: number;
  status: string;
  created_at: string;
};

function parseArgNumber(flag: string, fallback: number): number {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const raw = process.argv[idx + 1];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseArgString(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function asText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function asNullableUuid(v: unknown): string | null {
  const t = asText(v);
  if (!t) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t)
    ? t
    : null;
}

async function stageAliasCandidate(candidate: CandidateRow): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const p = candidate.candidate_payload_json ?? {};
  const proposedAlias = asText(p.proposed_alias);
  const targetTable = asText(p.target_table);
  if (!proposedAlias || !targetTable) return false;
  const targetModelId = asText(p.target_model_id);
  const targetPartId = asText(p.target_part_id);

  const { error } = await supabase.from("staged_alias_additions").upsert(
    {
      search_gap_candidate_id: candidate.id,
      catalog: candidate.catalog,
      normalized_query: candidate.normalized_query,
      target_kind: targetModelId ? "model" : "filter_part",
      target_table: targetTable,
      target_record_id: targetModelId ?? targetPartId,
      proposed_alias: proposedAlias,
      payload_json: p,
      status: "queued",
    },
    { onConflict: "search_gap_candidate_id", ignoreDuplicates: false },
  );
  return !error;
}

async function stageModelCandidate(candidate: CandidateRow): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const p = candidate.candidate_payload_json ?? {};
  const proposedModelNumber = asText(p.proposed_model_number);
  if (!proposedModelNumber) return false;

  const { error } = await supabase.from("staged_model_additions").upsert(
    {
      search_gap_candidate_id: candidate.id,
      catalog: candidate.catalog,
      normalized_query: candidate.normalized_query,
      proposed_model_number: proposedModelNumber,
      proposed_brand_id: asNullableUuid(p.proposed_brand_id),
      proposed_brand_slug: asText(p.proposed_brand_slug),
      payload_json: p,
      status: "queued",
    },
    { onConflict: "search_gap_candidate_id", ignoreDuplicates: false },
  );
  return !error;
}

async function stageFilterPartCandidate(candidate: CandidateRow): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const p = candidate.candidate_payload_json ?? {};
  const targetPartId = asText(p.target_part_id);
  const proposedOemPartNumber = asText(p.proposed_oem_part_number);
  const proposedAlias = asText(p.proposed_alias);
  if (!targetPartId && !proposedOemPartNumber) return false;

  const { error } = await supabase.from("staged_filter_part_additions").upsert(
    {
      search_gap_candidate_id: candidate.id,
      catalog: candidate.catalog,
      normalized_query: candidate.normalized_query,
      proposed_oem_part_number: proposedOemPartNumber,
      proposed_brand_id: asNullableUuid(p.proposed_brand_id),
      proposed_brand_slug: asText(p.proposed_brand_slug),
      target_part_id: targetPartId,
      proposed_alias: proposedAlias,
      payload_json: p,
      status: "queued",
    },
    { onConflict: "search_gap_candidate_id", ignoreDuplicates: false },
  );
  return !error;
}

async function stageCompatibilityCandidate(candidate: CandidateRow): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const p = candidate.candidate_payload_json ?? {};
  const compatTable = asText(p.compat_table);
  const modelFkRaw = asText(p.model_fk);
  const partFkRaw = asText(p.part_fk);
  const modelIdRaw = asText(p.model_id);
  const partIdRaw = asText(p.part_id);
  const inferredModelNumber = asText(p.inferred_model_number) ?? asText(p.proposed_model_number);
  const inferredBrandSlug = asText(p.inferred_brand_slug);
  const inferredQueryType = asText(p.inferred_query_type);
  if (!compatTable) return false;

  // Full compatibility payload (resolved IDs) or partial inferred payload are both stageable.
  const isFull = Boolean(modelFkRaw && partFkRaw && modelIdRaw && partIdRaw);
  const isPartial = Boolean(inferredModelNumber || inferredBrandSlug || inferredQueryType);
  if (!isFull && !isPartial) return false;

  const modelFk = modelFkRaw ?? (compatTable === "compatibility_mappings" ? "fridge_model_id" : "model_id");
  const partFk = partFkRaw ?? (compatTable === "compatibility_mappings" ? "filter_id" : "part_id");
  const modelId = modelIdRaw ?? `inferred_model:${inferredModelNumber ?? "unknown"}`;
  const partId = partIdRaw ?? "pending_part_lookup";

  if (!isFull) {
    console.log(
      `[search-gap-candidates-apply] partial compatibility staging accepted candidate_id=${candidate.id} inferred_brand=${inferredBrandSlug ?? "-"} inferred_model=${inferredModelNumber ?? "-"} inferred_query_type=${inferredQueryType ?? "-"}`,
    );
  }

  const { error } = await supabase.from("staged_compatibility_mapping_additions").upsert(
    {
      search_gap_candidate_id: candidate.id,
      catalog: candidate.catalog,
      normalized_query: candidate.normalized_query,
      compat_table: compatTable,
      model_fk: modelFk,
      part_fk: partFk,
      model_id: modelId,
      part_id: partId,
      payload_json: p,
      status: "queued",
    },
    { onConflict: "search_gap_candidate_id", ignoreDuplicates: false },
  );
  return !error;
}

async function stageHelpPageCandidate(candidate: CandidateRow): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const p = candidate.candidate_payload_json ?? {};
  const suggestedSlug = asText(p.suggested_slug);
  const suggestedTitle = asText(p.suggested_title);
  if (!suggestedSlug || !suggestedTitle) return false;

  const { error } = await supabase.from("staged_help_page_additions").upsert(
    {
      search_gap_candidate_id: candidate.id,
      catalog: candidate.catalog,
      normalized_query: candidate.normalized_query,
      suggested_slug: suggestedSlug,
      suggested_title: suggestedTitle,
      payload_json: p,
      status: "queued",
    },
    { onConflict: "search_gap_candidate_id", ignoreDuplicates: false },
  );
  return !error;
}

async function markApplied(candidateId: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("search_gap_candidates")
    .update({ status: "applied" })
    .eq("id", candidateId)
    .eq("status", "approved");
  if (error) throw error;
}

async function main() {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const dryRun = !process.argv.includes("--write");
  const limit = parseArgNumber("--limit", 100);
  const candidateIdRaw = parseArgString("--candidate-id");
  const candidateId = candidateIdRaw ? Number.parseInt(candidateIdRaw, 10) : NaN;

  let query = supabase
    .from("search_gap_candidates")
    .select("id, search_gap_id, catalog, normalized_query, candidate_type, candidate_payload_json, confidence_score, status, created_at")
    .eq("status", "approved")
    .order("confidence_score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (Number.isFinite(candidateId)) {
    query = query.eq("id", candidateId);
  }

  const { data, error } = await query;
  if (error) throw error;
  const candidates = (data ?? []) as CandidateRow[];

  const results: Array<{
    candidate_id: number;
    candidate_type: CandidateType;
    ok: boolean;
    dry_run: boolean;
    reason: string;
  }> = [];

  let appliedCount = 0;
  for (const c of candidates) {
    if (dryRun) {
      results.push({
        candidate_id: c.id,
        candidate_type: c.candidate_type,
        ok: true,
        dry_run: true,
        reason: "validated-only",
      });
      continue;
    }

    let ok = false;
    if (c.candidate_type === "alias") ok = await stageAliasCandidate(c);
    if (c.candidate_type === "model") ok = await stageModelCandidate(c);
    if (c.candidate_type === "filter_part") ok = await stageFilterPartCandidate(c);
    if (c.candidate_type === "compatibility_mapping") ok = await stageCompatibilityCandidate(c);
    if (c.candidate_type === "help_page") ok = await stageHelpPageCandidate(c);

    if (ok) {
      await markApplied(c.id);
      appliedCount += 1;
    }
    results.push({
      candidate_id: c.id,
      candidate_type: c.candidate_type,
      ok,
      dry_run: false,
      reason: ok ? "staged-and-marked-applied" : "payload-missing-required-fields",
    });
  }

  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        dry_run: dryRun,
        approved_candidates_seen: candidates.length,
        applied_count: appliedCount,
        rows: results,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[search-gap-candidates-apply] failed", err);
  process.exit(1);
});
