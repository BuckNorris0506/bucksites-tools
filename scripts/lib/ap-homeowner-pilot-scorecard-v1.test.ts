import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { GscTrackedPageSliceV1 } from "@/lib/owner-dashboard/gsc-api-artifact";
import {
  buildApHomeownerPilotScorecardRows,
  buildApHomeownerPilotScorecardV1Report,
  countApHomeownerPilotHandoffClicksBySlug30d,
  interpretApHomeownerPilotScorecardRow,
} from "./ap-homeowner-pilot-scorecard-v1";

const PAGE_TARGETS = [
  { slug: "medify-ma50-rf", page_url: "https://buckparts.com/air-purifier/filter/medify-ma50-rf" },
  { slug: "levoit-rf-rar040", page_url: "https://buckparts.com/air-purifier/filter/levoit-rf-rar040" },
  { slug: "coway-max2-hepa", page_url: "https://buckparts.com/air-purifier/filter/coway-max2-hepa" },
] as const;

function slice(
  slug: string,
  match_status: GscTrackedPageSliceV1["match_status"],
  impressions: number | "UNKNOWN" = 0,
  clicks: number | "UNKNOWN" = 0,
): GscTrackedPageSliceV1 {
  const target = PAGE_TARGETS.find((row) => row.slug === slug)!;
  return {
    slug,
    page_url: target.page_url,
    match_status,
    impressions,
    clicks,
    ctr: "UNKNOWN",
    average_position: "UNKNOWN",
    gsc_page_key: "UNKNOWN",
  };
}

