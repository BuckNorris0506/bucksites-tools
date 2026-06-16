import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CORE_400S_FLAGSHIP_SLUG,
  CORE_400S_STANDARD_FILTER_SLUG,
  deriveCore400sConfusableFamilies,
  deriveCore400sFitState,
  formatCore400sVerifiedDate,
  isCore400sFlagshipSlug,
  sortCore400sModels,
} from "./core-400s-flagship-v1";

describe("Core 400S flagship v1 derivations", () => {
  it("slug gate only allows the exact Core 400S model slug", () => {
    assert.equal(isCore400sFlagshipSlug(CORE_400S_FLAGSHIP_SLUG), true);
    assert.equal(isCore400sFlagshipSlug(" levoit-core-400s "), true);
    assert.equal(isCore400sFlagshipSlug("levoit-core-400s-rf"), false);
    assert.equal(isCore400sFlagshipSlug("levoit-core-300"), false);
  });

  it("fit state uses the existing direct-buyable winner signal", () => {
    assert.equal(
      deriveCore400sFitState({
        trust: { buyer_path_state: "show_confident_buy" },
        primaryVerifiedLink: { browser_truth_classification: "direct_buyable" },
      }),
      "exact_match",
    );
    assert.equal(
      deriveCore400sFitState({
        trust: { buyer_path_state: "show_confident_buy" },
        primaryVerifiedLink: { browser_truth_classification: null },
      }),
      "no_verified_link",
    );
    assert.equal(
      deriveCore400sFitState({
        trust: { buyer_path_state: "suppress_buy" },
        primaryVerifiedLink: { browser_truth_classification: "direct_buyable" },
      }),
      "no_verified_link",
    );
  });

  it("formats the existing verified timestamp for customer copy", () => {
    assert.equal(
      formatCore400sVerifiedDate("2026-06-12T22:15:23.992Z"),
      "Jun 12, 2026",
    );
    assert.equal(formatCore400sVerifiedDate("not-a-date"), null);
  });

  it("sorts related model lists with the flagship model first", () => {
    const sorted = sortCore400sModels([
      { id: "2", slug: "levoit-core-400s-rf", model_number: "Core 400S-RF" },
      { id: "1", slug: "levoit-core-400s", model_number: "Core 400S" },
      { id: "3", slug: "levoit-core-400-rf", model_number: "Core 400-RF" },
    ]);
    assert.deepEqual(
      sorted.map((model) => model.slug),
      ["levoit-core-400s", "levoit-core-400-rf", "levoit-core-400s-rf"],
    );
  });

  it("derives Core 200 / 300 / 600 as confusable only when they map to different filters", () => {
    const families = deriveCore400sConfusableFamilies([
      {
        id: "200",
        slug: "levoit-core-200",
        model_number: "Core 200",
        series: "Core 200",
        filters: [{ slug: "levoit-rf-cr200", oem_part_number: "LEVOIT-RF-CR200" }],
      },
      {
        id: "300",
        slug: "levoit-core-300",
        model_number: "Core 300",
        series: "Core 300",
        filters: [{ slug: "levoit-rf-rar029", oem_part_number: "LEVOIT-RF-RAR029" }],
      },
      {
        id: "600",
        slug: "levoit-core-600",
        model_number: "Core 600",
        series: "Core 600",
        filters: [{ slug: "levoit-rf-rar060", oem_part_number: "LEVOIT-RF-RAR060" }],
      },
    ]);

    assert.deepEqual(
      families.map((family) => family.series),
      ["Core 200", "Core 300", "Core 600"],
    );
  });

  it("does not derive a warning for a series that maps to the Core 400S filter", () => {
    const families = deriveCore400sConfusableFamilies([
      {
        id: "bad",
        slug: "unexpected-core-300",
        model_number: "Core 300 oddity",
        series: "Core 300",
        filters: [
          { slug: CORE_400S_STANDARD_FILTER_SLUG, oem_part_number: "LEVOIT-RF-RAR040" },
        ],
      },
      {
        id: "good",
        slug: "levoit-core-300",
        model_number: "Core 300",
        series: "Core 300",
        filters: [{ slug: "levoit-rf-rar029", oem_part_number: "LEVOIT-RF-RAR029" }],
      },
    ]);
    assert.equal(families.some((family) => family.series === "Core 300"), false);
  });
});
