import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { RPWFE_OFFICIAL_GE_TARGET_URL_V1 } from "./rpwfe-official-ge-browser-capture-v1";
import {
  buildRpwfeSupabaseUpdatePatchFromRepoCsvRowV1,
  dbRowMatchesRepoCsvForParityV1,
  executeRpwfeOfficialGeSupabaseParityApplyV1,
  proposedPatchContainsForbiddenRetailerLanguageV1,
  validateRpwfeSupabaseParityApplyPreconditionsV1,
  type RpwfeSupabaseRetailerLinkRowV1,
} from "./rpwfe-official-ge-supabase-parity-apply-v1";
import {
  RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1,
  RPWFE_OFFICIAL_GE_SUPABASE_PARITY_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
} from "./rpwfe-official-ge-supabase-parity-mutation-gate-v1";
import type { SupabaseLinksBySlugResultV1 } from "./fridge-supabase-vs-csv-retailer-links-diff-v1";
import type { RetailerLinkCsvRowV1 } from "./universal-batch-lifecycle-apply-execution-plan-v1";
import {
  bindArtifactsAtHashesV1,
  loadTruthLedgerAppendEntriesV1,
  TRUTH_LEDGER_V1_JSONL_REL_V1,
} from "./truth-ledger-v1";

const goodRepoRow: RetailerLinkCsvRowV1 = {
  filter_slug: "rpwfe",
  retailer_name: "GE Appliance Parts",
  affiliate_url: RPWFE_OFFICIAL_GE_TARGET_URL_V1,
  is_primary: "true",
  sort_order: "0",
  retailer_key: "oem-parts-catalog",
  browser_truth_classification: "direct_buyable",
  browser_truth_notes: "RPWFE official GE BuckParts Verified Link official_manufacturer_official_ge",
  browser_truth_checked_at: "2026-06-02T14:23:08.624Z",
};

const searchDbRow: RpwfeSupabaseRetailerLinkRowV1 = {
  id: "link-rpwfe-1",
  filter_id: "filter-rpwfe",
  retailer_name: "OEM parts catalog (keyword lookup)",
  affiliate_url: "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=RPWFE",
  destination_url: "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=RPWFE",
  retailer_key: "oem-parts-catalog",
  retailer_slug: "oem-parts-catalog",
  is_primary: true,
  browser_truth_classification: null,
  browser_truth_notes: null,
  browser_truth_checked_at: null,
};

function csvText(): string {
  return `filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at\nrpwfe,GE Appliance Parts,${RPWFE_OFFICIAL_GE_TARGET_URL_V1},true,0,oem-parts-catalog,direct_buyable,RPWFE official GE BuckParts Verified Link official_manufacturer_official_ge,2026-06-02T14:23:08.624Z\n`;
}

