import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  OWNER_REPORT_ARTIFACT_DB_ALLOWED_KEYS,
  OWNER_REPORT_ARTIFACT_KEY_LIVE_SITE_SMOKE,
} from "@/lib/owner-dashboard/gsc-durable-artifact-store";

function migrationFilesAddingArtifactKeyConstraint(): string[] {
  const migDir = join(process.cwd(), "supabase/migrations");
  return readdirSync(migDir)
    .filter((f) => f.endsWith(".sql"))
    .filter((f) => {
      const c = readFileSync(join(migDir, f), "utf8");
      return (
        c.includes("add constraint owner_report_artifacts_allowed_keys") &&
        c.includes("owner_report_artifacts_allowed_keys")
      );
    })
    .sort();
}

describe("owner_report_artifacts: TypeScript keys vs migration allowlist", () => {
  it("latest migration adding owner_report_artifacts_allowed_keys lists every OWNER_REPORT_ARTIFACT_DB_ALLOWED_KEYS value", () => {
    const files = migrationFilesAddingArtifactKeyConstraint();
    assert.ok(
      files.length > 0,
      "expected at least one migration with add constraint owner_report_artifacts_allowed_keys",
    );
    const last = files[files.length - 1]!;
    const sql = readFileSync(join(process.cwd(), "supabase/migrations", last), "utf8");
    for (const key of OWNER_REPORT_ARTIFACT_DB_ALLOWED_KEYS) {
      assert.ok(
        sql.includes(`'${key}'`),
        `${last} must allow '${key}' in artifact_key check (otherwise Supabase upserts from scripts will fail)`,
      );
    }
  });

  it("live-site smoke durable writer key is part of OWNER_REPORT_ARTIFACT_DB_ALLOWED_KEYS", () => {
    assert.ok(
      (OWNER_REPORT_ARTIFACT_DB_ALLOWED_KEYS as readonly string[]).includes(
        OWNER_REPORT_ARTIFACT_KEY_LIVE_SITE_SMOKE,
      ),
    );
  });
});
