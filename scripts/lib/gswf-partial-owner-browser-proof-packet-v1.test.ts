import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildGswfPartialOwnerBrowserProofPacketV1,
  GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_CONTRACT_V1,
  GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_JSON_REL_V1,
  GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_MD_REL_V1,
  GSWF_PARTIAL_OWNER_BROWSER_PROOF_TARGET_SLUGS_V1,
  writeGswfPartialOwnerBrowserProofPacketArtifactsV1,
} from "./gswf-partial-owner-browser-proof-packet-v1";
import { GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1 } from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/gswf-partial-owner-browser-proof-packet-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-10T18:00:00.000Z");

test("contract and read-only flags", () => {
  const packet = buildGswfPartialOwnerBrowserProofPacketV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(packet.contract, GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_CONTRACT_V1);
  assert.equal(packet.read_only, true);
  assert.equal(packet.data_mutation, false);
  assert.equal(packet.mutation_authorized, false);
  assert.equal(packet.csv_apply_authorized, false);
  assert.equal(packet.buy_cta_authorized, false);
  assert.equal(packet.apply_plan_authorized, false);
  assert.equal(packet.include_in_gswf_wrong_part_apply_plan, false);
  assert.equal(packet.owner_review_required, true);
});

test("covers exactly the 3 PARTIAL slugs and none of the 13 apply-plan rows", () => {
  const packet = buildGswfPartialOwnerBrowserProofPacketV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(packet.slug_rows.length, 3);
  assert.deepEqual(
    packet.slug_rows.map((row) => row.fridge_slug).sort(),
    [...GSWF_PARTIAL_OWNER_BROWSER_PROOF_TARGET_SLUGS_V1].sort(),
  );

  const planned = new Set(GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1);
  for (const row of packet.slug_rows) {
    assert.equal(planned.has(row.fridge_slug as (typeof GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1)[number]), false);
    assert.equal(row.include_in_apply_plan, false);
    assert.equal(row.buy_cta_authorized, false);
    assert.equal(row.mutation_authorized, false);
    assert.equal(row.csv_apply_authorized, false);
  }
});

test("all three require browser proof; hypothesized remaps are INFERRED only", () => {
  const packet = buildGswfPartialOwnerBrowserProofPacketV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(packet.summary_counts.browser_proof_required, 3);
  assert.equal(packet.summary_counts.exact_model_tier1_proven, 0);
  assert.equal(packet.summary_counts.unknown, 0);

  const bySlug = Object.fromEntries(packet.slug_rows.map((row) => [row.fridge_slug, row]));
  assert.equal(bySlug["ge-gfe28hmkww"]!.proof_status, "BROWSER_PROOF_REQUIRED");
  assert.equal(bySlug["ge-gfe28hmkww"]!.hypothesized_remap_target_filter_slug, "rpwfe");
  assert.equal(bySlug["ge-gfe28hmkww"]!.hypothesized_remap_confidence, "INFERRED");
  assert.equal(bySlug["ge-gfe28hmkww"]!.exact_model_tier1_proven, false);

  assert.equal(bySlug["ge-gsc25frshss"]!.proof_status, "BROWSER_PROOF_REQUIRED");
  assert.equal(bySlug["ge-gsc25frshss"]!.hypothesized_remap_target_filter_slug, "mwf");
  assert.equal(bySlug["ge-gsc25frshss"]!.hypothesized_remap_confidence, "INFERRED");

  assert.equal(bySlug["ge-gse26gshess"]!.proof_status, "BROWSER_PROOF_REQUIRED");
  assert.equal(bySlug["ge-gse26gshess"]!.hypothesized_remap_target_filter_slug, "mwf");
  assert.equal(bySlug["ge-gse26gshess"]!.hypothesized_remap_confidence, "INFERRED");

  for (const row of packet.slug_rows) {
    assert.equal(row.existing_repo_evidence.manual_evidence_exists, false);
    assert.ok(row.missing_proof.length >= 3);
  }
});

test("build path does not mutate compatibility_mappings.csv or write product data", () => {
  const csvPath = path.join(ROOT, "data/compatibility_mappings.csv");
  const before = readFileSync(csvPath, "utf8");
  buildGswfPartialOwnerBrowserProofPacketV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(readFileSync(csvPath, "utf8"), before);

  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    "supabase/",
    "docs/BuckParts-HQ-HANDOFF",
  ];
  for (const needle of forbiddenWrites) {
    assert.ok(!LIB_SOURCE.includes(needle), `must not write ${needle}`);
  }
});

test("write artifacts to draft paths", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gswf-partial-browser-proof-"));
  try {
    const packet = buildGswfPartialOwnerBrowserProofPacketV1({ rootDir: ROOT, now: FIXED_NOW });
    const written = writeGswfPartialOwnerBrowserProofPacketArtifactsV1({
      rootDir: tmp,
      packet,
    });
    assert.equal(written.json_rel_path, GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_JSON_REL_V1);
    assert.equal(written.md_rel_path, GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_MD_REL_V1);
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
    const json = JSON.parse(readFileSync(path.join(tmp, written.json_rel_path), "utf8")) as {
      buy_cta_authorized: boolean;
      include_in_gswf_wrong_part_apply_plan: boolean;
    };
    assert.equal(json.buy_cta_authorized, false);
    assert.equal(json.include_in_gswf_wrong_part_apply_plan, false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
