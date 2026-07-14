import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1 } from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_ALL_SLUGS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_COHORT_IDS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_COHORT_SLUGS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_EXPECTED_SLUG_COUNT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_ALLOWED_WRITE_REL_PATHS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_MD_REL_V1,
  buildBuckpartsFridgeModelPdpRenderedTruthProofPackV1,
  classifyFridgePdpRenderedTruthSlugV1,
  writeBuckpartsFridgeModelPdpRenderedTruthProofArtifactsV1,
} from "./buckparts-fridge-model-pdp-rendered-truth-proof-pack-v1";

const LIB_SOURCE = readFileSync(
  "scripts/lib/buckparts-fridge-model-pdp-rendered-truth-proof-pack-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-14T05:00:00.000Z");

test("exact 39 slug scope; PARTIAL 3 excluded", () => {
  assert.equal(
    BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_ALL_SLUGS_V1.length,
    BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_EXPECTED_SLUG_COUNT_V1,
  );
  assert.equal(BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_COHORT_IDS_V1.length, 4);
  assert.equal(BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_COHORT_SLUGS_V1.gte18.length, 1);
  assert.equal(BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_COHORT_SLUGS_V1.samsung_pass_5.length, 5);
  assert.equal(BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_COHORT_SLUGS_V1.gswf_13.length, 13);
  assert.equal(BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_COHORT_SLUGS_V1.qa_20.length, 20);
  assert.equal(new Set(BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_ALL_SLUGS_V1).size, 39);
  for (const partial of GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1) {
    assert.ok(!BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_ALL_SLUGS_V1.includes(partial));
  }
});

test("MATCH promotes frontend_safe; UNKNOWN/MISMATCH/QUARANTINE do not", () => {
  const match = classifyFridgePdpRenderedTruthSlugV1({
    cohort: "qa_20",
    slug: "lg-lrfxs3106s",
    csv_mappings: ["lt1000p"],
    supabase: { status: "CHECKED", supabase_filter_slugs: ["lt1000p"] },
    pdp: { status: "CHECKED", filter_slugs: ["lt1000p"] },
    quarantine: { quarantine: false, reason: null },
  });
  assert.equal(match.classification, "MATCH");
  assert.equal(match.frontend_safe_promoted, true);

  const unknown = classifyFridgePdpRenderedTruthSlugV1({
    cohort: "qa_20",
    slug: "lg-lrfxs3106s",
    csv_mappings: ["lt1000p"],
    supabase: { status: "UNKNOWN_DB_UNAVAILABLE", reason: "no db" },
    pdp: { status: "CHECKED", filter_slugs: ["lt1000p"] },
    quarantine: { quarantine: false, reason: null },
  });
  assert.equal(unknown.classification, "UNKNOWN_RENDER");
  assert.equal(unknown.frontend_safe_promoted, false);

  const mismatch = classifyFridgePdpRenderedTruthSlugV1({
    cohort: "qa_20",
    slug: "lg-lrfxs3106s",
    csv_mappings: ["lt1000p"],
    supabase: { status: "CHECKED", supabase_filter_slugs: ["lt1000p", "old"] },
    pdp: { status: "CHECKED", filter_slugs: ["lt1000p", "old"] },
    quarantine: { quarantine: false, reason: null },
  });
  assert.equal(mismatch.classification, "MISMATCH");
  assert.equal(mismatch.frontend_safe_promoted, false);

  const quarantined = classifyFridgePdpRenderedTruthSlugV1({
    cohort: "qa_20",
    slug: "lg-lrfxs3106s",
    csv_mappings: ["lt1000p"],
    supabase: { status: "CHECKED", supabase_filter_slugs: ["lt1000p"] },
    pdp: { status: "CHECKED", filter_slugs: ["lt1000p"] },
    quarantine: { quarantine: true, reason: "OWNER_REVIEW_OVERRIDE" },
  });
  assert.equal(quarantined.classification, "QUARANTINED_SUPPRESSED");
  assert.equal(quarantined.frontend_safe_promoted, false);
  assert.deepEqual(quarantined.rendered_filter_slugs, []);
});

