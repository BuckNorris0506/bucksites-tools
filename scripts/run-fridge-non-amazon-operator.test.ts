import assert from "node:assert/strict";
import test from "node:test";

import { classifyOutcome, isPlausibleManualCaptureCandidate } from "./run-fridge-non-amazon-operator";
import type { CandidateUrl } from "./lib/fridge-non-amazon-candidate-generator";
import type { CollectedEvidence } from "./lib/fridge-non-amazon-evidence-collector";
import type { ReviewPacket } from "./lib/non-amazon-review-packets";

function mkCandidate(source: CandidateUrl["source"], url: string): CandidateUrl {
  return {
    retailer: "AppliancePartsPros",
    retailer_key: "appliancepartspros",
    url,
    source,
  };
}

function mkEvidence(overrides: Partial<CollectedEvidence> = {}): CollectedEvidence {
  return {
    retailer: "AppliancePartsPros",
    retailer_key: "appliancepartspros",
    pdp_url: "https://www.appliancepartspros.com/samsung-da97-19467c.html",
    exact_token_or_alias_proof: "Exact token DA97-19467C not proven.",
    has_exact_token_or_alias_proof: false,
    buyability_evidence: "Buyability not proven.",
    has_buyability_evidence: false,
    substitution_or_discontinued_warning_present: "unknown",
    part_label: "Unknown",
    family_gap_source: "money_scoreboard_v1:refrigerator_water:unknown",
    fetch_status: "fetch_failed",
    fetch_error: "HTTP 403",
    snippet_only_evidence: true,
    evidence_source: "fetched_page",
    captured_at: null,
    raw_excerpt: null,
    ...overrides,
  };
}

function mkPacket(overrides: Partial<ReviewPacket> = {}): ReviewPacket {
  return {
    filter_slug: "da97-19467c",
    family_gap_source: "money_scoreboard_v1:refrigerator_water:unknown",
    current_cta_status: "no_valid_cta",
    retailer: "AppliancePartsPros",
    pdp_url: "https://www.appliancepartspros.com/samsung-da97-19467c.html",
    exact_token_or_alias_proof: "Exact token DA97-19467C not proven.",
    buyability_evidence: "Buyability not proven.",
    substitution_or_discontinued_warning_present: "unknown",
    part_label: "Unknown",
    risk_label: "high",
    decision: "UNKNOWN",
    recommended_next_action: "Need direct page evidence.",
    ...overrides,
  };
}

test("403 on plausible real URL => MANUAL_CAPTURE_NEEDED", () => {
  const candidate = mkCandidate("seeded", "https://www.appliancepartspros.com/samsung-da97-19467c.html");
  const evidence = mkEvidence();
  const packet = mkPacket();
  const outcome = classifyOutcome({
    slug: "da97-19467c",
    candidate,
    packet,
    evidence,
  });
  assert.equal("capture_instructions" in outcome, true);
});

test("404 always maps to BLOCKED reason 404", () => {
  const candidate = mkCandidate(
    "unverified_url_guess",
    "https://www.appliancepartspros.com/samsung-da97-17376a.html",
  );
  const evidence = mkEvidence({ fetch_error: "HTTP 404" });
  const packet = mkPacket();
  const outcome = classifyOutcome({
    slug: "da97-17376a",
    candidate,
    packet,
    evidence,
  });
  assert.equal("reason" in outcome, true);
  assert.equal("reason" in outcome ? outcome.reason : "", "404");
});

test("PASS only when packet is PASS", () => {
  const candidate = mkCandidate("seeded", "https://www.appliancepartspros.com/samsung-assy-case-filter.html");
  const evidence = mkEvidence({
    fetch_status: "ok",
    fetch_error: null,
    has_exact_token_or_alias_proof: true,
    has_buyability_evidence: true,
    substitution_or_discontinued_warning_present: "no",
  });
  const packet = mkPacket({
    decision: "PASS",
    risk_label: "medium",
    exact_token_or_alias_proof: "Exact token DA97-08006B present.",
    buyability_evidence: "Add to cart",
    substitution_or_discontinued_warning_present: "no",
  });
  const outcome = classifyOutcome({
    slug: "da97-08006b",
    candidate,
    packet,
    evidence,
  });
  assert.equal("decision" in outcome ? outcome.decision : "UNKNOWN", "PASS");
});

test("da97-19467c unverified guess still considered plausible for manual capture", () => {
  const plausible = isPlausibleManualCaptureCandidate({
    slug: "da97-19467c",
    candidate: mkCandidate("unverified_url_guess", "https://www.appliancepartspros.com/samsung-da97-19467c.html"),
    evidence: mkEvidence(),
  });
  assert.equal(plausible, true);
});

test("manual capture with not-found text => BLOCKED 404/not_found", () => {
  const candidate = mkCandidate("unverified_url_guess", "https://www.appliancepartspros.com/samsung-da97-19467c.html");
  const evidence = mkEvidence({
    fetch_status: "ok",
    fetch_error: null,
    evidence_source: "manual_capture",
    raw_excerpt:
      "Page not found - AppliancePartsPros.com. The page requested was not found on this server.",
  });
  const packet = mkPacket();
  const outcome = classifyOutcome({
    slug: "da97-19467c",
    candidate,
    packet,
    evidence,
  });
  assert.equal("reason" in outcome, true);
  assert.equal("reason" in outcome ? outcome.reason : "", "404/not_found");
  assert.equal("capture_instructions" in outcome, false);
});
