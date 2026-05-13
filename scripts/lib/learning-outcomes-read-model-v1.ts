import type {
  LearningOutcomesByConfidenceV1,
  LearningOutcomesByCtaStatusV1,
  LearningOutcomesByOutcomeV1,
  LearningOutcomesLatestRowV1,
  LearningOutcomesReadModelV1,
  LearningOutcomesReadModelRuntimeStatus,
} from "./buckparts-command-center-v2-types";

const LATEST_OUTCOMES_CAP = 15;
const RECENT_WINDOW_DAYS = 30 as const;

const OUTCOMES = ["pass", "fail", "blocked", "unknown"] as const;

export function degradedLearningOutcomesReadModelV1(
  runtime: LearningOutcomesReadModelRuntimeStatus,
  unknown_facts: string[],
): LearningOutcomesReadModelV1 {
  return {
    contract: "learning_outcomes_read_model_v1",
    runtime_status: runtime,
    total_outcomes: "UNKNOWN",
    recent_outcomes: "UNKNOWN",
    recent_window_days: RECENT_WINDOW_DAYS,
    by_outcome: "UNKNOWN",
    by_confidence: "UNKNOWN",
    by_cta_status: "UNKNOWN",
    latest_outcomes: [],
    proven_facts: [
      "Table public.learning_outcomes is defined in supabase/migrations/20260428200500_learning_outcomes.sql with columns including outcome, confidence, cta_status, date_checked, created_at.",
      "This read model uses read-only SELECT/count only; it does not insert or update learning_outcomes.",
    ],
    unknown_facts,
  };
}

function parseLatestRow(raw: unknown): LearningOutcomesLatestRowV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  if (typeof o.slug !== "string" || o.slug.length === 0) return null;
  if (typeof o.outcome !== "string") return null;
  if (o.confidence !== null && typeof o.confidence !== "string") return null;
  if (o.cta_status !== null && typeof o.cta_status !== "string") return null;
  if (typeof o.date_checked !== "string") return null;
  if (typeof o.created_at !== "string") return null;
  if (o.retailer !== null && typeof o.retailer !== "string") return null;
  if (o.index_status !== null && typeof o.index_status !== "string") return null;
  if (o.part_number !== null && typeof o.part_number !== "string") return null;
  if (o.model_number !== null && typeof o.model_number !== "string") return null;
  return {
    id: o.id,
    slug: o.slug,
    outcome: o.outcome,
    confidence: o.confidence as string | null,
    cta_status: o.cta_status as string | null,
    date_checked: o.date_checked,
    created_at: o.created_at,
    retailer: o.retailer as string | null,
    index_status: o.index_status as string | null,
    part_number: o.part_number as string | null,
    model_number: o.model_number as string | null,
  };
}

