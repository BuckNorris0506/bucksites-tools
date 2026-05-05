import assert from "node:assert/strict";
import test from "node:test";

import { CATALOG_HUB_LAUNCH_CATEGORIES } from "@/lib/catalog/catalog-availability";

test("/catalog hub lists only LIVE public-discovery categories", () => {
  assert.deepEqual(CATALOG_HUB_LAUNCH_CATEGORIES, ["refrigerator_water"]);
});
