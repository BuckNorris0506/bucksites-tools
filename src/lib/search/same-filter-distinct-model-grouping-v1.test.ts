import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyLevoitCore300IdentityV1,
  compactModelNumberV1,
  layoutCore300SameFilterSearchHitsV1,
  SAME_FILTER_DISTINCT_MODEL_COPY_V1,
} from "./same-filter-distinct-model-grouping-v1";

const FILTER = {
  oem_part_number: "LEVOIT-CORE-300-P-RF",
  slug: "levoit-rf-rar029",
};

function model(
  slug: string,
  model_number: string,
  filters: { oem_part_number: string; slug: string }[] = [FILTER],
) {
  return {
    kind: "model" as const,
    slug,
    model_number,
    brand_name: "Levoit",
    compatible_filters: filters,
  };
}

test("compactModelNumberV1 strips color punctuation", () => {
  assert.equal(compactModelNumberV1("Core 300 (Black)"), "CORE300BLACK");
  assert.equal(compactModelNumberV1("Core 300S-P Smart"), "CORE300SPSMART");
  assert.equal(compactModelNumberV1("Core300S"), "CORE300S");
});

test("Core 300 and Core 300S stay distinct families", () => {
  const core300 = classifyLevoitCore300IdentityV1("Core 300");
  const core300s = classifyLevoitCore300IdentityV1("Core 300S");
  assert.equal(core300.familyKey, "core-300");
  assert.equal(core300.isCanonical, true);
  assert.equal(core300s.familyKey, "core-300s");
  assert.equal(core300s.isCanonical, true);
  assert.notEqual(core300.familyKey, core300s.familyKey);
});

test("color and -P listings are aliases of the consumer unit, not a merge of 300 and 300S", () => {
  const cases: Array<[string, "core-300" | "core-300s"]> = [
    ["Core 300 (Black)", "core-300"],
    ["Core 300 (White)", "core-300"],
    ["Core 300-P", "core-300"],
    ["Core 300-P Black", "core-300"],
    ["Core 300S (Black)", "core-300s"],
    ["Core 300S (White)", "core-300s"],
    ["Core 300S-P Smart", "core-300s"],
    ["Core300S", "core-300s"],
  ];
  for (const [modelNumber, family] of cases) {
    const got = classifyLevoitCore300IdentityV1(modelNumber);
    assert.equal(got.familyKey, family, modelNumber);
    assert.equal(got.isCanonical, false, modelNumber);
    assert.equal(got.classification, "ALIAS", modelNumber);
  }
});

test("filter-named and revision-like records stay ungrouped", () => {
  for (const modelNumber of ["Core 300-RF", "Core 300-RAC", "Core 300-RWM"]) {
    const got = classifyLevoitCore300IdentityV1(modelNumber);
    assert.equal(got.familyKey, null, modelNumber);
  }
});

test("Core 300 Smart and SKU-like identifiers stay ungrouped", () => {
  assert.equal(classifyLevoitCore300IdentityV1("Core 300 Smart").familyKey, null);
  assert.equal(classifyLevoitCore300IdentityV1("LAP-C302S-WUSR").familyKey, null);
  assert.equal(classifyLevoitCore300IdentityV1("Core P350").familyKey, null);
  assert.equal(classifyLevoitCore300IdentityV1("HEAPAPLVNUS0161Y").familyKey, null);
});

