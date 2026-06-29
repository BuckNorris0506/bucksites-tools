import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { buildTrustCurrencyCommandCenterLaneV1 } from "./buckparts-trust-currency-command-center-v1";

test("trust_currency_v1 surfaces expired revalidation as blocking not report-only", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "trust-cc-"));
  const registryDir = path.join(root, "data/truth-integrity");
  mkdirSync(registryDir, { recursive: true });
  writeFileSync(
    path.join(registryDir, "truth-integrity-registry-v1.json"),
    JSON.stringify({
      contract: "truth_integrity_registry_v1",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      findings: [
        {
          finding_id: "cc-test-finding",
          finding_code: "TEST",
          title: "Test",
          status: "OPEN",
          severity: "critical",
          truth_surface: "buy_path",
          summary: "test",
          proven_gap: "test",
          false_safety_risk: "test",
          smallest_safe_fix: "test",
          re_audit: {
            next_re_audit_after: "2020-01-01T00:00:00.000Z",
            last_re_audit_at: null,
            cadence_days: 30,
            re_audit_owner: "test",
          },
          validation_commands: { prove_gap: ["npm test"] },
        },
      ],
    }),
  );

  const lane = buildTrustCurrencyCommandCenterLaneV1({
    rootDir: root,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  assert.equal(lane.blocks_public_serving, true);
  assert.equal(lane.blocks_guarded_apply, true);
  assert.equal(lane.blocking_stale_critical, true);
  assert.ok(lane.guarded_apply_preflight_blockers.length > 0);
});
