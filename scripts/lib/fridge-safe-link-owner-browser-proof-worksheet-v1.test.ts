import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import {
  FRIDGE_OWNER_BROWSER_PROOF_WORKSHEET_ALLOWED_WRITE_REL_PATHS_V1,
  FRIDGE_OWNER_BROWSER_PROOF_WORKSHEET_CANDIDATE_SLUGS_V1,
  FRIDGE_OWNER_BROWSER_PROOF_WORKSHEET_MD_REL_V1,
  buildFridgeSafeLinkOwnerBrowserProofWorksheetMarkdownV1,
  buildFridgeSafeLinkOwnerBrowserProofWorksheetV1,
  writeFridgeSafeLinkOwnerBrowserProofWorksheetDraftV1,
} from "./fridge-safe-link-owner-browser-proof-worksheet-v1";
import { FRIDGE_OWNER_BROWSER_PROOF_CURSOR_VALIDATION_REL_V1 } from "./fridge-safe-link-owner-browser-proof-batch-validation-v1";
import { FRIDGE_SAFE_LINK_BATCH_FACTORY_JSON_REL_V1 } from "./fridge-safe-link-batch-factory-v1";

const LIB_SOURCE = readFileSync(
  path.join(process.cwd(), "scripts/lib/fridge-safe-link-owner-browser-proof-worksheet-v1.ts"),
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  path.join(process.cwd(), "scripts/report-fridge-safe-link-owner-browser-proof-worksheet-v1.ts"),
  "utf8",
);

function copyRepoFile(root: string, rel: string): void {
  const dst = path.join(root, rel);
  mkdirSync(path.dirname(dst), { recursive: true });
  writeFileSync(dst, readFileSync(path.join(process.cwd(), rel)));
}

describe("fridge-safe-link-owner-browser-proof-worksheet-v1", () => {
  test("worksheet includes all 7 discovery candidate slugs from batch factory", () => {
    const worksheet = buildFridgeSafeLinkOwnerBrowserProofWorksheetV1({ rootDir: process.cwd() });
    assert.equal(worksheet.slug_count, 7);
    assert.equal(worksheet.batch_factory_owner_browser_proof_overlay_applied, true);
    assert.deepEqual(
      worksheet.slugs.map((s) => s.slug),
      [...FRIDGE_OWNER_BROWSER_PROOF_WORKSHEET_CANDIDATE_SLUGS_V1],
    );
    for (const row of worksheet.slugs) {
      assert.equal(row.batch_factory_state, "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF");
      assert.ok(row.candidate_urls.length > 0, row.slug);
    }
  });

  test("edr3rxd1 B087PDLZL9 is excluded from proof candidates and listed as rejected", () => {
    const worksheet = buildFridgeSafeLinkOwnerBrowserProofWorksheetV1({ rootDir: process.cwd() });
    assert.equal(worksheet.edr3_b087_excluded_as_oem, true);
    const edr3 = worksheet.slugs.find((s) => s.slug === "edr3rxd1");
    assert.ok(edr3);
    assert.ok(
      edr3.candidate_urls.every((c) => !c.url.includes("B087PDLZL9")),
      "B087 must not appear in candidate_urls",
    );
    assert.ok(
      edr3.rejected_candidates.some((r) => r.includes("B087PDLZL9")),
      "B087 must appear in rejected_candidates",
    );
    const md = buildFridgeSafeLinkOwnerBrowserProofWorksheetMarkdownV1(worksheet);
    assert.ok(md.includes("B087PDLZL9"));
    assert.ok(md.includes("FAIL_AFTERMARKET_NOT_OEM"));
  });

  test("markdown includes browser verify checklist and blank notes per slug", () => {
    const worksheet = buildFridgeSafeLinkOwnerBrowserProofWorksheetV1({ rootDir: process.cwd() });
    const md = buildFridgeSafeLinkOwnerBrowserProofWorksheetMarkdownV1(worksheet);
    assert.ok(md.includes("Direct product page"));
    assert.ok(md.includes("### Notes"));
    assert.equal((md.match(/## edr4rxd1/g) ?? []).length, 1);
    assert.equal((md.match(/Fill in after browser review/g) ?? []).length, 7);
  });

  test("writer does not touch protected paths", () => {
    assert.ok(!LIB_SOURCE.includes("buckparts.com/go"));
    assert.ok(!LIB_SOURCE.includes("/go/"));
    assert.ok(!REPORT_SOURCE.includes("/go"));
    assert.ok(!LIB_SOURCE.includes('writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")'));
    assert.ok(!LIB_SOURCE.includes('writeFileSync(path.join(args.rootDir, "data/evidence/'));
  });

  test("writeFridgeSafeLinkOwnerBrowserProofWorksheetDraftV1 writes only allowed draft path", () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "fridge-owner-browser-worksheet-"));
    try {
      copyRepoFile(tempRoot, FRIDGE_SAFE_LINK_BATCH_FACTORY_JSON_REL_V1);
      copyRepoFile(tempRoot, FRIDGE_OWNER_BROWSER_PROOF_CURSOR_VALIDATION_REL_V1);
      const csvBefore = readFileSync(path.join(process.cwd(), "data/retailer_links.csv"), "utf8");
      copyRepoFile(tempRoot, "data/retailer_links.csv");
      const evidenceRel = "data/evidence/amazon-edr3rxd1-aftermarket-pdp-evidence.2026-05-04.json";
      if (existsSync(path.join(process.cwd(), evidenceRel))) {
        copyRepoFile(tempRoot, evidenceRel);
        const evidenceBefore = readFileSync(path.join(tempRoot, evidenceRel), "utf8");
        const worksheet = buildFridgeSafeLinkOwnerBrowserProofWorksheetV1({ rootDir: tempRoot });
        const written = writeFridgeSafeLinkOwnerBrowserProofWorksheetDraftV1({
          rootDir: tempRoot,
          worksheet,
        });
        assert.equal(written.md_rel_path, FRIDGE_OWNER_BROWSER_PROOF_WORKSHEET_MD_REL_V1);
        assert.deepEqual(
          [written.md_rel_path],
          [...FRIDGE_OWNER_BROWSER_PROOF_WORKSHEET_ALLOWED_WRITE_REL_PATHS_V1],
        );
        assert.equal(readFileSync(path.join(tempRoot, "data/retailer_links.csv"), "utf8"), csvBefore);
        assert.equal(readFileSync(path.join(tempRoot, evidenceRel), "utf8"), evidenceBefore);
      }
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
