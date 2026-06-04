import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import {
  FRIDGE_SAFE_LINK_BATCH_FACTORY_ALLOWED_WRITE_REL_PATHS_V1,
  FRIDGE_SAFE_LINK_BATCH_FACTORY_JSON_REL_V1,
  FRIDGE_SAFE_LINK_BATCH_FACTORY_MD_REL_V1,
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

  test("GSWF with GE draft proof is APPLY_ELIGIBLE_WITH_EXISTING_PROOF only when proof artifact exists", () => {
    const report = buildFridgeSafeLinkBatchFactoryV1({ rootDir: process.cwd() });
    const gswf = report.rows.find((r) => r.slug === "gswf");
    assert.ok(gswf);
    if (existsSync(path.join(process.cwd(), "data/fridge/batch-production/drafts/fridge-safe-link-gswf-ge-official-owner-browser-proof-v1.json"))) {
      assert.equal(gswf.batch_factory_state, "APPLY_ELIGIBLE_WITH_EXISTING_PROOF");
      assert.ok(gswf.repo_draft_proof_files.length > 0);
    } else {
      assert.notEqual(gswf.batch_factory_state, "APPLY_ELIGIBLE_WITH_EXISTING_PROOF");
    }
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

  test("4396508 is CONFLICT_REQUIRES_RECONCILIATION", () => {
    const report = buildFridgeSafeLinkBatchFactoryV1({ rootDir: process.cwd() });
    const row = report.rows.find((r) => r.slug === "4396508");
    assert.ok(row);
    assert.equal(row.batch_factory_state, "CONFLICT_REQUIRES_RECONCILIATION");
  });

  test("writeFridgeSafeLinkBatchFactoryDraftsV1 writes only allowed draft paths", () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "fridge-batch-factory-"));
    try {
      for (const rel of [
        "data/fridge/batch-production/drafts/fridge-safe-link-rescue-owner-review-v1.json",
        "data/fridge/batch-production/drafts/fridge-safe-link-hyperagent-discovery-ingest-v1.json",
        "data/filters.csv",
        "data/retailer_links.csv",
        "data/compatibility_mappings.csv",
      ]) {
        copyRepoFile(tempRoot, rel);
      }
      const csvBefore = readFileSync(path.join(tempRoot, "data/retailer_links.csv"), "utf8");
      const report = buildFridgeSafeLinkBatchFactoryV1({ rootDir: tempRoot });
      const written = writeFridgeSafeLinkBatchFactoryDraftsV1({ rootDir: tempRoot, report });
      assert.equal(written.json_rel_path, FRIDGE_SAFE_LINK_BATCH_FACTORY_JSON_REL_V1);
      assert.equal(written.md_rel_path, FRIDGE_SAFE_LINK_BATCH_FACTORY_MD_REL_V1);
      assert.deepEqual(
        [written.json_rel_path, written.md_rel_path],
        [...FRIDGE_SAFE_LINK_BATCH_FACTORY_ALLOWED_WRITE_REL_PATHS_V1],
      );
      assert.equal(readFileSync(path.join(tempRoot, "data/retailer_links.csv"), "utf8"), csvBefore);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
