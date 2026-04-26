import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeRetailerName } from "@/lib/retailers/retailer-normalization";

describe("normalizeRetailerName", () => {
  it("maps Amazon variants", () => {
    assert.equal(normalizeRetailerName("amazon"), "amazon");
    assert.equal(normalizeRetailerName("amazon.com"), "amazon");
    assert.equal(normalizeRetailerName("amzn"), "amazon");
  });

  it("maps AppliancePartsPros variants", () => {
    assert.equal(normalizeRetailerName("AppliancePartsPros"), "appliancepartspros");
    assert.equal(normalizeRetailerName("AppliancePartsPros (Reseller)"), "appliancepartspros");
    assert.equal(normalizeRetailerName("Appliance Parts Pros"), "appliancepartspros");
    assert.equal(normalizeRetailerName("appliancepartspros"), "appliancepartspros");
    assert.equal(normalizeRetailerName("appliance parts pros"), "appliancepartspros");
  });

  it("maps GE variants", () => {
    assert.equal(normalizeRetailerName("ge"), "ge-appliance-parts");
    assert.equal(normalizeRetailerName("ge appliances"), "ge-appliance-parts");
    assert.equal(normalizeRetailerName("ge parts"), "ge-appliance-parts");
  });

  it("maps Home Depot variants", () => {
    assert.equal(normalizeRetailerName("home depot"), "home-depot");
    assert.equal(normalizeRetailerName("homedepot"), "home-depot");
  });

  it("maps Lowes variants", () => {
    assert.equal(normalizeRetailerName("lowes"), "lowes");
    assert.equal(normalizeRetailerName("lowe's"), "lowes");
  });

  it("maps OEM/DTC retailer variants", () => {
    assert.equal(normalizeRetailerName("Levoit (OEM/DTC)"), "levoit-oem-dtc");
    assert.equal(normalizeRetailerName("Coway (OEM/DTC)"), "coway-oem-dtc");
    assert.equal(normalizeRetailerName("Winix (OEM/DTC)"), "winix-oem-dtc");
  });

  it("returns null for unknown inputs", () => {
    assert.equal(normalizeRetailerName("best buy"), null);
    assert.equal(normalizeRetailerName(""), null);
  });
});
