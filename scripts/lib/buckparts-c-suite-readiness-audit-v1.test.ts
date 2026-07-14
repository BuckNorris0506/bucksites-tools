import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_C_SUITE_ALL_SLUGS_V1,
  BUCKPARTS_C_SUITE_COHORT_IDS_V1,
  BUCKPARTS_C_SUITE_COHORT_SLUGS_V1,
  BUCKPARTS_C_SUITE_EXPECTED_COHORT_COUNT_V1,
  BUCKPARTS_C_SUITE_EXPECTED_SLUG_COUNT_V1,
  BUCKPARTS_C_SUITE_READINESS_AUDIT_ALLOWED_WRITE_REL_PATHS_V1,
  BUCKPARTS_C_SUITE_READINESS_AUDIT_CONTRACT_V1,
  BUCKPARTS_C_SUITE_READINESS_AUDIT_JSON_REL_V1,
  BUCKPARTS_C_SUITE_READINESS_AUDIT_MD_REL_V1,
  buildBuckpartsCSuiteReadinessAuditV1,
  classifyCSuiteSlugVerdictV1,
  writeBuckpartsCSuiteReadinessAuditArtifactsV1,
} from "./buckparts-c-suite-readiness-audit-v1";

const ROOT = process.cwd();
const FIXED_NOW = () => new Date("2026-07-14T03:00:00.000Z");

const LIB_SOURCE = readFileSync(
  "scripts/lib/buckparts-c-suite-readiness-audit-v1.ts",
  "utf8",
);

function architectureFixtures(): Record<string, string> {
  return {
    "src/lib/data/fridges.ts":
      'import { getSupabaseServerClient } from "@/lib/supabase/server-client";\nexport async function getFridgeBySlug(){ const supabase = getSupabaseServerClient(); await supabase.from("compatibility_mappings").select("*"); }\n',
    "src/lib/data/filters.ts":
      'import { getSupabaseServerClient } from "@/lib/supabase/server-client";\nconst supabase = getSupabaseServerClient();\n',
    "src/lib/data/search.ts":
      'import { getSupabaseServerClient } from "@/lib/supabase/server-client";\n',
    "src/lib/retailers/launch-buy-links.ts":
      "export function filterRealBuyRetailerLinks(){ return []; }\nexport const direct_buyable = true;\n",
    "src/components/trust/TrustAwareBuySection.tsx": "export function TrustAwareBuySection(){}\n",
    "src/app/fridge/[slug]/page.tsx": "export default function Page(){}\n",
    "src/app/filter/[slug]/page.tsx": "export default function Page(){}\n",
    "src/app/search/page.tsx": "export default function Page(){}\n",
    "src/app/go/[linkId]/route.ts":
      'import { getRetailerLinkById } from "@/lib/data/retailers";\nexport async function GET(){ await getRetailerLinkById("x"); return "/go-unavailable"; }\n',
    "src/lib/retailers/go-affiliate-route-handler.ts": "export const goFallbackRedirect = () => {};\n",
    "src/app/sitemap.ts":
      'import { collectHomekeepWedgeSitemapUrls } from "@/lib/sitemap/wedge-indexable-urls";\nexport default async function sitemap(){ return collectHomekeepWedgeSitemapUrls(); }\n',
    "src/lib/sitemap/wedge-indexable-urls.ts": "export async function collectHomekeepWedgeSitemapUrls(){ return []; }\n",
    "src/app/robots.ts": "export default function robots(){ return {}; }\n",
    "src/lib/seo/structured-data.ts":
      "export function canEmitRefrigeratorFilterProductJsonLdV1(args:{hasTruthfulOfferJsonLd:boolean}){return args.hasTruthfulOfferJsonLd===true;}\nexport function resolveRefrigeratorFilterProductJsonLdV1(input:{hasTruthfulOfferJsonLd?:boolean}){ if(!canEmitRefrigeratorFilterProductJsonLdV1({hasTruthfulOfferJsonLd:input.hasTruthfulOfferJsonLd===true})) return null; return {}; }\n",
  };
}

