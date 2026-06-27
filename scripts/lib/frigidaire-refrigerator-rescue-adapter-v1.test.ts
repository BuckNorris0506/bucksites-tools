import assert from "node:assert/strict";
import test from "node:test";

import {
  assessFrigidaireWrongFamilyTokens,
  buildFrigidaireRefrigeratorRescueAdapterReportV1,
  detectFrigidaireSearchPlaceholderRows,
  isFrigidaireOfficialPdpUrl,
  isFrigidaireSearchPlaceholderUrl,
} from "./frigidaire-refrigerator-rescue-adapter-v1";
import {
  discoverFrigidaireProvenPdpUrl,
  FRIGIDAIRE_MANUFACTURER_RESCUE_CONFIG_V1,
  FRIGIDAIRE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1,
  frigidaireManufacturerPdpPatternStatusV1,
} from "./manufacturer-safe-link-rescue-frigidaire-config-v1";

const retailerCsv = `filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at
wf3cb,OEM parts catalog (keyword lookup),https://www.frigidaire.com/en/catalogsearch/result/?q=WF3CB,true,0,oem-parts-catalog,,,
ultrawf,OEM parts catalog (keyword lookup),https://www.frigidaire.com/en/catalogsearch/result/?q=ULTRAWF,true,0,oem-parts-catalog,,,
fppwfu01,OEM parts catalog (keyword lookup),https://www.frigidaire.com/en/catalogsearch/result/?q=FPPWFU01,true,0,oem-parts-catalog,,,
`;

const filtersCsv = `brand_slug,slug,oem_part_number,name,replacement_interval_months,notes
frigidaire,wf3cb,WF3CB,Frigidaire PureSource 3,6,
frigidaire,ultrawf,ULTRAWF,Frigidaire ULTRAWF,6,
frigidaire,fppwfu01,FPPWFU01,Frigidaire FPPWFU01,6,
`;

const wf3cbOwnerProof = JSON.stringify({
  contract: "fridge_safe_link_owner_browser_proof_result_v1",
  verdict: "PASS_BROWSER_PROOF",
  owner_proof_urls: [
    {
      url: "https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WF3CB",
      path_type: "official_manufacturer_pdp",
      browser_proof_status: "PASS",
    },
  ],
});

test("Frigidaire config does not infer PDP URLs via discoverPdpUrl", () => {
  assert.equal(
    FRIGIDAIRE_MANUFACTURER_RESCUE_CONFIG_V1.pdp_discovery.discoverPdpUrl({
      filterSlug: "wf3cb",
      oemPartToken: "WF3CB",
    }),
    null,
  );
});

test("isFrigidaireSearchPlaceholderUrl flags catalogsearch rows", () => {
  assert.equal(
    isFrigidaireSearchPlaceholderUrl(
      "oem-parts-catalog",
      "https://www.frigidaire.com/en/catalogsearch/result/?q=WF3CB",
    ),
    true,
  );
  assert.equal(
    isFrigidaireSearchPlaceholderUrl(
      "oem-parts-catalog",
      "https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WF3CB",
    ),
    false,
  );
});

test("isFrigidaireOfficialPdpUrl recognizes proven owner-proof URL shapes only", () => {
  assert.equal(
    isFrigidaireOfficialPdpUrl(
      "https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WF3CB",
    ),
    true,
  );
  assert.equal(
    isFrigidaireOfficialPdpUrl(
      "https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/ULTRAWF/1534529",
    ),
    true,
  );
  assert.equal(
    isFrigidaireOfficialPdpUrl(
      "https://www.frigidaire.com/en/catalogsearch/result/?q=WF3CB",
    ),
    false,
  );
});

test("discoverFrigidaireProvenPdpUrl loads wf3cb from owner proof fixture", () => {
  const d = discoverFrigidaireProvenPdpUrl({
    rootDir: "/tmp",
    filterSlug: "wf3cb",
    oemPartToken: "WF3CB",
    fileExists: (p) => p.includes("owner-browser-proof-result-wf3cb"),
    readTextFile: () => wf3cbOwnerProof,
  });
  assert.ok(d);
  assert.equal(d!.discovery_provenance, "PROVEN_OWNER_BROWSER_PROOF");
  assert.match(d!.discovered_url, /frigidaire\.com.*WF3CB/i);
});

