import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import {
  buildReviewPacket,
  ctaStatusFromRetailerRows,
  DEFAULT_REFRIGERATOR_REVIEW_CANDIDATES,
  type ReviewPacket,
} from "./lib/non-amazon-review-packets";

function argValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return null;
  const v = process.argv[idx + 1];
  return v && !v.startsWith("--") ? v : null;
}

function parseSlugArg(): string[] {
  const raw = argValue("--slugs");
  if (!raw) return ["da97-08006b", "da97-15217d", "da29-00012b"];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function loadCurrentCtaStatusBySlug(slugs: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (slugs.length === 0) return out;

  const supabase = getSupabaseAdmin();
  const { data: filters, error: filterErr } = await supabase
    .from("filters")
    .select("id,slug")
    .in("slug", slugs);
  if (filterErr) throw filterErr;

  const idBySlug = new Map<string, string>();
  const slugsById = new Map<string, string>();
  for (const row of (filters ?? []) as Array<{ id: string; slug: string }>) {
    idBySlug.set(row.slug, row.id);
    slugsById.set(row.id, row.slug);
  }

  const filterIds = [...slugsById.keys()];
  if (filterIds.length === 0) return out;

  const { data: links, error: linksErr } = await supabase
    .from("retailer_links")
    .select("filter_id,retailer_key,affiliate_url,browser_truth_classification")
    .in("filter_id", filterIds);
  if (linksErr) throw linksErr;

  const linksBySlug = new Map<
    string,
    Array<{ retailer_key: string; affiliate_url: string; browser_truth_classification: string | null }>
  >();
  for (const row of (links ?? []) as Array<{
    filter_id: string;
    retailer_key: string;
    affiliate_url: string;
    browser_truth_classification: string | null;
  }>) {
    const slug = slugsById.get(row.filter_id);
    if (!slug) continue;
    if (!linksBySlug.has(slug)) linksBySlug.set(slug, []);
    linksBySlug.get(slug)!.push({
      retailer_key: row.retailer_key ?? "",
      affiliate_url: row.affiliate_url ?? "",
      browser_truth_classification: row.browser_truth_classification ?? null,
    });
  }

  for (const slug of slugs) {
    out.set(slug, ctaStatusFromRetailerRows(linksBySlug.get(slug) ?? []));
  }

  return out;
}

export async function generateFridgeNonAmazonReviewPackets(slugs: string[]): Promise<ReviewPacket[]> {
  const ctaStatusBySlug = await loadCurrentCtaStatusBySlug(slugs);
  const packets: ReviewPacket[] = [];

  for (const slug of slugs) {
    const evidence = DEFAULT_REFRIGERATOR_REVIEW_CANDIDATES[slug];
    if (!evidence) {
      packets.push({
        filter_slug: slug,
        family_gap_source: "money_scoreboard_v1:refrigerator_water:unknown",
        current_cta_status: ctaStatusBySlug.get(slug) ?? "unknown_slug",
        retailer: "UNKNOWN",
        pdp_url: "",
        exact_token_or_alias_proof: "No candidate packet evidence available for this slug.",
        buyability_evidence: "No candidate packet evidence available for this slug.",
        substitution_or_discontinued_warning_present: "unknown",
        part_label: "Unknown",
        risk_label: "high",
        decision: "UNKNOWN",
        recommended_next_action:
          "Run manual non-Amazon discovery and capture direct on-page token + buyability evidence.",
      });
      continue;
    }

    packets.push(
      buildReviewPacket({
        filter_slug: slug,
        current_cta_status: ctaStatusBySlug.get(slug) ?? "unknown_slug",
        evidence,
      }),
    );
  }

  return packets;
}

async function main() {
  loadEnv();
  const wedgeArg = argValue("--wedge") ?? "refrigerator_water";
  if (wedgeArg !== "refrigerator_water") {
    throw new Error(`Unsupported --wedge "${wedgeArg}". This generator is refrigerator_water-only.`);
  }

  const slugs = parseSlugArg();
  const packets = await generateFridgeNonAmazonReviewPackets(slugs);
  const output = {
    wedge: "refrigerator_water",
    read_only: true,
    non_amazon_only: true,
    auto_approve: false,
    packet_count: packets.length,
    packets,
  };
  console.log(JSON.stringify(output, null, 2));
}

if (process.argv[1]?.endsWith("generate-fridge-non-amazon-review-packets.ts")) {
  main().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[generate-fridge-non-amazon-review-packets] FAILED: ${message}`);
    process.exitCode = 1;
  });
}
