import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import {
  FRIDGE_SAFE_LINK_RESCUE_FIRST4_JSON_REL_V1,
  FRIDGE_SAFE_LINK_RESCUE_FIRST4_MD_REL_V1,
  FRIDGE_SAFE_LINK_RESCUE_FIRST4_SLUGS_V1,
  buildFridgeSafeLinkRescueFirst4ApplyReviewV1,
  writeFridgeSafeLinkRescueFirst4ApplyReviewDraftsV1,
} from "./fridge-safe-link-rescue-first4-apply-review-v1";

describe("fridge-safe-link-rescue-first4-apply-review-v1", () => {
  test("build report is read-only and includes exactly four approved slugs", () => {
    const report = buildFridgeSafeLinkRescueFirst4ApplyReviewV1({ rootDir: process.cwd() });
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.verified_link_authorized, false);
    assert.equal(report.rows.length, 4);
    assert.deepEqual(
      report.rows.map((r) => r.slug),
      [...FRIDGE_SAFE_LINK_RESCUE_FIRST4_SLUGS_V1],
    );
    assert.ok(!report.rows.some((r) => r.slug === "4396842"));
    assert.ok(report.rows.every((r) => r.live_has_go_cta === false));
    assert.ok(report.rows.every((r) => r.mutation_authorized === false));
    assert.ok(report.rows.every((r) => r.verified_link_authorized === false));
  });

  test("4396508 is apply-plan draft eligible with no ASIN collision", () => {
    const report = buildFridgeSafeLinkRescueFirst4ApplyReviewV1({ rootDir: process.cwd() });
    const row = report.rows.find((r) => r.slug === "4396508");
    assert.ok(row);
    assert.equal(row.amazon_asin_reuse_policy_classification, "EXACT_PDP_PROVEN_NO_COLLISION");
    assert.equal(row.sufficient_to_draft_future_apply_plan, true);
    assert.equal(row.owner_apply_review_ready, true);
    assert.equal(row.product_attribution_label, "aftermarket_compatible");
  });

  test("writeFridgeSafeLinkRescueFirst4ApplyReviewDraftsV1 writes only allowed draft paths", () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "fridge-first4-"));
    try {
      const rescueSrc = path.join(process.cwd(), "data/fridge/batch-production/drafts/fridge-safe-link-rescue-owner-review-v1.json");
      const rescueDstDir = path.join(tempRoot, "data/fridge/batch-production/drafts");
      mkdirSync(rescueDstDir, { recursive: true });
      writeFileSync(path.join(rescueDstDir, "fridge-safe-link-rescue-owner-review-v1.json"), readFileSync(rescueSrc));

      for (const rel of ["data/filters.csv", "data/compatibility_mappings.csv", "data/retailer_links.csv"]) {
        const dst = path.join(tempRoot, rel);
        mkdirSync(path.dirname(dst), { recursive: true });
        writeFileSync(dst, readFileSync(path.join(process.cwd(), rel)));
      }
      for (const slug of FRIDGE_SAFE_LINK_RESCUE_FIRST4_SLUGS_V1) {
        const rescue = JSON.parse(readFileSync(rescueSrc, "utf8")) as {
          missing_safe_link_slugs: Array<{ slug: string; evidence_files_on_disk: string[] }>;
        };
        const row = rescue.missing_safe_link_slugs.find((r) => r.slug === slug);
        for (const evidenceRel of row?.evidence_files_on_disk ?? []) {
          if (evidenceRel.includes("unknown-outcome")) continue;
          const dst = path.join(tempRoot, evidenceRel);
          mkdirSync(path.dirname(dst), { recursive: true });
          writeFileSync(dst, readFileSync(path.join(process.cwd(), evidenceRel)));
        }
      }

      const report = buildFridgeSafeLinkRescueFirst4ApplyReviewV1({ rootDir: tempRoot });
      const written = writeFridgeSafeLinkRescueFirst4ApplyReviewDraftsV1({ rootDir: tempRoot, report });
      assert.equal(written.json_rel_path, FRIDGE_SAFE_LINK_RESCUE_FIRST4_JSON_REL_V1);
      assert.equal(written.md_rel_path, FRIDGE_SAFE_LINK_RESCUE_FIRST4_MD_REL_V1);
      const json = JSON.parse(
        readFileSync(path.join(tempRoot, written.json_rel_path), "utf8"),
      ) as { verified_link_authorized: boolean };
      assert.equal(json.verified_link_authorized, false);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("does not fetch /go URLs — packet uses rescue JSON not live HTML", () => {
    const report = buildFridgeSafeLinkRescueFirst4ApplyReviewV1({ rootDir: process.cwd() });
    assert.match(report.proven_facts.join("\n"), /no live HTML rescan/);
    assert.ok(report.exact_repo_paths_read.every((p) => !/\/go(\/|\?)/i.test(p)));
    assert.ok(report.rows.every((r) => r.live_has_go_cta_source === "fridge_safe_link_rescue_owner_review_v1"));
  });
});
