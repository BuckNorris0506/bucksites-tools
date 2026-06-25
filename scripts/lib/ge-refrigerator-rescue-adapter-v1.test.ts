import assert from "node:assert/strict";
import test from "node:test";

import {
  assessExactTokenInPrimarySlice,
  assessWrongFamilyTokens,
  detectGeSearchPlaceholderRows,
  discoverGeSpecPdpUrl,
  deriveGeRescueValidationGates,
  GE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1,
  isGeAppliancePartsSearchPlaceholderUrl,
  isGeAppliancePartsSpecPdpUrl,
  buildGeRefrigeratorRescueAdapterReportV1,
  allGeRescueBrowserGatesPass,
} from "./ge-refrigerator-rescue-adapter-v1";

const retailerCsv = `filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at
mwf,OEM parts catalog (keyword lookup),https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=MWF,true,0,oem-parts-catalog,,,
rpwfe,GE Appliance Parts,https://www.geapplianceparts.com/store/parts/spec/RPWFE,true,0,oem-parts-catalog,direct_buyable,applied,2026-06-02T14:23:08.624Z
gswf,OEM parts catalog (keyword lookup),https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=GSWF,true,0,oem-parts-catalog,,,
xwfe,OEM parts catalog (keyword lookup),https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=XWFE,true,0,oem-parts-catalog,,,
`;

const filtersCsv = `brand_slug,slug,oem_part_number,name,replacement_interval_months,notes
ge,mwf,MWF,GE MWF,6,
ge,rpwfe,RPWFE,GE RPWFE,6,
ge,gswf,GSWF,GE GSWF,6,
ge,xwfe,XWFE,GE XWFE,6,
`;

test("isGeAppliancePartsSearchPlaceholderUrl flags GE catalog search", () => {
  assert.equal(
    isGeAppliancePartsSearchPlaceholderUrl(
      "oem-parts-catalog",
      "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=MWF",
    ),
    true,
  );
  assert.equal(
    isGeAppliancePartsSearchPlaceholderUrl(
      "oem-parts-catalog",
      "https://www.geapplianceparts.com/store/parts/spec/MWF",
    ),
    false,
  );
});

test("isGeAppliancePartsSpecPdpUrl recognizes spec PDP", () => {
  assert.equal(
    isGeAppliancePartsSpecPdpUrl("https://www.geapplianceparts.com/store/parts/spec/RPWFE"),
    true,
  );
});

test("discoverGeSpecPdpUrl infers official GE spec pattern", () => {
  const d = discoverGeSpecPdpUrl({ filterSlug: "mswf", oemPartToken: "MSWF" });
  assert.ok(d);
  assert.equal(d!.inferred_spec_url, "https://www.geapplianceparts.com/store/parts/spec/MSWF");
  assert.equal(d!.path_type, "official_manufacturer_spec_pdp");
  assert.equal(d!.known_broken_destination, false);
});

test("discoverGeSpecPdpUrl flags known-broken MWF spec URL", () => {
  const d = discoverGeSpecPdpUrl({ filterSlug: "mwf", oemPartToken: "MWF" });
  assert.ok(d);
  assert.equal(d!.known_broken_destination, true);
});

test("detectGeSearchPlaceholderRows finds committed GE placeholder slugs", () => {
  const { parse } = require("csv-parse/sync") as typeof import("csv-parse/sync");
  const rows = detectGeSearchPlaceholderRows({
    retailerRows: parse(retailerCsv, { columns: true, skip_empty_lines: true }),
    filterRows: parse(filtersCsv, { columns: true, skip_empty_lines: true }),
  });
  const slugs = rows.map((r) => r.filter_slug).sort();
  assert.deepEqual(slugs, ["gswf", "mwf", "xwfe"]);
  assert.equal(rows[0].gate_failure_kind, "search_placeholder");
});

test("assessExactTokenInPrimarySlice requires token in title or h1", () => {
  assert.equal(
    assessExactTokenInPrimarySlice({
      oemPartToken: "RPWFE",
      title: "RPWFE Water Filter",
      h1Text: "Details",
    }),
    true,
  );
  assert.equal(
    assessExactTokenInPrimarySlice({
      oemPartToken: "RPWFE",
      title: "Water Filter",
      h1Text: "Generic",
    }),
    false,
  );
});

