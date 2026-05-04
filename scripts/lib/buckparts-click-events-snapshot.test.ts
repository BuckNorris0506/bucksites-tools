import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateClickRowsForTopLists,
  clickSnapshotForTests,
  isFridgeWaterClickRow,
} from "./buckparts-click-events-snapshot";

test("isFridgeWaterClickRow is true only for legacy fridge rows without wedge FKs", () => {
  assert.equal(
    isFridgeWaterClickRow({
      filter_id: "f1",
      retailer_slug: "amazon",
      page_type: "refrigerator_filter",
      page_slug: "lt1000p",
      air_purifier_retailer_link_id: null,
      vacuum_retailer_link_id: null,
      humidifier_retailer_link_id: null,
      whole_house_water_retailer_link_id: null,
      appliance_air_retailer_link_id: null,
    }),
    true,
  );
  assert.equal(
    isFridgeWaterClickRow({
      filter_id: "f1",
      retailer_slug: "amazon",
      page_type: null,
      page_slug: null,
      air_purifier_retailer_link_id: "ap-1",
      vacuum_retailer_link_id: null,
      humidifier_retailer_link_id: null,
      whole_house_water_retailer_link_id: null,
      appliance_air_retailer_link_id: null,
    }),
    false,
  );
});

test("aggregateClickRowsForTopLists ranks fridge retailers and wedge link ids", () => {
  const rows = [
    {
      filter_id: "a",
      retailer_slug: "amazon",
      page_type: "refrigerator_filter",
      page_slug: "lt1000p",
      air_purifier_retailer_link_id: null,
      vacuum_retailer_link_id: null,
      humidifier_retailer_link_id: null,
      whole_house_water_retailer_link_id: null,
      appliance_air_retailer_link_id: null,
    },
    {
      filter_id: "a",
      retailer_slug: "amazon",
      page_type: "refrigerator_filter",
      page_slug: "lt1000p",
      air_purifier_retailer_link_id: null,
      vacuum_retailer_link_id: null,
      humidifier_retailer_link_id: null,
      whole_house_water_retailer_link_id: null,
      appliance_air_retailer_link_id: null,
    },
    {
      filter_id: null,
      retailer_slug: null,
      page_type: null,
      page_slug: null,
      air_purifier_retailer_link_id: "11111111-1111-4111-8111-111111111111",
      vacuum_retailer_link_id: null,
      humidifier_retailer_link_id: null,
      whole_house_water_retailer_link_id: null,
      appliance_air_retailer_link_id: null,
    },
  ];
  const tops = aggregateClickRowsForTopLists(rows);
  assert.equal(tops.top_retailer_slugs_30d?.[0]?.retailer_slug, "amazon");
  assert.equal(tops.top_retailer_slugs_30d?.[0]?.clicks, 2);
  assert.equal(tops.top_wedge_link_ids_30d?.[0]?.wedge, "air_purifier");
  assert.equal(tops.top_wedge_link_ids_30d?.[0]?.clicks, 1);
});

test("clickSnapshotForTests fixture is OK-shaped", () => {
  const s = clickSnapshotForTests();
  assert.equal(s.runtime_status, "OK");
  assert.equal(s.commission_or_revenue, "NOT_CONNECTED");
});
