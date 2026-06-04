import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import {
  FRIDGE_OWNER_BROWSER_PROOF_BATCH_BUNDLE_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_BATCH_COHORT_SIZE_V1,
  FRIDGE_OWNER_BROWSER_PROOF_EXCLUDED_SLUGS_V1,
  FRIDGE_OWNER_BROWSER_PROOF_EXPECTED_SLUGS_V1,
  classifyOwnerBrowserProofCandidateUrlV1,
  deriveOwnerBrowserProofValidationStatusV1,
  runOwnerBrowserProofBatchValidationV1,
  validateOwnerBrowserProofBatchIntegrityV1,
  type OwnerBrowserProofBatchBundleV1,
} from "./fridge-safe-link-owner-browser-proof-batch-validation-v1";
import {
  FRIDGE_SAFE_LINK_BATCH_COHORT_SIZE_V1,
  validateHyperAgentBatchBundleForCursorValidationV1,
} from "./buckparts-ops-agent-workflow-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  path.join(ROOT, "scripts/lib/fridge-safe-link-owner-browser-proof-batch-validation-v1.ts"),
  "utf8",
);
const RUNNER_SOURCE = readFileSync(
  path.join(ROOT, "scripts/run-fridge-safe-link-owner-browser-proof-cursor-validation-v1.ts"),
  "utf8",
);

function loadOwnerBrowserBundle(): OwnerBrowserProofBatchBundleV1 {
  return JSON.parse(
    readFileSync(path.join(ROOT, FRIDGE_OWNER_BROWSER_PROOF_BATCH_BUNDLE_REL_V1), "utf8"),
  ) as OwnerBrowserProofBatchBundleV1;
}

describe("fridge-safe-link-owner-browser-proof-batch-validation-v1", () => {
  test("14-slug browser-proof bundle validates independently from 26-slug SAFE_LINK_BATCH gate", () => {
    const bundle = loadOwnerBrowserBundle();
    const ownerIntegrity = validateOwnerBrowserProofBatchIntegrityV1(bundle);
    assert.equal(ownerIntegrity.authentic, true, ownerIntegrity.errors.join("; "));
    assert.equal(bundle.packet_count, FRIDGE_OWNER_BROWSER_PROOF_BATCH_COHORT_SIZE_V1);
    assert.notEqual(FRIDGE_OWNER_BROWSER_PROOF_BATCH_COHORT_SIZE_V1, FRIDGE_SAFE_LINK_BATCH_COHORT_SIZE_V1);

    const legacy26 = validateHyperAgentBatchBundleForCursorValidationV1(
      bundle as unknown as Parameters<typeof validateHyperAgentBatchBundleForCursorValidationV1>[0],
      FRIDGE_SAFE_LINK_BATCH_COHORT_SIZE_V1,
    );
    assert.equal(legacy26.authentic, false);
    assert.ok(legacy26.errors.some((e) => e.includes("expected 26")));
  });

  test("excluded slug fails integrity if present", () => {
    const bundle = loadOwnerBrowserBundle();
    const poisoned = structuredClone(bundle);
    poisoned.packets.push(structuredClone(bundle.packets[0]));
    poisoned.packets[poisoned.packets.length - 1]!.slug = "gswf";
    poisoned.packet_count = 15;
    const integrity = validateOwnerBrowserProofBatchIntegrityV1(poisoned);
    assert.equal(integrity.authentic, false);
    assert.ok(integrity.errors.some((e) => e.includes("gswf")));
  });

  test("edr3rxd1 B087PDLZL9 cannot be treated as OEM", () => {
    const bundle = loadOwnerBrowserBundle();
    const result = runOwnerBrowserProofBatchValidationV1({ rootDir: ROOT, bundle });
    assert.equal(result.edr3_b087_present_as_aftermarket_only, true);
    assert.equal(result.edr3_b087_excluded_as_oem, true);
    const b087 = result.candidate_url_verdicts.find(
      (c) => c.slug === "edr3rxd1" && c.url.includes("B087PDLZL9"),
    );
    assert.ok(b087);
    assert.equal(b087.verdict, "REJECTED_RISKY_OR_AFTERMARKET");

    const poisoned = structuredClone(bundle);
    const pkt = poisoned.packets.find((p) => p.slug === "edr3rxd1")!;
    const bad = pkt.candidate_urls!.find((c) => c.url.includes("B087PDLZL9"))!;
    bad.url_type = "retailer_direct_pdp";
    bad.oem_or_compatible = "OEM";
    const badResult = runOwnerBrowserProofBatchValidationV1({ rootDir: ROOT, bundle: poisoned });
    assert.equal(badResult.edr3_b087_excluded_as_oem, false);
    assert.equal(deriveOwnerBrowserProofValidationStatusV1(badResult), "VALIDATION_FAIL");
  });

  test("purepour and frig-242086201 remain blocked without repo proof", () => {
    const bundle = loadOwnerBrowserBundle();
    const result = runOwnerBrowserProofBatchValidationV1({ rootDir: ROOT, bundle });
    assert.equal(result.purepour_remains_blocked, true);
    assert.equal(result.frig_242086201_remains_blocked, true);
    const purepour = result.slug_verdicts.find((r) => r.slug === "purepour");
    const frig = result.slug_verdicts.find((r) => r.slug === "frig-242086201");
    assert.equal(purepour?.verdict, "BLOCKED_CONFLICT");
    assert.equal(frig?.verdict, "BLOCKED_CONFLICT");
  });

  test("discovery candidates do not authorize apply planning or CC closure", () => {
    const bundle = loadOwnerBrowserBundle();
    const result = runOwnerBrowserProofBatchValidationV1({ rootDir: ROOT, bundle });
    const status = deriveOwnerBrowserProofValidationStatusV1(result);
    assert.notEqual(status, "VALIDATION_PASS");
    assert.ok(result.integrity.authentic);
    assert.equal(bundle.apply_planning_authorized, false);
    assert.equal(bundle.command_center_closure_claimed, false);
  });

  test("search/support URLs are not direct buyable candidates", () => {
    const { verdict } = classifyOwnerBrowserProofCandidateUrlV1({
      slug: "test",
      candidate: {
        url: "https://example.com/search?kw=filter",
        url_type: "retailer_direct_pdp",
        oem_or_compatible: "OEM",
        page_type: "search_page",
      },
    });
    assert.equal(verdict, "NOT_DIRECT_BUYABLE");
  });

  test("no /go fetches and no retailer_links or evidence writes in lib or runner", () => {
    assert.ok(!LIB_SOURCE.includes("buckparts.com/go"));
    assert.ok(!LIB_SOURCE.includes("/go/"));
    assert.ok(!RUNNER_SOURCE.includes("/go"));
    assert.ok(!LIB_SOURCE.includes('writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")'));
    assert.ok(!LIB_SOURCE.includes('writeFileSync(path.join(args.rootDir, "data/evidence/'));
  });
});
