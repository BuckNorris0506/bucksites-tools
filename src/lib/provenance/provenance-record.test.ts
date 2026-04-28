import test from "node:test";
import assert from "node:assert/strict";
import {
  PROVENANCE_ACTORS,
  PROVENANCE_CLAIM_TYPES,
  PROVENANCE_CONFIDENCE_LEVELS,
  PROVENANCE_SOURCE_TYPES,
  isValidProvenanceRecord,
  type ProvenanceRecord,
} from "./provenance-record";

function validRecord(): ProvenanceRecord {
  return {
    claimId: "claim-123",
    claimType: PROVENANCE_CLAIM_TYPES.fit_compatibility,
    claimSubject: "/filter/lt1000p",
    claimValue: "mapped_compatible_models_present",
    sourceType: PROVENANCE_SOURCE_TYPES.repo_mapping,
    sourceUrl: "https://buckparts.com/filter/lt1000p",
    capturedAt: "2026-04-28T13:00:00.000Z",
    confidence: PROVENANCE_CONFIDENCE_LEVELS.exact,
    actor: PROVENANCE_ACTORS.system,
    actorId: "pipeline-v1",
    evidenceExcerpt: "3 mapped compatible models in repository mappings.",
    evidenceRef: {
      table: "compatibility_mappings",
      count: 3,
      isRecommended: true,
      note: null,
    },
  };
}

test("valid record passes", () => {
  assert.equal(isValidProvenanceRecord(validRecord()), true);
});

test("bad claimType fails", () => {
  const record = { ...validRecord(), claimType: "bad_claim_type" };
  assert.equal(isValidProvenanceRecord(record), false);
});

test("bad sourceType fails", () => {
  const record = { ...validRecord(), sourceType: "bad_source_type" };
  assert.equal(isValidProvenanceRecord(record), false);
});

test("bad confidence fails", () => {
  const record = { ...validRecord(), confidence: "super_confident" };
  assert.equal(isValidProvenanceRecord(record), false);
});

test("bad actor fails", () => {
  const record = { ...validRecord(), actor: "automation" };
  assert.equal(isValidProvenanceRecord(record), false);
});

test("empty required string fails", () => {
  const record = { ...validRecord(), claimSubject: "   " };
  assert.equal(isValidProvenanceRecord(record), false);
});

test("invalid capturedAt fails", () => {
  const record = { ...validRecord(), capturedAt: "not-a-date" };
  assert.equal(isValidProvenanceRecord(record), false);
});

test("null evidenceRef fails", () => {
  const record = { ...validRecord(), evidenceRef: null };
  assert.equal(isValidProvenanceRecord(record), false);
});

test("sourceUrl null is allowed", () => {
  const record = { ...validRecord(), sourceUrl: null };
  assert.equal(isValidProvenanceRecord(record), true);
});

test("actorId null is allowed", () => {
  const record = { ...validRecord(), actorId: null };
  assert.equal(isValidProvenanceRecord(record), true);
});
