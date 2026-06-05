import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import {
  FRIDGE_OWNER_BROWSER_PROOF_ASSIST_BUNDLE_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_ASSIST_COHORT_SIZE_V1,
  FRIDGE_OWNER_BROWSER_PROOF_ASSIST_EXPECTED_SLUGS_V1,
  FRIDGE_OWNER_BROWSER_PROOF_ASSIST_EXTRA_EXCLUDED_SLUGS_V1,
  FRIDGE_OWNER_BROWSER_PROOF_ASSIST_MISSION_TYPE_V1,
  deriveOwnerBrowserProofAssistValidationStatusV1,
  loadOwnerBrowserProofAssistBundleV1,
  runOwnerBrowserProofAssistValidationV1,
  validateOwnerBrowserProofAssistBundleIntegrityV1,
  type OwnerBrowserProofAssistBundleV1,
} from "./fridge-safe-link-owner-browser-proof-assist-validation-v1";
import { FRIDGE_OWNER_BROWSER_PROOF_EXCLUDED_SLUGS_V1 } from "./fridge-safe-link-owner-browser-proof-batch-validation-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  path.join(ROOT, "scripts/lib/fridge-safe-link-owner-browser-proof-assist-validation-v1.ts"),
  "utf8",
);
const RUNNER_SOURCE = readFileSync(
  path.join(ROOT, "scripts/run-fridge-safe-link-owner-browser-proof-assist-cursor-validation-v1.ts"),
  "utf8",
);

describe("fridge-safe-link-owner-browser-proof-assist-validation-v1", () => {
  test("7-slug assist bundle parses and matches expected contract", () => {
    const bundle = loadOwnerBrowserProofAssistBundleV1(ROOT);
    assert.equal(bundle.contract, "buckparts_hyperagent_batch_bundle_v1");
    assert.equal(bundle.mission_type, FRIDGE_OWNER_BROWSER_PROOF_ASSIST_MISSION_TYPE_V1);
    assert.equal(bundle.bundle_id, "6d1c66c0-acd6-4083-9169-99f2a21ec8e8");
    assert.equal(bundle.manifest.manifest_id, "e2425548-6548-4d91-a01b-04e1cdee3818");
    assert.equal(bundle.packets.length, FRIDGE_OWNER_BROWSER_PROOF_ASSIST_COHORT_SIZE_V1);
    assert.equal(bundle.manifest.total_slugs, FRIDGE_OWNER_BROWSER_PROOF_ASSIST_COHORT_SIZE_V1);
    const slugs = bundle.packets.map((p) => p.slug).sort();
    assert.deepEqual(slugs, [...FRIDGE_OWNER_BROWSER_PROOF_ASSIST_EXPECTED_SLUGS_V1].sort());
  });

  test("assist bundle integrity passes for committed intake bundle", () => {
    const bundle = loadOwnerBrowserProofAssistBundleV1(ROOT);
    const integrity = validateOwnerBrowserProofAssistBundleIntegrityV1(bundle);
    assert.equal(integrity.authentic, true, integrity.errors.join("; "));
  });

  test("excluded 14/26-slug slugs fail integrity if present", () => {
    const bundle = loadOwnerBrowserProofAssistBundleV1(ROOT);
    for (const excluded of [
      ...FRIDGE_OWNER_BROWSER_PROOF_EXCLUDED_SLUGS_V1,
      ...FRIDGE_OWNER_BROWSER_PROOF_ASSIST_EXTRA_EXCLUDED_SLUGS_V1,
    ]) {
      const poisoned = structuredClone(bundle) as OwnerBrowserProofAssistBundleV1;
      poisoned.packets.push(structuredClone(bundle.packets[0]!));
      poisoned.packets[poisoned.packets.length - 1]!.slug = excluded;
      const integrity = validateOwnerBrowserProofAssistBundleIntegrityV1(poisoned);
      assert.equal(integrity.authentic, false, `expected fail for ${excluded}`);
      assert.ok(integrity.errors.some((e) => e.includes(excluded)));
    }
  });

  test("edr3rxd1 B087PDLZL9 is DO_NOT_USE only, never an accepted candidate", () => {
    const bundle = loadOwnerBrowserProofAssistBundleV1(ROOT);
    const result = runOwnerBrowserProofAssistValidationV1({ rootDir: ROOT, bundle });
    assert.equal(result.edr3_b087_excluded_as_oem, true);
    assert.equal(result.edr3_b087_in_do_not_use, true);
    assert.equal(result.edr3_b087_in_urls_to_avoid_only, true);

    const edr3 = bundle.packets.find((p) => p.slug === "edr3rxd1")!;
    assert.ok(
      !(edr3.candidate_urls ?? []).some((c) => c.url.includes("B087PDLZL9")),
      "B087 must not be in candidate_urls",
    );
    assert.ok(
      (edr3.urls_to_avoid ?? []).some((u) => u.url.includes("B087PDLZL9")),
      "B087 must be in urls_to_avoid",
    );
    assert.ok(
      (bundle.do_not_use ?? []).some((d) => d.url.includes("B087PDLZL9")),
      "B087 must be in do_not_use",
    );

    const poisoned = structuredClone(bundle) as OwnerBrowserProofAssistBundleV1;
    const pkt = poisoned.packets.find((p) => p.slug === "edr3rxd1")!;
    pkt.candidate_urls!.push({
      url: "https://www.amazon.com/dp/B087PDLZL9",
      retailer: "Amazon",
      oem_signal: "OEM",
    });
    const bad = runOwnerBrowserProofAssistValidationV1({ rootDir: ROOT, bundle: poisoned });
    assert.equal(bad.edr3_b087_excluded_as_oem, false);
    assert.equal(deriveOwnerBrowserProofAssistValidationStatusV1(bad), "VALIDATION_FAIL");
  });

  test("authorization flags remain false and truth closure is not claimed", () => {
    const bundle = loadOwnerBrowserProofAssistBundleV1(ROOT);
    const result = runOwnerBrowserProofAssistValidationV1({ rootDir: ROOT, bundle });
    assert.equal(result.authorization_flags_all_false, true);
    assert.equal(bundle.read_only, true);
    assert.equal(bundle.truth_closure_claimed, false);
    assert.equal(bundle.command_center_closure_claimed, false);
    assert.equal(bundle.manifest.apply_planning_authorized, false);
    assert.equal(bundle.manifest.verified_link_authorized, false);
    assert.ok(bundle.packets.every((p) => p.read_only === true && p.truth_closure_claimed === false));
    assert.notEqual(deriveOwnerBrowserProofAssistValidationStatusV1(result), "VALIDATION_PASS");
  });

  test("no /go fetches and no retailer_links or evidence writes in lib or runner", () => {
    assert.ok(!LIB_SOURCE.includes("buckparts.com/go"));
    assert.ok(!LIB_SOURCE.includes("/go/"));
    assert.ok(!RUNNER_SOURCE.includes("/go"));
    assert.ok(!LIB_SOURCE.includes('writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")'));
    assert.ok(!LIB_SOURCE.includes('writeFileSync(path.join(args.rootDir, "data/evidence/'));
    assert.ok(!RUNNER_SOURCE.includes("data/retailer_links.csv"));
    assert.ok(!RUNNER_SOURCE.includes("data/evidence/"));
  });

  test("bundle file path is the assist draft", () => {
    assert.equal(
      FRIDGE_OWNER_BROWSER_PROOF_ASSIST_BUNDLE_REL_V1,
      "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-assist-v1.json",
    );
  });
});
