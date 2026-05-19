import assert from "node:assert/strict";
import test from "node:test";

import type { EvidenceInventoryV1 } from "./buckparts-command-center-v2-types";
import {
  buildPagePublishabilityTruthRowV1,
  buildPagePublishabilityTruthSummaryV1,
  parseFilterAliasesCsv,
  parseFilterSlugToModelSlugsFromCompatibilityCsv,
  parseRefrigeratorFiltersCatalogCsv,
} from "./buckparts-page-publishability-truth-v1";

function emptyEvidenceInventory(): EvidenceInventoryV1 {
  return {
    contract: "evidence_inventory_v1",
    proven_facts: [],
    unknown_facts: [],
    data_evidence: {
      directory_relative_path: "data/evidence",
      total_json_files: 0,
      filename_outcome_buckets: {
        live_outcome_by_filename_substring: 0,
        unknown_outcome_by_filename_substring: 0,
        fail_hold_outcome_by_filename_substring: 0,
        other_json_not_matching_filename_patterns: 0,
      },
      recent_filenames: [],
      recent_ordering: "lexicographic_by_filename",
      proven_facts: [],
      unknown_facts: [],
      body_mapping: {
        parsed_ok_count: 0,
        parse_error_count: 0,
        mapped_count: 0,
        unmapped_count: 0,
        by_scope: {},
        by_filter_slug: {},
        by_token: {},
      },
    },
    refrigerator_manual_evidence: {
      inventory_contract: "refrigerator_manual_evidence_files_v1",
      directory_relative_path: "data/manual-evidence/refrigerator",
      valid_record_count: 0,
      invalid_or_unreadable_count: 0,
      validated_model_slugs: [],
      proven_facts: [],
      unknown_facts: [],
    },
    fridge_form_factor_evidence: {
      inventory_contract: "fridge_form_factor_evidence_files_v1",
      directory_relative_path: "data/fridge-form-factor-evidence",
      valid_record_count: 0,
      invalid_or_unreadable_count: 0,
      validated_model_slugs: [],
      proven_facts: [],
      unknown_facts: [],
    },
  };
}

test("parseRefrigeratorFiltersCatalogCsv reads slug oem brand", () => {
  const csv = `slug,oem_part_number,brand_slug,name
mwf,MWF,ge,MWF Filter
`;
  const rows = parseRefrigeratorFiltersCatalogCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.filter_slug, "mwf");
  assert.equal(rows[0]!.oem_token, "MWF");
});

test("missing CTA join forces UNKNOWN safe_cta_link_count and read_only_only", () => {
  const compat = parseFilterSlugToModelSlugsFromCompatibilityCsv(
    "fridge_slug,filter_slug\nlg-lrfxs3106s,mwf\n",
  );
  const row = buildPagePublishabilityTruthRowV1({
    catalog: { filter_slug: "mwf", oem_token: "MWF", brand_slug: "ge" },
    evidence_inventory: emptyEvidenceInventory(),
    filter_slug_to_model_slugs: compat,
    quarantined_filter_slugs: new Set(["mwf"]),
    indexable_slugs: new Set(["mwf"]),
    cta_join_by_filter_slug: null,
    affiliate_approval_pending: true,
    commission_or_revenue: "NOT_CONNECTED",
    human_likely_clicks_by_filter_slug: null,
    click_visibility_runtime_status: null,
    demand_present_by_filter_slug: null,
  });
  assert.equal(row.cta.safe_cta_link_count, "UNKNOWN");
  assert.equal(row.automation_allowed, "never_auto_mutate");
  assert.notEqual(row.automation_allowed, "auto_fix_allowed");
});

