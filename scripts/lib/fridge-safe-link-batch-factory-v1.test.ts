import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import {
  FRIDGE_SAFE_LINK_BATCH_FACTORY_ALLOWED_WRITE_REL_PATHS_V1,
  FRIDGE_SAFE_LINK_BATCH_FACTORY_JSON_REL_V1,
  FRIDGE_SAFE_LINK_BATCH_FACTORY_MD_REL_V1,
  FRIDGE_SAFE_LINK_CURSOR_VALIDATION_REL_V1,
  FRIDGE_SAFE_LINK_HYPERAGENT_BUNDLE_REL_V1,
  FRIDGE_SAFE_LINK_HYPERAGENT_DISCOVERY_BRIDGE_REL_V1,
  buildFridgeSafeLinkBatchFactoryV1,
  classifyWithHyperAgentCandidate,
  writeFridgeSafeLinkBatchFactoryDraftsV1,
} from "./fridge-safe-link-batch-factory-v1";

const LIB_SOURCE = readFileSync(
  path.join(process.cwd(), "scripts/lib/fridge-safe-link-batch-factory-v1.ts"),
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  path.join(process.cwd(), "scripts/report-fridge-safe-link-batch-factory-v1.ts"),
  "utf8",
);

function copyRepoFile(root: string, rel: string): void {
  const dst = path.join(root, rel);
  mkdirSync(path.dirname(dst), { recursive: true });
  writeFileSync(dst, readFileSync(path.join(process.cwd(), rel)));
}