function writeTrustCurrencyClearFixture(root: string, referenceTime: Date): void {
  const dir = path.join(root, "data/truth-integrity");
  mkdirSync(dir, { recursive: true });
  const nextReAudit = new Date(referenceTime.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  writeFileSync(
    path.join(dir, "truth-integrity-registry-v1.json"),
    `${JSON.stringify(
      {
        contract: "truth_integrity_registry_v1",
        read_only: true,
        data_mutation: false,
        mutation_authorized: false,
        findings: [
          {
            finding_id: "fixture-truth-integrity",
            finding_code: "FIXTURE",
            title: "Fixture finding",
            status: "OPEN",
            severity: "high",
            truth_surface: "buy_path",
            summary: "fixture",
            proven_gap: "fixture",
            false_safety_risk: "fixture",
            smallest_safe_fix: "fixture",
            re_audit: {
              next_re_audit_after: nextReAudit,
              last_re_audit_at: referenceTime.toISOString(),
              cadence_days: 30,
              re_audit_owner: "test",
            },
            validation_commands: { prove_gap: ["npm test"] },
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
}

function writeAuthorizedRpwfeSupabaseFixtureRoot(): { root: string; cleanup: () => void } {
  const root = mkdtempSync(path.join(tmpdir(), "rpwfe-supabase-parity-"));
  const referenceTime = new Date("2026-06-10T12:00:00.000Z");
  writeTrustCurrencyClearFixture(root, referenceTime);
  mkdirSync(path.dirname(path.join(root, RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1)), {
    recursive: true,
  });
  writeFileSync(
    path.join(root, RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1),
    '{"csv_apply":true}\n',
    "utf8",
  );
  const bound_artifacts_v1 = bindArtifactsAtHashesV1({
    rootDir: root,
    artifacts: [
      {
        artifact_rel_path: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1,
        entry_type: "apply_plan",
      },
    ],
  });
  mkdirSync(path.join(root, "data/owner-decisions"), { recursive: true });
  writeFileSync(
    path.join(root, "data/owner-decisions/rpwfe-supabase-parity-fixture-v1.json"),
    `${JSON.stringify({
      contract: "founder_decision_registry_v1",
      rows: [
        {
          decision_id: "decision-rpwfe-supabase-fixture",
          source_queue_row_id: "queue-rpwfe-fixture",
          source_decision_packet_id: "packet-rpwfe-fixture",
          decided_at: "2026-06-10T12:00:00.000Z",
          decision_status: "approved",
          owner_note: "Approve RPWFE official GE Supabase parity apply.",
          allowed_next_scope: "owner_mutation_approved",
          evidence_required_before_mutation: true,
          expires_at: "2027-06-01T00:00:00.000Z",
          prohibited_actions_still_apply: ["Do not apply other slugs."],
          bound_artifacts_v1,
          rpwfe_apply_context_v1: {
            target_slug: "rpwfe",
            apply_plan_rel_path: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1,
          },
        },
      ],
    })}\n`,
    "utf8",
  );
  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

function appliedDbRow(): RpwfeSupabaseRetailerLinkRowV1 {
  const patch = buildRpwfeSupabaseUpdatePatchFromRepoCsvRowV1(goodRepoRow);
  return {
    id: "link-rpwfe-1",
    filter_id: "filter-rpwfe",
    retailer_name: String(patch.retailer_name),
    affiliate_url: String(patch.affiliate_url),
    destination_url: String(patch.destination_url),
    retailer_key: "oem-parts-catalog",
    retailer_slug: "oem-parts-catalog",
    is_primary: true,
    browser_truth_classification: String(patch.browser_truth_classification),
    browser_truth_notes: String(patch.browser_truth_notes),
    browser_truth_checked_at: String(patch.browser_truth_checked_at),
  };
}

const supabaseMatches: SupabaseLinksBySlugResultV1 = {
  status: "CHECKED",
  slug_to_filter_id: new Map([["rpwfe", "filter-rpwfe"]]),
  links_by_slug: new Map([
    [
      "rpwfe",
      [
        {
          filter_id: "filter-rpwfe",
          retailer_key: "oem-parts-catalog",
          affiliate_url: RPWFE_OFFICIAL_GE_TARGET_URL_V1,
          is_primary: true,
          browser_truth_classification: "direct_buyable",
        },
      ],
    ],
  ]),
};

test("preconditions reject non-direct-buyable repo row", () => {
  const blockers = validateRpwfeSupabaseParityApplyPreconditionsV1({
    repoRow: { ...goodRepoRow, browser_truth_classification: "" },
    rpwfeRepoRowCount: 1,
  });
  assert.ok(blockers.includes("repo_csv_not_direct_buyable_official_ge_applied"));
});

test("patch excludes Waterdrop Amazon compatible language", () => {
  const patch = buildRpwfeSupabaseUpdatePatchFromRepoCsvRowV1(goodRepoRow);
  assert.equal(proposedPatchContainsForbiddenRetailerLanguageV1(patch), false);
  assert.equal(
    proposedPatchContainsForbiddenRetailerLanguageV1({ browser_truth_notes: "Waterdrop WD-F19C" }),
    true,
  );
});

test("dry-run ready when supabase row drifts from repo csv", async () => {
  let updated = false;
  const run = await executeRpwfeOfficialGeSupabaseParityApplyV1({
    rootDir: "/tmp",
    apply: false,
    fileExists: (p) => p.includes("retailer_links"),
    readTextFile: () => csvText(),
    deps: {
      resolveFilterIdBySlug: async () => "filter-rpwfe",
      fetchPrimaryOemRow: async () => [searchDbRow],
      updateRowById: async () => {
        updated = true;
      },
      loadSupabaseSnapshot: async () => supabaseMatches,
    },
  });

  assert.equal(run.apply_status, "DRY_RUN_READY");
  assert.equal(updated, false);
  assert.equal(run.rows_updated, 0);
  assert.equal(run.mutation_authorized, false);
});

test("apply without founder approval is BLOCKED and does not update Supabase", async () => {
  let updateCount = 0;
  const root = mkdtempSync(path.join(tmpdir(), "rpwfe-no-founder-"));
  const referenceTime = new Date("2026-06-10T12:00:00.000Z");
  try {
    writeTrustCurrencyClearFixture(root, referenceTime);
    const run = await executeRpwfeOfficialGeSupabaseParityApplyV1({
      rootDir: root,
      apply: true,
      io_capability: "MUTATION",
      fileExists: (p) => p.includes("retailer_links"),
      readTextFile: (p) => {
        if (p.includes("retailer_links")) return csvText();
        return readFileSync(p, "utf8");
      },
      writeTextFile: () => {},
      now: () => referenceTime,
      deps: {
        resolveFilterIdBySlug: async () => "filter-rpwfe",
        fetchPrimaryOemRow: async () => [searchDbRow],
        updateRowById: async () => {
          updateCount += 1;
        },
        loadSupabaseSnapshot: async () => supabaseMatches,
      },
    });

      assert.equal(run.apply_status, "BLOCKED");
    assert.equal(updateCount, 0);
    assert.equal(run.mutation_authorized, false);
    assert.ok(
      run.blockers.includes("founder_owner_mutation_approved_missing_or_inactive"),
    );
    const ledger = loadTruthLedgerAppendEntriesV1({ rootDir: root });
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0]!.apply_outcome, "blocked");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("READ_INDEX + apply blocks with io_capability_read_index_cannot_mutate_supabase", async () => {
  let updateCount = 0;
  const { root, cleanup } = writeAuthorizedRpwfeSupabaseFixtureRoot();
  try {
    const run = await executeRpwfeOfficialGeSupabaseParityApplyV1({
      rootDir: root,
      apply: true,
      io_capability: "READ_INDEX",
      fileExists: (p) => p.includes("retailer_links"),
      readTextFile: (p) => {
        if (p.includes("retailer_links")) return csvText();
        return readFileSync(p, "utf8");
      },
      writeTextFile: () => {},
      now: () => new Date("2026-06-10T12:00:00.000Z"),
      deps: {
        resolveFilterIdBySlug: async () => "filter-rpwfe",
        fetchPrimaryOemRow: async () => [searchDbRow],
        updateRowById: async () => {
          updateCount += 1;
        },
        loadSupabaseSnapshot: async () => supabaseMatches,
      },
    });

    assert.equal(run.apply_status, "BLOCKED");
    assert.equal(updateCount, 0);
    assert.ok(
      run.blockers.includes(RPWFE_OFFICIAL_GE_SUPABASE_PARITY_IO_READ_INDEX_SUPABASE_BLOCKER_V1),
    );
  } finally {
    cleanup();
  }
});

test("apply with authorized founder decision updates matched row", async () => {
  let updateCount = 0;
  let current = searchDbRow;
  const { root, cleanup } = writeAuthorizedRpwfeSupabaseFixtureRoot();
  try {
    const run = await executeRpwfeOfficialGeSupabaseParityApplyV1({
      rootDir: root,
      apply: true,
      io_capability: "MUTATION",
      fileExists: (p) => p.includes("retailer_links"),
      readTextFile: (p) => {
        if (p.includes("retailer_links")) return csvText();
        return readFileSync(p, "utf8");
      },
      writeTextFile: () => {},
      now: () => new Date("2026-06-10T12:00:00.000Z"),
      deps: {
        resolveFilterIdBySlug: async () => "filter-rpwfe",
        fetchPrimaryOemRow: async () => [current],
        updateRowById: async (_id, patch) => {
          updateCount += 1;
          current = {
            ...current,
            retailer_name: String(patch.retailer_name),
            affiliate_url: String(patch.affiliate_url),
            destination_url: String(patch.destination_url),
            browser_truth_classification: String(patch.browser_truth_classification),
            browser_truth_notes: String(patch.browser_truth_notes),
            browser_truth_checked_at: String(patch.browser_truth_checked_at),
          };
        },
        loadSupabaseSnapshot: async () => {
          if (dbRowMatchesRepoCsvForParityV1(current, goodRepoRow)) return supabaseMatches;
          return {
            status: "CHECKED",
            slug_to_filter_id: new Map([["rpwfe", "filter-rpwfe"]]),
            links_by_slug: new Map([["rpwfe", [current]]]),
          } as unknown as SupabaseLinksBySlugResultV1;
        },
      },
    });

    assert.equal(run.apply_status, "APPLIED");
    assert.equal(updateCount, 1);
    const ledger = loadTruthLedgerAppendEntriesV1({ rootDir: root });
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0]!.mutation_lane, "rpwfe_official_ge_supabase_parity_apply_v1");
    assert.equal(ledger[0]!.apply_outcome, "applied");
    assert.ok(existsSync(path.join(root, TRUTH_LEDGER_V1_JSONL_REL_V1)));
    assert.equal(run.mutation_authorized, true);
    assert.equal(run.post_apply_parity_status, "SUPABASE_MATCHES_REPO_CSV");
    assert.equal(run.post_apply_is_direct_buyable_safe_cta, true);
  } finally {
    cleanup();
  }
});

test("already applied is noop", async () => {
  const { root, cleanup } = writeAuthorizedRpwfeSupabaseFixtureRoot();
  try {
    const run = await executeRpwfeOfficialGeSupabaseParityApplyV1({
      rootDir: root,
      apply: true,
      io_capability: "MUTATION",
      fileExists: (p) => p.includes("retailer_links"),
      readTextFile: (p) => {
        if (p.includes("retailer_links")) return csvText();
        return readFileSync(p, "utf8");
      },
      writeTextFile: () => {},
      now: () => new Date("2026-06-10T12:00:00.000Z"),
      deps: {
        resolveFilterIdBySlug: async () => "filter-rpwfe",
        fetchPrimaryOemRow: async () => [appliedDbRow()],
        updateRowById: async () => {
          throw new Error("should not update");
        },
        loadSupabaseSnapshot: async () => supabaseMatches,
      },
    });

    assert.equal(run.apply_status, "ALREADY_APPLIED");
    assert.equal(run.rows_updated, 0);
  } finally {
    cleanup();
  }
});

test("blocks when more than one supabase row would match", async () => {
  const run = await executeRpwfeOfficialGeSupabaseParityApplyV1({
    rootDir: "/tmp",
    apply: false,
    fileExists: (p) => p.includes("retailer_links"),
    readTextFile: () => csvText(),
    deps: {
      resolveFilterIdBySlug: async () => "filter-rpwfe",
      fetchPrimaryOemRow: async () => [searchDbRow, { ...searchDbRow, id: "link-2" }],
      updateRowById: async () => {},
      loadSupabaseSnapshot: async () => supabaseMatches,
    },
  });

  assert.equal(run.apply_status, "BLOCKED");
  assert.ok(run.blockers.some((b) => b.startsWith("supabase_primary_oem_row_count_gt_one")));
});
