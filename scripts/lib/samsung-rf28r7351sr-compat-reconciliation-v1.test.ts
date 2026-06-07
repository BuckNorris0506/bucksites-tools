import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getFridgeModelReviewOverride,
  isFridgeModelUnderOwnerReview,
} from "@/lib/fridge/fridge-model-review-overrides";
import {
  SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1,
} from "./refrigerator-model-first-samsung-marketing-token-cross-reference-v1";
import {
  validateRefrigeratorManualEvidencePublicReady,
  type RefrigeratorManualEvidenceRecord,
} from "@/lib/manuals/refrigerator-manual-evidence";

const COMPAT_CSV = "data/compatibility_mappings.csv";
const MODEL_SLUG = "samsung-rf28r7351sr";
const TARGET_FILTER = "da97-17376b";
const REMOVED_FILTERS = ["da29-00020b", "da29-00012b"] as const;

function parseCompatRows(csv: string): { fridge_slug: string; filter_slug: string }[] {
  const lines = csv.trim().split("\n");
  const rows: { fridge_slug: string; filter_slug: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;
    const [fridge_slug, filter_slug] = line.split(",");
    if (fridge_slug && filter_slug) rows.push({ fridge_slug, filter_slug });
  }
  return rows;
}

function modelFilterSlugs(rows: { fridge_slug: string; filter_slug: string }[], model: string): string[] {
  return rows.filter((r) => r.fridge_slug === model).map((r) => r.filter_slug);
}

test("samsung-rf28r7351sr maps to da97-17376b only in compatibility_mappings.csv", async () => {
  const csv = await readFile(COMPAT_CSV, "utf8");
  const slugs = modelFilterSlugs(parseCompatRows(csv), MODEL_SLUG);
  assert.deepEqual(slugs, [TARGET_FILTER]);
});

test("samsung-rf28r7351sr no longer maps to wrong-family da29 filters", async () => {
  const csv = await readFile(COMPAT_CSV, "utf8");
  const slugs = modelFilterSlugs(parseCompatRows(csv), MODEL_SLUG);
  for (const removed of REMOVED_FILTERS) {
    assert.ok(!slugs.includes(removed), `must not map to ${removed}`);
  }
});

test("da97-17376b aligns with Samsung HAF-QIN cross-reference", () => {
  const hafQin = SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1.HAFQIN;
  assert.ok(hafQin.allowed_filter_slugs.includes(TARGET_FILTER));
  assert.equal(hafQin.canonical_filter_slug, TARGET_FILTER);
  assert.equal(hafQin.marketing_token, "HAF-QIN");
});

test("manual evidence for samsung-rf28r7351sr still validates as public-ready", async () => {
  const raw = await readFile("data/manual-evidence/refrigerator/samsung-rf28r7351sr.json", "utf8");
  const record = JSON.parse(raw) as RefrigeratorManualEvidenceRecord;
  const r = validateRefrigeratorManualEvidencePublicReady(record);
  assert.equal(r.ok, true, r.errors.join("; "));
});

test("samsung-rf28r7351sr quarantine remains active after Step 2a CSV reconcile", () => {
  const override = getFridgeModelReviewOverride(MODEL_SLUG);
  assert.ok(override);
  assert.equal(override.reason, "FILTER_MAPPING_CONFLICT");
  assert.equal(isFridgeModelUnderOwnerReview(MODEL_SLUG), true);
});

test("compatibility_mappings.csv diff is exactly the scoped samsung-rf28r7351sr change", () => {
  const diff = execSync(`git diff -- "${COMPAT_CSV}"`, { encoding: "utf8" });
  const srLines = diff
    .split("\n")
    .filter((line) => line.includes("samsung-rf28r7351sr") && (line.startsWith("+") || line.startsWith("-")));
  assert.deepEqual(srLines.sort(), [
    "-samsung-rf28r7351sr,da29-00012b",
    "-samsung-rf28r7351sr,da29-00020b",
    "+samsung-rf28r7351sr,da97-17376b",
  ].sort());
});

test("Step 2a leaves buyer-path go retailer and supabase paths untouched", () => {
  const protectedPaths = [
    "src/app/go/[linkId]/route.ts",
    "data/retailer_links.csv",
    "src/lib/retailers/launch-buy-links.ts",
    "src/components/trust/TrustAwareBuySection.tsx",
  ];
  for (const rel of protectedPaths) {
    const diff = execSync(`git diff -- "${rel}"`, { encoding: "utf8" }).trim();
    assert.equal(diff, "", `${rel} must not be modified in Step 2a`);
  }
  const supabaseDiff = execSync("git diff -- supabase/", { encoding: "utf8" }).trim();
  assert.equal(supabaseDiff, "", "supabase/ must not be modified in Step 2a");
});