describe("ap_homeowner_pilot_scorecard_v1", () => {
  it("emits all three pilot rows", () => {
    const rows = buildApHomeownerPilotScorecardRows({
      tracked_page_slices_v1: PAGE_TARGETS.map((target) =>
        slice(target.slug, "ZERO_IN_RANGE"),
      ),
      handoffClicksBySlug: new Map([
        ["medify-ma50-rf", 0],
        ["levoit-rf-rar040", 0],
        ["coway-max2-hepa", 0],
      ]),
      clickQueryStatus: "OK",
      pageTargets: [...PAGE_TARGETS],
    });
    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.map((row) => row.slug).sort(),
      ["coway-max2-hepa", "levoit-rf-rar040", "medify-ma50-rf"],
    );
    assert.ok(rows.every((row) => row.revenue_status === "NOT_CONNECTED"));
  });

  it("interprets ZERO_IN_RANGE with nonzero handoffs", () => {
    assert.equal(
      interpretApHomeownerPilotScorecardRow({
        gsc_match_status: "ZERO_IN_RANGE",
        gsc_impressions_30d: 0,
        handoff_status: "PROVEN_NONZERO",
        handoff_clicks_30d: 12,
      }),
      "HANDOFFS_WITHOUT_PROVEN_GSC_DEMAND",
    );
    const rows = buildApHomeownerPilotScorecardRows({
      tracked_page_slices_v1: [slice("levoit-rf-rar040", "ZERO_IN_RANGE")],
      handoffClicksBySlug: new Map([["levoit-rf-rar040", 12]]),
      clickQueryStatus: "OK",
      pageTargets: [...PAGE_TARGETS],
    });
    const levoit = rows.find((row) => row.slug === "levoit-rf-rar040");
    assert.equal(levoit?.interpretation, "HANDOFFS_WITHOUT_PROVEN_GSC_DEMAND");
    assert.equal(levoit?.handoff_status, "PROVEN_NONZERO");
  });

  it("interprets zero handoffs in window", () => {
    assert.equal(
      interpretApHomeownerPilotScorecardRow({
        gsc_match_status: "ZERO_IN_RANGE",
        gsc_impressions_30d: 0,
        handoff_status: "PROVEN_ZERO",
        handoff_clicks_30d: 0,
      }),
      "NO_HANDOFFS_IN_WINDOW",
    );
    assert.equal(
      interpretApHomeownerPilotScorecardRow({
        gsc_match_status: "FOUND",
        gsc_impressions_30d: 40,
        handoff_status: "PROVEN_ZERO",
        handoff_clicks_30d: 0,
      }),
      "NO_HANDOFFS_IN_WINDOW",
    );
  });

  it("interprets GSC QUERY_FAILED and NOT_FETCHED as measurement incomplete", () => {
    for (const gsc_match_status of ["QUERY_FAILED", "NOT_FETCHED"] as const) {
      assert.equal(
        interpretApHomeownerPilotScorecardRow({
          gsc_match_status,
          gsc_impressions_30d: "UNKNOWN",
          handoff_status: "PROVEN_ZERO",
          handoff_clicks_30d: 0,
        }),
        "MEASUREMENT_INCOMPLETE",
      );
    }
    const rows = buildApHomeownerPilotScorecardRows({
      tracked_page_slices_v1: [slice("medify-ma50-rf", "QUERY_FAILED", "UNKNOWN", "UNKNOWN")],
      handoffClicksBySlug: new Map([["medify-ma50-rf", 0]]),
      clickQueryStatus: "OK",
      pageTargets: [...PAGE_TARGETS],
    });
    const medify = rows.find((row) => row.slug === "medify-ma50-rf");
    assert.equal(medify?.interpretation, "MEASUREMENT_INCOMPLETE");
  });

  it("keeps handoff_status UNKNOWN when click query fails", () => {
    const rows = buildApHomeownerPilotScorecardRows({
      tracked_page_slices_v1: PAGE_TARGETS.map((target) => slice(target.slug, "ZERO_IN_RANGE")),
      handoffClicksBySlug: null,
      clickQueryStatus: "UNKNOWN",
      pageTargets: [...PAGE_TARGETS],
    });
    assert.ok(rows.every((row) => row.handoff_status === "UNKNOWN"));
    assert.ok(rows.every((row) => row.handoff_clicks_30d === "UNKNOWN"));
    assert.ok(rows.every((row) => row.interpretation === "MEASUREMENT_INCOMPLETE"));
  });

  it("counts handoffs by pilot slug through link id map", () => {
    const counts = countApHomeownerPilotHandoffClicksBySlug30d({
      clickRows: [
        {
          filter_id: null,
          retailer_slug: null,
          page_type: null,
          page_slug: null,
          air_purifier_retailer_link_id: "link-levoit",
          vacuum_retailer_link_id: null,
          humidifier_retailer_link_id: null,
          whole_house_water_retailer_link_id: null,
          appliance_air_retailer_link_id: null,
          created_at: "2026-06-01T00:00:00.000Z",
          user_agent: "Mozilla/5.0",
        },
        {
          filter_id: null,
          retailer_slug: null,
          page_type: null,
          page_slug: null,
          air_purifier_retailer_link_id: "link-levoit",
          vacuum_retailer_link_id: null,
          humidifier_retailer_link_id: null,
          whole_house_water_retailer_link_id: null,
          appliance_air_retailer_link_id: null,
          created_at: "2026-06-02T00:00:00.000Z",
          user_agent: "Mozilla/5.0",
        },
      ],
      linkIdToFilterSlug: new Map([["link-levoit", "levoit-rf-rar040"]]),
    });
    assert.equal(counts.get("levoit-rf-rar040"), 2);
    assert.equal(counts.get("medify-ma50-rf"), 0);
  });

  it("buildApHomeownerPilotScorecardV1Report uses injected GSC artifact slices", async () => {
    const report = await buildApHomeownerPilotScorecardV1Report({
      rootDir: process.cwd(),
      clickRows30d: [],
      clickQueryStatus: "OK",
      loadGscArtifact: async () => ({
        ok: true,
        source: "test",
        artifact: {
          status: "OK",
          fetched_at: "2026-06-17T00:00:00.000Z",
          property: "sc-domain:buckparts.com",
          date_range: { start_date: "2026-05-16", end_date: "2026-06-14" },
          total_clicks: 1,
          total_impressions: 414,
          average_ctr: 0,
          average_position: 0,
          top_queries_by_clicks: "UNKNOWN",
          top_queries_by_impressions: "UNKNOWN",
          top_pages_by_clicks: "UNKNOWN",
          top_pages_by_impressions: "UNKNOWN",
          high_impression_low_click_opportunities: "UNKNOWN",
          tracked_page_slices_v1: PAGE_TARGETS.map((target) => slice(target.slug, "ZERO_IN_RANGE")),
          proven_facts: [],
          unknown_facts: [],
          provenance: {
            source: "google_search_console_api",
            scope: "https://www.googleapis.com/auth/webmasters.readonly",
            writer: "test",
          },
        },
      }),
      loadLinkIdToFilterSlug: async () => new Map(),
    });
    assert.equal(report.contract, "ap_homeowner_pilot_scorecard_v1");
    assert.equal(report.rows.length, 3);
    assert.equal(report.runtime_status, "OK");
  });
});
