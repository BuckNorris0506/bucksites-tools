import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  attachOwnerQuarantinedFridgeModelsReport,
  buildOwnerQuarantinedFridgeModelsSummary,
} from "@/lib/owner-dashboard/load-command-center-report";
import {
  attachOwnerVerticalLaunchPolicyReport,
  buildOwnerVerticalLaunchPolicyReport,
} from "@/lib/owner-dashboard/owner-vertical-launch-policy";

describe("owner quarantined fridge summary", () => {
  it("includes lg-lrfxs3106s in owner quarantine summary with required contract fields", async () => {
    const summary = await buildOwnerQuarantinedFridgeModelsSummary({
      resolveModelStats: async (slug) => {
        if (slug === "lg-lrfxs3106s") {
          return { mapped_filter_count: 2, safe_cta_count: 2 };
        }
        return null;
      },
    });
    assert.ok(summary.some((r) => r.fridge_model_slug === "lg-lrfxs3106s"));
    const row = summary.find((r) => r.fridge_model_slug === "lg-lrfxs3106s");
    assert.ok(row);
    assert.equal(row.reason, "FILTER_MAPPING_CONFLICT");
    assert.equal(row.public_status, "owner_review_required");
    assert.equal(row.internal_evidence_doc, "docs/fridge-model-filter-mapping-discrepancies.md");
    assert.equal(row.owner_action_required, true);
    assert.ok(
      row.mapped_filter_count === 2 || row.mapped_filter_count === "UNKNOWN",
      "mapped_filter_count must be populated or UNKNOWN",
    );
    assert.ok(
      row.safe_cta_count === 2 || row.safe_cta_count === "UNKNOWN",
      "safe_cta_count must be populated or UNKNOWN",
    );
  });

  it("does not include non-quarantined model slugs", async () => {
    const summary = await buildOwnerQuarantinedFridgeModelsSummary({
      resolveModelStats: async () => ({ mapped_filter_count: 0, safe_cta_count: 0 }),
    });
    assert.equal(summary.some((r) => r.fridge_model_slug === "lg-lfxs26973s"), false);
  });

  it("owner report object includes quarantined fridge lane and read-only flag", () => {
    const report = attachOwnerQuarantinedFridgeModelsReport(
      { report_name: "test" },
      [
        {
          fridge_model_slug: "lg-lrfxs3106s",
          reason: "FILTER_MAPPING_CONFLICT",
          public_status: "owner_review_required",
          internal_evidence_doc: "docs/fridge-model-filter-mapping-discrepancies.md",
          mapped_filter_count: "UNKNOWN",
          safe_cta_count: "UNKNOWN",
          owner_action_required: true,
        },
      ],
    );
    assert.ok("owner_quarantined_fridge_models" in report);
    assert.equal(report.owner_quarantined_fridge_models.data_mutation, false);
    assert.ok(report.owner_quarantined_fridge_models.models.length >= 1);
  });

  it("attach chain can add vertical launch policy lane with data_mutation false", () => {
    const policy = buildOwnerVerticalLaunchPolicyReport();
    const report = attachOwnerVerticalLaunchPolicyReport(
      attachOwnerQuarantinedFridgeModelsReport({ report_name: "x" }, []),
      policy,
    );
    assert.ok("owner_vertical_launch_policy" in report);
    assert.equal(report.owner_vertical_launch_policy.data_mutation, false);
    assert.ok(report.owner_vertical_launch_policy.rows.some((r) => r.vertical_slug === "refrigerator"));
  });

  it("public fridge page behavior wiring remains unchanged", () => {
    const src = readFileSync(join(process.cwd(), "src/app/fridge/[slug]/page.tsx"), "utf8");
    assert.ok(src.includes("const reviewOverride = getFridgeModelReviewOverride(params.slug);"));
    assert.ok(src.includes("const manualEvidence = reviewOverride"));
    assert.ok(src.includes("mappedFilterCount={reviewOverride ? 0 : fridge.filters.length}"));
    assert.ok(src.includes("quarantineMessage={reviewOverride?.public_message ?? null}"));
  });
});
