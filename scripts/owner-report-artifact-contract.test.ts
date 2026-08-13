import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  OWNER_REPORT_ARTIFACT_KEY_GA4_TRUST_FUNNEL,
  OWNER_REPORT_ARTIFACT_KEY_GSC,
  OWNER_REPORT_ARTIFACT_KEY_LIVE_SITE_SMOKE,
} from "@/lib/owner-dashboard/gsc-durable-artifact-store";

function latestAllowedKeysMigration(rootDir: string): { path: string; sql: string } {
  const migrationsDir = path.join(rootDir, "supabase/migrations");
  const file = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .filter((name) => {
      const sql = readFileSync(path.join(migrationsDir, name), "utf8");
      return sql.includes("add constraint owner_report_artifacts_allowed_keys");
    })
    .sort()
    .at(-1);
  assert.ok(file, "expected an owner_report_artifacts_allowed_keys migration");
  return {
    path: path.join(migrationsDir, file),
    sql: readFileSync(path.join(migrationsDir, file), "utf8"),
  };
}

function extractAllowedArtifactKeys(sql: string): string[] {
  const check = sql.match(/check\s*\(\s*artifact_key\s+in\s*\(([^)]*)\)\s*\)/i);
  assert.ok(check, "expected artifact_key IN check constraint");
  return Array.from(check[1].matchAll(/'([^']+)'/g), (match) => match[1]).sort();
}

test("live-site smoke owner artifact key is declared in latest DB allowlist", () => {
  const rootDir = process.cwd();
  const migration = latestAllowedKeysMigration(rootDir);
  const allowedKeys = extractAllowedArtifactKeys(migration.sql);

  assert.deepEqual(allowedKeys, [
    OWNER_REPORT_ARTIFACT_KEY_GA4_TRUST_FUNNEL,
    OWNER_REPORT_ARTIFACT_KEY_GSC,
    OWNER_REPORT_ARTIFACT_KEY_LIVE_SITE_SMOKE,
  ].sort());

  const liveSmokeWriter = readFileSync(path.join(rootDir, "scripts/live-site-smoke-artifact.ts"), "utf8");
  assert.ok(liveSmokeWriter.includes("artifact_key: OWNER_REPORT_ARTIFACT_KEY_LIVE_SITE_SMOKE"));

  const liveSmokeLoader = readFileSync(
    path.join(rootDir, "scripts/lib/load-live-site-monitor-artifact.ts"),
    "utf8",
  );
  assert.ok(liveSmokeLoader.includes("artifact_key: OWNER_REPORT_ARTIFACT_KEY_LIVE_SITE_SMOKE"));
  assert.ok(migration.path.endsWith("20260513233500_owner_report_artifacts_reassert_allowed_keys.sql"));
});