function seedFixture(root: string): void {
  mkdirSync(path.join(root, "data/fridge/batch-production/drafts"), { recursive: true });
  mkdirSync(path.join(root, "data/ops/credit-control"), { recursive: true });
  for (const [rel, body] of Object.entries(architectureFixtures())) {
    const abs = path.join(root, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, body, "utf8");
  }

  const csvLines = ["fridge_slug,filter_slug"];
  for (const slug of BUCKPARTS_C_SUITE_COHORT_SLUGS_V1.gte18) {
    // no mappings
    void slug;
  }
  for (const slug of BUCKPARTS_C_SUITE_COHORT_SLUGS_V1.samsung_pass_5) {
    csvLines.push(`${slug},da97-17376b`);
  }
  for (const slug of BUCKPARTS_C_SUITE_COHORT_SLUGS_V1.gswf_13) {
    csvLines.push(`${slug},rpwfe`);
  }
  for (const slug of BUCKPARTS_C_SUITE_COHORT_SLUGS_V1.qa_20) {
    csvLines.push(`${slug},ultrawf`);
  }
  for (const slug of BUCKPARTS_C_SUITE_COHORT_SLUGS_V1.gswf_partial_3) {
    csvLines.push(`${slug},gswf`);
  }
  writeFileSync(
    path.join(root, "data/compatibility_mappings.csv"),
    `${csvLines.join("\n")}\n`,
    "utf8",
  );

  writeFileSync(
    path.join(
      root,
      "data/fridge/batch-production/drafts/gswf-gte18gsnrss-no-filter-supabase-compat-parity-owner-review-v1.json",
    ),
    JSON.stringify({
      target_fridge_slug: "ge-gte18gsnrss",
      classification: "IN_SYNC",
      supabase_mappings: [],
    }),
    "utf8",
  );
  writeFileSync(
    path.join(
      root,
      "data/fridge/batch-production/drafts/samsung-pass-repair-supabase-compat-parity-owner-review-v1.json",
    ),
    JSON.stringify({
      rows: BUCKPARTS_C_SUITE_COHORT_SLUGS_V1.samsung_pass_5.map((slug) => ({
        fridge_slug: slug,
        classification: "IN_SYNC",
        supabase_mappings: ["da97-17376b"],
      })),
    }),
    "utf8",
  );
  writeFileSync(
    path.join(
      root,
      "data/fridge/batch-production/drafts/gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review-v1.json",
    ),
    JSON.stringify({
      rows: BUCKPARTS_C_SUITE_COHORT_SLUGS_V1.gswf_13.map((slug) => ({
        fridge_slug: slug,
        classification: "IN_SYNC",
        supabase_mappings: ["rpwfe"],
      })),
    }),
    "utf8",
  );
  writeFileSync(
    path.join(
      root,
      "data/fridge/batch-production/drafts/refrigerator-model-first-qa-batch-supabase-compat-parity-owner-review-v1.json",
    ),
    JSON.stringify({
      rows: BUCKPARTS_C_SUITE_COHORT_SLUGS_V1.qa_20.map((slug) => ({
        fridge_slug: slug,
        classification: "SUPABASE_STILL_HAS_OLD_ROWS",
        supabase_mappings: ["ultrawf", "old-wrong"],
      })),
    }),
    "utf8",
  );
  writeFileSync(
    path.join(
      root,
      "data/fridge/batch-production/drafts/gswf-partial-owner-browser-proof-packet-v1.json",
    ),
    JSON.stringify({
      target_slugs: [...BUCKPARTS_C_SUITE_COHORT_SLUGS_V1.gswf_partial_3],
      slug_rows: BUCKPARTS_C_SUITE_COHORT_SLUGS_V1.gswf_partial_3.map((slug) => ({
        fridge_slug: slug,
        proof_status: "UNKNOWN_NOT_PROVEN",
        include_in_apply_plan: false,
      })),
    }),
    "utf8",
  );
  writeFileSync(
    path.join(root, "data/ops/credit-control/credit-control-center-v1.json"),
    JSON.stringify({
      contract: "buckparts_credit_control_center_v1",
      deployment_posture: "REPO_ONLY_SAFE",
    }),
    "utf8",
  );
}

