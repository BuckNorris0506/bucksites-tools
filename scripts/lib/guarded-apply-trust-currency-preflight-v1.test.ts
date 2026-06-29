import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  buildGuardedApplyTrustCurrencyPreflightV1,
  guardedApplyTrustCurrencyBlocksMutationV1,
} from "./guarded-apply-trust-currency-preflight-v1";

test("guarded apply blocks when revalidation cadence expired", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "trust-preflight-"));
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
          finding_id: "test-finding",
          finding_code: "TEST",
          title: "Test",
          status: "OPEN",
          severity: "high",
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

  const preflight = buildGuardedApplyTrustCurrencyPreflightV1({
    rootDir: root,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  assert.equal(guardedApplyTrustCurrencyBlocksMutationV1(preflight), true);
  assert.ok(preflight.blockers.some((b) => b.includes("trust_currency_revalidation")));
});
