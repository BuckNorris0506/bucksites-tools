import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOfferCandidatePayload,
  buildQueueRowDraft,
} from "./hqii-candidate-queue-upsert";

test("state transition: valid Amazon PDP + token evidence -> token_verified", () => {
  const row = buildQueueRowDraft({
    filter_slug: "pentek-cbc-10bb",
    retailer_name: "Amazon",
    url: "https://www.amazon.com/Pentek-CBC-BB-Carbon-Filter-Cartridge/dp/B00310NIU0",
    token_required: ["CBC-10BB"],
    token_evidence_ok: true,
    token_evidence_notes: "PDP body contains exact CBC-10BB token.",
  });

  assert.equal(row.candidate_state, "token_verified");
  assert.equal(row.validation_status, "pending");
  assert.equal(row.canonical_url, "https://www.amazon.com/dp/B00310NIU0");
  assert.equal(row.asin, "B00310NIU0");
});

test("state transition: valid Amazon PDP + missing token evidence -> rejected", () => {
  const row = buildQueueRowDraft({
    filter_slug: "pentek-cbc-10bb",
    retailer_name: "Amazon",
    url: "https://www.amazon.com/Pentek-CBC-BB-Carbon-Filter-Cartridge/dp/B00310NIU0",
    token_required: ["CBC-10BB"],
    token_evidence_ok: false,
    token_evidence_notes: "No defensible token in fetched body.",
  });

  assert.equal(row.candidate_state, "rejected");
  assert.equal(row.validation_status, "rejected");
  assert.equal(row.last_error, "token_evidence_missing");
});

test("search/category URL is not queued as verified", () => {
  const row = buildQueueRowDraft({
    filter_slug: "pentek-cbc-10bb",
    retailer_name: "Amazon",
    url: "https://www.amazon.com/s?k=CBC-10BB",
    token_required: ["CBC-10BB"],
    token_evidence_ok: true,
  });

  assert.equal(row.candidate_state, "rejected");
  assert.equal(row.validation_status, "rejected");
  assert.equal(row.last_error, "non_amazon_dp_url");
});

test("buildOfferCandidatePayload uses production queue column names", () => {
  const draft = buildQueueRowDraft({
    filter_slug: "pentek-cbc-10bb",
    retailer_name: "Amazon",
    url: "https://www.amazon.com/Pentek-CBC-BB-Carbon-Filter-Cartridge/dp/B00310NIU0",
    token_required: ["CBC-10BB"],
    token_evidence_ok: true,
  });

  const payload = buildOfferCandidatePayload(
    "whole_house_water_part_id",
    "11111111-1111-1111-1111-111111111111",
    draft,
  );

  assert.equal(payload.whole_house_water_part_id, "11111111-1111-1111-1111-111111111111");
  assert.equal(payload.offer_url, draft.offer_url);
  assert.equal(payload.source_kind, "hqii_discovery_enrichment_phase1");
  assert.equal(payload.validation_status, "pending");
  assert.ok(!("candidate_url" in payload));
  assert.ok(!("source" in payload));
  assert.ok(!("review_status" in payload));
  assert.ok(!("filter_id" in payload));
});