export async function fetchLearningOutcomesReadModelV1FromSupabase(
  deps: { now?: () => Date } = {},
): Promise<LearningOutcomesReadModelV1> {
  const now = deps.now ?? (() => new Date());
  const provenBase: string[] = [
    "Table public.learning_outcomes is defined in supabase/migrations/20260428200500_learning_outcomes.sql with columns including outcome, confidence, cta_status, date_checked, created_at.",
    "This read model uses read-only SELECT/count only; it does not insert or update learning_outcomes.",
    `recent_outcomes counts rows with date_checked >= now minus ${RECENT_WINDOW_DAYS} days (same window convention as other Command Center 30d slices where applicable).`,
    "latest_outcomes omits evidence JSON, candidate_url, reason text, clicks, and conversions to keep payloads bounded and to avoid implying revenue or PDP-fit proof from this slice.",
  ];

  try {
    const { loadEnv } = await import("./load-env");
    const { getSupabaseAdmin } = await import("./supabase-admin");
    loadEnv();
    const supabase = getSupabaseAdmin();

    const { count: total, error: totalErr } = await supabase
      .from("learning_outcomes")
      .select("id", { count: "exact", head: true });
    if (totalErr) {
      return degradedLearningOutcomesReadModelV1("UNKNOWN_QUERY_ERROR", [
        `learning_outcomes total count error: ${totalErr.message}`,
      ]);
    }
    const totalN = typeof total === "number" ? total : 0;

    const cutoff = new Date(now().getTime() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { count: recentC, error: recentErr } = await supabase
      .from("learning_outcomes")
      .select("id", { count: "exact", head: true })
      .gte("date_checked", cutoff);
    const unknown_facts: string[] = [];
    if (recentErr) {
      unknown_facts.push(`learning_outcomes recent count error: ${recentErr.message}`);
    }
    const recentN: number | "UNKNOWN" = recentErr ? "UNKNOWN" : typeof recentC === "number" ? recentC : 0;

    let by_outcome: LearningOutcomesByOutcomeV1 | "UNKNOWN" = "UNKNOWN";
    let by_confidence: LearningOutcomesByConfidenceV1 | "UNKNOWN" = "UNKNOWN";
    let by_cta_status: LearningOutcomesByCtaStatusV1 | "UNKNOWN" = "UNKNOWN";

    if (totalN === 0) {
      by_outcome = { pass: 0, fail: 0, blocked: 0, unknown: 0 };
      by_confidence = { exact: 0, likely: 0, uncertain: 0, unset: 0 };
      by_cta_status = { live: 0, not_live: 0, blocked: 0, unset: 0 };
    } else {
      const outcomeParts = await Promise.all(
        OUTCOMES.map(async (outcome) => {
          const { count, error } = await supabase
            .from("learning_outcomes")
            .select("id", { count: "exact", head: true })
            .eq("outcome", outcome);
          if (error) return { outcome, n: null as number | null, err: error.message };
          return { outcome, n: typeof count === "number" ? count : 0, err: null as string | null };
        }),
      );
      if (outcomeParts.some((p) => p.n === null)) {
        unknown_facts.push(
          ...outcomeParts.filter((p) => p.err).map((p) => `learning_outcomes outcome=${p.outcome} count: ${p.err}`),
        );
        by_outcome = "UNKNOWN";
      } else {
        by_outcome = {
          pass: outcomeParts.find((p) => p.outcome === "pass")!.n!,
          fail: outcomeParts.find((p) => p.outcome === "fail")!.n!,
          blocked: outcomeParts.find((p) => p.outcome === "blocked")!.n!,
          unknown: outcomeParts.find((p) => p.outcome === "unknown")!.n!,
        };
        const sumO = by_outcome.pass + by_outcome.fail + by_outcome.blocked + by_outcome.unknown;
        if (sumO !== totalN) {
          unknown_facts.push(
            `Outcome bucket counts sum to ${sumO} but total_outcomes is ${totalN}; treat breakdown as approximate (concurrent writes or read skew).`,
          );
        }
      }

      const confBuckets = ["exact", "likely", "uncertain"] as const;
      const confParts = await Promise.all(
        confBuckets.map(async (c) => {
          const { count, error } = await supabase
            .from("learning_outcomes")
            .select("id", { count: "exact", head: true })
            .eq("confidence", c);
          if (error) return { key: c, n: null as number | null, err: error.message };
          return { key: c, n: typeof count === "number" ? count : 0, err: null as string | null };
        }),
      );
      const { count: unsetConf, error: unsetConfErr } = await supabase
        .from("learning_outcomes")
        .select("id", { count: "exact", head: true })
        .is("confidence", null);

      if (confParts.some((p) => p.n === null) || unsetConfErr) {
        if (unsetConfErr) unknown_facts.push(`learning_outcomes confidence unset count: ${unsetConfErr.message}`);
        unknown_facts.push(
          ...confParts.filter((p) => p.err).map((p) => `learning_outcomes confidence=${p.key} count: ${p.err}`),
        );
        by_confidence = "UNKNOWN";
      } else {
        by_confidence = {
          exact: confParts.find((p) => p.key === "exact")!.n!,
          likely: confParts.find((p) => p.key === "likely")!.n!,
          uncertain: confParts.find((p) => p.key === "uncertain")!.n!,
          unset: typeof unsetConf === "number" ? unsetConf : 0,
        };
      }

      const ctaBuckets = ["live", "not_live", "blocked"] as const;
      const ctaParts = await Promise.all(
        ctaBuckets.map(async (c) => {
          const { count, error } = await supabase
            .from("learning_outcomes")
            .select("id", { count: "exact", head: true })
            .eq("cta_status", c);
          if (error) return { key: c, n: null as number | null, err: error.message };
          return { key: c, n: typeof count === "number" ? count : 0, err: null as string | null };
        }),
      );
      const { count: unsetCta, error: unsetCtaErr } = await supabase
        .from("learning_outcomes")
        .select("id", { count: "exact", head: true })
        .is("cta_status", null);
      if (ctaParts.some((p) => p.n === null) || unsetCtaErr) {
        if (unsetCtaErr) unknown_facts.push(`learning_outcomes cta_status unset count: ${unsetCtaErr.message}`);
        unknown_facts.push(...ctaParts.filter((p) => p.err).map((p) => `learning_outcomes cta_status=${p.key} count: ${p.err}`));
        by_cta_status = "UNKNOWN";
      } else {
        by_cta_status = {
          live: ctaParts.find((p) => p.key === "live")!.n!,
          not_live: ctaParts.find((p) => p.key === "not_live")!.n!,
          blocked: ctaParts.find((p) => p.key === "blocked")!.n!,
          unset: typeof unsetCta === "number" ? unsetCta : 0,
        };
      }
    }

    const { data: latestRaw, error: latestErr } = await supabase
      .from("learning_outcomes")
      .select(
        "id, slug, outcome, confidence, cta_status, date_checked, created_at, retailer, index_status, part_number, model_number",
      )
      .order("date_checked", { ascending: false })
      .limit(LATEST_OUTCOMES_CAP);

    let latest_outcomes: LearningOutcomesLatestRowV1[] = [];
    if (latestErr) {
      unknown_facts.push(`learning_outcomes latest slice error: ${latestErr.message}`);
    } else {
      latest_outcomes = (latestRaw ?? []).map(parseLatestRow).filter((r): r is LearningOutcomesLatestRowV1 => r !== null);
      if (latest_outcomes.length < (latestRaw ?? []).length) {
        unknown_facts.push("Some learning_outcomes latest rows failed strict parse and were dropped from latest_outcomes.");
      }
    }

    return {
      contract: "learning_outcomes_read_model_v1",
      runtime_status: "OK",
      total_outcomes: totalN,
      recent_outcomes: recentN,
      recent_window_days: RECENT_WINDOW_DAYS,
      by_outcome,
      by_confidence,
      by_cta_status,
      latest_outcomes,
      proven_facts: provenBase,
      unknown_facts,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return degradedLearningOutcomesReadModelV1("UNKNOWN_DB_UNAVAILABLE", [
      `learning_outcomes_read_model_v1 Supabase load failed: ${msg}`,
    ]);
  }
}
