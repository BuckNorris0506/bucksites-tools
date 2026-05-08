import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("owner_report_artifacts allowed keys include gsc and ga4 trust funnel", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260508153000_owner_report_artifacts_allow_ga4_trust_funnel.sql"),
    "utf8",
  );
  assert.ok(sql.includes("gsc_search_analytics"));
  assert.ok(sql.includes("ga4_trust_funnel"));
  assert.ok(sql.includes("owner_report_artifacts_allowed_keys"));
});