describe("fridge-safe-link-batch-factory-v1", () => {
  test("batch factory is read-only and never authorizes mutation", () => {
    const report = buildFridgeSafeLinkBatchFactoryV1({ rootDir: process.cwd() });
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.verified_link_authorized, false);
    assert.equal(report.hyperagent_ingest_authoritative, false);
    assert.equal(report.cohort_summary.total_missing_before, 26);
  });

  test("no /go fetches in lib or report", () => {
    assert.ok(!LIB_SOURCE.includes("buckparts.com/go"));
    assert.ok(!LIB_SOURCE.includes("/go/"));
    assert.ok(!REPORT_SOURCE.includes("/go"));
  });

  test("lib does not write retailer_links or evidence paths", () => {
    assert.ok(!LIB_SOURCE.includes('writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")'));
    assert.ok(!LIB_SOURCE.includes('writeFileSync(path.join(args.rootDir, "data/evidence/'));
  });

  test("HyperAgent never bypasses repo gates — hyperagent_used_for_state is false on all rows", () => {
    const report = buildFridgeSafeLinkBatchFactoryV1({ rootDir: process.cwd() });
    assert.ok(report.rows.every((r) => r.hyperagent_used_for_state === false));
    assert.ok(report.rows.every((r) => r.launch_buy_links_gate_passes === false));
  });

  test("reads validated bundle and validation packet when present", () => {
    const report = buildFridgeSafeLinkBatchFactoryV1({ rootDir: process.cwd() });
    assert.ok(report.exact_repo_paths_read.includes(FRIDGE_SAFE_LINK_HYPERAGENT_BUNDLE_REL_V1));
    assert.ok(report.exact_repo_paths_read.includes(FRIDGE_SAFE_LINK_CURSOR_VALIDATION_REL_V1));
    assert.equal(report.hyperagent_ingest_rel_path, FRIDGE_SAFE_LINK_HYPERAGENT_BUNDLE_REL_V1);
    assert.equal(report.hyperagent_bundle_rel_path, FRIDGE_SAFE_LINK_HYPERAGENT_BUNDLE_REL_V1);
    assert.equal(report.bundle_authentic, true);
    assert.equal(report.validation_overlay_applied, true);
    assert.equal(report.validation_status, "VALIDATION_PARTIAL");
  });

  test("VALIDATION_PARTIAL blocks Command Center closure and apply planning", () => {
    const report = buildFridgeSafeLinkBatchFactoryV1({ rootDir: process.cwd() });
    assert.equal(report.command_center_status_update_allowed, false);
    assert.equal(report.apply_planning_allowed, false);
    assert.equal(report.truth_closure_authorized, false);
    assert.equal(report.csv_apply_authorized, false);
  });

  test("Cursor validation overlay supersedes stale discovery — gswf not eligible_now", () => {
    const report = buildFridgeSafeLinkBatchFactoryV1({ rootDir: process.cwd() });
    const gswf = report.rows.find((r) => r.slug === "gswf");
    assert.ok(gswf);
    assert.equal(gswf.batch_factory_state, "CONFLICT_REQUIRES_RECONCILIATION");
    assert.equal(gswf.cursor_validation_overlay_applied, true);
    assert.equal(report.cohort_summary.eligible_now_count, 0);
  });

  test("confirmed DO_NOT_USE hard stop appears in do_not_use_list", () => {
    const report = buildFridgeSafeLinkBatchFactoryV1({ rootDir: process.cwd() });
    assert.equal(report.cohort_summary.do_not_use_count, 1);
    assert.deepEqual(report.do_not_use_list, ["frig-242294502"]);
    const row = report.rows.find((r) => r.slug === "frig-242294502");
    assert.equal(row?.batch_factory_state, "DO_NOT_USE_WRONG_PART_RISK");
    assert.equal(row?.cursor_validation_overlay_applied, true);
  });

  test("confirmed no-safe rows move to suppressed cohort", () => {
    const report = buildFridgeSafeLinkBatchFactoryV1({ rootDir: process.cwd() });
    for (const slug of ["gswf2", "opfg3f", "pfmwf", "da97-19467c"]) {
      const row = report.rows.find((r) => r.slug === slug);
      assert.equal(row?.batch_factory_state, "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED", slug);
      assert.equal(row?.cursor_validation_overlay_applied, true, slug);
    }
    assert.ok(report.cohort_summary.no_safe_count >= 5);
  });

  test("owner-browser cohort matches validated remaining list (14)", () => {
    const report = buildFridgeSafeLinkBatchFactoryV1({ rootDir: process.cwd() });
    assert.equal(report.cohort_summary.owner_browser_needed_count, 14);
    const ownerSlugs = report.rows
      .filter((r) => r.batch_factory_state === "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF")
      .map((r) => r.slug)
      .sort();
    const expected = [
      "da97-17376a",
      "edr3rxd1",
      "edr4rxd1",
      "eptwfu01",
      "fppwfu01",
      "frig-242017801",
      "frig-242086201",
      "mswf",
      "purepour",
      "smartwater-mwfp",
      "ultrawf",
      "wf2cb",
      "wf3cb",
      "wfcb",
    ];
    assert.deepEqual(ownerSlugs, expected);
  });

  test("partial rows are blocked reconciliation not eligible apply", () => {
    const report = buildFridgeSafeLinkBatchFactoryV1({ rootDir: process.cwd() });
    for (const slug of ["gswf", "xwfe"]) {
      const row = report.rows.find((r) => r.slug === slug);
      assert.equal(row?.batch_factory_state, "CONFLICT_REQUIRES_RECONCILIATION", slug);
      assert.equal(row?.cursor_validation_verdict, "PARTIAL", slug);
      assert.ok(
        row?.exact_blockers.some((b) => b.includes("cursor_validation_partial")),
        slug,
      );
    }
    assert.ok(!report.proposed_first_batch_rows.some((r) => r.slug === "gswf"));
  });

  test("4396508 and 4396842 remain existing conflict/no-safe", () => {
    const report = buildFridgeSafeLinkBatchFactoryV1({ rootDir: process.cwd() });
    assert.equal(
      report.rows.find((r) => r.slug === "4396508")?.batch_factory_state,
      "CONFLICT_REQUIRES_RECONCILIATION",
    );
    assert.equal(
      report.rows.find((r) => r.slug === "4396842")?.batch_factory_state,
      "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED",
    );
  });

  test("wrong-part substitutions are DO_NOT_USE_WRONG_PART_RISK", () => {
    const root = process.cwd();
    assert.equal(
      classifyWithHyperAgentCandidate({
        rootDir: root,
        slug: "xwf",
        candidateToken: "XWFE",
        candidateUrl: "https://www.geapplianceparts.com/store/parts/spec/XWFE",
      }),
      "DO_NOT_USE_WRONG_PART_RISK",
    );
    assert.equal(
      classifyWithHyperAgentCandidate({
        rootDir: root,
        slug: "gswf2",
        candidateToken: "GSWF",
        candidateUrl: "https://www.geapplianceparts.com/store/parts/spec/GSWF",
      }),
      "DO_NOT_USE_WRONG_PART_RISK",
    );
    assert.equal(
      classifyWithHyperAgentCandidate({
        rootDir: root,
        slug: "4396842",
        candidateToken: "EDR3RXD1",
        candidateUrl: "https://www.amazon.com/dp/B087PDLZL9",
      }),
      "DO_NOT_USE_WRONG_PART_RISK",
    );
  });

  test("writeFridgeSafeLinkBatchFactoryDraftsV1 writes only allowed draft paths", () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "fridge-batch-factory-"));
    try {
      for (const rel of [
        "data/fridge/batch-production/drafts/fridge-safe-link-rescue-owner-review-v1.json",
        FRIDGE_SAFE_LINK_HYPERAGENT_DISCOVERY_BRIDGE_REL_V1,
        FRIDGE_SAFE_LINK_HYPERAGENT_BUNDLE_REL_V1,
        FRIDGE_SAFE_LINK_CURSOR_VALIDATION_REL_V1,
        "data/filters.csv",
        "data/retailer_links.csv",
        "data/compatibility_mappings.csv",
      ]) {
        copyRepoFile(tempRoot, rel);
      }
      const csvBefore = readFileSync(path.join(tempRoot, "data/retailer_links.csv"), "utf8");
      const evidenceRel = "data/evidence/amazon-edr3rxd1-aftermarket-pdp-evidence.2026-05-04.json";
      if (existsSync(path.join(process.cwd(), evidenceRel))) {
        copyRepoFile(tempRoot, evidenceRel);
      }
      const evidenceBefore = existsSync(path.join(tempRoot, evidenceRel))
        ? readFileSync(path.join(tempRoot, evidenceRel), "utf8")
        : null;
      const report = buildFridgeSafeLinkBatchFactoryV1({ rootDir: tempRoot });
      const written = writeFridgeSafeLinkBatchFactoryDraftsV1({ rootDir: tempRoot, report });
      assert.equal(written.json_rel_path, FRIDGE_SAFE_LINK_BATCH_FACTORY_JSON_REL_V1);
      assert.equal(written.md_rel_path, FRIDGE_SAFE_LINK_BATCH_FACTORY_MD_REL_V1);
      assert.deepEqual(
        [written.json_rel_path, written.md_rel_path],
        [...FRIDGE_SAFE_LINK_BATCH_FACTORY_ALLOWED_WRITE_REL_PATHS_V1],
      );
      assert.equal(readFileSync(path.join(tempRoot, "data/retailer_links.csv"), "utf8"), csvBefore);
      if (evidenceBefore) {
        assert.equal(
          readFileSync(
            path.join(tempRoot, "data/evidence/amazon-edr3rxd1-aftermarket-pdp-evidence.2026-05-04.json"),
            "utf8",
          ),
          evidenceBefore,
        );
      }
      assert.ok(
        !existsSync(path.join(tempRoot, "src/app/fridge/go")) &&
          !LIB_SOURCE.includes('writeFileSync(path.join(args.rootDir, "src/app'),
      );
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("stale discovery bridge alone cannot override validation overlay", () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "fridge-overlay-"));
    try {
      for (const rel of [
        "data/fridge/batch-production/drafts/fridge-safe-link-rescue-owner-review-v1.json",
        FRIDGE_SAFE_LINK_HYPERAGENT_DISCOVERY_BRIDGE_REL_V1,
        FRIDGE_SAFE_LINK_HYPERAGENT_BUNDLE_REL_V1,
        FRIDGE_SAFE_LINK_CURSOR_VALIDATION_REL_V1,
        "data/filters.csv",
        "data/retailer_links.csv",
        "data/compatibility_mappings.csv",
      ]) {
        copyRepoFile(tempRoot, rel);
      }
      const discovery = JSON.parse(
        readFileSync(path.join(tempRoot, FRIDGE_SAFE_LINK_HYPERAGENT_DISCOVERY_BRIDGE_REL_V1), "utf8"),
      ) as { rows: Array<Record<string, string>> };
      const frig = discovery.rows.find((r) => r.slug === "frig-242294502");
      if (frig) {
        frig.hyperagent_classification = "SAFE_CANDIDATE_FOUND";
        frig.candidate_url = "https://example.com/wrong";
      }
      writeFileSync(
        path.join(tempRoot, FRIDGE_SAFE_LINK_HYPERAGENT_DISCOVERY_BRIDGE_REL_V1),
        `${JSON.stringify(discovery, null, 2)}\n`,
      );
      const report = buildFridgeSafeLinkBatchFactoryV1({ rootDir: tempRoot });
      assert.equal(
        report.rows.find((r) => r.slug === "frig-242294502")?.batch_factory_state,
        "DO_NOT_USE_WRONG_PART_RISK",
      );
      assert.equal(report.hyperagent_ingest_rel_path, FRIDGE_SAFE_LINK_HYPERAGENT_BUNDLE_REL_V1);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
