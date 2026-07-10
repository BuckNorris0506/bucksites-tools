import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildGswfFamilyReconciliationOwnerReviewV1,
  GSWF_FAMILY_KEY_V1,
  GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_CONTRACT_V1,
  GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_JSON_REL_V1,
  GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_MD_REL_V1,
  writeGswfFamilyReconciliationOwnerReviewArtifactsV1,
} from "./gswf-family-reconciliation-owner-review-v1";

const ROOT = process.cwd();
const FIXED_NOW = () => new Date("2026-06-09T12:00:00.000Z");

const PARTIAL_SLUGS = ["ge-gfe28hmkww", "ge-gsc25frshss", "ge-gse26gshess"];
const NO_FILTER_SLUGS = ["ge-gte18gsnrss"];

test("contract and read-only flags", () => {
  const packet = buildGswfFamilyReconciliationOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(packet.contract, GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_CONTRACT_V1);
  assert.equal(packet.read_only, true);
  assert.equal(packet.data_mutation, false);
  assert.equal(packet.mutation_authorized, false);
  assert.equal(packet.buy_cta_authorized, false);
  assert.equal(packet.apply_plan_authorized, false);
  assert.equal(packet.family_key, GSWF_FAMILY_KEY_V1);
  assert.equal(packet.validation_status, "VALIDATION_PARTIAL");
  assert.equal(packet.baseline_family_reconciliation_severity, "MEDIUM");
  assert.equal(packet.recommended_family_reconciliation_severity, "CRITICAL");
  assert.equal(packet.owner_review_required, true);
});

test("summary counts match cursor validation packet", () => {
  const packet = buildGswfFamilyReconciliationOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(packet.summary_counts.proven_wrong_part_repair, 13);
  assert.equal(packet.summary_counts.partial_browser_proof_required, 3);
  assert.equal(packet.summary_counts.no_filter_suppression, 1);
  assert.equal(packet.summary_counts.total_mission_rows, 17);
});

test("classifies partial and no-filter rows", () => {
  const packet = buildGswfFamilyReconciliationOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  const partialSlugs = packet.browser_proof_required_rows.map((r) => r.fridge_slug).sort();
  const noFilterSlugs = packet.no_filter_suppression_rows.map((r) => r.fridge_slug);
  assert.deepEqual(partialSlugs, [...PARTIAL_SLUGS].sort());
  assert.deepEqual(noFilterSlugs, NO_FILTER_SLUGS);
  for (const row of packet.no_filter_suppression_rows) {
    assert.equal(row.proposed_compat_action, "suppress_all_filter_mappings");
    assert.equal(row.proposed_remap_target_filter_slug, null);
  }
});

test("filter-page buyer-path proof is separated from compat contamination", () => {
  const packet = buildGswfFamilyReconciliationOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(packet.filter_page_buyer_path_proof.exact_token_gswf_proven, true);
  assert.equal(packet.filter_page_buyer_path_proof.direct_buyability_proven, true);
  assert.equal(packet.filter_page_buyer_path_proof.buy_cta_authorized, false);
  assert.equal(packet.filter_page_buyer_path_proof.live_go_cta_authorized, false);
  assert.equal(packet.filter_page_buyer_path_proof.committed_retailer_links_safe_gated_count, 0);
  assert.match(
    packet.filter_page_buyer_path_proof.target_url,
    /geapplianceparts\.com\/store\/parts\/spec\/GSWF/i,
  );
});

test("unknown_facts are deduplicated with precise canonical wording", () => {
  const packet = buildGswfFamilyReconciliationOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.deepEqual(packet.unknown_facts, [
    "UNKNOWN: Whether owner will mark GSWF family discontinued before rebuild.",
    "UNKNOWN: Live Supabase compat state vs committed CSV for the 17 mission slugs.",
  ]);
  assert.equal(new Set(packet.unknown_facts).size, packet.unknown_facts.length);
});

test("write artifacts to draft paths without mutation flags", () => {
  const tmpRoot = mkdtempSync(path.join(tmpdir(), "gswf-owner-review-"));
  try {
    const packet = buildGswfFamilyReconciliationOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
    const written = writeGswfFamilyReconciliationOwnerReviewArtifactsV1({
      rootDir: tmpRoot,
      packet,
    });
    assert.equal(
      written.json_rel_path,
      GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_JSON_REL_V1,
    );
    assert.equal(written.md_rel_path, GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_MD_REL_V1);
    const json = JSON.parse(
      readFileSync(path.join(tmpRoot, written.json_rel_path), "utf8"),
    ) as { mutation_authorized: boolean; buy_cta_authorized: boolean };
    assert.equal(json.mutation_authorized, false);
    assert.equal(json.buy_cta_authorized, false);
    const md = readFileSync(path.join(tmpRoot, written.md_rel_path), "utf8");
    assert.match(md, /buy_cta_authorized: \*\*false\*\*/);
    assert.match(md, /recommended_family_reconciliation_severity: \*\*CRITICAL\*\*/);
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});
