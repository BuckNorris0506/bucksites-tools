import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import type { AllProductCensusProductRowV1 } from "./all-product-safe-buyer-path-census-v1";
import {
  detectReferenceabilityGapsV1,
  filterGapsForEligibilityV1,
  gapFindingToWorkItemV1,
  REFERENCEABILITY_FRIDGE_FILTER_COMPAT_MODELS_MARKER_V1,
  REFERENCEABILITY_FRIDGE_FILTER_REPO_EVIDENCE_MARKER_V1,
  REFERENCEABILITY_FRIDGE_FILTER_TRUST_DECISION_MARKER_V1,
  buildReferenceabilityPageContextV1,
} from "./referenceability-factory-gap-detectors-v1";

const FRIDGE_FILTER_PAGE_SOURCE = readFileSync("src/app/filter/[slug]/page.tsx", "utf8");

function provenRow(slug: string): AllProductCensusProductRowV1 {
  return {
    slug,
    wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
    vertical_launch_state: "LIVE",
    page_classification: "SAFE_BUYER_PATH_PROVEN",
    indexable_in_repo_policy: true,
    public_route: `/filter/${slug}`,
    current_page_state: "PROVEN",
    retailer_row_state: "SAFE_CTA",
    evidence_files: slug === "rpwfe" ? [] : [`data/evidence/amazon-${slug}-live-outcome.json`],
    supabase_safe_path_missing_from_csv: false,
    csv_safe_path_missing_from_supabase: false,
    recommended_next_safe_action: "none",
    owner_approval_required: false,
    mutation_authorized: false,
    rescue_priority_score: 0,
  };
}

describe("refrigerator filter referenceability wiring", () => {
  test("wired filter template clears blocking OWNER_COPY and INTERNAL_LINK_PLAN gaps", () => {
    assert.ok(FRIDGE_FILTER_PAGE_SOURCE.includes(REFERENCEABILITY_FRIDGE_FILTER_TRUST_DECISION_MARKER_V1));
    assert.ok(FRIDGE_FILTER_PAGE_SOURCE.includes(REFERENCEABILITY_FRIDGE_FILTER_COMPAT_MODELS_MARKER_V1));
    assert.ok(FRIDGE_FILTER_PAGE_SOURCE.includes(REFERENCEABILITY_FRIDGE_FILTER_REPO_EVIDENCE_MARKER_V1));

    const context = buildReferenceabilityPageContextV1({
      wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
      slug: "edr4rxd1",
      compat_model_count: 4,
      filter_row_present: true,
      oem_part_number: "EDR4RXD1",
      browser_truth_checked_at: "2026-06-01T00:00:00.000Z",
      browser_truth_classification: "direct_buyable",
      page_template_source: FRIDGE_FILTER_PAGE_SOURCE,
      marketing_risk: null,
      ap_runtime_gate_state: null,
    });

    const row = provenRow("edr4rxd1");
    const gaps = filterGapsForEligibilityV1({
      findings: detectReferenceabilityGapsV1({ row, context, now: new Date("2026-06-10T12:00:00.000Z") }),
      row,
      context,
    });
    const workItems = gaps
      .map((g) => gapFindingToWorkItemV1(g, row))
      .filter((w): w is NonNullable<typeof w> => w != null);
    const blocking = workItems.filter((w) =>
      ["OWNER_COPY_REVIEW", "INTERNAL_LINK_PLAN", "STRUCTURED_DATA_WIRE"].includes(
        w.permitted_action_class,
      ),
    );

    assert.equal(blocking.length, 0);
  });

  test("rpwfe clears evidence_presentation OWNER_COPY when repo evidence section wired", () => {
    const context = buildReferenceabilityPageContextV1({
      wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
      slug: "rpwfe",
      compat_model_count: 3,
      filter_row_present: true,
      oem_part_number: "RPWFE",
      browser_truth_checked_at: "2026-06-02T14:23:08.624Z",
      browser_truth_classification: "direct_buyable",
      page_template_source: FRIDGE_FILTER_PAGE_SOURCE,
      marketing_risk: null,
      ap_runtime_gate_state: null,
    });
    const row = provenRow("rpwfe");
    const gaps = filterGapsForEligibilityV1({
      findings: detectReferenceabilityGapsV1({ row, context, now: new Date("2026-06-10T12:00:00.000Z") }),
      row,
      context,
    });
    const blocking = gaps.filter(
      (g) =>
        g.permitted_action_class === "OWNER_COPY_REVIEW" &&
        g.improvement_class === "evidence_presentation",
    );
    assert.equal(blocking.length, 0);
  });
});