test("layout nests Core 300 aliases, keeps Core 300S distinct, and promotes the shared filter", () => {
  const models = [
    model("levoit-core-300", "Core 300"),
    model("levoit-core-300-black", "Core 300 (Black)"),
    model("levoit-core-300-p", "Core 300-P"),
    model("levoit-core-300s", "Core 300S"),
    model("levoit-core-300s-white", "Core 300S (White)"),
    model("levoit-core-300s-p-smart", "Core 300S-P Smart"),
    model("levoit-core-300-rf", "Core 300-RF"),
    model("levoit-core-300-rac", "Core 300-RAC"),
    model("levoit-core-300-smart", "Core 300 Smart"),
  ];
  const filters = [
    {
      kind: "filter" as const,
      slug: "levoit-rf-rar029",
      oem_part_number: "LEVOIT-CORE-300-P-RF",
      name: "Core 300 Series Original Filter (Core 300-P-RF)",
    },
  ];

  const layout = layoutCore300SameFilterSearchHitsV1({ models, filters });
  assert.equal(layout.groupingApplied, true);
  assert.equal(layout.sharedFilter?.slug, "levoit-rf-rar029");
  assert.equal(layout.families.length, 2);
  assert.equal(layout.families[0]?.familyKey, "core-300");
  assert.equal(layout.families[0]?.canonical?.slug, "levoit-core-300");
  assert.deepEqual(
    layout.families[0]?.aliases.map((m) => m.model_number),
    ["Core 300 (Black)", "Core 300-P"],
  );
  assert.equal(layout.families[1]?.familyKey, "core-300s");
  assert.equal(layout.families[1]?.canonical?.slug, "levoit-core-300s");
  assert.ok(layout.families[1]?.aliases.some((m) => m.model_number === "Core 300S-P Smart"));
  assert.deepEqual(
    layout.ungroupedModels.map((m) => m.model_number).sort(),
    ["Core 300 Smart", "Core 300-RAC", "Core 300-RF"],
  );
  assert.equal(layout.remainingFilters.length, 0);

  const allSlugs = [
    ...layout.families.flatMap((family) => family.members.map((m) => m.slug)),
    ...layout.ungroupedModels.map((m) => m.slug),
  ].sort();
  assert.deepEqual(allSlugs, [...models.map((m) => m.slug)].sort());
});

test("layout does not apply when models do not share one filter", () => {
  const layout = layoutCore300SameFilterSearchHitsV1({
    models: [
      model("levoit-core-300", "Core 300"),
      model("levoit-core-300-black", "Core 300 (Black)", [
        { oem_part_number: "OTHER", slug: "other-filter" },
      ]),
    ],
    filters: [],
  });
  assert.equal(layout.groupingApplied, false);
  assert.equal(layout.ungroupedModels.length, 2);
});

test("layout does not apply to unrelated catalogs that merely share a filter", () => {
  const layout = layoutCore300SameFilterSearchHitsV1({
    models: [
      model("honeywell-hpa300", "HPA300"),
      model("honeywell-hpa304", "HPA304"),
      model("honeywell-hpa3100", "HPA3100"),
    ],
    filters: [],
  });
  assert.equal(layout.groupingApplied, false);
});

test("production Core 300 search shape promotes the filter and keeps 300 vs 300S distinct", () => {
  const productionModels = [
    "Core 300",
    "Core 300 (Black)",
    "Core 300-P",
    "Core 300-P Black",
    "Core 300-RAC",
    "Core 300-RF",
    "Core 300-RWM",
    "Core 300 Smart",
    "Core 300 (White)",
    "Core 300S",
    "Core 300S (Black)",
    "Core 300S-P Smart",
    "Core 300S (White)",
    "Core300S",
  ].map((model_number, i) =>
    model(`slug-${i}`, model_number),
  );
  const layout = layoutCore300SameFilterSearchHitsV1({
    models: productionModels,
    filters: [
      {
        kind: "filter",
        slug: "levoit-rf-rar029",
        oem_part_number: "LEVOIT-CORE-300-P-RF",
        name: "Core 300 Series Original Filter (Core 300-P-RF)",
      },
    ],
  });
  assert.equal(layout.groupingApplied, true);
  assert.equal(layout.sharedFilter?.oem_part_number, "LEVOIT-CORE-300-P-RF");
  assert.deepEqual(
    layout.families.map((family) => family.familyLabel),
    ["Core 300", "Core 300S"],
  );
  assert.equal(layout.families[0]?.canonical?.model_number, "Core 300");
  assert.equal(layout.families[1]?.canonical?.model_number, "Core 300S");
  assert.ok(layout.ungroupedModels.some((m) => m.model_number === "Core 300-RF"));
  assert.ok(layout.ungroupedModels.some((m) => m.model_number === "Core 300 Smart"));
  assert.equal(layout.families.flatMap((f) => f.members).length + layout.ungroupedModels.length, 14);
});

test("customer copy does not call Verified Link the answer and does not claim machines are the same", () => {
  assert.match(SAME_FILTER_DISTINCT_MODEL_COPY_V1.distinctMachineNote, /different machines/i);
  assert.match(SAME_FILTER_DISTINCT_MODEL_COPY_V1.sharedFilterNote, /does not make the machines the same/i);
  assert.doesNotMatch(SAME_FILTER_DISTINCT_MODEL_COPY_V1.sharedFilterNote, /Verified Link/);
  assert.doesNotMatch(SAME_FILTER_DISTINCT_MODEL_COPY_V1.distinctMachineNote, /Verified Link/);
});
