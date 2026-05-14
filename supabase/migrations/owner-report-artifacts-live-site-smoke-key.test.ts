import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { OWNER_REPORT_ARTIFACT_KEY_LIVE_SITE_SMOKE } from "@/lib/owner-dashboard/gsc-durable-artifact-store";

test("owner_report_artifacts allow-live-site migration includes the TypeScript live-site artifact key", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260509120000_owner_report_artifacts_allow_live_site_smoke.sql"),
    "utf8",
  );
  assert.ok(sql.includes(OWNER_REPORT_ARTIFACT_KEY_LIVE_SITE_SMOKE));
  assert.ok(sql.includes("owner_report_artifacts_allowed_keys"));
});

test("reassert migration repeats same live_site_smoke_v1 allowlist for repair deploys", () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20260510120000_owner_report_artifacts_reassert_allowed_keys_live_site_smoke_v1.sql",
    ),
    "utf8",
  );
  assert.ok(sql.includes(OWNER_REPORT_ARTIFACT_KEY_LIVE_SITE_SMOKE));
  assert.ok(sql.includes("owner_report_artifacts_allowed_keys"));
});