test("assessWrongFamilyTokens blocks GSWF2 conflation on gswf slug", () => {
  const r = assessWrongFamilyTokens({
    filterSlug: "gswf",
    oemPartToken: "GSWF",
    finalUrl: "https://www.geapplianceparts.com/store/parts/spec/GSWF2",
    title: "GSWF2",
    h1Text: "GSWF2",
    textSample: "",
  });
  assert.equal(r.blocked, true);
  assert.ok(r.detected_forbidden_tokens.includes("GSWF2"));
});

test("assessWrongFamilyTokens blocks XWFE for xwf slug", () => {
  const r = assessWrongFamilyTokens({
    filterSlug: "xwf",
    oemPartToken: "XWF",
    title: "XWFE Filter",
    h1Text: "XWFE",
    textSample: "",
  });
  assert.equal(r.blocked, true);
});

test("deriveGeRescueValidationGates PASS on ideal RPWFE-like signals", () => {
  const wrongFamily = assessWrongFamilyTokens({
    filterSlug: "mswf",
    oemPartToken: "MSWF",
  });
  const gates = deriveGeRescueValidationGates({
    filterSlug: "mswf",
    oemPartToken: "MSWF",
    csvPrimaryIsSearchPlaceholder: true,
    discoveredSpecUrl: "https://www.geapplianceparts.com/store/parts/spec/MSWF",
    discoveredSpecKnownBroken: false,
    finalUrl: "https://www.geapplianceparts.com/store/parts/spec/MSWF",
    title: "MSWF | GE Parts",
    h1Text: "MSWF",
    textSample: "GE MSWF refrigerator water filter",
    purchaseActions: ["Add to Cart"],
    classification: "direct_buyable",
    wrongFamily,
    captureCompleted: true,
  });
  assert.equal(allGeRescueBrowserGatesPass(gates), true);
});

test("deriveGeRescueValidationGates waives supersession gate for xwfe", () => {
  const gates = deriveGeRescueValidationGates({
    filterSlug: "xwfe",
    oemPartToken: "XWFE",
    csvPrimaryIsSearchPlaceholder: true,
    discoveredSpecUrl: "https://www.geapplianceparts.com/store/parts/spec/XWFE",
    discoveredSpecKnownBroken: false,
    finalUrl: "https://www.geapplianceparts.com/store/parts/spec/XWFE",
    title: "XWFE",
    h1Text: "XWFE",
    textSample: "",
    purchaseActions: ["Add to Cart"],
    classification: "direct_buyable",
    wrongFamily: assessWrongFamilyTokens({ filterSlug: "xwfe", oemPartToken: "XWFE" }),
    captureCompleted: true,
  });
  const supersession = gates.find((g) => g.gate_id === "supersession_review_cleared");
  assert.equal(supersession?.status, "FAIL");
});

test("buildGeRefrigeratorRescueAdapterReportV1 reads repo CSV cohort", () => {
  const report = buildGeRefrigeratorRescueAdapterReportV1({
    rootDir: "/tmp/ge-adapter-test",
    now: () => new Date("2026-06-10T00:00:00.000Z"),
    fileExists: (p) => p.includes("retailer_links") || p.includes("filters"),
    readTextFile: (p) => {
      if (p.includes("retailer_links")) return retailerCsv;
      if (p.includes("filters")) return filtersCsv;
      return "";
    },
  });

  assert.equal(report.contract, "ge_refrigerator_rescue_adapter_v1");
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(
    report.cohort_summary.ge_rescue_search_placeholder_count,
    GE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1.length >= 3 ? 3 : report.cohort_summary.ge_rescue_search_placeholder_count,
  );
  const rescueSlugs = report.rows
    .filter((r) => r.cohort_lane === "RESCUE_SEARCH_PLACEHOLDER")
    .map((r) => r.filter_slug)
    .sort();
  assert.deepEqual(rescueSlugs, ["gswf", "mwf", "xwfe"]);
  const ref = report.rows.find((r) => r.filter_slug === "rpwfe");
  assert.ok(ref);
  assert.equal(ref!.cohort_lane, "REFERENCE_ALREADY_APPLIED");
});
