import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CATALOG_REFRIGERATOR_WATER_FILTER } from "@/lib/catalog/constants";
import type { SearchHit } from "@/lib/data/search";
import {
  isExactFridgeFilterIdentityHit,
  isExactFridgeModelIdentityHit,
  resolveCustomerSearchRouteV1,
} from "@/lib/search/customer-search-route-v1";

const wrxModel: SearchHit = {
  catalog: CATALOG_REFRIGERATOR_WATER_FILTER,
  kind: "fridge",
  slug: "whirlpool-wrx735sdhz",
  model_number: "WRX735SDHZ",
  brand_name: "Whirlpool",
  brand_slug: "whirlpool",
  via: "model",
};

const edrFilter: SearchHit = {
  catalog: CATALOG_REFRIGERATOR_WATER_FILTER,
  kind: "filter",
  slug: "edr4rxd1",
  oem_part_number: "EDR4RXD1",
  name: "EveryDrop Filter 4",
  brand_name: "Whirlpool",
  brand_slug: "whirlpool",
  via: "oem",
};

describe("customer search route v1", () => {
  it("routes WRX735SDHZ to direct model when one exact fridge identity", () => {
    const route = resolveCustomerSearchRouteV1("WRX735SDHZ", [wrxModel]);
    assert.equal(route.kind, "direct_model");
    if (route.kind === "direct_model") {
      assert.equal(route.href, "/fridge/whirlpool-wrx735sdhz");
      assert.equal(route.modelNumber, "WRX735SDHZ");
    }
  });

  it("routes EDR4RXD1 to direct part when one exact filter identity", () => {
    const route = resolveCustomerSearchRouteV1("EDR4RXD1", [edrFilter]);
    assert.equal(route.kind, "direct_part");
    if (route.kind === "direct_part") {
      assert.equal(route.href, "/filter/edr4rxd1?fromSearch=1");
      assert.equal(route.partNumber, "EDR4RXD1");
    }
  });

  it("uses resolution when model and filter both exact-match", () => {
    const route = resolveCustomerSearchRouteV1("WRX735SDHZ", [wrxModel, edrFilter]);
    assert.equal(route.kind, "resolution");
  });

  it("uses resolution when multiple fridge models match", () => {
    const other: SearchHit = {
      ...wrxModel,
      slug: "whirlpool-wrx735sdhb",
      model_number: "WRX735SDHB",
    };
    const route = resolveCustomerSearchRouteV1("WRX735SD", [wrxModel, other]);
    assert.equal(route.kind, "resolution");
  });

  it("uses recovery for no match without converting to fit denial", () => {
    const route = resolveCustomerSearchRouteV1("ZZZZNOTREAL", []);
    assert.equal(route.kind, "recovery");
  });

  it("does not treat alias-only fuzzy overlap as exact model without alias token match", () => {
    const aliasHit: SearchHit = {
      ...wrxModel,
      via: "alias",
      matchedAlias: "WRX735SDHZ/A",
    };
    assert.equal(isExactFridgeModelIdentityHit(aliasHit as typeof wrxModel, "wrx735sdhz"), true);
    assert.equal(isExactFridgeModelIdentityHit(aliasHit as typeof wrxModel, "wrx735sdh"), false);
  });

  it("requires exact OEM compact match for filter identity", () => {
    assert.equal(isExactFridgeFilterIdentityHit(edrFilter as typeof edrFilter, "edr4rxd1"), true);
    assert.equal(isExactFridgeFilterIdentityHit(edrFilter as typeof edrFilter, "edr4"), false);
  });
});
