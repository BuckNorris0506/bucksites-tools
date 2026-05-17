import assert from "node:assert/strict";
import test from "node:test";

import { isSearchPlaceholderBuyLink } from "@/lib/retailers/launch-buy-links";
import {
  BATCH_NON_AMAZON_PDP_QUEUE_ROW_ID_V1,
  BATCH_PRODUCTION_SOURCE_NON_AMAZON_PDP_CANDIDATES_V1,
  buildBatchProductionRowsFromNonAmazonPdpCandidatesV1,
  isAmazonAffiliateUrlV1,
  looksLikeRetailerPdpUrlV1,
} from "./batch-production-non-amazon-pdp-source-v1";
import { buildBatchAgentEvidenceCapturePacketV1 } from "./batch-agent-evidence-capture-packet-v1";
import { buildBatchEvidenceCollectionPlanV1 } from "./batch-evidence-collection-plan-v1";
import {
  buildBatchProductionReviewReportV1,
  batchProductionReviewReportGrantsMutationAuthority,
} from "./batch-production-lane-v1";

const FIXTURE_FILTERS = `brand_slug,slug,oem_part_number,name,replacement_interval_months,notes
samsung,da97-08006b,DA97-08006B,Samsung filter case,6,""
samsung,da97-15217d,DA97-15217D,Samsung ice maker,6,""
samsung,da29-00012b,DA29-00012B,Samsung water filter,6,""
lg,adq75795101,ADQ75795101,LG filter,6,""
ge,rpwfe,RPWFE,GE RPWFE,6,""
`;

const FIXTURE_LINKS = `filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key
da97-08006b,OEM catalog,https://www.repairclinic.com/Search?SearchTerm=DA97-08006B,true,0,oem-parts-catalog
da97-15217d,OEM catalog,https://www.repairclinic.com/Search?SearchTerm=DA97-15217D,true,0,oem-parts-catalog
da29-00012b,OEM catalog,https://www.repairclinic.com/Search?SearchTerm=DA29-00012B,true,0,oem-parts-catalog
adq75795101,OEM catalog,https://www.repairclinic.com/Search?SearchTerm=ADQ75795101,true,0,oem-parts-catalog
rpwfe,OEM catalog,https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=RPWFE,true,0,oem-parts-catalog
`;

function fixtureDeps() {
  const files: Record<string, string> = {
    "/repo/data/filters.csv": FIXTURE_FILTERS,
    "/repo/data/retailer_links.csv": FIXTURE_LINKS,
  };
  return {
    readTextFile: (p: string) => files[p] ?? "",
  };
}

test("source emits max 5 rows excluding Amazon and search-placeholder PDP URLs", () => {
  const built = buildBatchProductionRowsFromNonAmazonPdpCandidatesV1("/repo", fixtureDeps());
  assert.equal(built.source, BATCH_PRODUCTION_SOURCE_NON_AMAZON_PDP_CANDIDATES_V1);
  assert.equal(built.read_only, true);
  assert.equal(built.data_mutation, false);
  assert.ok(built.rows.length <= 5);
  assert.ok(built.rows.length >= 3);
  for (const row of built.rows) {
    assert.equal(row.candidate_kind, "product");
    assert.equal(row.buyer_path_safety, "unknown");
    assert.equal(row.wrong_purchase_risk, "unknown");
    assert.equal(row.source_queue_row_id, BATCH_NON_AMAZON_PDP_QUEUE_ROW_ID_V1);
    assert.ok(row.url);
    assert.equal(isAmazonAffiliateUrlV1(row.url!), false);
    assert.equal(isSearchPlaceholderBuyLink("oem-parts-catalog", row.url!), false);
    assert.ok(looksLikeRetailerPdpUrlV1(row.url!, null));
    assert.ok(row.read_only_rationale?.includes("PROVEN:"));
    assert.ok(row.read_only_rationale?.includes("Agent should browser-inspect"));
  }
});

test("looksLikeRetailerPdpUrlV1 rejects repairclinic search URLs", () => {
  const search = "https://www.repairclinic.com/Search?SearchTerm=DA97-08006B";
  assert.equal(looksLikeRetailerPdpUrlV1(search, "oem-parts-catalog"), false);
  assert.equal(
    looksLikeRetailerPdpUrlV1(
      "https://www.appliancepartspros.com/samsung-assy-case-filter-da97-08006b-ap4578378.html",
      "appliancepartspros",
    ),
    true,
  );
});

test("non-amazon source through review and agent packet keeps may_mutate false and Layer 6 NOT_PROVEN", () => {
  const built = buildBatchProductionRowsFromNonAmazonPdpCandidatesV1("/repo", fixtureDeps());
  const report = buildBatchProductionReviewReportV1({
    rows: built.rows,
    generated_at: "t",
  });
  assert.equal(report.layer_6_founder_only_approval, "NOT_PROVEN");
  assert.equal(batchProductionReviewReportGrantsMutationAuthority(report), false);
  const plan = buildBatchEvidenceCollectionPlanV1({ reviewReport: report, generated_at: "t" });
  const packet = buildBatchAgentEvidenceCapturePacketV1({ plan, generated_at: "t" });
  assert.equal(packet.layer_6_founder_only_approval, "NOT_PROVEN");
  assert.match(packet.agent_role, /agent.*fills/i);
  assert.match(packet.owner_role, /reviews agent-filled/i);
  assert.ok(packet.agent_instructions.some((l) => /Do not instruct the owner to hand-author JSON/i.test(l)));
});
