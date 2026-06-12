import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  AP_HYPERAGENT_CHAT_DISCOVERY_HOLMES_FIXTURE_REL_V1,
  loadApHyperagentChatDiscoveryHolmesFixtureV1,
  validateApHyperagentChatDiscoveryOutputV1,
} from "./air-purifier-hyperagent-chat-discovery-validation-v1";

const REPO_ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/air-purifier-hyperagent-chat-discovery-validation-v1.ts"),
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/report-ap-hyperagent-chat-discovery-validation-v1.ts"),
  "utf8",
);

test("corrected holmes fixture passes mechanical validation with judgment_required", () => {
  const packet = loadApHyperagentChatDiscoveryHolmesFixtureV1(REPO_ROOT);
  const result = validateApHyperagentChatDiscoveryOutputV1({
    packet,
    approved_scope_slugs: ["holmes-hapf30"],
    rootDir: REPO_ROOT,
  });

  assert.equal(result.validation_status, "VALIDATION_PASS");
  assert.ok(result.mechanical_checks_failed_count === 0);
  assert.ok(result.mechanical_checks_passed_count > 0);
  assert.equal(result.mutation_authority_changed, false);
  assert.ok(result.judgment_required.length > 0);
  assert.ok(
    result.judgment_required.some((item) => item.includes("holmes-hapf30")),
    "expected holmes evidence-index reconciliation in judgment_required",
  );
  assert.ok(result.findings.some((f) => f.includes("mechanical validation checks passed")));
});

test("holmes mismatch pattern becomes VALIDATION_PARTIAL", () => {
  const packet = loadApHyperagentChatDiscoveryHolmesFixtureV1(REPO_ROOT);
  const row = structuredClone(packet.candidate_rows[0]!);
  // Live PDP opened in session but row filed as search-terminal REJECT_SEARCH_CATEGORY.
  row.final_url = row.repo_csv_primary_url;
  row.pdp_like_final_url = true;
  row.recommendation = "REJECT_SEARCH_CATEGORY";
  row.reference_only_reason = null;
  row.browser_truth_classification_recommendation = null;
  row.stock_state = "not_shown";
  row.evidence_notes =
    "PROVEN: Live PDP SP_763535 opened with HAPF300AHD tokens but row left on search URL.";

  const mismatch = structuredClone(packet);
  mismatch.candidate_rows = [row];

  const result = validateApHyperagentChatDiscoveryOutputV1({
    packet: mismatch,
    approved_scope_slugs: ["holmes-hapf30"],
    rootDir: REPO_ROOT,
    include_judgment_required: false,
  });

  assert.equal(result.validation_status, "VALIDATION_PARTIAL");
  assert.ok(result.mechanical_checks_failed_count > 0);
  assert.ok(
    result.mechanical_checks.some(
      (c) => !c.passed && c.severity === "partial" && c.check_id.includes("reject_search"),
    ),
  );
  assert.ok(
    result.mechanical_checks.some(
      (c) =>
        !c.passed &&
        c.severity === "partial" &&
        c.check_id.includes("pdp_like_not_on_search_final_url"),
    ),
  );
});

test("PASS_DIRECT_BUYABLE without buy action fails", () => {
  const packet = loadApHyperagentChatDiscoveryHolmesFixtureV1(REPO_ROOT);
  const row = structuredClone(packet.candidate_rows[0]!);
  row.recommendation = "PASS_DIRECT_BUYABLE";
  row.buy_action_seen = false;
  row.exact_token_in_primary_slice = true;

  const result = validateApHyperagentChatDiscoveryOutputV1({
    packet: { ...packet, candidate_rows: [row] },
    approved_scope_slugs: ["holmes-hapf30"],
    rootDir: REPO_ROOT,
    include_judgment_required: false,
  });

  assert.equal(result.validation_status, "VALIDATION_FAIL");
  assert.ok(
    result.mechanical_checks.some(
      (c) => c.check_id.endsWith(":pass_direct_buyable_buy_action") && !c.passed,
    ),
  );
});

test("wrong scope slug fails", () => {
  const packet = loadApHyperagentChatDiscoveryHolmesFixtureV1(REPO_ROOT);
  const result = validateApHyperagentChatDiscoveryOutputV1({
    packet,
    approved_scope_slugs: ["shark-hepa-hp100"],
    rootDir: REPO_ROOT,
    include_judgment_required: false,
  });

  assert.equal(result.validation_status, "VALIDATION_FAIL");
  assert.ok(
    result.mechanical_checks.some((c) => c.check_id === "approved_scope_slugs" && !c.passed),
  );
});

test("recommended_csv_mutation non-null fails", () => {
  const packet = loadApHyperagentChatDiscoveryHolmesFixtureV1(REPO_ROOT);
  const row = structuredClone(packet.candidate_rows[0]!);
  row.recommended_csv_mutation = {
    file: "data/air-purifier/retailer_links.csv",
    filter_slug: "holmes-hapf30",
    fields: { primary_url: "https://example.com" },
    note: "forbidden in chat-only discovery",
  };

  const result = validateApHyperagentChatDiscoveryOutputV1({
    packet: { ...packet, candidate_rows: [row] },
    approved_scope_slugs: ["holmes-hapf30"],
    rootDir: REPO_ROOT,
    include_judgment_required: false,
  });

  assert.equal(result.validation_status, "VALIDATION_FAIL");
  assert.ok(
    result.mechanical_checks.some(
      (c) => c.check_id.endsWith(":recommended_csv_mutation_null") && !c.passed,
    ),
  );
});

test("validator and report script remain read-only", () => {
  assert.ok(!LIB_SOURCE.includes("writeFileSync"));
  assert.ok(!REPORT_SOURCE.includes("writeFileSync"));
  assert.ok(LIB_SOURCE.includes(AP_HYPERAGENT_CHAT_DISCOVERY_HOLMES_FIXTURE_REL_V1));
});
