import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateClickRowsForTopLists,
  buildRefrigeratorFilterHumanLikelyClicksBySlug30d,
  classifyClickUserAgent,
  clickSnapshotForTests,
  computeClickQualityFromRows,
  isFridgeWaterClickRow,
} from "./buckparts-click-events-snapshot";

test("classifyClickUserAgent: BuckPartsAudit => INTERNAL_AUDIT", () => {
  assert.equal(classifyClickUserAgent("Mozilla/5.0 BuckPartsAudit/1.0"), "INTERNAL_AUDIT");
});

test("classifyClickUserAgent: ClaudeBot => KNOWN_BOT", () => {
  assert.equal(
    classifyClickUserAgent(
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
    ),
    "KNOWN_BOT",
  );
});

test("classifyClickUserAgent: meta-externalagent => KNOWN_BOT", () => {
  assert.equal(
    classifyClickUserAgent("meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)"),
    "KNOWN_BOT",
  );
});

test("classifyClickUserAgent: MJ12bot => KNOWN_BOT", () => {
  assert.equal(classifyClickUserAgent("Mozilla/5.0 (compatible; MJ12bot/v1.4.8; http://mj12bot.com/)"), "KNOWN_BOT");
});

test("classifyClickUserAgent: curl => SCRIPTED_CLIENT", () => {
  assert.equal(classifyClickUserAgent("curl/8.7.1"), "SCRIPTED_CLIENT");
});

test("classifyClickUserAgent: node => SCRIPTED_CLIENT", () => {
  assert.equal(classifyClickUserAgent("node"), "SCRIPTED_CLIENT");
});

test("classifyClickUserAgent: normal Chrome => HUMAN_LIKELY", () => {
  assert.equal(
    classifyClickUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
    ),
    "HUMAN_LIKELY",
  );
});

test("classifyClickUserAgent: normal Safari => HUMAN_LIKELY", () => {
  assert.equal(
    classifyClickUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    ),
    "HUMAN_LIKELY",
  );
});

test("classifyClickUserAgent: missing => UNKNOWN", () => {
  assert.equal(classifyClickUserAgent(null), "UNKNOWN");
  assert.equal(classifyClickUserAgent(""), "UNKNOWN");
  assert.equal(classifyClickUserAgent("   "), "UNKNOWN");
});

test("classifyClickUserAgent: non-browser token => UNKNOWN", () => {
  assert.equal(classifyClickUserAgent("SomeOpaqueClient/9.9"), "UNKNOWN");
});

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

test("computeClickQualityFromRows: raw != human_likely and excluded surfaced", () => {
  const last7Iso = "2026-05-10T00:00:00.000Z";
  const rows = [
    {
      created_at: "2026-05-12T12:00:00.000Z",
      user_agent: "Mozilla/5.0 BuckPartsAudit/1.0",
      filter_id: null,
      retailer_slug: null,
      page_type: null,
      page_slug: null,
      air_purifier_retailer_link_id: null,
      vacuum_retailer_link_id: null,
      humidifier_retailer_link_id: null,
      whole_house_water_retailer_link_id: null,
      appliance_air_retailer_link_id: null,
    },
    {
      created_at: "2026-05-12T12:00:00.000Z",
      user_agent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
      filter_id: null,
      retailer_slug: null,
      page_type: null,
      page_slug: null,
      air_purifier_retailer_link_id: null,
      vacuum_retailer_link_id: null,
      humidifier_retailer_link_id: null,
      whole_house_water_retailer_link_id: null,
      appliance_air_retailer_link_id: null,
    },
    {
      created_at: "2026-05-05T12:00:00.000Z",
      user_agent: "curl/8.7.1",
      filter_id: null,
      retailer_slug: null,
      page_type: null,
      page_slug: null,
      air_purifier_retailer_link_id: null,
      vacuum_retailer_link_id: null,
      humidifier_retailer_link_id: null,
      whole_house_water_retailer_link_id: null,
      appliance_air_retailer_link_id: null,
    },
    {
      created_at: "2026-05-05T12:00:00.000Z",
      user_agent: null,
      filter_id: null,
      retailer_slug: null,
      page_type: null,
      page_slug: null,
      air_purifier_retailer_link_id: null,
      vacuum_retailer_link_id: null,
      humidifier_retailer_link_id: null,
      whole_house_water_retailer_link_id: null,
      appliance_air_retailer_link_id: null,
    },
  ];
  const q = computeClickQualityFromRows(rows, { last7Iso, raw7: 2, raw30: 4 });
  assert.equal(q.human_likely_last_30_days_clicks, 1);
  assert.equal(q.human_likely_last_7_days_clicks, 1);
  assert.equal(q.excluded_last_30_days_clicks, 3);
  assert.equal(q.excluded_by_category_30d?.INTERNAL_AUDIT, 1);
  assert.equal(q.excluded_by_category_30d?.SCRIPTED_CLIENT, 1);
  assert.equal(q.excluded_by_category_30d?.UNKNOWN, 1);
  assert.equal(q.click_freshness_status, "OK");
});

test("computeClickQualityFromRows: NO_RECENT_EVENTS when raw30 is 0", () => {
  const q = computeClickQualityFromRows([], { last7Iso: "2026-05-01T00:00:00Z", raw7: 0, raw30: 0 });
  assert.equal(q.click_freshness_status, "NO_RECENT_EVENTS");
});

test("clickSnapshotForTests fixture is OK-shaped with quality fields", () => {
  const s = clickSnapshotForTests();
  assert.equal(s.runtime_status, "OK");
  assert.equal(s.commission_or_revenue, "NOT_CONNECTED");
  assert.equal(s.raw_last_30_days_clicks, 10);
  assert.equal(s.human_likely_last_30_days_clicks, 3);
  assert.equal(s.excluded_last_30_days_clicks, 7);
});

test("buildRefrigeratorFilterHumanLikelyClicksBySlug30d counts human-likely refrigerator_filter page_slug only", () => {
  const map = buildRefrigeratorFilterHumanLikelyClicksBySlug30d([
    {
      filter_id: "f1",
      retailer_slug: "amazon",
      page_type: "refrigerator_filter",
      page_slug: "mwf",
      air_purifier_retailer_link_id: null,
      vacuum_retailer_link_id: null,
      humidifier_retailer_link_id: null,
      whole_house_water_retailer_link_id: null,
      appliance_air_retailer_link_id: null,
      created_at: "2026-05-01T00:00:00.000Z",
      user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    },
    {
      filter_id: "f1",
      retailer_slug: "amazon",
      page_type: "refrigerator_filter",
      page_slug: "mwf",
      air_purifier_retailer_link_id: null,
      vacuum_retailer_link_id: null,
      humidifier_retailer_link_id: null,
      whole_house_water_retailer_link_id: null,
      appliance_air_retailer_link_id: null,
      created_at: "2026-05-01T00:00:00.000Z",
      user_agent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    },
    {
      filter_id: "f2",
      retailer_slug: "amazon",
      page_type: "fridge_filter",
      page_slug: "other",
      air_purifier_retailer_link_id: null,
      vacuum_retailer_link_id: null,
      humidifier_retailer_link_id: null,
      whole_house_water_retailer_link_id: null,
      appliance_air_retailer_link_id: null,
      created_at: "2026-05-01T00:00:00.000Z",
      user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    },
  ]);
  assert.equal(map.get("mwf"), 1);
  assert.equal(map.has("other"), false);
});