test("buildPagePublishabilityTruthSummaryV1 never emits auto_fix_allowed", () => {
  const summary = buildPagePublishabilityTruthSummaryV1({
    generated_at: "2026-05-18T00:00:00.000Z",
    catalog_rows: [{ filter_slug: "mwf", oem_token: "MWF", brand_slug: "ge" }],
    evidence_inventory: emptyEvidenceInventory(),
    filter_slug_to_model_slugs: new Map([["mwf", ["some-model"]]]),
    indexable_slugs: new Set(["mwf"]),
    cta_join_by_filter_slug: new Map([
      [
        "mwf",
        { safe_cta_link_count: 2, direct_buyable_link_count: 1, mapped_model_count: 1 },
      ],
    ]),
    affiliate_approval_pending: false,
    commission_or_revenue: "CONNECTED",
    human_likely_clicks_by_filter_slug: null,
    click_visibility_runtime_status: null,
    demand_present_by_filter_slug: null,
  });
  assert.equal(summary.contract, "page_publishability_truth_summary_v1");
  assert.equal(summary.read_only, true);
  assert.equal(summary.data_mutation, false);
  assert.equal(summary.distribution_automation_allowed.auto_fix_allowed, undefined);
  assert.ok(!Object.keys(summary.distribution_automation_allowed).includes("auto_fix_allowed"));
  for (const sample of summary.sample_rows) {
    assert.notEqual(sample.automation_allowed, "auto_fix_allowed");
  }
});

test("unknown_join_count increments when CTA join missing", () => {
  const summary = buildPagePublishabilityTruthSummaryV1({
    generated_at: "2026-05-18T00:00:00.000Z",
    catalog_rows: [{ filter_slug: "a", oem_token: "A", brand_slug: "ge" }],
    evidence_inventory: emptyEvidenceInventory(),
    filter_slug_to_model_slugs: new Map([["a", []]]),
    indexable_slugs: null,
    cta_join_by_filter_slug: null,
    affiliate_approval_pending: false,
    commission_or_revenue: "UNKNOWN",
    human_likely_clicks_by_filter_slug: null,
    click_visibility_runtime_status: null,
    demand_present_by_filter_slug: null,
  });
  assert.ok(summary.unknown_join_count > 0);
  assert.ok(summary.top_unknown_join_reasons.some((r) => r.includes("cta_filter_slug_join_missing")));
});

test("click and demand joins set present absent without UNKNOWN when maps supplied", () => {
  const summary = buildPagePublishabilityTruthSummaryV1({
    generated_at: "2026-05-18T00:00:00.000Z",
    catalog_rows: [
      { filter_slug: "mwf", oem_token: "MWF", brand_slug: "ge" },
      { filter_slug: "empty", oem_token: "EMPTY", brand_slug: "ge" },
    ],
    evidence_inventory: emptyEvidenceInventory(),
    filter_slug_to_model_slugs: new Map([
      ["mwf", []],
      ["empty", []],
    ]),
    indexable_slugs: new Set(["mwf", "empty"]),
    cta_join_by_filter_slug: new Map([
      ["mwf", { safe_cta_link_count: 1, direct_buyable_link_count: 0, mapped_model_count: 0 }],
      ["empty", { safe_cta_link_count: 0, direct_buyable_link_count: 0, mapped_model_count: 0 }],
    ]),
    affiliate_approval_pending: false,
    commission_or_revenue: "NOT_CONNECTED",
    human_likely_clicks_by_filter_slug: new Map([["mwf", 3]]),
    click_visibility_runtime_status: "OK",
    demand_present_by_filter_slug: new Map([
      ["mwf", true],
      ["empty", false],
    ]),
  });
  const mwf = summary.sample_rows.find((r) => r.filter_slug === "mwf");
  const empty = summary.sample_rows.find((r) => r.filter_slug === "empty");
  assert.ok(mwf);
  assert.ok(empty);
  assert.equal(mwf.click_signal, "present");
  assert.equal(mwf.demand_signal, "present");
  assert.equal(empty.click_signal, "absent");
  assert.equal(empty.demand_signal, "absent");
  assert.ok(
    !summary.top_unknown_join_reasons.some((r) => r.includes("per_page_click_not_joined_v1")),
  );
  assert.ok(
    !summary.top_unknown_join_reasons.some((r) => r.includes("per_page_demand_not_joined_v1")),
  );
});

test("parseFilterAliasesCsv maps alias to filter_slug", () => {
  const map = parseFilterAliasesCsv(`filter_slug,alias
mwf,LT1000P
`);
  assert.equal(map.get("lt1000p"), "mwf");
});
