import assert from "node:assert/strict";
import test from "node:test";

import {
  BUCKPARTS_PAGE_FACTORY_PREFLIGHT_CONTRACT_V1,
  PAGE_FACTORY_TARGETS_CSV_REL_V1,
  buildPageFactoryPreflightReportV1,
  loadPageFactoryTargetFromRegistryV1,
  type SupabaseCompatLoadResultV1,
} from "./buckparts-page-factory-preflight-v1";

const ROOT = process.cwd();
const RF28_SLUG = "samsung-rf28r7351sr";

function gateStatus(
  report: Awaited<ReturnType<typeof buildPageFactoryPreflightReportV1>>,
  gateId: string,
) {
  const gate = report.gates.find((g) => g.gate_id === gateId);
  assert.ok(gate, `missing gate ${gateId}`);
  return gate!;
}

test("registry loads samsung-rf28r7351sr target", () => {
  const target = loadPageFactoryTargetFromRegistryV1({
    rootDir: ROOT,
    fridgeSlug: RF28_SLUG,
  });
  assert.equal(target.fridge_slug, RF28_SLUG);
  assert.deepEqual(target.expected_filter_slugs, ["da97-17376b"]);
  assert.deepEqual(target.forbidden_filter_slugs, ["da29-00020b", "da29-00012b"]);
  assert.equal(target.official_marketing_token, "HAF-QIN");
});

test("v0.1 preflight report contract and repo gates for samsung-rf28r7351sr", async () => {
  const report = await buildPageFactoryPreflightReportV1({
    rootDir: ROOT,
    fridgeSlug: RF28_SLUG,
  });

  assert.equal(report.contract, BUCKPARTS_PAGE_FACTORY_PREFLIGHT_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_blocked_until_owner_approval, true);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.registry_source, PAGE_FACTORY_TARGETS_CSV_REL_V1);

  assert.equal(gateStatus(report, "repo_evidence_ready").status, "PASS");
  assert.equal(gateStatus(report, "compat_csv_exact_mapping").status, "PASS");
  assert.equal(gateStatus(report, "compat_csv_forbidden_absent").status, "PASS");
  assert.equal(gateStatus(report, "exact_token_alignment").status, "PASS");
  assert.equal(gateStatus(report, "quarantine_state_observed").status, "PASS");
  assert.equal(gateStatus(report, "retailer_link_csv_gates_observed").status, "WARN");

  assert.equal(gateStatus(report, "supabase_compat_parity").status, "UNKNOWN");
  assert.equal(gateStatus(report, "local_page_proof").status, "UNKNOWN");
  assert.equal(gateStatus(report, "live_page_proof").status, "UNKNOWN");

  assert.equal(report.preflight_status, "READY_FOR_OWNER_REVIEW");
});

test("supabase_compat_parity stays UNKNOWN without --check-supabase", async () => {
  const report = await buildPageFactoryPreflightReportV1({
    rootDir: ROOT,
    fridgeSlug: RF28_SLUG,
    checkSupabase: false,
  });
  const gate = gateStatus(report, "supabase_compat_parity");
  assert.equal(gate.status, "UNKNOWN");
  assert.equal(gate.observed?.check_supabase, false);
});

test("supabase_compat_parity can PASS with injected loader", async () => {
  const report = await buildPageFactoryPreflightReportV1({
    rootDir: ROOT,
    fridgeSlug: RF28_SLUG,
    checkSupabase: true,
    loadSupabaseCompat: async (): Promise<SupabaseCompatLoadResultV1> => ({
      status: "CHECKED",
      supabase_filter_slugs: ["da97-17376b"],
    }),
  });
  assert.equal(gateStatus(report, "supabase_compat_parity").status, "PASS");
});

test("local and live page proof return UNKNOWN even when base URLs are passed in v0.1", async () => {
  const report = await buildPageFactoryPreflightReportV1({
    rootDir: ROOT,
    fridgeSlug: RF28_SLUG,
    baseUrl: "http://127.0.0.1:3012",
    liveBaseUrl: "https://buckparts.com",
  });
  assert.equal(gateStatus(report, "local_page_proof").status, "UNKNOWN");
  assert.equal(gateStatus(report, "live_page_proof").status, "UNKNOWN");
  assert.equal(report.preflight_status, "UNKNOWN");
});

test("missing registry slug throws", () => {
  assert.throws(
    () =>
      loadPageFactoryTargetFromRegistryV1({
        rootDir: ROOT,
        fridgeSlug: "not-in-registry-slug",
      }),
    /page_factory_target_not_found/,
  );
});
