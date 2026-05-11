import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildBuckpartsDailyOperatorReport,
  type BuckpartsDailyOperatorReport,
} from "./report-buckparts-daily-operator";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

type RuntimeStatus = "OK" | "ATTENTION" | "UNKNOWN";
type AuthorityLevel = "BRIGHT" | "SCOPED_PARTIAL";
type OwnerOrAgent = "OWNER" | "AGENT";

export type DemandWorkQueueItemType =
  | "GSC_IMPRESSION_LOW_CLICK_REVIEW"
  | "INTERNAL_ZERO_RESULT_GAP_REVIEW"
  | "PAGE_WITH_CLICKS_NO_REVENUE_UNKNOWN"
  | "SAFE_CTA_COVERAGE_REVIEW"
  | "CUSTOMER_LANGUAGE_REVIEW";

export type DemandWorkQueueItem = {
  id: string;
  type: DemandWorkQueueItemType;
  priority_rank: number;
  authority_level: AuthorityLevel;
  source: string;
  scope: string;
  proof: string[];
  why_it_matters: string;
  recommended_action: string;
  owner_or_agent: OwnerOrAgent;
  excluded_assumptions: string[];
  validation_required: string[];
};

export type DemandWorkQueueBlockedInput = {
  input: string;
  status: "UNKNOWN" | "BLOCKED" | "DETAIL_MISSING";
  reason: string;
  summary_available?: string;
};

export type BuckpartsDemandWorkQueueReport = {
  contract: "buckparts_demand_work_queue_v1";
  generated_at: string;
  runtime_status: RuntimeStatus;
  items: DemandWorkQueueItem[];
  blocked_or_unknown_inputs: DemandWorkQueueBlockedInput[];
  excluded_signals: Array<{ signal: string; reason: string }>;
  proven_facts: string[];
  unknown_facts: string[];
};

type PublicLanguageIssue = {
  page: string;
  term: string;
  recommendation: string;
  proof: string;
};

type InternalSearchGapDetail = {
  id: number | string;
  catalog?: string | null;
  normalized_query?: string | null;
  sample_raw_query?: string | null;
  search_count?: number | null;
  zero_result_count?: number | null;
  status?: string | null;
  likely_entity_type?: string | null;
  last_seen_at?: string | null;
};

type DemandWorkQueueOptions = {
  rootDir?: string;
  now?: () => Date;
  providers?: {
    dailyOperator?: () => Promise<BuckpartsDailyOperatorReport>;
    internalSearchGapDetails?: () => Promise<InternalSearchGapDetail[] | "UNKNOWN">;
    publicLanguageIssues?: () => Promise<PublicLanguageIssue[]>;
  };
};

type CandidateItem = Omit<DemandWorkQueueItem, "priority_rank"> & {
  priority_bucket: number;
  magnitude: number;
};

const FALLBACK_EXCLUDED_SIGNALS = [
  {
    signal: "affiliate revenue/conversions",
    reason: "Excluded until a real affiliate revenue/conversion feed exists; clicks are not revenue.",
  },
  {
    signal: "valuation monitor",
    reason: "Excluded until real revenue/profit exists; traffic or clicks must not be converted into valuation.",
  },
  {
    signal: "GA4 custom-dimension breakdowns",
    reason: "Excluded until model/filter/quarantine custom dimensions are proven in aggregate artifacts.",
  },
  {
    signal: "semantic page-state by CTA/trust/quarantine/demand joins",
    reason: "Excluded because sitemap inventory/policy buckets do not prove semantic CTA, trust, quarantine, or demand state.",
  },
  {
    signal: "catalog-wide evidence coverage by brand/model",
    reason: "Excluded until evidence artifacts are joined to catalog brand/model inventories.",
  },
  {
    signal: "deployed commit sync",
    reason: "Excluded unless deployed_commit is explicitly proven; local HEAD is never production deploy proof.",
  },
];

const BASE_VALIDATION = [
  "Run the source read-only report again.",
  "Verify the action did not use revenue, valuation, GA4 dimensions, semantic page-state, or deploy sync.",
  "Run npm test, npm run build, npm run buckparts:audit, and git status --short before committing any implementation.",
];

function slugifyId(value: string): string {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "unknown";
}