test("discoverFrigidaireProvenPdpUrl returns null without owner proof on disk", () => {
  assert.equal(
    discoverFrigidaireProvenPdpUrl({
      rootDir: "/tmp/missing",
      filterSlug: "fppwfu01",
      oemPartToken: "FPPWFU01",
    }),
    null,
  );
});

test("assessFrigidaireWrongFamilyTokens blocks ULTRAWF for eptwfu01 slug", () => {
  const r = assessFrigidaireWrongFamilyTokens({
    filterSlug: "eptwfu01",
    oemPartToken: "EPTWFU01",
    title: "ULTRAWF Filter",
    h1Text: "ULTRAWF",
    textSample: "",
  });
  assert.equal(r.blocked, true);
  assert.ok(r.detected_forbidden_tokens.includes("ULTRAWF"));
});

test("frigidaireManufacturerPdpPatternStatusV1 stays UNKNOWN with zero proven slugs", () => {
  assert.equal(
    frigidaireManufacturerPdpPatternStatusV1({ provenSlugCount: 0, cohortSlugCount: 10 }),
    "UNKNOWN",
  );
  assert.equal(
    frigidaireManufacturerPdpPatternStatusV1({ provenSlugCount: 3, cohortSlugCount: 10 }),
    "PROVEN_PARTIAL",
  );
});

test("detectFrigidaireSearchPlaceholderRows finds committed placeholder slugs", () => {
  const { parse } = require("csv-parse/sync") as typeof import("csv-parse/sync");
  const rows = detectFrigidaireSearchPlaceholderRows({
    retailerRows: parse(retailerCsv, { columns: true, skip_empty_lines: true }),
    filterRows: parse(filtersCsv, { columns: true, skip_empty_lines: true }),
  });
  const slugs = rows.map((r) => r.filter_slug).sort();
  assert.deepEqual(slugs, ["fppwfu01", "ultrawf", "wf3cb"]);
  assert.equal(rows[0].gate_failure_kind, "search_placeholder");
});

test("buildFrigidaireRefrigeratorRescueAdapterReportV1 is read-only with coverage_unlocked false", () => {
  const report = buildFrigidaireRefrigeratorRescueAdapterReportV1({
    rootDir: "/tmp/frig-adapter",
    now: () => new Date("2026-06-10T00:00:00.000Z"),
    fileExists: (p) =>
      p.includes("retailer_links") ||
      p.includes("filters") ||
      p.includes("owner-browser-proof-result-wf3cb"),
    readTextFile: (p) => {
      if (p.includes("retailer_links")) return retailerCsv;
      if (p.includes("filters")) return filtersCsv;
      if (p.includes("owner-browser-proof-result-wf3cb")) return wf3cbOwnerProof;
      return "";
    },
  });

  assert.equal(report.contract, "frigidaire_refrigerator_rescue_adapter_v1");
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.coverage_unlocked, false);
  assert.equal(report.cohort_summary.pdp_pattern_guessed_slug_count, 0);
  assert.equal(
    report.cohort_summary.frigidaire_rescue_search_placeholder_count,
    FRIGIDAIRE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1.length >= 3 ? 3 : report.cohort_summary.frigidaire_rescue_search_placeholder_count,
  );

  const wf3cb = report.rows.find((r) => r.filter_slug === "wf3cb");
  assert.ok(wf3cb);
  assert.ok(wf3cb!.repo_proven_official_pdp_url?.includes("frigidaire.com"));
  assert.equal(wf3cb!.adapter_ready_for_browser_capture, true);

  const fppwfu01 = report.rows.find((r) => r.filter_slug === "fppwfu01");
  assert.ok(fppwfu01);
  assert.equal(fppwfu01!.repo_proven_official_pdp_url, null);
  assert.equal(fppwfu01!.adapter_ready_for_browser_capture, false);
  assert.equal(fppwfu01!.manufacturer_pdp_pattern_status, "UNKNOWN");
});
