import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  assessExactTokenInPrimarySlice,
  assessWrongFamilyTokens,
  deriveGeRescueValidationGates,
  discoverGeSpecPdpUrl,
  buildGeRefrigeratorRescueAdapterReportV1,
  allGeRescueBrowserGatesPass,
} from "./ge-refrigerator-rescue-adapter-v1";
import {
  deriveEverydropWhirlpoolOfficialProofSignals,
  buildOwnerBrowserChecklistOnlyProofForSlugV1,
} from "./fridge-safe-link-everydrop-whirlpool-official-browser-capture-v1";
import {
  GE_MANUFACTURER_RESCUE_CONFIG_V1,
} from "./manufacturer-safe-link-rescue-ge-config-v1";
import {
  EVERYDROP_WHIRLPOOL_MANUFACTURER_RESCUE_CONFIG_V1,
  deriveEverydropWhirlpoolProofSignalsFromFramework,
} from "./manufacturer-safe-link-rescue-everydrop-whirlpool-config-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
  assessExactToken,
  assessExactTokenInIdentityBlobIncludes,
  assessExactTokenInTitleOrH1WordBoundary,
  allManufacturerGatesPass,
  deriveEverydropStyleOfficialProofSignals,
  type ManufacturerRescueAdapter,
} from "./manufacturer-safe-link-rescue-framework-v1";

