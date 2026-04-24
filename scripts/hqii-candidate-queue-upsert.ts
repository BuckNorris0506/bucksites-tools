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

type QueueInputRow = {
  filter_slug: string;
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
  candidate_url: string;
  canonical_url: string;
  asin: string;
  source: string;
  review_status: "pending" | "rejected";
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
      candidate_url: rawUrl,
      canonical_url: rawUrl,
      asin: "",
      source: SOURCE,
      review_status: "rejected",
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
  let review_status: "pending" | "rejected" = "pending";
  let last_error: string | null = null;
  let notes: string | null = null;

  if (tokenEvidenceOk === true) {
    candidate_state = "token_verified";
    notes = "Token evidence verified from enrichment output.";
  } else if (tokenEvidenceOk === false) {
    candidate_state = "rejected";
    review_status = "rejected";
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
    candidate_url: rawUrl,
    canonical_url: canonical,
    asin,
    source: SOURCE,
    review_status,
    candidate_state,
    token_required: tokenRequired,
    token_evidence_ok: tokenEvidenceOk,
    token_evidence_notes: tokenEvidenceNotes,
    last_error,
    notes,
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

  const drafts = (parsed as QueueInputRow[]).map(buildQueueRowDraft);
  const filterSlugs = [...new Set(drafts.map((d) => d.filter_slug).filter(Boolean))];

  const supabase = getSupabaseAdmin();
  const { data: filters, error: filterErr } = await supabase
    .from("filters")
    .select("id, slug")
    .in("slug", filterSlugs);
  if (filterErr) throw filterErr;
  const filterIdBySlug = new Map((filters ?? []).map((f) => [String(f.slug), String(f.id)]));

  const accepted = drafts.filter((d) => filterIdBySlug.has(d.filter_slug));
  const rejectedUnknownSlug = drafts
    .filter((d) => !filterIdBySlug.has(d.filter_slug))
    .map((d) => ({ ...d, candidate_state: "rejected" as const, review_status: "rejected" as const, last_error: "unknown_filter_slug" }));

  let inserted = 0;
  let updated = 0;
  if (write && accepted.length > 0) {
    for (const d of accepted) {
      const filterId = filterIdBySlug.get(d.filter_slug)!;
      const { data: existing, error: existingErr } = await supabase
        .from("retailer_link_candidates")
        .select("id")
        .eq("filter_id", filterId)
        .eq("retailer_key", d.retailer_key)
        .eq("review_status", "pending")
        .limit(1);
      if (existingErr) throw existingErr;

      const payload = {
        filter_id: filterId,
        retailer_key: d.retailer_key,
        candidate_url: d.candidate_url,
        retailer_name: d.retailer_name,
        source: d.source,
        review_status: d.review_status,
        notes: d.notes,
        candidate_state: d.candidate_state,
        canonical_url: d.canonical_url,
        asin: d.asin,
        token_required: d.token_required,
        token_evidence_ok: d.token_evidence_ok,
        token_evidence_notes: d.token_evidence_notes,
        browser_truth_classification: null,
        browser_truth_notes: null,
        browser_truth_checked_at: null,
        retry_after: null,
        retry_count: 0,
        last_error: d.last_error,
      };

      if ((existing ?? []).length > 0) {
        const id = String(existing![0]!.id);
        const { error: updateErr } = await supabase
          .from("retailer_link_candidates")
          .update(payload)
          .eq("id", id);
        if (updateErr) throw updateErr;
        updated += 1;
      } else {
        const { error: insertErr } = await supabase
          .from("retailer_link_candidates")
          .insert(payload);
        if (insertErr) throw insertErr;
        inserted += 1;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        dry_run: !write,
        input_count: drafts.length,
        matched_filter_slugs: accepted.length,
        unknown_filter_slugs: rejectedUnknownSlug.map((r) => r.filter_slug),
        state_counts: drafts.reduce(
          (acc, d) => {
            acc[d.candidate_state] = (acc[d.candidate_state] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
        inserted,
        updated,
        rows: drafts,
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
