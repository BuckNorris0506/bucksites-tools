import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { AP_HUB_DEMAND_LOOKUP_CANDIDATE_SLUGS_V1 } from "@/lib/air-purifier/ap-hub-demand-lookups-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.."));

function modelsCsvSlugs(): Set<string> {
  const csv = readFileSync(path.join(REPO_ROOT, "data/air-purifier/models.csv"), "utf8");
  const slugs = new Set<string>();
  for (const line of csv.split("\n")) {
    if (!line.trim() || line.startsWith("brand,")) continue;
    const parts = line.split(",");
    if (parts.length >= 2) slugs.add(parts[1]!.trim());
  }
  return slugs;
}

describe("ap-hub-demand-lookups-v1", () => {
  it("candidate slugs are proven in data/air-purifier/models.csv", () => {
    const proven = modelsCsvSlugs();
    for (const slug of AP_HUB_DEMAND_LOOKUP_CANDIDATE_SLUGS_V1) {
      assert.ok(proven.has(slug), `missing models.csv slug: ${slug}`);
    }
  });

  it("steers shark-hp150 first", () => {
    assert.equal(AP_HUB_DEMAND_LOOKUP_CANDIDATE_SLUGS_V1[0], "shark-hp150");
  });
});