describe("manufacturer-safe-link-rescue-framework-v1", () => {
  test("framework contract constant is stable", () => {
    assert.equal(
      MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
      "manufacturer_safe_link_rescue_framework_v1",
    );
  });

  test("GE config exposes all framework strategy interfaces", () => {
    const cfg = GE_MANUFACTURER_RESCUE_CONFIG_V1;
    assert.equal(cfg.manufacturer_key, "ge_appliance_parts");
    assert.equal(cfg.exact_token_mode, "title_h1_word_boundary");
    assert.equal(typeof cfg.search_placeholder.isSearchPlaceholderUrl, "function");
    assert.equal(typeof cfg.pdp_discovery.discoverPdpUrl, "function");
    assert.equal(typeof cfg.wrong_family.assess, "function");
    assert.equal(typeof cfg.validation_gates.deriveGates, "function");
    assert.equal(typeof cfg.supersession.requiresReview, "function");
  });

  test("EveryDrop config exposes all framework strategy interfaces", () => {
    const cfg = EVERYDROP_WHIRLPOOL_MANUFACTURER_RESCUE_CONFIG_V1;
    assert.equal(cfg.manufacturer_key, "everydrop_whirlpool");
    assert.equal(cfg.exact_token_mode, "identity_blob_includes");
    assert.equal(typeof cfg.search_placeholder.isSearchPlaceholderUrl, "function");
    assert.equal(typeof cfg.pdp_discovery.isOfficialPdpUrl, "function");
    assert.equal(typeof cfg.supersession.assess, "function");
  });

  test("GE exact-token mode uses title/h1 word boundary only", () => {
    assert.equal(
      assessExactToken({
        mode: "title_h1_word_boundary",
        oemPartToken: "RPWFE",
        title: "RPWFE Water Filter",
        h1Text: "Details",
        textSample: "no token in body",
      }),
      true,
    );
    assert.equal(
      assessExactToken({
        mode: "title_h1_word_boundary",
        oemPartToken: "RPWFE",
        title: "Water Filter",
        h1Text: "Generic",
        textSample: "RPWFE in body only",
      }),
      false,
    );
    assert.equal(
      assessExactTokenInPrimarySlice({
        oemPartToken: "RPWFE",
        title: "RPWFE Water Filter",
        h1Text: "Details",
      }),
      assessExactTokenInTitleOrH1WordBoundary({
        oemPartToken: "RPWFE",
        title: "RPWFE Water Filter",
        h1Text: "Details",
      }),
    );
  });

  test("EveryDrop exact-token mode uses identity blob includes", () => {
    const target =
      "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-3.edr3rxd1.html";
    const adapterDerived = deriveEverydropWhirlpoolOfficialProofSignals({
      slug: "edr3rxd1",
      oemToken: "EDR3RXD1",
      targetUrl: target,
      finalUrl: target,
      title: "everydrop Refrigerator Water Filter 3 - EDR3RXD1 (Pack of 1)",
      h1Text: "everydrop Refrigerator Water Filter 3 - EDR3RXD1",
      textSample: "EDR3RXD1 Add To Cart Genuine Filter",
      purchaseActions: ["Add To Cart"],
      classification: "direct_buyable",
      captureSucceeded: true,
    });
    const frameworkDerived = deriveEverydropWhirlpoolProofSignalsFromFramework({
      slug: "edr3rxd1",
      oemToken: "EDR3RXD1",
      targetUrl: target,
      finalUrl: target,
      title: "everydrop Refrigerator Water Filter 3 - EDR3RXD1 (Pack of 1)",
      h1Text: "everydrop Refrigerator Water Filter 3 - EDR3RXD1",
      textSample: "EDR3RXD1 Add To Cart Genuine Filter",
      purchaseActions: ["Add To Cart"],
      classification: "direct_buyable",
      captureSucceeded: true,
    });
    assert.deepEqual(adapterDerived, frameworkDerived);
    assert.equal(
      assessExactTokenInIdentityBlobIncludes({
        oemPartToken: "EDR3RXD1",
        title: "Filter 3",
        h1Text: "Generic",
        textSample: "EDR3RXD1 pack",
      }),
      true,
    );
  });

  test("GE validation gates via config match adapter deriveGeRescueValidationGates", () => {
    const wrongFamily = assessWrongFamilyTokens({
      filterSlug: "mswf",
      oemPartToken: "MSWF",
    });
    const args = {
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
      classification: "direct_buyable" as const,
      wrongFamily,
      captureCompleted: true,
    };
    const adapterGates = deriveGeRescueValidationGates(args);
    const configGates = GE_MANUFACTURER_RESCUE_CONFIG_V1.validation_gates.deriveGates({
      ...args,
      discoveredPdpUrl: args.discoveredSpecUrl,
      discoveredPdpKnownBroken: args.discoveredSpecKnownBroken,
    });
    assert.deepEqual(adapterGates, configGates);
    assert.equal(allGeRescueBrowserGatesPass(adapterGates), allManufacturerGatesPass(configGates));
  });

  test("GE wrong-family via config matches adapter assessWrongFamilyTokens", () => {
    const input = {
      filterSlug: "gswf",
      oemPartToken: "GSWF",
      finalUrl: "https://www.geapplianceparts.com/store/parts/spec/GSWF2",
      title: "GSWF2",
      h1Text: "GSWF2",
      textSample: "",
    };
    assert.deepEqual(
      assessWrongFamilyTokens(input),
      GE_MANUFACTURER_RESCUE_CONFIG_V1.wrong_family.assess(input),
    );
  });

  test("GE discoverGeSpecPdpUrl matches config pdp discovery", () => {
    const discovered = discoverGeSpecPdpUrl({ filterSlug: "mswf", oemPartToken: "MSWF" });
    const fromConfig = GE_MANUFACTURER_RESCUE_CONFIG_V1.pdp_discovery.discoverPdpUrl({
      filterSlug: "mswf",
      oemPartToken: "MSWF",
    });
    assert.ok(discovered);
    assert.ok(fromConfig);
    assert.equal(discovered!.inferred_spec_url, fromConfig!.discovered_url);
    assert.equal(discovered!.known_broken_destination, fromConfig!.known_broken_destination);
  });

  test("ManufacturerRescueAdapter shape satisfied by GE report builder", () => {
    const adapter: ManufacturerRescueAdapter<{ contract: string }> = {
      manufacturerKey: GE_MANUFACTURER_RESCUE_CONFIG_V1.manufacturer_key,
      contract: MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
      buildReport: ({ rootDir }) =>
        buildGeRefrigeratorRescueAdapterReportV1({
          rootDir,
          fileExists: () => false,
          readTextFile: () => "",
        }),
    };
    assert.equal(adapter.manufacturerKey, "ge_appliance_parts");
  });

  test("checklist-only EveryDrop row remains UNKNOWN fail-closed", () => {
    const row = buildOwnerBrowserChecklistOnlyProofForSlugV1({
      slug: "4396508",
      oemToken: "4396508",
      brandSlug: "whirlpool",
      csvPrimaryUrl:
        "https://www.whirlpoolparts.com/catalog.jsp?search=stw=&path=&searchKeyword=4396508",
      repoProvenTargetUrl: null,
    });
    assert.equal(row.coverage_unlocked, false);
    assert.equal(row.browser_truth_status, "UNKNOWN");
    assert.equal(row.whirlpool_official_pdp_proof_result, "UNKNOWN");
  });

  test("deriveEverydropStyleOfficialProofSignals FAIL when capture incomplete", () => {
    const derived = deriveEverydropStyleOfficialProofSignals({
      filterSlug: "edr3rxd1",
      oemPartToken: "EDR3RXD1",
      targetUrl: null,
      finalUrl: "",
      title: "",
      h1Text: "",
      textSample: "",
      purchaseActions: [],
      classification: "likely_valid",
      captureSucceeded: false,
      wrongFamily: EVERYDROP_WHIRLPOOL_MANUFACTURER_RESCUE_CONFIG_V1.wrong_family.assess({
        filterSlug: "edr3rxd1",
        oemPartToken: "EDR3RXD1",
      }),
      supersession: { required: false, notes: null },
      pdpDiscovery: EVERYDROP_WHIRLPOOL_MANUFACTURER_RESCUE_CONFIG_V1.pdp_discovery,
      exactTokenMode: "identity_blob_includes",
    });
    assert.equal(derived.browser_truth_status, "UNKNOWN");
    assert.ok(derived.blockers.includes("browser_capture_not_completed"));
  });
});
