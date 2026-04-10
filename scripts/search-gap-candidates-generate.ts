import {
  HOMEKEEP_GLOBAL_SEARCH_CATALOG,
  HOMEKEEP_WEDGE_CATALOG,
  type HomekeepWedgeCatalog,
  isHomekeepWedgeCatalog,
} from "@/lib/catalog/identity";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

type CandidateType =
  | "alias"
  | "model"
  | "filter_part"
  | "compatibility_mapping"
  | "help_page";

type GapRow = {
  id: number;
  catalog: string;
  normalized_query: string;
  sample_raw_query: string;
  likely_entity_type: string;
  search_count: number;
  zero_result_count: number;
  status: string;
};

type Candidate = {
  search_gap_id: number;
  catalog: string;
  normalized_query: string;
  candidate_type: CandidateType;
  candidate_payload_json: Record<string, unknown>;
  confidence_score: number;
  status: "proposed";
};

type CatalogConfig = {
  modelTable: string;
  modelAliasTable: string;
  modelAliasFk: string;
  partTable: string;
  partAliasTable: string;
  partAliasFk: string;
  compatTable: string;
  compatModelFk: string;
  compatPartFk: string;
};

const CATALOG_CONFIG = {
  [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: {
    modelTable: "fridge_models",
    modelAliasTable: "fridge_model_aliases",
    modelAliasFk: "fridge_model_id",
    partTable: "filters",
    partAliasTable: "filter_aliases",
    partAliasFk: "filter_id",
    compatTable: "compatibility_mappings",
    compatModelFk: "fridge_model_id",
    compatPartFk: "filter_id",
  },
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: {
    modelTable: "air_purifier_models",
    modelAliasTable: "air_purifier_model_aliases",
    modelAliasFk: "air_purifier_model_id",
    partTable: "air_purifier_filters",
    partAliasTable: "air_purifier_filter_aliases",
    partAliasFk: "air_purifier_filter_id",
    compatTable: "air_purifier_compatibility_mappings",
    compatModelFk: "air_purifier_model_id",
    compatPartFk: "air_purifier_filter_id",
  },
  [HOMEKEEP_WEDGE_CATALOG.vacuum]: {
    modelTable: "vacuum_models",
    modelAliasTable: "vacuum_model_aliases",
    modelAliasFk: "vacuum_model_id",
    partTable: "vacuum_filters",
    partAliasTable: "vacuum_filter_aliases",
    partAliasFk: "vacuum_filter_id",
    compatTable: "vacuum_compatibility_mappings",
    compatModelFk: "vacuum_model_id",
    compatPartFk: "vacuum_filter_id",
  },
  [HOMEKEEP_WEDGE_CATALOG.humidifier]: {
    modelTable: "humidifier_models",
    modelAliasTable: "humidifier_model_aliases",
    modelAliasFk: "humidifier_model_id",
    partTable: "humidifier_filters",
    partAliasTable: "humidifier_filter_aliases",
    partAliasFk: "humidifier_filter_id",
    compatTable: "humidifier_compatibility_mappings",
    compatModelFk: "humidifier_model_id",
    compatPartFk: "humidifier_filter_id",
  },
  [HOMEKEEP_WEDGE_CATALOG.appliance_air]: {
    modelTable: "appliance_air_models",
    modelAliasTable: "appliance_air_model_aliases",
    modelAliasFk: "appliance_air_model_id",
    partTable: "appliance_air_parts",
    partAliasTable: "appliance_air_part_aliases",
    partAliasFk: "appliance_air_part_id",
    compatTable: "appliance_air_compatibility_mappings",
    compatModelFk: "appliance_air_model_id",
    compatPartFk: "appliance_air_part_id",
  },
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: {
    modelTable: "whole_house_water_models",
    modelAliasTable: "whole_house_water_model_aliases",
    modelAliasFk: "whole_house_water_model_id",
    partTable: "whole_house_water_parts",
    partAliasTable: "whole_house_water_part_aliases",
    partAliasFk: "whole_house_water_part_id",
    compatTable: "whole_house_water_compatibility_mappings",
    compatModelFk: "whole_house_water_model_id",
    compatPartFk: "whole_house_water_part_id",
  },
} satisfies Record<HomekeepWedgeCatalog, CatalogConfig>;

function compact(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseArgNumber(flag: string, fallback: number): number {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const raw = process.argv[idx + 1];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function tokenCandidates(raw: string): string[] {
  const cleaned = raw.replace(/[^\w\-\/\s]/g, " ").trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const joined = cleaned.replace(/\s+/g, "");
  const out = new Set<string>([cleaned, joined, ...tokens]);
  return Array.from(out).filter((x) => x.length >= 2);
}

type QueryIntent = {
  hasFilterWord: boolean;
  modelLikeToken: string | null;
  oemLikeToken: string | null;
  safePartProbe: string | null;
  reason: string;
};

function looksLikeModelToken(token: string): boolean {
  const t = token.toUpperCase();
  return /[A-Z]/.test(t) && /\d/.test(t) && t.length >= 7 && t.length <= 18;
}

function looksLikeOemSkuToken(token: string): boolean {
  const t = token.toUpperCase();
  // Explicit known OEM/filter code shapes (includes letter-only tokens like XWFE/RPWFE).
  if (/^(XWFE|RPWFE|XWF|MWF|ULTRAWF|UKF[0-9A-Z]*|LT[0-9A-Z]*|EDR[0-9A-Z]*)$/.test(t)) {
    return true;
  }
  // Common refrigerator OEM/SKU style: compact alpha+digits, usually no spaces.
  if (!/[A-Z]/.test(t) || !/\d/.test(t)) return false;
  if (t.length < 5 || t.length > 12) return false;
  // Bias toward part-number style prefixes common in filter SKUs.
  if (/^(UKF|LT|EDR|ADQ|CF|DA|WF)/.test(t)) return true;
  // Fallback: short mixed token without separators is often OEM-ish.
  return !/[\s/]/.test(t);
}

function inferQueryIntent(rawQuery: string): QueryIntent {
  const hasFilterWord = /\b(filter|water\s*filter|cartridge|replacement)\b/i.test(rawQuery);
  const tokens = tokenCandidates(rawQuery)
    .map((t) => t.replace(/[^a-z0-9]/gi, ""))
    .filter((t) => t.length >= 2);

  const modelLike = tokens.find((t) => looksLikeModelToken(t)) ?? null;
  const oemLike = tokens.find((t) => looksLikeOemSkuToken(t)) ?? null;

  // Never use whole natural language as part number; only safe token probes.
  const safePartProbe = oemLike ?? null;
  const reason = oemLike
    ? `oem_like_token=${oemLike}`
    : modelLike
      ? `model_like_token=${modelLike}`
      : hasFilterWord
        ? "contains_filter_word"
        : "no_strong_token_signal";
  return { hasFilterWord, modelLikeToken: modelLike, oemLikeToken: oemLike, safePartProbe, reason };
}

function inferType(rawQuery: string, normalizedQuery: string, likely: string): CandidateType {
  const intent = inferQueryIntent(rawQuery);
  if (intent.oemLikeToken && !intent.hasFilterWord && !intent.modelLikeToken) {
    return "filter_part";
  }
  if (intent.hasFilterWord && intent.modelLikeToken) {
    return "compatibility_mapping";
  }
  if (
    likely === "alias" ||
    likely === "model" ||
    likely === "filter_part" ||
    likely === "compatibility_mapping" ||
    likely === "help_page"
  ) {
    return likely;
  }
  const q = rawQuery.toLowerCase();
  if (q.includes("reset") || q.startsWith("how ") || q.includes("manual")) return "help_page";
  if (q.includes("fits") || q.includes("compatible") || q.includes(" for ")) {
    return "compatibility_mapping";
  }
  if (/[a-z]/.test(normalizedQuery) && /\d/.test(normalizedQuery)) {
    return normalizedQuery.length <= 12 ? "model" : "filter_part";
  }
  return "alias";
}

function inferTypeWithReason(
  rawQuery: string,
  normalizedQuery: string,
  likely: string,
): { type: CandidateType; reason: string; intent: QueryIntent } {
  const intent = inferQueryIntent(rawQuery);
  const oemToken = (intent.oemLikeToken ?? "").toUpperCase();
  const isKnownStandaloneSkuFamily =
    /^(UKF|LT|EDR|XWFE|RPWFE|HAF|DA|WF|CF)/.test(oemToken);
  if (isKnownStandaloneSkuFamily && !intent.hasFilterWord) {
    return {
      type: "filter_part",
      reason: "standalone_known_oem_sku_family",
      intent,
    };
  }
  if (intent.oemLikeToken && !intent.hasFilterWord && !intent.modelLikeToken) {
    return {
      type: "filter_part",
      reason: "standalone_oem_sku_pattern",
      intent,
    };
  }
  if (intent.hasFilterWord && intent.modelLikeToken) {
    return {
      type: "compatibility_mapping",
      reason: "mixed_brand_model_filter_intent",
      intent,
    };
  }
  const t = inferType(rawQuery, normalizedQuery, likely);
  return { type: t, reason: `fallback_likely_or_pattern (${intent.reason})`, intent };
}

async function listBrandsForCatalog(catalog: HomekeepWedgeCatalog) {
  const supabase = getSupabaseAdmin();
  const cfg = CATALOG_CONFIG[catalog];
  if (!cfg) return [];
  const { data, error } = await supabase
    .from(cfg.modelTable)
    .select("brand_id, brands:brand_id (id, slug, name)")
    .limit(500);
  if (error) throw error;
  const seen = new Set<string>();
  const brands: { id: string; slug: string; name: string }[] = [];
  for (const row of data ?? []) {
    const b = (row as { brands?: { id: string; slug: string; name: string } | null }).brands;
    if (!b || seen.has(b.id)) continue;
    seen.add(b.id);
    brands.push({ id: b.id, slug: b.slug, name: b.name });
  }
  return brands;
}

function resolveCatalogForGap(gapCatalog: string): {
  effectiveCatalog: HomekeepWedgeCatalog | null;
  reason: string | null;
} {
  if (isHomekeepWedgeCatalog(gapCatalog)) {
    return { effectiveCatalog: gapCatalog, reason: null };
  }
  if (gapCatalog === HOMEKEEP_GLOBAL_SEARCH_CATALOG) {
    const fb = HOMEKEEP_WEDGE_CATALOG.refrigerator_water;
    return {
      effectiveCatalog: fb,
      reason: `catalog=${HOMEKEEP_GLOBAL_SEARCH_CATALOG} -> fallback=${fb}`,
    };
  }
  return { effectiveCatalog: null, reason: `unsupported catalog=${gapCatalog}` };
}

async function proposeForGap(gap: GapRow): Promise<Candidate[]> {
  const resolved = resolveCatalogForGap(gap.catalog);
  if (!resolved.effectiveCatalog) return [];
  const effectiveCatalog = resolved.effectiveCatalog;
  const cfg = CATALOG_CONFIG[effectiveCatalog];
  if (!cfg) return [];
  const supabase = getSupabaseAdmin();
  const raw = gap.sample_raw_query.trim();
  const norm = gap.normalized_query.trim();
  const classified = inferTypeWithReason(raw, norm, gap.likely_entity_type);
  const intent = classified.intent;
  let guess = classified.type;
  const toks = tokenCandidates(raw);
  const probes = toks.slice(0, 4);
  const out: Candidate[] = [];
  if (classified.reason.startsWith("standalone_")) {
    console.log(
      `[search-gap-candidates-generate] rule_fired=${classified.reason} gap_id=${gap.id}`,
    );
  }
  console.log(
    `[search-gap-candidates-generate] classify gap_id=${gap.id} query="${raw}" guess=${guess} reason=${classified.reason} intent={filter_word:${intent.hasFilterWord},model_token:${intent.modelLikeToken ?? "-"},oem_token:${intent.oemLikeToken ?? "-"}}`,
  );

  const addCandidate = (candidate: Omit<Candidate, "search_gap_id" | "catalog" | "normalized_query" | "status">) => {
    out.push({
      search_gap_id: gap.id,
      catalog: effectiveCatalog,
      normalized_query: gap.normalized_query,
      status: "proposed",
      ...candidate,
    });
  };

  if (guess === "help_page") {
    addCandidate({
      candidate_type: "help_page",
      confidence_score: 0.8,
      candidate_payload_json: {
        source_query: raw,
        suggested_slug: raw
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
        suggested_title: raw.replace(/\s+/g, " ").trim(),
        notes: "Auto-generated help page candidate from queued search gap.",
      },
    });
    return out;
  }

  const brands = await listBrandsForCatalog(effectiveCatalog);
  const brandMatch =
    brands.find((b) => compact(raw).includes(compact(b.slug))) ||
    brands.find((b) => compact(raw).includes(compact(b.name)));

  if (
    effectiveCatalog === HOMEKEEP_WEDGE_CATALOG.refrigerator_water &&
    intent.hasFilterWord &&
    Boolean(intent.modelLikeToken) &&
    Boolean(brandMatch)
  ) {
    guess = "compatibility_mapping";
    console.log(
      `[search-gap-candidates-generate] rule_fired=fridge_brand_model_filter_intent gap_id=${gap.id} brand=${brandMatch?.slug ?? "-"}`,
    );
  }

  const modelProbe = intent.modelLikeToken ?? probes[0] ?? raw;
  const partProbe = intent.safePartProbe ?? probes.find((t) => /\d/.test(t)) ?? probes[0] ?? raw;

  const [modelsRes, partsRes, modelAliasesRes, partAliasesRes] = await Promise.all([
    supabase.from(cfg.modelTable).select("id, slug, model_number, brand_id").ilike("model_number", `%${modelProbe}%`).limit(20),
    supabase.from(cfg.partTable).select("id, slug, oem_part_number, brand_id").ilike("oem_part_number", `%${partProbe}%`).limit(20),
    supabase
      .from(cfg.modelAliasTable)
      .select(`alias, ${cfg.modelAliasFk}`)
      .ilike("alias", `%${modelProbe}%`)
      .limit(20),
    supabase
      .from(cfg.partAliasTable)
      .select(`alias, ${cfg.partAliasFk}`)
      .ilike("alias", `%${partProbe}%`)
      .limit(20),
  ]);
  if (modelsRes.error) throw modelsRes.error;
  if (partsRes.error) throw partsRes.error;
  if (modelAliasesRes.error) throw modelAliasesRes.error;
  if (partAliasesRes.error) throw partAliasesRes.error;
  const models = (modelsRes.data ?? []) as Array<{ id: string; slug: string; model_number: string; brand_id: string }>;
  const parts = (partsRes.data ?? []) as Array<{ id: string; slug: string; oem_part_number: string; brand_id: string }>;
  const modelAliases = (modelAliasesRes.data ?? []) as Array<Record<string, unknown>>;
  const partAliases = (partAliasesRes.data ?? []) as Array<Record<string, unknown>>;

  if (guess === "alias" || guess === "model") {
    const bestModel = models[0];
    const existingModelAlias = modelAliases.find((a) => String(a.alias ?? "").toLowerCase() === raw.toLowerCase());
    addCandidate({
      candidate_type: guess === "model" ? "model" : "alias",
      confidence_score: existingModelAlias ? 0.46 : bestModel ? 0.77 : 0.58,
      candidate_payload_json: bestModel
        ? {
            target_table: cfg.modelTable,
            target_model_id: bestModel.id,
            target_model_slug: bestModel.slug,
            target_model_number: bestModel.model_number,
            proposed_alias: raw,
            source_catalog: gap.catalog,
            already_exists_alias_match: Boolean(existingModelAlias),
            reason: existingModelAlias
              ? "Alias already appears to exist; low-confidence review candidate only."
              : "Queued search gap resembles an existing model; propose alias addition.",
          }
        : {
            target_table: cfg.modelTable,
            proposed_model_number: raw,
            source_catalog: gap.catalog,
            proposed_brand_id: brandMatch?.id ?? null,
            proposed_brand_slug: brandMatch?.slug ?? null,
            reason: "No close model match found; propose new model candidate.",
          },
    });
  }

  if (guess === "filter_part" || guess === "alias") {
    const bestPart = parts[0];
    const existingPartAlias = partAliases.find((a) => String(a.alias ?? "").toLowerCase() === raw.toLowerCase());
    const proposedPartNumber = intent.safePartProbe;
    addCandidate({
      candidate_type: "filter_part",
      confidence_score: existingPartAlias ? 0.45 : bestPart ? 0.73 : 0.62,
      candidate_payload_json: bestPart
        ? {
            target_table: cfg.partTable,
            target_part_id: bestPart.id,
            target_part_slug: bestPart.slug,
            target_oem_part_number: bestPart.oem_part_number,
            proposed_alias: raw,
            source_catalog: gap.catalog,
            already_exists_alias_match: Boolean(existingPartAlias),
            reason: existingPartAlias
              ? "Part alias appears to already exist; low-confidence review candidate only."
              : "Queued gap likely maps to existing part via alternate part number.",
          }
        : {
            target_table: cfg.partTable,
            proposed_oem_part_number: proposedPartNumber,
            source_catalog: gap.catalog,
            proposed_brand_id: brandMatch?.id ?? null,
            proposed_brand_slug: brandMatch?.slug ?? null,
            reason: proposedPartNumber
              ? "No close part match found; propose new filter/part candidate."
              : "No safe OEM token found; skip raw sentence as part number.",
          },
    });
  }

  if (guess === "compatibility_mapping" || (models.length > 0 && parts.length > 0)) {
    const topModel = models[0];
    const topPart = parts[0];
    if (topModel && topPart) {
      const { data: existingMap, error: mapErr } = await supabase
        .from(cfg.compatTable)
        .select(`${cfg.compatModelFk}, ${cfg.compatPartFk}`)
        .eq(cfg.compatModelFk, topModel.id)
        .eq(cfg.compatPartFk, topPart.id)
        .limit(1);
      if (mapErr) throw mapErr;
      if ((existingMap ?? []).length === 0) {
        addCandidate({
          candidate_type: "compatibility_mapping",
          confidence_score: 0.68,
          candidate_payload_json: {
            compat_table: cfg.compatTable,
            model_fk: cfg.compatModelFk,
            part_fk: cfg.compatPartFk,
            model_id: topModel.id,
            model_number: topModel.model_number,
            part_id: topPart.id,
            oem_part_number: topPart.oem_part_number,
            source_query: raw,
            source_catalog: gap.catalog,
            reason: "Model and part both appear relevant; mapping missing in compatibility table.",
          },
        });
        console.log(
          `[search-gap-candidates-generate] compatibility candidate created gap_id=${gap.id} mode=resolved model=${topModel.model_number} part=${topPart.oem_part_number}`,
        );
      }
    } else if (guess === "compatibility_mapping") {
      const inferredModelNumber =
        intent.modelLikeToken ??
        probes.find((t) => /[a-z]/i.test(t) && /\d/.test(t)) ??
        null;
      addCandidate({
        candidate_type: "compatibility_mapping",
        confidence_score: 0.61,
        candidate_payload_json: {
          compat_table: cfg.compatTable,
          target_table: cfg.compatTable,
          inferred_brand_slug: brandMatch?.slug ?? null,
          inferred_model_number: inferredModelNumber,
          inferred_query_type: "brand_model_filter_mixed",
          source_query: raw,
          source_catalog: gap.catalog,
          proposed_model_number: inferredModelNumber,
          model_id: topModel?.id ?? null,
          part_id: topPart?.id ?? null,
          reason:
            "Mixed model+filter query classified as compatibility intent; staged partial candidate for review.",
        },
      });
      console.log(
        `[search-gap-candidates-generate] compatibility candidate created gap_id=${gap.id} mode=partial inferred_brand=${brandMatch?.slug ?? "-"} inferred_model=${inferredModelNumber ?? "-"}`,
      );
    }
  }

  // safety cap: no candidate explosion per gap
  return out.slice(0, 5);
}

async function main() {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const limit = parseArgNumber("--limit", 50);
  const dryRun = !process.argv.includes("--write");

  const { data: gaps, error } = await supabase
    .from("search_gaps")
    .select("id, catalog, normalized_query, sample_raw_query, likely_entity_type, search_count, zero_result_count, status")
    .eq("status", "queued")
    .order("zero_result_count", { ascending: false })
    .order("search_count", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const gapRows = (gaps ?? []) as GapRow[];
  const gapIds = gapRows.map((g) => g.id);
  console.log(
    `[search-gap-candidates-generate] queued_gaps_found=${gapRows.length} ids=${gapIds.join(",") || "(none)"}`,
  );

  const proposals: Candidate[] = [];
  for (const gap of gapRows) {
    const resolved = resolveCatalogForGap(gap.catalog);
    if (!resolved.effectiveCatalog) {
      console.log(
        `[search-gap-candidates-generate] skip gap_id=${gap.id} reason=${resolved.reason}`,
      );
      continue;
    }
    if (resolved.reason) {
      console.log(
        `[search-gap-candidates-generate] process gap_id=${gap.id} ${resolved.reason}`,
      );
    } else {
      console.log(
        `[search-gap-candidates-generate] process gap_id=${gap.id} catalog=${resolved.effectiveCatalog}`,
      );
    }
    const rows = await proposeForGap(gap);
    if (rows.length === 0) {
      console.log(
        `[search-gap-candidates-generate] skip gap_id=${gap.id} reason=no-candidates-produced`,
      );
      continue;
    }
    console.log(
      `[search-gap-candidates-generate] gap_id=${gap.id} candidates_generated=${rows.length}`,
    );
    proposals.push(...rows);
  }
  console.log(
    `[search-gap-candidates-generate] candidates_attempted_insert=${proposals.length}`,
  );

  let inserted = 0;
  if (!dryRun && proposals.length > 0) {
    const { error: insErr, count } = await supabase
      .from("search_gap_candidates")
      .upsert(proposals, {
        onConflict: "search_gap_id,candidate_type,payload_hash",
        ignoreDuplicates: true,
        count: "exact",
      });
    if (insErr) {
      console.log(
        `[search-gap-candidates-generate] bulk upsert failed; retrying single inserts`,
      );
      // fallback: insert one-by-one for deterministic conflict handling
      for (const p of proposals) {
        const { error: oneErr } = await supabase.from("search_gap_candidates").insert(p);
        if (!oneErr) inserted += 1;
      }
    } else {
      inserted = count ?? 0;
    }
  }

  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        dry_run: dryRun,
        queued_gaps_considered: (gaps ?? []).length,
        proposals_generated: proposals.length,
        proposals_inserted: inserted,
        rows: proposals,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[search-gap-candidates-generate] failed", err);
  process.exit(1);
});
