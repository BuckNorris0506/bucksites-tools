import assert from "node:assert/strict";
import test from "node:test";

import { selectBatchSlugs } from "./generate-fridge-non-amazon-review-packets";

test("batch mode excludes monetized slugs by default", () => {
  const selected = selectBatchSlugs({
    candidateSlugs: ["da97-08006b", "da97-15217d", "da29-00012b"],
    ctaStatusBySlug: new Map([
      ["da97-08006b", "has_valid_cta (1)"],
      ["da97-15217d", "has_valid_cta (1)"],
      ["da29-00012b", "no_valid_cta"],
    ]),
    limit: 10,
    includeMonetized: false,
  });
  assert.deepEqual(selected, ["da29-00012b"]);
});

test("batch mode can include monetized slugs with flag", () => {
  const selected = selectBatchSlugs({
    candidateSlugs: ["da97-08006b", "da97-15217d", "da29-00012b"],
    ctaStatusBySlug: new Map([
      ["da97-08006b", "has_valid_cta (1)"],
      ["da97-15217d", "has_valid_cta (1)"],
      ["da29-00012b", "no_valid_cta"],
    ]),
    limit: 10,
    includeMonetized: true,
  });
  assert.deepEqual(selected, ["da29-00012b", "da97-08006b", "da97-15217d"]);
});
