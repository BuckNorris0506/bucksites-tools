import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildEdr4rxd1OwnerReviewPacketV1,
  EDR4RXD1_OWNER_REVIEW_PACKET_CONTRACT_V1,
  EDR4RXD1_OWNER_REVIEW_PACKET_JSON_REL_V1,
  EDR4RXD1_OWNER_REVIEW_PACKET_MD_REL_V1,
  writeEdr4rxd1OwnerReviewPacketArtifactsV1,
} from "./edr4rxd1-owner-review-packet-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/edr4rxd1-owner-review-packet-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-06-08T12:00:00.000Z");

const COMPAT_REVIEW_SLUGS = [
  "whirlpool-wrf535smhb",
  "whirlpool-wrf736sdam",
  "whirlpool-wrf757sdfz",
  "whirlpool-wrf757sihz",
  "whirlpool-wrf767sdam",
  "whirlpool-wrs315sdhv",
];

test("contract and read-only flags", () => {
  const packet = buildEdr4rxd1OwnerReviewPacketV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(packet.contract, EDR4RXD1_OWNER_REVIEW_PACKET_CONTRACT_V1);
  assert.equal(packet.read_only, true);
  assert.equal(packet.data_mutation, false);
  assert.equal(packet.mutation_authorized, false);
  assert.equal(packet.validation_status, "VALIDATION_PARTIAL");
  assert.equal(packet.family_key, "filter::whirlpool::edr4rxd1");
  assert.equal(packet.family_reconciliation_severity, "MEDIUM");
  assert.equal(packet.owner_review_required, true);
});

test("classifies wrf540cwhz as sole evidence promotion candidate", () => {
  const packet = buildEdr4rxd1OwnerReviewPacketV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(packet.evidence_promotion_candidates.length, 1);
  assert.equal(packet.evidence_promotion_candidates[0]!.fridge_slug, "whirlpool-wrf540cwhz");
  assert.equal(packet.evidence_promotion_candidates[0]!.repo_classification, "PROVEN_CORRECT");
  assert.equal(
    packet.evidence_promotion_candidates[0]!.repo_manual_evidence_path,
    "data/manual-evidence/refrigerator/whirlpool-wrf540cwhz.json",
  );
});

test("classifies wrf535sdhz and wrf540cwhm as browser proof targets", () => {
  const packet = buildEdr4rxd1OwnerReviewPacketV1({ rootDir: ROOT, now: FIXED_NOW });
  const browserSlugs = packet.browser_proof_targets.map((row) => row.fridge_slug);
  assert.deepEqual(browserSlugs, ["whirlpool-wrf535sdhz", "whirlpool-wrf540cwhm"]);
  assert.ok(!browserSlugs.includes("whirlpool-wrf535sibz"));
});

test("classifies six wrong-part candidates as compat review candidates", () => {
  const packet = buildEdr4rxd1OwnerReviewPacketV1({ rootDir: ROOT, now: FIXED_NOW });
  const compatSlugs = packet.compat_review_candidates.map((row) => row.fridge_slug).sort();
  assert.deepEqual(compatSlugs, [...COMPAT_REVIEW_SLUGS].sort());
  assert.equal(packet.compat_review_candidates.length, 6);
});

test("sets safe_for_scaling=false and safe_for_bounded_research=true", () => {
  const packet = buildEdr4rxd1OwnerReviewPacketV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(packet.safe_for_scaling, false);
  assert.equal(packet.safe_for_bounded_research, true);
  assert.equal(packet.command_center_action_scope, "BOUNDED_RESEARCH_ONLY");
});

test("no_action_rows capture rejected HyperAgent closure claims", () => {
  const packet = buildEdr4rxd1OwnerReviewPacketV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(packet.no_action_rows.length, 8);
  assert.ok(
    packet.no_action_rows.some(
      (row) =>
        row.fridge_slug === "whirlpool-wrf535sdhz" &&
        row.rejection_kind === "HYPERAGENT_PROVEN_REJECTED",
    ),
  );
  assert.ok(
    packet.no_action_rows.some(
      (row) =>
        row.fridge_slug === "whirlpool-wrf736sdam" &&
        row.rejection_kind === "HYPERAGENT_WRONG_PART_UNKNOWN_SUPPORT",
    ),
  );
});

test("read-only guard blocks forbidden writes in build path", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "src/app/fridge/',
    'writeFileSync(path.join(args.rootDir, "public/robots',
    'writeFileSync(path.join(args.rootDir, "public/sitemap',
    "docs/BuckParts-HQ-HANDOFF",
  ];

  const buildSection = LIB_SOURCE.split("export function buildEdr4rxd1OwnerReviewPacketV1")[0]!;
  for (const needle of forbiddenWrites) {
    assert.equal(
      buildSection.includes(needle),
      false,
      `build path must not write ${needle}`,
    );
  }

  assert.ok(LIB_SOURCE.includes("readFileSync"));
  assert.ok(LIB_SOURCE.includes(EDR4RXD1_OWNER_REVIEW_PACKET_JSON_REL_V1));
  assert.ok(LIB_SOURCE.includes(EDR4RXD1_OWNER_REVIEW_PACKET_MD_REL_V1));
});

test("write-artifacts writes only allowed packet paths", () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "edr4rxd1-owner-review-"));
  try {
    const packet = buildEdr4rxd1OwnerReviewPacketV1({ rootDir: ROOT, now: FIXED_NOW });
    const written = writeEdr4rxd1OwnerReviewPacketArtifactsV1({ rootDir: tempRoot, packet });
    assert.equal(written.json_rel_path, EDR4RXD1_OWNER_REVIEW_PACKET_JSON_REL_V1);
    assert.equal(written.md_rel_path, EDR4RXD1_OWNER_REVIEW_PACKET_MD_REL_V1);

    const json = JSON.parse(
      readFileSync(path.join(tempRoot, written.json_rel_path), "utf8"),
    ) as { mutation_authorized: boolean; safe_for_scaling: boolean };
    assert.equal(json.mutation_authorized, false);
    assert.equal(json.safe_for_scaling, false);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
