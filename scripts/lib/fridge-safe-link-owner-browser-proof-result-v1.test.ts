import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import {
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_ARTIFACT_RELS_V1,
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_EDR4RXD1_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_EPTWFU01_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_ULTRAWF_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_WFCB_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_WF3CB_REL_V1,
  loadOwnerBrowserProofResultArtifactsV1,
  loadOwnerBrowserProofResultEdr4rxd1V1,
  loadOwnerBrowserProofResultEptwfu01V1,
  loadOwnerBrowserProofResultUltrawfV1,
  loadOwnerBrowserProofResultWfcbV1,
  loadOwnerBrowserProofResultWf3cbV1,
  proveEdr4rxd1OwnerBrowserProofPassV1,
  proveEptwfu01OwnerBrowserProofPassV1,
  proveUltrawfOwnerBrowserProofPassV1,
  proveWfcbOwnerBrowserProofPassV1,
  proveWf3cbOwnerBrowserProofPassV1,
  validateOwnerBrowserProofResultV1,
} from "./fridge-safe-link-owner-browser-proof-result-v1";

const LIB_SOURCE = readFileSync(
  path.join(process.cwd(), "scripts/lib/fridge-safe-link-owner-browser-proof-result-v1.ts"),
  "utf8",
);

describe("fridge-safe-link-owner-browser-proof-result-v1", () => {
  test("wf3cb draft result loads and validates as read-only PASS_BROWSER_PROOF", () => {
    const result = loadOwnerBrowserProofResultWf3cbV1(process.cwd());
    const validation = validateOwnerBrowserProofResultV1(result);
    assert.equal(validation.valid, true, validation.errors.join("; "));
    assert.equal(result.slug, "wf3cb");
    assert.equal(result.verdict, "PASS_BROWSER_PROOF");
    assert.equal(result.oem_part_token, "WF3CB");

    const summary = proveWf3cbOwnerBrowserProofPassV1(result);
    assert.equal(summary.pass_verdict, true);
    assert.equal(summary.proof_url_count, 3);
    assert.equal(summary.amazon_unverified, true);

    assert.ok(
      result.owner_proof_urls.every((u) => !u.url.includes("B087PDLZL9")),
      "wf3cb proof must not include edr3 DO_NOT_USE ASIN",
    );
    assert.ok(
      result.owner_proof_urls.some((u) => u.url.includes("frigidaire.com")),
      "official manufacturer URL required",
    );
  });

  test("wf3cb result uses PROVEN labels for owner-observed browser proof", () => {
    const result = loadOwnerBrowserProofResultWf3cbV1(process.cwd());
    for (const row of result.owner_proof_urls) {
      assert.ok(row.proven_observations && row.proven_observations.length > 0, row.url);
      assert.ok(row.proven_observations.every((o) => o.startsWith("PROVEN:")), row.url);
    }
    assert.ok((result.unknown_facts ?? []).some((f) => f.includes("Amazon")));
    assert.ok((result.unknown_facts ?? []).some((f) => f.includes("screenshot")));
  });

  test("lib does not authorize mutation or /go", () => {
    assert.ok(!LIB_SOURCE.includes("buckparts.com/go"));
    assert.ok(!LIB_SOURCE.includes("/go/"));
    assert.ok(!LIB_SOURCE.includes('writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")'));
    assert.ok(!LIB_SOURCE.includes('writeFileSync(path.join(args.rootDir, "data/evidence/'));
  });

  test("artifact path matches expected draft location", () => {
    assert.equal(
      FRIDGE_OWNER_BROWSER_PROOF_RESULT_WF3CB_REL_V1,
      "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-wf3cb-v1.json",
    );
    assert.equal(
      FRIDGE_OWNER_BROWSER_PROOF_RESULT_EPTWFU01_REL_V1,
      "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-eptwfu01-v1.json",
    );
    assert.equal(
      FRIDGE_OWNER_BROWSER_PROOF_RESULT_EDR4RXD1_REL_V1,
      "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-edr4rxd1-v1.json",
    );
    assert.equal(
      FRIDGE_OWNER_BROWSER_PROOF_RESULT_WFCB_REL_V1,
      "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-wfcb-v1.json",
    );
    assert.equal(
      FRIDGE_OWNER_BROWSER_PROOF_RESULT_ULTRAWF_REL_V1,
      "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-ultrawf-v1.json",
    );
  });

  test("eptwfu01 draft result loads and validates as read-only PASS_BROWSER_PROOF", () => {
    const result = loadOwnerBrowserProofResultEptwfu01V1(process.cwd());
    const validation = validateOwnerBrowserProofResultV1(result);
    assert.equal(validation.valid, true, validation.errors.join("; "));
    assert.equal(result.slug, "eptwfu01");
    assert.equal(result.verdict, "PASS_BROWSER_PROOF");
    assert.equal(result.oem_part_token, "EPTWFU01");
    assert.equal(result.verified_link_authorized, false);

    const summary = proveEptwfu01OwnerBrowserProofPassV1(result);
    assert.equal(summary.pass_verdict, true);
    assert.equal(summary.proof_url_count, 3);
    assert.equal(summary.amazon_hold_single_filter, true);

    assert.ok(
      result.owner_proof_urls.every((u) => !u.url.includes("B087PDLZL9")),
      "must not include edr3 DO_NOT_USE ASIN",
    );
    assert.ok(
      result.owner_proof_urls.some((u) => u.url.includes("frigidaire.com")),
      "official manufacturer URL required",
    );
    assert.ok(result.not_authorized?.includes("VALIDATION_PASS"));
  });

  test("eptwfu01 result uses PROVEN labels for owner-observed browser proof", () => {
    const result = loadOwnerBrowserProofResultEptwfu01V1(process.cwd());
    for (const row of result.owner_proof_urls) {
      assert.ok(row.proven_observations && row.proven_observations.length > 0, row.url);
      assert.ok(row.proven_observations.every((o) => o.startsWith("PROVEN:")), row.url);
    }
    assert.ok((result.unverified_candidates ?? []).some((c) => c.url?.includes("B0CXKH95V1")));
    assert.ok((result.unknown_facts ?? []).some((f) => f.includes("single-pack")));
  });

  test("edr4rxd1 draft result loads and validates as read-only PASS_BROWSER_PROOF", () => {
    const result = loadOwnerBrowserProofResultEdr4rxd1V1(process.cwd());
    const validation = validateOwnerBrowserProofResultV1(result);
    assert.equal(validation.valid, true, validation.errors.join("; "));
    assert.equal(result.slug, "edr4rxd1");
    assert.equal(result.verdict, "PASS_BROWSER_PROOF");
    assert.equal(result.oem_part_token, "EDR4RXD1");
    assert.equal(result.verified_link_authorized, false);

    const summary = proveEdr4rxd1OwnerBrowserProofPassV1(result);
    assert.equal(summary.pass_verdict, true);
    assert.equal(summary.proof_url_count, 4);
    assert.equal(summary.amazon_pass_single_pack, true);

    assert.ok(
      result.owner_proof_urls.every((u) => !u.url.includes("B087PDLZL9")),
      "must not include edr3 DO_NOT_USE ASIN",
    );
    assert.ok(
      result.owner_proof_urls.some((u) => u.url.includes("whirlpool.com")),
      "official manufacturer URL required",
    );
    assert.ok(result.not_authorized?.includes("VALIDATION_PASS"));
  });

  test("edr4rxd1 result uses PROVEN labels for owner-observed browser proof", () => {
    const result = loadOwnerBrowserProofResultEdr4rxd1V1(process.cwd());
    for (const row of result.owner_proof_urls) {
      assert.ok(row.proven_observations && row.proven_observations.length > 0, row.url);
      assert.ok(row.proven_observations.every((o) => o.startsWith("PROVEN:")), row.url);
    }
    const amazon = result.owner_proof_urls.find((u) => u.url.includes("B00UB38V2A"));
    assert.ok(amazon?.inferred_observations?.some((o) => o.includes("Waterdrop")));
    assert.ok((result.unknown_facts ?? []).some((f) => f.includes("screenshot")));
  });

  test("wfcb draft result loads and validates as read-only PASS_BROWSER_PROOF", () => {
    const result = loadOwnerBrowserProofResultWfcbV1(process.cwd());
    const validation = validateOwnerBrowserProofResultV1(result);
    assert.equal(validation.valid, true, validation.errors.join("; "));
    assert.equal(result.slug, "wfcb");
    assert.equal(result.verdict, "PASS_BROWSER_PROOF");
    assert.equal(result.oem_part_token, "WFCB");
    assert.equal(result.verified_link_authorized, false);
    assert.equal(result.apply_planning_authorized, false);

    const summary = proveWfcbOwnerBrowserProofPassV1(result);
    assert.equal(summary.pass_verdict, true);
    assert.equal(summary.pass_proof_url_count, 2);
    assert.equal(summary.hold_out_of_stock_count, 1);
    assert.equal(summary.amazon_pass_candidate_count, 1);
    assert.equal(summary.swift_green_excluded, true);

    assert.ok(result.not_authorized?.includes("VALIDATION_PASS"));
    assert.ok(result.not_authorized?.includes("amazon_affiliate_tag_mutation"));
    assert.ok(
      result.owner_proof_urls.some((u) => u.url.includes("warnersstellian.com")),
    );
    assert.ok(
      result.owner_proof_urls.some((u) => u.url.includes("frigidaire.com")),
    );
    const hdHold = result.hold_candidates?.[0];
    assert.equal(hdHold?.browser_proof_status, "PASS_IDENTITY_BUT_HOLD_OUT_OF_STOCK");
    assert.ok((hdHold?.proven_observations ?? []).some((o) => o.includes("Out of Stock")));
  });

  test("wfcb result uses PROVEN labels and excludes Swift Green Amazon listing", () => {
    const result = loadOwnerBrowserProofResultWfcbV1(process.cwd());
    for (const row of result.owner_proof_urls) {
      assert.ok(row.proven_observations && row.proven_observations.length > 0, row.url);
      assert.ok(row.proven_observations.every((o) => o.startsWith("PROVEN:")), row.url);
    }
    const amazonPass = result.amazon_pass_candidates?.[0];
    assert.equal(amazonPass?.browser_proof_status, "PASS_BROWSER_PROOF_AMAZON_CANDIDATE");
    assert.ok((amazonPass?.proven_observations ?? []).some((o) => o.includes("Amazon.com")));
    const swiftGreen = result.failed_candidates?.[0];
    assert.equal(swiftGreen?.action, "DO_NOT_USE");
    assert.ok((swiftGreen?.proven_observations ?? []).some((o) => o.includes("Swift Green")));
    assert.ok((result.recommended_next_action ?? "").includes("affiliate tag"));
  });

  test("ultrawf draft result loads and validates as read-only PASS_BROWSER_PROOF", () => {
    const result = loadOwnerBrowserProofResultUltrawfV1(process.cwd());
    const validation = validateOwnerBrowserProofResultV1(result);
    assert.equal(validation.valid, true, validation.errors.join("; "));
    assert.equal(result.slug, "ultrawf");
    assert.equal(result.verdict, "PASS_BROWSER_PROOF");
    assert.equal(result.oem_part_token, "ULTRAWF");
    assert.equal(result.verified_link_authorized, false);

    const summary = proveUltrawfOwnerBrowserProofPassV1(result);
    assert.equal(summary.pass_verdict, true);
    assert.equal(summary.proof_url_count, 3);
    assert.equal(summary.amazon_pass_candidate_asin, true);

    assert.ok(result.not_authorized?.includes("VALIDATION_PASS"));
    assert.ok(result.not_authorized?.includes("amazon_affiliate_tag_mutation"));
    assert.ok(
      result.owner_proof_urls.some((u) => u.url.includes("frigidaireapplianceparts.com")),
    );
    assert.ok(
      result.owner_proof_urls.some((u) => u.url.includes("frigidaire.com")),
    );
    const amazon = result.amazon_pass_candidates?.[0];
    assert.equal(amazon?.browser_proof_status, "PASS_BROWSER_PROOF_AMAZON_CANDIDATE");
    assert.ok((amazon?.url ?? "").includes("B002JAKRAM"));
  });

  test("ultrawf result uses PROVEN labels for owner-observed browser proof", () => {
    const result = loadOwnerBrowserProofResultUltrawfV1(process.cwd());
    for (const row of result.owner_proof_urls) {
      assert.ok(row.proven_observations && row.proven_observations.length > 0, row.url);
      assert.ok(row.proven_observations.every((o) => o.startsWith("PROVEN:")), row.url);
    }
    const amazon = result.amazon_pass_candidates?.[0];
    assert.ok((amazon?.proven_observations ?? []).every((o) => o.startsWith("PROVEN:")));
    assert.ok((amazon?.unknown_observations ?? []).some((o) => o.includes("Affiliate tag")));
    assert.ok((result.recommended_next_action ?? "").includes("affiliate"));
  });

  test("all draft result artifacts validate independently", () => {
    const artifacts = loadOwnerBrowserProofResultArtifactsV1(process.cwd());
    assert.equal(artifacts.length, FRIDGE_OWNER_BROWSER_PROOF_RESULT_ARTIFACT_RELS_V1.length);
    const slugs = new Set(artifacts.map((a) => a.slug));
    assert.equal(slugs.size, artifacts.length, "slug collision across result artifacts");
    for (const result of artifacts) {
      const validation = validateOwnerBrowserProofResultV1(result);
      assert.equal(validation.valid, true, `${result.slug}: ${validation.errors.join("; ")}`);
    }
  });
});
