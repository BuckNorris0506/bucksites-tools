import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { rankFridgeCoverageRows } from "./generate-fridge-non-amazon-review-packets";
import { buildFridgeNonAmazonCandidates, type CandidateUrl } from "./lib/fridge-non-amazon-candidate-generator";
import {
  collectEvidenceForCandidate,
  type CollectedEvidence,
} from "./lib/fridge-non-amazon-evidence-collector";
import { buildReviewPacket, type ReviewPacket } from "./lib/non-amazon-review-packets";

type CoverageRow = {
  slug: string;
  number_of_valid_links: number;
  number_of_direct_buyable_links: number;
  has_primary_amazon: boolean;
};

type BlockedReason =
  | "no candidate"
  | "404"
  | "discontinued/substitution"
  | "suffix drift"
  | "no exact token"
  | "no buyability";

type ManualCaptureNeeded = {
  filter_slug: string;
  retailer: string;
  pdp_url: string;
  candidate_source: CandidateUrl["source"];
  reason: string;
  capture_instructions: string[];
};

type PassCandidate = {
  filter_slug: string;
  retailer: string;
  pdp_url: string;
  risk_label: ReviewPacket["risk_label"];
  decision: "PASS";
  recommended_next_action: string;
};

type BlockedCandidate = {
  filter_slug: string;
  retailer: string;
  pdp_url: string;
  candidate_source: CandidateUrl["source"];
  reason: BlockedReason;
  detail: string;
};

type UnknownCandidate = {
  filter_slug: string;
  retailer: string;
  pdp_url: string;
  candidate_source: CandidateUrl["source"];
  reason: string;
  detail: string;
};

type OperatorRowResult = {
  slug: string;
  current_cta_status: string;
  candidate_count: number;
  outcomes: Array<PassCandidate | ManualCaptureNeeded | BlockedCandidate | UnknownCandidate>;
};

const DEFAULT_KNOWN_BLOCKED_SLUGS = new Set([
  "da29-00012b",
  "da29-00019a",
  "da97-17376a",
  "adq75795101",
]);

function argValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return null;
  const v = process.argv[idx + 1];
  return v && !v.startsWith("--") ? v : null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function parseLimit(): number {
  const raw = argValue("--limit");
  if (!raw) return 10;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid --limit "${raw}" (must be > 0).`);
  return n;
}

function parseSlugsOrNull(): string[] | null {
  const raw = argValue("--slugs");
  if (!raw) return null;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function ctaStatusFromCoverage(row: CoverageRow | undefined): string {
  if (!row) return "unknown_slug";
  if (row.number_of_valid_links > 0) return `has_valid_cta (${row.number_of_valid_links})`;
  return "no_valid_cta";
}

function hasSuffixDrift(slug: string, text: string): boolean {
  const m = slug.toUpperCase().match(/^([A-Z0-9-]+?)([A-Z])$/);
  if (!m) return false;
  const prefix = m[1];
  const expectedSuffix = m[2];
  const nearby = text.toUpperCase().match(new RegExp(`${prefix}[A-Z]`, "g")) ?? [];
  return nearby.some((token) => token.slice(-1) !== expectedSuffix);
}

export function isPlausibleManualCaptureCandidate(args: {
  slug: string;
  candidate: CandidateUrl;
  evidence: CollectedEvidence;
}): boolean {
  if (args.evidence.fetch_status !== "fetch_failed" || args.evidence.fetch_error !== "HTTP 403") {
    return false;
  }
  if (args.candidate.source === "seeded") return true;
  const url = args.candidate.url.toLowerCase();
  const slug = args.slug.toLowerCase();
  const plausibleHost =
    url.startsWith("https://www.appliancepartspros.com/") || url.startsWith("https://appliancepartspros.com/");
  const plausibleFamily = slug.startsWith("da97") || slug.startsWith("da29") || slug.startsWith("adq");
  return plausibleHost && plausibleFamily && url.includes(slug);
}

export function classifyOutcome(args: {
  slug: string;
  candidate: CandidateUrl;
  packet: ReviewPacket;
  evidence: CollectedEvidence;
}): PassCandidate | ManualCaptureNeeded | BlockedCandidate | UnknownCandidate {
  const { slug, candidate, packet, evidence } = args;
  if (packet.decision === "PASS") {
    return {
      filter_slug: slug,
      retailer: packet.retailer,
      pdp_url: packet.pdp_url,
      risk_label: packet.risk_label,
      decision: "PASS",
      recommended_next_action: packet.recommended_next_action,
    };
  }

  if (isPlausibleManualCaptureCandidate({ slug, candidate, evidence })) {
    return {
      filter_slug: slug,
      retailer: packet.retailer,
      pdp_url: packet.pdp_url,
      candidate_source: candidate.source,
      reason: "HTTP 403 on plausible non-Amazon PDP; manual capture required before deterministic re-run.",
      capture_instructions: [
        "Capture exact part token text visible on PDP (or explicit alias/cross-reference).",
        "Capture buyability text (add-to-cart, in-stock, ships, and/or price).",
        "Capture substitution/discontinued warning text if present.",
      ],
    };
  }

  if (evidence.fetch_status === "fetch_failed" && evidence.fetch_error === "HTTP 404") {
    return {
      filter_slug: slug,
      retailer: packet.retailer,
      pdp_url: packet.pdp_url,
      candidate_source: candidate.source,
      reason: "404",
      detail: "Candidate URL returned HTTP 404 and is treated as blocked/non-existent.",
    };
  }

  if (packet.substitution_or_discontinued_warning_present === "yes") {
    return {
      filter_slug: slug,
      retailer: packet.retailer,
      pdp_url: packet.pdp_url,
      candidate_source: candidate.source,
      reason: "discontinued/substitution",
      detail: "Candidate evidence indicates substitution/discontinued warning.",
    };
  }

  if (!evidence.has_exact_token_or_alias_proof && hasSuffixDrift(slug, evidence.exact_token_or_alias_proof)) {
    return {
      filter_slug: slug,
      retailer: packet.retailer,
      pdp_url: packet.pdp_url,
      candidate_source: candidate.source,
      reason: "suffix drift",
      detail: evidence.exact_token_or_alias_proof,
    };
  }

  if (!evidence.has_exact_token_or_alias_proof) {
    return {
      filter_slug: slug,
      retailer: packet.retailer,
      pdp_url: packet.pdp_url,
      candidate_source: candidate.source,
      reason: "no exact token",
      detail: evidence.exact_token_or_alias_proof,
    };
  }

  if (!evidence.has_buyability_evidence) {
    return {
      filter_slug: slug,
      retailer: packet.retailer,
      pdp_url: packet.pdp_url,
      candidate_source: candidate.source,
      reason: "no buyability",
      detail: evidence.buyability_evidence,
    };
  }

  return {
    filter_slug: slug,
    retailer: packet.retailer,
    pdp_url: packet.pdp_url,
    candidate_source: candidate.source,
    reason: "insufficient deterministic evidence",
    detail: packet.recommended_next_action,
  };
}

async function loadFridgeCoverageRows(): Promise<CoverageRow[]> {
  const supabase = getSupabaseAdmin();
  const { data: filters, error: filterErr } = await supabase.from("filters").select("id,slug");
  if (filterErr) throw filterErr;
  const slugById = new Map<string, string>();
  for (const row of (filters ?? []) as Array<{ id: string; slug: string }>) {
    if (row.id && row.slug) slugById.set(row.id, row.slug);
  }

  const { data: links, error: linksErr } = await supabase
    .from("retailer_links")
    .select("filter_id,retailer_key,browser_truth_classification,is_primary");
  if (linksErr) throw linksErr;

  const bySlug = new Map<string, CoverageRow>();
  for (const slug of slugById.values()) {
    bySlug.set(slug, {
      slug,
      number_of_valid_links: 0,
      number_of_direct_buyable_links: 0,
      has_primary_amazon: false,
    });
  }

  for (const row of (links ?? []) as Array<{
    filter_id: string;
    retailer_key: string;
    browser_truth_classification: string | null;
    is_primary: boolean | null;
  }>) {
    const slug = slugById.get(row.filter_id);
    if (!slug) continue;
    const acc = bySlug.get(slug);
    if (!acc) continue;
    const classification = (row.browser_truth_classification ?? "").trim();
    if (classification === "direct_buyable" || classification === "likely_valid") {
      acc.number_of_valid_links += 1;
    }
    if (classification === "direct_buyable") acc.number_of_direct_buyable_links += 1;
    if ((row.retailer_key ?? "").trim().toLowerCase() === "amazon" && Boolean(row.is_primary)) {
      acc.has_primary_amazon = true;
    }
  }

  return rankFridgeCoverageRows([...bySlug.values()]);
}

async function chooseSlugs(args: {
  limit: number;
  explicitSlugs: string[] | null;
  excludeKnownBlocked: boolean;
}): Promise<string[]> {
  if (args.explicitSlugs && args.explicitSlugs.length > 0) {
    return args.explicitSlugs;
  }
  const coverage = await loadFridgeCoverageRows();
  return coverage
    .filter((row) => row.number_of_valid_links === 0)
    .filter((row) => (args.excludeKnownBlocked ? !DEFAULT_KNOWN_BLOCKED_SLUGS.has(row.slug) : true))
    .slice(0, args.limit)
    .map((row) => row.slug);
}

async function runOperator(args: {
  limit: number;
  explicitSlugs: string[] | null;
  excludeKnownBlocked: boolean;
}) {
  const coverage = await loadFridgeCoverageRows();
  const coverageBySlug = new Map(coverage.map((row) => [row.slug, row]));
  const slugs = await chooseSlugs(args);

  const rows: OperatorRowResult[] = [];
  for (const slug of slugs) {
    const candidates = buildFridgeNonAmazonCandidates(slug);
    const outcomes: OperatorRowResult["outcomes"] = [];
    if (candidates.length === 0) {
      outcomes.push({
        filter_slug: slug,
        retailer: "UNKNOWN",
        pdp_url: "",
        candidate_source: "unverified_url_guess",
        reason: "no candidate",
        detail: "No non-Amazon candidate URL generated for this slug.",
      });
    } else {
      for (const candidate of candidates) {
        const evidence = await collectEvidenceForCandidate({ slug, candidate });
        const packet = buildReviewPacket({
          filter_slug: slug,
          current_cta_status: ctaStatusFromCoverage(coverageBySlug.get(slug)),
          evidence,
        });
        outcomes.push(classifyOutcome({ slug, candidate, packet, evidence }));
      }
    }
    rows.push({
      slug,
      current_cta_status: ctaStatusFromCoverage(coverageBySlug.get(slug)),
      candidate_count: candidates.length,
      outcomes,
    });
  }

  const pass: PassCandidate[] = [];
  const manual_capture_needed: ManualCaptureNeeded[] = [];
  const blocked: BlockedCandidate[] = [];
  const unknown: UnknownCandidate[] = [];
  for (const row of rows) {
    for (const outcome of row.outcomes) {
      if ("decision" in outcome && outcome.decision === "PASS") pass.push(outcome);
      else if ("capture_instructions" in outcome) manual_capture_needed.push(outcome);
      else if ("reason" in outcome && (
        outcome.reason === "no candidate" ||
        outcome.reason === "404" ||
        outcome.reason === "discontinued/substitution" ||
        outcome.reason === "suffix drift" ||
        outcome.reason === "no exact token" ||
        outcome.reason === "no buyability"
      )) blocked.push(outcome);
      else unknown.push(outcome as UnknownCandidate);
    }
  }

  return {
    wedge: "refrigerator_water",
    operator: "fridge_non_amazon",
    read_only: true,
    non_amazon_only: true,
    auto_approve: false,
    data_mutation: false,
    ingest_called: false,
    include_monetized: false,
    exclude_known_blocked_slugs: args.excludeKnownBlocked,
    known_blocked_slugs: [...DEFAULT_KNOWN_BLOCKED_SLUGS],
    evaluated_slug_count: rows.length,
    evaluated_slugs: rows.map((r) => r.slug),
    groups: {
      PASS: pass,
      MANUAL_CAPTURE_NEEDED: manual_capture_needed,
      BLOCKED: blocked,
      UNKNOWN: unknown,
    },
    recommended_next_action:
      pass.length > 0
        ? "Prepare human write-lane package(s) for PASS candidates only."
        : manual_capture_needed.length > 0
          ? "Run URL-scoped manual capture for MANUAL_CAPTURE_NEEDED URLs, then re-run operator."
          : "Move to next ranked slugs; current batch has no write-lane-safe PASS candidates.",
    slug_results: rows,
  };
}

async function main() {
  loadEnv();
  const wedge = argValue("--wedge") ?? "refrigerator_water";
  if (wedge !== "refrigerator_water") {
    throw new Error(`Unsupported --wedge "${wedge}". This operator is refrigerator_water-only.`);
  }
  const limit = parseLimit();
  const explicitSlugs = parseSlugsOrNull();
  const excludeKnownBlocked = !hasFlag("--include-known-blocked");
  const output = await runOperator({ limit, explicitSlugs, excludeKnownBlocked });
  console.log(JSON.stringify(output, null, 2));
}

if (process.argv[1]?.endsWith("run-fridge-non-amazon-operator.ts")) {
  main().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[run-fridge-non-amazon-operator] FAILED: ${message}`);
    process.exitCode = 1;
  });
}
