import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { isDirectBuyableSafeCtaRow } from "@/lib/retailers/launch-buy-links";

import type { SupabaseLinksBySlugResultV1 } from "./fridge-supabase-vs-csv-retailer-links-diff-v1";
import { RPWFE_OFFICIAL_GE_TARGET_URL_V1 } from "./rpwfe-official-ge-browser-capture-v1";
import {
  buildRpwfeOfficialGeSupabaseParityPlanLaneFromInputsV1,
  buildRpwfeOfficialGeSupabaseParityPlanLaneV1,
} from "./rpwfe-official-ge-supabase-parity-plan-v1";
import type { RetailerLinkCsvRowV1 } from "./universal-batch-lifecycle-apply-execution-plan-v1";

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

const goodRepoRow: RetailerLinkCsvRowV1 = {
  filter_slug: "rpwfe",
  retailer_name: "GE Appliance Parts",
  affiliate_url: RPWFE_OFFICIAL_GE_TARGET_URL_V1,
  is_primary: "true",
  sort_order: "0",
  retailer_key: "oem-parts-catalog",
  browser_truth_classification: "direct_buyable",
  browser_truth_notes:
    "RPWFE official GE guarded CSV apply v1; browser evidence data/fridge/batch-production/rpwfe-rescue/rpwfe-official-ge-browser-evidence-v1.json; customer label BuckParts Verified Link (official_manufacturer_official_ge).",
  browser_truth_checked_at: "2026-06-02T14:23:08.624Z",
};

const searchPlaceholderRow: RetailerLinkCsvRowV1 = {
  ...goodRepoRow,
  retailer_name: "OEM parts catalog (keyword lookup)",
  affiliate_url:
    "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=RPWFE",
  browser_truth_classification: "",
  browser_truth_notes: "",
  browser_truth_checked_at: "",
};

const supabaseUnknown: SupabaseLinksBySlugResultV1 = {
  status: "UNKNOWN_DB_UNAVAILABLE",
  reason: "fixture",
};

test("repo RPWFE CSV row is direct_buyable official GE spec PDP", async () => {
  const lane = await buildRpwfeOfficialGeSupabaseParityPlanLaneV1({
    rootDir: REPO_ROOT,
    loadSupabase: async () => supabaseUnknown,
  });

  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.filter_slug, "rpwfe");
  assert.equal(lane.repo_csv_status, "REPO_DIRECT_BUYABLE_OFFICIAL_GE_SPEC_PDP");
  assert.equal(lane.proposed_url, RPWFE_OFFICIAL_GE_TARGET_URL_V1);
  assert.equal(lane.proposed_browser_truth_classification, "direct_buyable");
  assert.equal(lane.proposed_retailer_name, "GE Appliance Parts");
  assert.ok(isDirectBuyableSafeCtaRow(lane.repo_csv_row ?? { affiliate_url: "" }));
});

test("lane is read-only with required blockers and no Supabase mutation", () => {
  const lane = buildRpwfeOfficialGeSupabaseParityPlanLaneFromInputsV1({
    repoCsvRow: goodRepoRow,
    supabase: supabaseUnknown,
  });

  assert.equal(lane.supabase_mutation_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.buckparts_verified_link_authorized, false);
  assert.equal(lane.owner_supabase_apply_required, true);
  assert.ok(lane.blockers.includes("owner_supabase_apply_approval_missing"));
  assert.ok(lane.blockers.includes("supabase_apply_not_authorized"));
  assert.ok(lane.blockers.includes("live_page_not_revalidated_after_supabase_parity"));
});

test("Waterdrop Amazon compatible replacement excluded from plan", () => {
  const lane = buildRpwfeOfficialGeSupabaseParityPlanLaneFromInputsV1({
    repoCsvRow: goodRepoRow,
    supabase: supabaseUnknown,
  });

  assert.equal(lane.waterdrop_in_plan, false);
  assert.equal(lane.amazon_in_plan, false);
  assert.equal(lane.compatible_replacement_in_plan, false);
  assert.equal(lane.proposed_retailer_key, "oem-parts-catalog");
  assert.doesNotMatch(JSON.stringify(lane.proposed_supabase_row_preview ?? {}), /waterdrop|amazon|WD-F19C/i);
});

test("invalid repo row degrades safely", () => {
  const lane = buildRpwfeOfficialGeSupabaseParityPlanLaneFromInputsV1({
    repoCsvRow: searchPlaceholderRow,
    supabase: supabaseUnknown,
  });

  assert.equal(lane.repo_csv_status, "REPO_NOT_DIRECT_BUYABLE");
  assert.equal(lane.proposed_supabase_parity_status, "BLOCKED_REPO_CSV_NOT_READY");
  assert.equal(lane.proposed_supabase_row_preview, null);
  assert.equal(lane.parity_action_preview, "blocked");
  assert.ok(lane.blockers.includes("repo_csv_not_direct_buyable"));
});

test("detects supabase drift when live row still search placeholder", () => {
  const supabaseDrift: SupabaseLinksBySlugResultV1 = {
    status: "CHECKED",
    slug_to_filter_id: new Map([["rpwfe", "filter-id-rpwfe"]]),
    links_by_slug: new Map([
      [
        "rpwfe",
        [
          {
            filter_id: "filter-id-rpwfe",
            retailer_key: "oem-parts-catalog",
            affiliate_url:
              "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=RPWFE",
            is_primary: true,
            browser_truth_classification: null,
          },
        ],
      ],
    ]),
  };

  const lane = buildRpwfeOfficialGeSupabaseParityPlanLaneFromInputsV1({
    repoCsvRow: goodRepoRow,
    supabase: supabaseDrift,
  });

  assert.equal(lane.proposed_supabase_parity_status, "SUPABASE_DRIFT_FROM_REPO_CSV");
  assert.equal(lane.parity_action_preview, "update_existing_primary_row");
});

test("repo committed CSV line matches expected official GE apply", () => {
  const csv = readFileSync(path.join(REPO_ROOT, "data/retailer_links.csv"), "utf8");
  assert.match(csv, /rpwfe,GE Appliance Parts,https:\/\/www\.geapplianceparts\.com\/store\/parts\/spec\/RPWFE/);
  assert.match(csv, /direct_buyable/);
});
