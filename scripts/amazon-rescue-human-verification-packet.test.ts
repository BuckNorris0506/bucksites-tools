import assert from "node:assert/strict";
import test from "node:test";

import {
  AMAZON_RESCUE_HUMAN_VERIFICATION_DEFAULT_TOKENS,
  buildAmazonRescueHumanVerificationPacketV1,
  DEFERRED_EXCLUDED_RESCUE_TOKEN,
  evidenceFilenamePrefixForSlug,
  normalizeTokenList,
} from "./lib/amazon-rescue-human-verification-packet-v1";

test("default tokens list is five and excludes 4396842", () => {
  assert.equal(AMAZON_RESCUE_HUMAN_VERIFICATION_DEFAULT_TOKENS.length, 5);
  assert.ok(
    !AMAZON_RESCUE_HUMAN_VERIFICATION_DEFAULT_TOKENS.some((t) => t === DEFERRED_EXCLUDED_RESCUE_TOKEN),
  );
});

test("normalizeTokenList drops deferred token and dedupes", () => {
  const { use, excluded } = normalizeTokenList([
    "ADQ75795101",
    "4396842",
    "adq75795101",
    "DA97-08006B",
  ]);
  assert.deepEqual(excluded, ["4396842"]);
  assert.deepEqual(use, ["ADQ75795101", "DA97-08006B"]);
});

test("evidenceFilenamePrefixForSlug lowercases slug", () => {
  assert.equal(evidenceFilenamePrefixForSlug("ADQ75795101"), "data/evidence/amazon-adq75795101-");
  assert.equal(evidenceFilenamePrefixForSlug(null), null);
  assert.equal(evidenceFilenamePrefixForSlug("   "), null);
});

test("buildAmazonRescueHumanVerificationPacketV1 shapes items", () => {
  const packet = buildAmazonRescueHumanVerificationPacketV1({
    generated_at: "2026-05-14T00:00:00.000Z",
    excluded_tokens: ["4396842"],
    rows: [
      {
        token: "ADQ75795101",
        canonical_slug: "adq75795101",
        filter_id: "bfb3cae6-594f-4c11-873d-9cc5eccd2913",
        resolution_via: "slug_lower",
        resolution_error: null,
      },
      {
        token: "X-UNRESOLVED",
        canonical_slug: null,
        filter_id: null,
        resolution_via: null,
        resolution_error: "not_found",
      },
    ],
  });
  assert.equal(packet.report_name, "buckparts_amazon_rescue_human_verification_packet_v1");
  assert.equal(packet.read_only, true);
  assert.equal(packet.data_mutation, false);
  assert.deepEqual(packet.excluded_tokens, ["4396842"]);
  assert.equal(packet.items.length, 2);
  const first = packet.items[0];
  assert.equal(first.expected_evidence_filename_prefix, "data/evidence/amazon-adq75795101-");
  assert.ok(first.exact_browser_checks.length >= 3);
  assert.ok(first.allowed_outcomes.includes("NOT_FOUND"));
  assert.ok(first.not_accepted_as_proof.some((s) => s.includes("top_candidate_tokens_head")));
  const second = packet.items[1];
  assert.equal(second.expected_evidence_filename_prefix, null);
  assert.ok(second.expected_evidence_glob_note.includes("Resolve"));
});
