import assert from "node:assert/strict";
import test from "node:test";

import { buildGscSearchAnalyticsArtifact } from "./fetch-buckparts-gsc-artifact";

test("missing gsc env returns UNKNOWN_CONFIG artifact and no fake metrics", async () => {
  const artifact = await buildGscSearchAnalyticsArtifact({
    env: {
      GSC_PROPERTY_SITE_URL: "",
      GSC_SERVICE_ACCOUNT_JSON: "",
      GSC_SERVICE_ACCOUNT_KEY_PATH: "",
    },
  });
  assert.equal(artifact.status, "UNKNOWN_CONFIG");
  assert.equal(artifact.total_clicks, "UNKNOWN");
  assert.equal(artifact.total_impressions, "UNKNOWN");
  assert.equal(artifact.average_ctr, "UNKNOWN");
});
