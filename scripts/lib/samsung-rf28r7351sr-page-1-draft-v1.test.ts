import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getFridgeModelReviewOverride,
  isFridgeModelUnderOwnerReview,
} from "@/lib/fridge/fridge-model-review-overrides";
import {
  validateRefrigeratorManualEvidencePublicReady,
  type RefrigeratorManualEvidenceRecord,
} from "@/lib/manuals/refrigerator-manual-evidence";

const DRAFT_PATH =
  "data/fridge/batch-production/drafts/samsung-rf28r7351sr-page-1-draft-v1.md";
const EVIDENCE_PATH = "data/manual-evidence/refrigerator/samsung-rf28r7351sr.json";

const PROTECTED_PATHS_NO_COMPAT = [
  "src/app/go/[linkId]/route.ts",
  "data/retailer_links.csv",
  "src/components/trust/TrustAwareBuySection.tsx",
  "src/lib/retailers/launch-buy-links.ts",
];

const BANNED_DRAFT_PATTERNS = [
  /BuckParts Verified Link/i,
  /\bguaranteed fit\b/i,
  /\bsafe to buy\b/i,
  /\baffiliate\b/i,
  /\bprice\b/i,
  /\bavailability\b/i,
  /\baggregateRating\b/i,
  /\bwill damage\b/i,
  /\bwill break\b/i,
];

test("samsung-rf28r7351sr evidence fixture is public-ready", async () => {
  const raw = await readFile(EVIDENCE_PATH, "utf8");
  const record = JSON.parse(raw) as RefrigeratorManualEvidenceRecord;
  const r = validateRefrigeratorManualEvidencePublicReady(record);
  assert.equal(r.ok, true, r.errors.join("; "));
  assert.equal(record.fridge_model_slug, "samsung-rf28r7351sr");
  assert.ok(record.cautions.includes("HAF-CIN"));
  assert.ok(/can risk damage|risk damage/i.test(record.cautions));
});

test("page 1 draft cites HAF-QIN and DA97-17376B with cautious HAF-CIN warning", async () => {
  const draft = await readFile(DRAFT_PATH, "utf8");
  assert.ok(/HAF-QIN/i.test(draft));
  assert.ok(/DA97-17376B/i.test(draft));
  assert.ok(/HAF-CIN/i.test(draft));
  assert.ok(/can risk damage|risk damage/i.test(draft));
  assert.ok(!/will damage/i.test(draft));
  assert.ok(draft.includes("samsung-rf28r7351sr"));
  assert.ok(draft.includes("da97-17376b"));
});

test("page 1 draft omits banned purchase and guarantee language", async () => {
  const draft = await readFile(DRAFT_PATH, "utf8");
  for (const pattern of BANNED_DRAFT_PATTERNS) {
    assert.ok(!pattern.test(draft), `draft must not match ${pattern}`);
  }
});

test("page 1 draft documents Step 2a gates — repo CSV reconciled, seed and quarantine pending", async () => {
  const draft = await readFile(DRAFT_PATH, "utf8");
  assert.ok(/compatibility_mappings\.csv/.test(draft));
  assert.ok(/quarantine/i.test(draft));
  assert.ok(/seed:import|Supabase parity/i.test(draft));
  assert.ok(/da97-17376b/i.test(draft));
});

test("samsung-rf28r7351sr live slug is quarantined for wrong-family mappings", () => {
  const override = getFridgeModelReviewOverride("samsung-rf28r7351sr");
  assert.ok(override);
  assert.equal(override.reason, "FILTER_MAPPING_CONFLICT");
  assert.equal(isFridgeModelUnderOwnerReview("samsung-rf28r7351sr"), true);
});

test("page 1 leaves protected buyer-path paths untouched (excluding scoped compat CSV)", () => {
  for (const rel of PROTECTED_PATHS_NO_COMPAT) {
    const diff = execSync(`git diff -- "${rel}"`, { encoding: "utf8" }).trim();
    assert.equal(diff, "", `${rel} must not be modified`);
  }
  const supabaseDiff = execSync("git diff -- supabase/", { encoding: "utf8" }).trim();
  assert.equal(supabaseDiff, "", "supabase/ must not be modified");
});
