/**
 * DEV_ONLY — INVALID_FOR_TRUTH_VALIDATION
 *
 * Builds a stub HyperAgent bundle from manifest + repo joins for local UI/tests only.
 * Output path is explicitly DEV_ONLY and must never be used for Cursor truth validation
 * or Command Center closure.
 *
 * Canonical truth-validation input:
 *   data/fridge/batch-production/drafts/fridge-safe-link-hyperagent-ingest-bundle-v1.json
 *   (full Mission Control export with UUID ingest_ids and complete packet bodies)
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { INVALID_HYPERAGENT_PACKET_BODY_SOURCES_V1 } from "./lib/buckparts-ops-agent-workflow-v1";

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  "data/fridge/batch-production/drafts/DEV_ONLY-fridge-safe-link-hyperagent-ingest-bundle-stub-v1.json",
);

// Manifest skeleton for dev stub only (not authoritative Mission Control export)
const manifest = {
  contract: "buckparts_hyperagent_batch_manifest_v1",
  manifest_id: "dev-stub-manifest",
  task_id: "0d6c0f26-25cc-4a4e-95ab-d5e78d148664",
  created_at: new Date().toISOString(),
  mission_type: "SAFE_LINK_BATCH",
  cohort_key: "refrigerator_water_missing_safe_link",
  one_product_exception: null,
  total_slugs: 26,
  discovery_status: "DISCOVERY_COMPLETE",
  truth_closure_claimed: false,
  proposed_state_summary: {},
  state_changes_from_batch_factory: 0,
  state_changed_slugs: [] as string[],
  hard_stops: [] as string[],
  read_only: true,
  data_mutation: false,
  not_authorized: ["retailer_links_csv_mutation", "verified_link_authorization"],
  slug_index: [] as Array<{ slug: string; proposed_state: string; state_changed: boolean }>,
};

const batchFactory = JSON.parse(
  readFileSync(
    path.join(ROOT, "data/fridge/batch-production/drafts/fridge-safe-link-batch-factory-v1.json"),
    "utf8",
  ),
);

const discovery = JSON.parse(
  readFileSync(
    path.join(
      ROOT,
      "data/fridge/batch-production/drafts/fridge-safe-link-hyperagent-discovery-ingest-v1.json",
    ),
    "utf8",
  ),
);

const bfBySlug = new Map(
  batchFactory.rows.map((r: { slug: string; batch_factory_state: string; oem_part_token: string; brand_slug: string }) => [
    r.slug,
    r,
  ]),
);
const discBySlug = new Map(
  discovery.rows.map((r: { slug: string; candidate_url: string | null }) => [r.slug, r]),
);

const slugs = [...new Set(batchFactory.rows.map((r: { slug: string }) => r.slug))] as string[];

const packets = slugs.map((slug, i) => {
  const bf = bfBySlug.get(slug);
  const disc = discBySlug.get(slug);
  return {
    contract: "buckparts_hyperagent_ingest_packet_v1",
    ingest_id: `materialized-${slug}-${i}`,
    task_id: manifest.task_id,
    slug,
    oem_part_token: bf?.oem_part_token ?? slug,
    brand: bf?.brand_slug ?? "unknown",
    created_at: manifest.created_at,
    discovery_status: "DISCOVERY_COMPLETE",
    truth_closure_claimed: false,
    batch_factory_state_at_discovery: bf?.batch_factory_state ?? "UNKNOWN",
    proposed_state: bf?.batch_factory_state ?? "UNKNOWN",
    state_changed_from_batch_factory: false,
    candidate_url: disc?.candidate_url ?? null,
    specialist_outputs: [
      { specialist: "Discovery", summary: `Discovery for ${slug}` },
      { specialist: "TruthRisk", summary: `TruthRisk for ${slug}` },
    ],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    read_only: true,
    data_mutation: false,
    packet_body_source: INVALID_HYPERAGENT_PACKET_BODY_SOURCES_V1[1],
    materialized_from_manifest: true,
    dev_only: true,
  };
});

manifest.slug_index = packets.map((p) => ({
  slug: p.slug,
  proposed_state: p.proposed_state,
  state_changed: false,
}));

const bundle = {
  contract: "buckparts_hyperagent_batch_bundle_v1",
  manifest,
  packets,
  packet_count: packets.length,
  dev_only: true,
  invalid_for_truth_validation: true,
};

writeFileSync(OUT, `${JSON.stringify(bundle, null, 2)}\n`);
console.warn(
  `DEV_ONLY stub written to ${OUT} — INVALID_FOR_TRUTH_VALIDATION; do not use for Cursor validation or CC closure.`,
);
