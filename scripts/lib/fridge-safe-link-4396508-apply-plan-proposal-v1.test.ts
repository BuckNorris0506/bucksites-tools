import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import {
  FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_JSON_REL_V1,
  FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_MD_REL_V1,
  FRIDGE_SAFE_LINK_4396508_TARGET_SLUG_V1,
  buildFridgeSafeLink4396508ApplyPlanProposalV1,
  proposedSlugSetFromReport,
  writeFridgeSafeLink4396508ApplyPlanProposalDraftsV1,
} from "./fridge-safe-link-4396508-apply-plan-proposal-v1";

function copyRepoFile(root: string, rel: string): void {
  const dst = path.join(root, rel);
  mkdirSync(path.dirname(dst), { recursive: true });
  writeFileSync(dst, readFileSync(path.join(process.cwd(), rel)));
}

describe("fridge-safe-link-4396508-apply-plan-proposal-v1", () => {
  test("proposal is read-only and targets 4396508 only", () => {
    const report = buildFridgeSafeLink4396508ApplyPlanProposalV1({ rootDir: process.cwd() });
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.verified_link_authorized, false);
    assert.equal(report.target_slug, FRIDGE_SAFE_LINK_4396508_TARGET_SLUG_V1);
    assert.equal(report.apply_plan_ready, true);
    assert.equal(report.apply_plan_applied, false);
    assert.equal(report.live_state.live_has_go_cta, false);
    assert.equal(report.live_state.production_go_clicked, false);
    assert.deepEqual(proposedSlugSetFromReport(report), [FRIDGE_SAFE_LINK_4396508_TARGET_SLUG_V1]);
    assert.ok(!report.proven_facts.join("\n").includes("4396842"));
    assert.ok(!report.proven_facts.join("\n").includes("edr4rxd1"));
  });

  test("browser_truth fields remain UNKNOWN — gates not weakened", () => {
    const report = buildFridgeSafeLink4396508ApplyPlanProposalV1({ rootDir: process.cwd() });
    const classification = report.proposed_retailer_link_row_fields.find(
      (f) => f.field === "browser_truth_classification",
    );
    const subtype = report.proposed_retailer_link_row_fields.find(
      (f) => f.field === "browser_truth_buyable_subtype",
    );
    assert.equal(classification?.proposed_value, null);
    assert.equal(classification?.proof_status, "UNKNOWN");
    assert.equal(subtype?.proposed_value, null);
    assert.equal(subtype?.proof_status, "UNKNOWN");
    assert.equal(report.amazon_asin_reuse_policy_classification, "EXACT_PDP_PROVEN_NO_COLLISION");
  });

  test("writeFridgeSafeLink4396508ApplyPlanProposalDraftsV1 writes only allowed draft paths", () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "fridge-4396508-"));
    try {
      for (const rel of [
        "data/fridge/batch-production/drafts/fridge-safe-link-rescue-owner-review-v1.json",
        "data/fridge/batch-production/drafts/fridge-safe-link-rescue-first4-apply-review-v1.json",
        "data/evidence/amazon-4396508-owner-review-pdp-evidence.2026-05-10.json",
        "data/retailer_links.csv",
        "data/filters.csv",
      ]) {
        copyRepoFile(tempRoot, rel);
      }
      const report = buildFridgeSafeLink4396508ApplyPlanProposalV1({ rootDir: tempRoot });
      const written = writeFridgeSafeLink4396508ApplyPlanProposalDraftsV1({ rootDir: tempRoot, report });
      assert.equal(written.json_rel_path, FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_JSON_REL_V1);
      assert.equal(written.md_rel_path, FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_MD_REL_V1);
      const json = JSON.parse(
        readFileSync(path.join(tempRoot, written.json_rel_path), "utf8"),
      ) as { verified_link_authorized: boolean; target_slug: string };
      assert.equal(json.verified_link_authorized, false);
      assert.equal(json.target_slug, "4396508");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("does not fetch /go URLs", () => {
    const report = buildFridgeSafeLink4396508ApplyPlanProposalV1({ rootDir: process.cwd() });
    assert.equal(report.live_state.production_go_clicked, false);
    assert.match(report.proven_facts.join("\n"), /production \/go not clicked/);
    assert.ok(
      report.exact_repo_paths_read.every((p) => !/\/go(\/|\?)/i.test(p)),
    );
  });
});
