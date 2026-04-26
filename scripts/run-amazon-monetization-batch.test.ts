import assert from "node:assert/strict";
import test from "node:test";

import {
  applySlugIncludeExclude,
  buildPlannedQueueRows,
  expectedTokensFromSlug,
  matchesFamily,
} from "./run-amazon-monetization-batch";

test("expectedTokensFromSlug extracts strict token from slug", () => {
  assert.deepEqual(expectedTokensFromSlug("pentek-rfc-20bb"), ["RFC-20BB"]);
  assert.deepEqual(expectedTokensFromSlug("mwf"), []);
});

test("matchesFamily prioritizes brand and fallback fields", () => {
  const row = {
    id: "1",
    slug: "pentek-rfc-20bb",
    oem_part_number: "RFC-20BB",
    brand_slug: "pentek",
    brand_name: "Pentek",
  };
  assert.equal(matchesFamily(row, "pentek"), true);
  assert.equal(matchesFamily(row, "rfc"), true);
  assert.equal(matchesFamily(row, "blueair"), false);
});

test("buildPlannedQueueRows outputs dry-run queue row shape", () => {
  const rows = buildPlannedQueueRows({
    runId: "run_2026_04_25_001",
    wedge: "whole_house_water",
    selectedSlugs: ["pentek-rfc-20bb", "pentek-r30-20bb"],
  });

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    run_id: "run_2026_04_25_001",
    wedge: "whole_house_water",
    filter_slug: "pentek-rfc-20bb",
    expected_tokens: ["RFC-20BB"],
    candidate_state_planned: "candidate_found",
  });
});

test("slug include narrows selection to named eligible slugs", () => {
  const eligible = [
    { id: "1", slug: "pentek-a", oem_part_number: "A", brand_slug: "pentek", brand_name: "Pentek" },
    { id: "2", slug: "pentek-b", oem_part_number: "B", brand_slug: "pentek", brand_name: "Pentek" },
  ];
  const r = applySlugIncludeExclude({
    eligible,
    limit: 10,
    slugInclude: new Set(["pentek-b"]),
    slugExclude: new Set(),
  });
  assert.deepEqual(
    r.selected.map((s) => s.slug),
    ["pentek-b"],
  );
});

test("slug exclude removes named slugs and records reason", () => {
  const eligible = [
    { id: "1", slug: "pentek-a", oem_part_number: "A", brand_slug: "pentek", brand_name: "Pentek" },
    { id: "2", slug: "pentek-b", oem_part_number: "B", brand_slug: "pentek", brand_name: "Pentek" },
  ];
  const r = applySlugIncludeExclude({
    eligible,
    limit: 10,
    slugInclude: new Set(),
    slugExclude: new Set(["pentek-a"]),
  });
  assert.deepEqual(
    r.selected.map((s) => s.slug),
    ["pentek-b"],
  );
  assert.equal(
    r.skipped.some((x) => x.filter_slug === "pentek-a" && x.reason === "excluded_by_operator"),
    true,
  );
});

test("include non-eligible slug is reported as skipped", () => {
  const eligible = [
    { id: "1", slug: "pentek-a", oem_part_number: "A", brand_slug: "pentek", brand_name: "Pentek" },
  ];
  const r = applySlugIncludeExclude({
    eligible,
    limit: 10,
    slugInclude: new Set(["pentek-missing"]),
    slugExclude: new Set(),
  });
  assert.equal(r.selected.length, 0);
  assert.equal(
    r.skipped.some((x) => x.filter_slug === "pentek-missing" && x.reason === "included_but_not_eligible"),
    true,
  );
});
