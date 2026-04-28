import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import fs from "node:fs";
import { buildReviewPacket, type ReviewPacket } from "./lib/non-amazon-review-packets";
import { buildFridgeNonAmazonCandidates } from "./lib/fridge-non-amazon-candidate-generator";
import {
  collectEvidenceForCandidate,
  parseManualFallbackCaptures,
  type ManualFallbackCapture,
} from "./lib/fridge-non-amazon-evidence-collector";
import { rankFridgeCoverageRows } from "./generate-fridge-non-amazon-review-packets";

type CoverageRow = {
  slug: string;
  number_of_valid_links: number;
  number_of_direct_buyable_links: number;
  has_primary_amazon: boolean;
};

type SlugEvidencePacket = {
  filter_slug: string;
  current_cta_status: string;
  candidate_count: number;
  packets: Array<{
    packet: ReviewPacket;
    evidence_provenance: {
      source: "fetched_page" | "manual_capture";
      captured_at: string | null;
      raw_excerpt: string | null;
      fetch_status: "ok" | "fetch_failed" | "invalid_candidate_url";
      fetch_error: string | null;
    };
  }>;
};

function argValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return null;
  const v = process.argv[idx + 1];
  return v && !v.startsWith("--") ? v : null;
}

function parseSlugsOrNull(): string[] | null {
  const raw = argValue("--slugs");
  if (!raw) return null;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseLimit(): number {
  const raw = argValue("--limit");
  if (!raw) return 10;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid --limit "${raw}" (must be > 0).`);
  return n;
}

function parseFallbackCaptureFile(): string | null {
  return argValue("--fallback-capture-file");
}

function ctaStatusFromCoverage(row: CoverageRow | undefined): string {
  if (!row) return "unknown_slug";
  if (row.number_of_valid_links > 0) return `has_valid_cta (${row.number_of_valid_links})`;
  return "no_valid_cta";
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
    .select("filter_id,retailer_key,affiliate_url,browser_truth_classification,is_primary");
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
    affiliate_url: string;
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

async function chooseSlugs(limit: number, explicit: string[] | null): Promise<string[]> {
  if (explicit && explicit.length > 0) return explicit;
  const coverage = await loadFridgeCoverageRows();
  return coverage
    .filter((row) => row.number_of_valid_links === 0)
    .slice(0, limit)
    .map((row) => row.slug);
}

async function main() {
  loadEnv();
  const wedge = argValue("--wedge") ?? "refrigerator_water";
  if (wedge !== "refrigerator_water") {
    throw new Error(`Unsupported --wedge "${wedge}". This collector is refrigerator_water-only.`);
  }

  const limit = parseLimit();
  const explicitSlugs = parseSlugsOrNull();
  const fallbackCaptureFile = parseFallbackCaptureFile();
  let fallbackByUrl: Map<string, ManualFallbackCapture> | undefined;
  if (fallbackCaptureFile) {
    const raw = fs.readFileSync(fallbackCaptureFile, "utf8");
    fallbackByUrl = parseManualFallbackCaptures(raw);
  }
  const slugs = await chooseSlugs(limit, explicitSlugs);
  const coverage = await loadFridgeCoverageRows();
  const coverageBySlug = new Map(coverage.map((row) => [row.slug, row]));

  const results: SlugEvidencePacket[] = [];
  for (const slug of slugs) {
    const currentStatus = ctaStatusFromCoverage(coverageBySlug.get(slug));
    const candidates = buildFridgeNonAmazonCandidates(slug);
    const packets: SlugEvidencePacket["packets"] = [];
    for (const candidate of candidates) {
      const evidence = await collectEvidenceForCandidate({
        slug,
        candidate,
        fallbackByUrl,
      });
      const packet = buildReviewPacket({
          filter_slug: slug,
          current_cta_status: currentStatus,
          evidence,
      });
      packets.push({
        packet,
        evidence_provenance: {
          source: evidence.evidence_source,
          captured_at: evidence.captured_at,
          raw_excerpt: evidence.raw_excerpt,
          fetch_status: evidence.fetch_status,
          fetch_error: evidence.fetch_error,
        },
      });
    }
    results.push({
      filter_slug: slug,
      current_cta_status: currentStatus,
      candidate_count: candidates.length,
      packets,
    });
  }

  const output = {
    wedge: "refrigerator_water",
    read_only: true,
    non_amazon_only: true,
    auto_approve: false,
    fallback_capture_file: fallbackCaptureFile,
    packet_count: results.length,
    results,
  };
  console.log(JSON.stringify(output, null, 2));
}

if (process.argv[1]?.endsWith("collect-fridge-non-amazon-evidence.ts")) {
  if (process.env.BUCKPARTS_ALLOW_FROZEN !== "true") {
    throw new Error(
      "FROZEN_SCRIPT_BLOCKED: Set BUCKPARTS_ALLOW_FROZEN=true to run this frozen/tactical script intentionally.",
    );
  }
  main().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[collect-fridge-non-amazon-evidence] FAILED: ${message}`);
    process.exitCode = 1;
  });
}
