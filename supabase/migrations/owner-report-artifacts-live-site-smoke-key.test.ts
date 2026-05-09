import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("owner_report_artifacts allowed keys include live_site_smoke_v1", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260509120000_owner_report_artifacts_allow_live_site_smoke.sql"),
    "utf8",
  );
  assert.ok(sql.includes("live_site_smoke_v1"));
  assert.ok(sql.includes("owner_report_artifacts_allowed_keys"));
});