test("exact 42 slug scope and 5 cohorts", () => {
  assert.equal(BUCKPARTS_C_SUITE_ALL_SLUGS_V1.length, BUCKPARTS_C_SUITE_EXPECTED_SLUG_COUNT_V1);
  assert.equal(BUCKPARTS_C_SUITE_COHORT_IDS_V1.length, BUCKPARTS_C_SUITE_EXPECTED_COHORT_COUNT_V1);
  assert.equal(BUCKPARTS_C_SUITE_COHORT_SLUGS_V1.gte18.length, 1);
  assert.equal(BUCKPARTS_C_SUITE_COHORT_SLUGS_V1.samsung_pass_5.length, 5);
  assert.equal(BUCKPARTS_C_SUITE_COHORT_SLUGS_V1.gswf_13.length, 13);
  assert.equal(BUCKPARTS_C_SUITE_COHORT_SLUGS_V1.qa_20.length, 20);
  assert.equal(BUCKPARTS_C_SUITE_COHORT_SLUGS_V1.gswf_partial_3.length, 3);
  assert.equal(new Set(BUCKPARTS_C_SUITE_ALL_SLUGS_V1).size, 42);
});

test("IN_SYNC without frontend proof is UNKNOWN; QA old rows FAIL; PARTIAL held UNKNOWN", () => {
  assert.equal(
    classifyCSuiteSlugVerdictV1({
      cohort: "samsung_pass_5",
      backend_classification: "IN_SYNC",
      frontend_observed_state: "UNKNOWN",
    }),
    "UNKNOWN",
  );
  assert.equal(
    classifyCSuiteSlugVerdictV1({
      cohort: "samsung_pass_5",
      backend_classification: "IN_SYNC",
      frontend_observed_state: "MATCH",
    }),
    "PASS",
  );
  assert.equal(
    classifyCSuiteSlugVerdictV1({
      cohort: "qa_20",
      backend_classification: "SUPABASE_STILL_HAS_OLD_ROWS",
      frontend_observed_state: "UNKNOWN",
    }),
    "FAIL",
  );
  assert.equal(
    classifyCSuiteSlugVerdictV1({
      cohort: "gswf_partial_3",
      backend_classification: "PARTIAL_HELD_UNKNOWN_NOT_PROVEN",
      frontend_observed_state: "UNKNOWN",
    }),
    "UNKNOWN",
  );
});

