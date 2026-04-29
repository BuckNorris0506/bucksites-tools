import assert from "node:assert/strict";
import test from "node:test";

import { metadata as applianceAirMetadata } from "@/app/appliance-air/layout";
import { metadata as humidifierMetadata } from "@/app/humidifier/layout";
import { metadata as vacuumMetadata } from "@/app/vacuum/layout";

test("vacuum route tree metadata is noindex/follow", () => {
  assert.equal(vacuumMetadata.robots?.index, false);
  assert.equal(vacuumMetadata.robots?.follow, true);
});

test("humidifier route tree metadata is noindex/follow", () => {
  assert.equal(humidifierMetadata.robots?.index, false);
  assert.equal(humidifierMetadata.robots?.follow, true);
});

test("appliance-air route tree metadata is noindex/follow", () => {
  assert.equal(applianceAirMetadata.robots?.index, false);
  assert.equal(applianceAirMetadata.robots?.follow, true);
});