test("build pack is read-only, exact scope, writes only allowlisted drafts", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "pdp-rendered-truth-"));
  try {
    const csvMap = new Map<string, string[]>();
    for (const slug of BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_ALL_SLUGS_V1) {
      if (slug === "ge-gte18gsnrss") csvMap.set(slug, []);
      else if (slug.startsWith("samsung-rf27") || slug.startsWith("samsung-rs22") || slug === "samsung-rf28r6301sr" || slug === "samsung-rf28t5101sr") {
        csvMap.set(slug, ["da97-17376b"]);
      } else if (slug.startsWith("ge-")) csvMap.set(slug, ["rpwfe"]);
      else csvMap.set(slug, ["ultrawf"]);
    }

    const report = await buildBuckpartsFridgeModelPdpRenderedTruthProofPackV1({
      rootDir: tmp,
      now: FIXED_NOW,
      loadCsvByFridgeSlug: () => csvMap,
      loadSupabaseCompat: async (slug) => ({
        status: "CHECKED",
        supabase_filter_slugs: csvMap.get(slug) ?? [],
      }),
      loadPdpFridgeFilters: async (slug) => ({
        status: "CHECKED",
        filter_slugs: csvMap.get(slug) ?? [],
      }),
      resolveQuarantine: () => ({ quarantine: false, reason: null }),
    });

    assert.equal(report.contract, BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_CONTRACT_V1);
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.supabase_mutation_authorized, false);
    assert.equal(report.csv_mutation_authorized, false);
    assert.equal(report.buy_cta_authorized, false);
    assert.equal(report.retailer_links_mutation_authorized, false);
    assert.equal(report.sitemap_robots_mutation_authorized, false);
    assert.equal(report.product_json_ld_mutation_authorized, false);
    assert.equal(report.live_production_fetch_enabled, false);
    assert.equal(report.scope.slug_count, 39);
    assert.equal(report.rows.length, 39);
    assert.deepEqual(
      [...report.scope.excluded_partial_slugs].sort(),
      [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1].sort(),
    );
    assert.equal(report.summary.MATCH, 39);
    assert.equal(report.summary.frontend_safe_promoted_count, 39);
    assert.ok(report.rows.every((r) => r.backend_closed_cohort === true));
    assert.ok(report.rows.every((r) => r.partial_excluded === true));
    assert.ok(!report.rows.some((r) => GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1.includes(r.slug as never)));

    const written = writeBuckpartsFridgeModelPdpRenderedTruthProofArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.equal(written.json_rel_path, BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1);
    assert.equal(written.md_rel_path, BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_MD_REL_V1);
    assert.deepEqual(
      [...BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_ALLOWED_WRITE_REL_PATHS_V1].sort(),
      [
        BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1,
        BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_MD_REL_V1,
      ].sort(),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("frontend_safe is not claimed without rendered proof; lib forbids production fetch / CSV writes", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "pdp-rendered-unknown-"));
  try {
    const csvMap = new Map<string, string[]>();
    for (const slug of BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_ALL_SLUGS_V1) {
      csvMap.set(slug, slug === "ge-gte18gsnrss" ? [] : ["x"]);
    }
    const report = await buildBuckpartsFridgeModelPdpRenderedTruthProofPackV1({
      rootDir: tmp,
      now: FIXED_NOW,
      loadCsvByFridgeSlug: () => csvMap,
      loadSupabaseCompat: async (slug) => ({
        status: "CHECKED",
        supabase_filter_slugs: csvMap.get(slug) ?? [],
      }),
      loadPdpFridgeFilters: async () => ({
        status: "UNKNOWN",
        reason: "injector blocked pdp",
      }),
      resolveQuarantine: () => ({ quarantine: false, reason: null }),
    });
    assert.equal(report.summary.UNKNOWN_RENDER, 39);
    assert.equal(report.summary.frontend_safe_promoted_count, 0);
    assert.ok(report.rows.every((r) => r.frontend_safe_promoted === false));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  assert.match(LIB_SOURCE, /live_production_fetch_enabled: false/);
  assert.match(LIB_SOURCE, /csv_mutation_authorized: false/);
  assert.doesNotMatch(LIB_SOURCE, /writeFileSync\([^)]*compatibility_mappings\.csv/);
  assert.doesNotMatch(LIB_SOURCE, /retailer_links\.csv/);
  assert.doesNotMatch(LIB_SOURCE, /fetch\(["'` ]https?:\/\//);
});