test("audit: mutation flags false, live fetch disabled, QA executive risk, PARTIAL never promoted", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "c-suite-audit-"));
  try {
    seedFixture(tmp);
    const report = buildBuckpartsCSuiteReadinessAuditV1({
      rootDir: tmp,
      now: FIXED_NOW,
      headSha: "e097e09",
    });

    assert.equal(report.contract, BUCKPARTS_C_SUITE_READINESS_AUDIT_CONTRACT_V1);
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.supabase_mutation_authorized, false);
    assert.equal(report.csv_mutation_authorized, false);
    assert.equal(report.buy_cta_authorized, false);
    assert.equal(report.retailer_links_mutation_authorized, false);
    assert.equal(report.sitemap_robots_mutation_authorized, false);
    assert.equal(report.product_json_ld_mutation_authorized, false);
    assert.equal(report.live_fetch_enabled, false);
    assert.equal(report.live_fetch_status, "DISABLED_BY_DEFAULT");
    assert.equal(report.scope.slug_count, 42);
    assert.equal(report.scope.cohort_count, 5);
    assert.equal(report.cohort_rows.length, 42);

    assert.equal(report.cohort_totals.qa_20_supabase_old_rows_count, 20);
    assert.equal(report.executive_lanes.ceo_strategy.verdict, "FAIL");
    assert.equal(report.executive_lanes.cpo_journey.verdict, "FAIL");
    assert.equal(report.executive_lanes.data_metrics.verdict, "FAIL");
    assert.match(
      report.explicit_callouts.join("\n"),
      /QA 20 is runtime-risk because Supabase still has old rows on 20\/20/,
    );

    const inSync = report.cohort_rows.filter((r) =>
      ["gte18", "samsung_pass_5", "gswf_13"].includes(r.cohort),
    );
    assert.equal(inSync.length, 19);
    for (const row of inSync) {
      assert.equal(row.backend_classification, "IN_SYNC");
      assert.equal(row.frontend_observed_state, "UNKNOWN");
      assert.equal(row.verdict, "UNKNOWN");
      assert.equal(row.cta_go_link_state, "UNKNOWN");
      assert.equal(row.product_json_ld_state, "UNKNOWN");
    }

    const partial = report.cohort_rows.filter((r) => r.cohort === "gswf_partial_3");
    assert.equal(partial.length, 3);
    for (const row of partial) {
      assert.equal(row.backend_classification, "PARTIAL_HELD_UNKNOWN_NOT_PROVEN");
      assert.equal(row.verdict, "UNKNOWN");
      assert.ok(row.notes.some((n) => /never promote/i.test(n)));
    }

    const qa = report.cohort_rows.filter((r) => r.cohort === "qa_20");
    assert.equal(qa.length, 20);
    for (const row of qa) {
      assert.equal(row.backend_classification, "SUPABASE_STILL_HAS_OLD_ROWS");
      assert.equal(row.verdict, "FAIL");
    }

    assert.equal(report.next_10_moves.length, 10);
    assert.match(report.next_10_moves[0] ?? "", /QA 20 Supabase sync/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("writes only allowlisted draft paths; live-base-url stays disabled in v1", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "c-suite-audit-write-"));
  try {
    seedFixture(tmp);
    const report = buildBuckpartsCSuiteReadinessAuditV1({
      rootDir: tmp,
      now: FIXED_NOW,
      headSha: "e097e09",
      liveBaseUrl: "https://buckparts.com",
    });
    assert.equal(report.live_fetch_enabled, false);
    assert.equal(report.live_fetch_status, "DISABLED_IN_V1");

    const written = writeBuckpartsCSuiteReadinessAuditArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.equal(written.json_rel_path, BUCKPARTS_C_SUITE_READINESS_AUDIT_JSON_REL_V1);
    assert.equal(written.md_rel_path, BUCKPARTS_C_SUITE_READINESS_AUDIT_MD_REL_V1);
    assert.deepEqual(
      [...BUCKPARTS_C_SUITE_READINESS_AUDIT_ALLOWED_WRITE_REL_PATHS_V1].sort(),
      [BUCKPARTS_C_SUITE_READINESS_AUDIT_JSON_REL_V1, BUCKPARTS_C_SUITE_READINESS_AUDIT_MD_REL_V1].sort(),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
    assert.equal(existsSync(path.join(tmp, "data/compatibility_mappings.csv")), true);
    // ensure no accidental CSV rewrite by comparing seed line count still present
    const csv = readFileSync(path.join(tmp, "data/compatibility_mappings.csv"), "utf8");
    assert.match(csv, /samsung-rf27t5201sr,da97-17376b/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("lib does not implement live URL fetch and does not authorize apply writers", () => {
  assert.doesNotMatch(LIB_SOURCE, /fetch\(/);
  assert.doesNotMatch(LIB_SOURCE, /--apply/);
  assert.doesNotMatch(LIB_SOURCE, /retailer_links\.csv/);
  assert.match(LIB_SOURCE, /live_fetch_enabled: false/);
  assert.match(LIB_SOURCE, /product_json_ld_mutation_authorized: false/);
});

test("repo integration: build against real artifacts when present", () => {
  const qaArtifact = path.join(
    ROOT,
    "data/fridge/batch-production/drafts/refrigerator-model-first-qa-batch-supabase-compat-parity-owner-review-v1.json",
  );
  if (!existsSync(qaArtifact)) {
    return;
  }
  const report = buildBuckpartsCSuiteReadinessAuditV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  assert.equal(report.cohort_rows.length, 42);
  assert.equal(report.cohort_totals.qa_20_supabase_old_rows_count, 20);
  assert.equal(report.executive_lanes.ceo_strategy.verdict, "FAIL");
  assert.ok(
    report.cohort_rows
      .filter((r) => r.cohort === "samsung_pass_5")
      .every((r) => r.verdict === "UNKNOWN" && r.backend_classification === "IN_SYNC"),
  );
});