function fmt(value: unknown): string {
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  if (typeof value === "string") return value;
  return "UNKNOWN";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function rankCandidates(candidates: CandidateItem[]): DemandWorkQueueItem[] {
  return candidates
    .sort((a, b) =>
      a.priority_bucket - b.priority_bucket ||
      b.magnitude - a.magnitude ||
      a.id.localeCompare(b.id),
    )
    .map(({ priority_bucket: _priorityBucket, magnitude: _magnitude, ...item }, index) => ({
      ...item,
      priority_rank: index + 1,
    }));
}

function addGscItems(args: {
  daily: BuckpartsDailyOperatorReport;
  candidates: CandidateItem[];
  blocked: DemandWorkQueueBlockedInput[];
}) {
  const gsc = args.daily.demand_opportunities.gsc_external_demand;
  const hasNumericTotals = isNumber(gsc.total_impressions) && isNumber(gsc.total_clicks);
  if (gsc.status !== "OK" || !hasNumericTotals) {
    args.blocked.push({
      input: "gsc_external_demand",
      status: "UNKNOWN",
      reason: "GSC external demand is not status OK with numeric total_impressions and total_clicks.",
      summary_available: `status=${gsc.status}; impressions=${fmt(gsc.total_impressions)}; clicks=${fmt(gsc.total_clicks)}`,
    });
    return;
  }

  const opportunities = gsc.high_impression_low_click_opportunities;
  if (opportunities === "UNKNOWN") {
    args.blocked.push({
      input: "gsc_high_impression_low_click_opportunities",
      status: "DETAIL_MISSING",
      reason: "GSC totals are BRIGHT, but item-level high-impression/low-click opportunities are UNKNOWN.",
      summary_available: `impressions=${gsc.total_impressions}; clicks=${gsc.total_clicks}; ctr=${fmt(gsc.average_ctr)}; position=${fmt(gsc.average_position)}`,
    });
    return;
  }

  for (const opp of opportunities) {
    args.candidates.push({
      id: `gsc-${slugifyId(opp.key)}`,
      type: "GSC_IMPRESSION_LOW_CLICK_REVIEW",
      priority_bucket: 3,
      magnitude: opp.impressions,
      authority_level: "BRIGHT",
      source: "gsc_external_demand.high_impression_low_click_opportunities",
      scope: "Search-demand query/page opportunity only; not revenue or conversion proof.",
      proof: [
        `key=${opp.key}`,
        `impressions=${opp.impressions}`,
        `clicks=${opp.clicks}`,
        `ctr=${fmt(opp.ctr)}`,
      ],
      why_it_matters: "A high-impression/low-click query or page can show demand that is not earning visits yet.",
      recommended_action: "Review title/snippet and landing-page relevance for the proven query/page; keep changes read-only until separately approved.",
      owner_or_agent: "AGENT",
      excluded_assumptions: [
        "Does not prove revenue.",
        "Does not prove conversion.",
        "Does not prove page quality beyond search-demand metrics.",
      ],
      validation_required: BASE_VALIDATION,
    });
  }
}

function addInternalSearchItems(args: {
  daily: BuckpartsDailyOperatorReport;
  gapDetails: InternalSearchGapDetail[] | "UNKNOWN";
  candidates: CandidateItem[];
  blocked: DemandWorkQueueBlockedInput[];
}) {
  const internal = args.daily.demand_opportunities.internal_search_demand_gaps;
  if (internal.runtime_status !== "OK") {
    args.blocked.push({
      input: "internal_search_demand_gaps",
      status: "UNKNOWN",
      reason: `Internal search demand/gaps runtime_status=${internal.runtime_status}.`,
    });
    return;
  }

  const actionable = internal.search_gaps_backlog.total_actionable;
  if (isNumber(actionable) && actionable > 0) {
    if (args.gapDetails === "UNKNOWN") {
      args.blocked.push({
        input: "internal_search_gap_details",
        status: "DETAIL_MISSING",
        reason: "Search gap counts are available, but concrete search_gaps rows were not readable through the read-only detail loader.",
        summary_available: `summary_path=Daily Operator/Command Surface counts; detail_source=search_gaps select(id,catalog,normalized_query,sample_raw_query,search_count,zero_result_count,status,likely_entity_type,last_seen_at); searches_30d=${fmt(internal.search_events.last_30d)}; zero_result_30d=${fmt(internal.search_events.zero_result_last_30d)}; actionable_gaps=${actionable}`,
      });
      return;
    }

    if (args.gapDetails.length === 0) {
      args.blocked.push({
        input: "internal_search_gap_details",
        status: "DETAIL_MISSING",
        reason: "Search gap counts are available, but the read-only detail query returned no actionable search_gaps rows.",
        summary_available: `summary_path=Daily Operator/Command Surface counts; detail_source=search_gaps statuses open/reviewing/queued; searches_30d=${fmt(internal.search_events.last_30d)}; zero_result_30d=${fmt(internal.search_events.zero_result_last_30d)}; actionable_gaps=${actionable}`,
      });
      return;
    }

    for (const gap of args.gapDetails.slice(0, 10)) {
      const query = String(gap.sample_raw_query || gap.normalized_query || gap.id || "UNKNOWN");
      const normalized = String(gap.normalized_query || "UNKNOWN");
      const zeroResultCount = isNumber(gap.zero_result_count) ? gap.zero_result_count : 0;
      const searchCount = isNumber(gap.search_count) ? gap.search_count : 0;
      args.candidates.push({
        id: `internal-gap-${slugifyId(String(gap.id))}-${slugifyId(query)}`,
        type: "INTERNAL_ZERO_RESULT_GAP_REVIEW",
        priority_bucket: 2,
        magnitude: zeroResultCount || searchCount,
        authority_level: "BRIGHT",
        source: "search_gaps read-only detail query",
        scope: "Internal search gap query review only; not revenue, buyer intent, or catalog coverage proof.",
        proof: [
          `gap_id=${gap.id}`,
          `status=${gap.status ?? "UNKNOWN"}`,
          `catalog=${gap.catalog ?? "UNKNOWN"}`,
          `query=${query}`,
          `normalized_query=${normalized}`,
          `search_count=${fmt(gap.search_count)}`,
          `zero_result_count=${fmt(gap.zero_result_count)}`,
          `likely_entity_type=${gap.likely_entity_type ?? "UNKNOWN"}`,
        ],
        why_it_matters: "A concrete zero-result search gap shows homeowner demand that search did not satisfy.",
        recommended_action: "Review the proven query and decide whether it needs an alias, model/filter page, compatibility evidence, or a closed gap status.",
        owner_or_agent: "AGENT",
        excluded_assumptions: [
          "Search gaps are not revenue.",
          "Search gaps are not verified buyer intent.",
          "Search gaps do not prove catalog-wide coverage.",
        ],
        validation_required: BASE_VALIDATION,
      });
    }
    return;
  }

  const zero30 = internal.search_events.zero_result_last_30d;
  if (isNumber(zero30) && zero30 > 0 && (!isNumber(actionable) || actionable === 0)) {
    args.blocked.push({
      input: "internal_zero_result_query_details",
      status: "DETAIL_MISSING",
      reason: "Zero-result search counts are available, but concrete zero-result query details are not exposed in the inspected summary path.",
      summary_available: `zero_result_30d=${zero30}`,
    });
  }
}

async function loadInternalSearchGapDetails(): Promise<InternalSearchGapDetail[] | "UNKNOWN"> {
  try {
    loadEnv();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("search_gaps")
      .select("id, catalog, normalized_query, sample_raw_query, search_count, zero_result_count, status, likely_entity_type, last_seen_at")
      .in("status", ["open", "reviewing", "queued"])
      .order("zero_result_count", { ascending: false })
      .order("search_count", { ascending: false })
      .order("last_seen_at", { ascending: false })
      .limit(10);
    if (error) return "UNKNOWN";
    return (data ?? []) as InternalSearchGapDetail[];
  } catch {
    return "UNKNOWN";
  }
}

function addClickItems(args: {
  daily: BuckpartsDailyOperatorReport;
  candidates: CandidateItem[];
  blocked: DemandWorkQueueBlockedInput[];
}) {
  const click = args.daily.throughput_clicks_money.click_visibility;
  if (!click || click.runtime_status !== "OK") {
    args.blocked.push({
      input: "click_visibility",
      status: "UNKNOWN",
      reason: `Click visibility is ${click?.runtime_status ?? "UNKNOWN"}.`,
    });
    return;
  }

  const pages = click.top_page_attribution_30d;
  if (!Array.isArray(pages) || pages.length === 0) {
    args.blocked.push({
      input: "click_page_attribution",
      status: "DETAIL_MISSING",
      reason: "Click visibility has aggregate counts, but no concrete top_page_attribution_30d entries are available for page-level work items.",
      summary_available: `raw_30d=${fmt(click.raw_last_30_days_clicks)}; human_likely_30d=${fmt(click.human_likely_last_30_days_clicks)}; revenue=${click.commission_or_revenue}`,
    });
    return;
  }

  for (const page of pages.slice(0, 10)) {
    const pageType = page.page_type ?? "UNKNOWN_PAGE_TYPE";
    const pageSlug = page.page_slug ?? "UNKNOWN_PAGE_SLUG";
    args.candidates.push({
      id: `clicks-${slugifyId(pageType)}-${slugifyId(pageSlug)}`,
      type: "PAGE_WITH_CLICKS_NO_REVENUE_UNKNOWN",
      priority_bucket: 4,
      magnitude: page.clicks,
      authority_level: "SCOPED_PARTIAL",
      source: "click_visibility.top_page_attribution_30d",
      scope: "/go click behavior only; never revenue, buyer intent, or valuation.",
      proof: [
        `page_type=${pageType}`,
        `page_slug=${pageSlug}`,
        `clicks_30d=${page.clicks}`,
      ],
      why_it_matters: "A page receiving clicks may deserve buyer-path clarity review, but clicks are not money.",
      recommended_action: "Review the page's fit guidance and buying-option clarity; do not infer revenue or mutate links from click counts.",
      owner_or_agent: "AGENT",
      excluded_assumptions: [
        "Clicks are not revenue.",
        "Clicks are not verified buyer intent.",
        "Page attribution is not semantic page-state proof.",
      ],
      validation_required: BASE_VALIDATION,
    });
  }
}

function addCtaBlockedInput(args: {
  daily: BuckpartsDailyOperatorReport;
  blocked: DemandWorkQueueBlockedInput[];
}) {
  const cta = args.daily.throughput_clicks_money;
  const hasDemandOrClicks =
    args.daily.demand_opportunities.gsc_external_demand.status === "OK" ||
    args.daily.demand_opportunities.internal_search_demand_gaps.runtime_status === "OK" ||
    cta.click_visibility?.runtime_status === "OK";
  if (!hasDemandOrClicks) return;

  args.blocked.push({
    input: "safe_cta_coverage_item_detail",
    status: "DETAIL_MISSING",
    reason: "CTA coverage can be reviewed only where demand/click proof is joined to a concrete page or query; v1 inspected summaries do not expose that join.",
  });
}

async function addCustomerLanguageItems(args: {
  providers: DemandWorkQueueOptions["providers"];
  candidates: CandidateItem[];
  blocked: DemandWorkQueueBlockedInput[];
}) {
  const issues = await (args.providers?.publicLanguageIssues?.() ?? Promise.resolve([]));
  for (const issue of issues) {
    args.candidates.push({
      id: `language-${slugifyId(issue.page)}-${slugifyId(issue.term)}`,
      type: "CUSTOMER_LANGUAGE_REVIEW",
      priority_bucket: 6,
      magnitude: 1,
      authority_level: "SCOPED_PARTIAL",
      source: "public_homeowner_copy_guard",
      scope: "Customer-facing language issue only; not fit, revenue, or conversion proof.",
      proof: [`page=${issue.page}`, `term=${issue.term}`, issue.proof],
      why_it_matters: "Plain homeowner language reduces confusion before buying or comparing part numbers.",
      recommended_action: issue.recommendation,
      owner_or_agent: "AGENT",
      excluded_assumptions: [
        "Does not prove search demand.",
        "Does not prove revenue.",
        "Does not authorize public UI behavior changes beyond copy review.",
      ],
      validation_required: BASE_VALIDATION,
    });
  }
  if (issues.length === 0) {
    args.blocked.push({
      input: "customer_language_demand_join",
      status: "DETAIL_MISSING",
      reason: "No concrete customer-language issue joined to a demanded/clicked page is available to this v1 report.",
    });
  }
}

export async function buildBuckpartsDemandWorkQueueReport(
  options: DemandWorkQueueOptions = {},
): Promise<BuckpartsDemandWorkQueueReport> {
  const rootDir = options.rootDir ?? process.cwd();
  const now = options.now ?? (() => new Date());
  const daily = await (options.providers?.dailyOperator?.() ?? buildBuckpartsDailyOperatorReport({ rootDir, now }));
  const gapDetails = await (options.providers?.internalSearchGapDetails?.() ?? loadInternalSearchGapDetails());

  const candidates: CandidateItem[] = [];
  const blocked_or_unknown_inputs: DemandWorkQueueBlockedInput[] = [];

  addInternalSearchItems({ daily, gapDetails, candidates, blocked: blocked_or_unknown_inputs });
  addGscItems({ daily, candidates, blocked: blocked_or_unknown_inputs });
  addClickItems({ daily, candidates, blocked: blocked_or_unknown_inputs });
  addCtaBlockedInput({ daily, blocked: blocked_or_unknown_inputs });
  await addCustomerLanguageItems({ providers: options.providers, candidates, blocked: blocked_or_unknown_inputs });

  const items = rankCandidates(candidates);
  const runtime_status: RuntimeStatus =
    items.length > 0 ? "OK" : blocked_or_unknown_inputs.length > 0 ? "ATTENTION" : "UNKNOWN";

  const excluded_signals =
    daily.decision_authority_policy.excluded_signals.length > 0
      ? daily.decision_authority_policy.excluded_signals
      : FALLBACK_EXCLUDED_SIGNALS;

  const proven_facts = [
    "Demand-to-Work Queue v1 is read-only and emits JSON to stdout only.",
    `Daily Operator contract=${daily.contract}; runtime_status=${daily.runtime_status}.`,
    daily.demand_opportunities.gsc_external_demand.status === "OK"
      ? `GSC demand status OK; impressions=${fmt(daily.demand_opportunities.gsc_external_demand.total_impressions)}; clicks=${fmt(daily.demand_opportunities.gsc_external_demand.total_clicks)}.`
      : null,
    daily.demand_opportunities.internal_search_demand_gaps.runtime_status === "OK"
      ? `Internal search runtime OK; searches_30d=${fmt(daily.demand_opportunities.internal_search_demand_gaps.search_events.last_30d)}; zero_result_30d=${fmt(daily.demand_opportunities.internal_search_demand_gaps.search_events.zero_result_last_30d)}; actionable_gaps=${fmt(daily.demand_opportunities.internal_search_demand_gaps.search_gaps_backlog.total_actionable)}.`
      : null,
    daily.throughput_clicks_money.click_visibility?.runtime_status === "OK"
      ? `Click visibility runtime OK; raw_30d=${fmt(daily.throughput_clicks_money.click_visibility.raw_last_30_days_clicks)}; human_likely_30d=${fmt(daily.throughput_clicks_money.click_visibility.human_likely_last_30_days_clicks)}; revenue=${daily.throughput_clicks_money.click_visibility.commission_or_revenue}.`
      : null,
  ].filter((value): value is string => typeof value === "string");

  const unknown_facts = [
    ...blocked_or_unknown_inputs.map((input) => `${input.input}: ${input.reason}`),
    ...excluded_signals.map((signal) => `${signal.signal}: ${signal.reason}`),
  ];

  return {
    contract: "buckparts_demand_work_queue_v1",
    generated_at: now().toISOString(),
    runtime_status,
    items,
    blocked_or_unknown_inputs,
    excluded_signals,
    proven_facts,
    unknown_facts: Array.from(new Set(unknown_facts)),
  };
}

export function renderBuckpartsDemandWorkQueueReport(report: BuckpartsDemandWorkQueueReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export async function main(): Promise<void> {
  const report = await buildBuckpartsDemandWorkQueueReport();
  process.stdout.write(renderBuckpartsDemandWorkQueueReport(report));
}

const entryHref = pathToFileURL(path.resolve(process.argv[1] ?? "")).href;
if (import.meta.url === entryHref) {
  main().catch(() => {
    console.error("[report-buckparts-demand-work-queue] failed");
    process.exit(1);
  });
}
