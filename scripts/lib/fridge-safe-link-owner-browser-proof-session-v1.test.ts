import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import {
  FRIDGE_OWNER_BROWSER_PROOF_ASSIST_BUNDLE_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_ASSIST_CURSOR_VALIDATION_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_ASSIST_EXPECTED_SLUGS_V1,
} from "./fridge-safe-link-owner-browser-proof-assist-validation-v1";
import {
  FRIDGE_OWNER_BROWSER_PROOF_SESSION_ALLOWED_WRITE_REL_PATHS_V1,
  FRIDGE_OWNER_BROWSER_PROOF_SESSION_MD_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_SESSION_RESULT_OPTIONS_V1,
  buildFridgeSafeLinkOwnerBrowserProofSessionMarkdownV1,
  buildFridgeSafeLinkOwnerBrowserProofSessionV1,
  deriveOwnerBrowserProofSessionOrderV1,
  proveEdr3B087ExcludedFromSessionCandidatesV1,
  writeFridgeSafeLinkOwnerBrowserProofSessionDraftV1,
} from "./fridge-safe-link-owner-browser-proof-session-v1";
import { loadOwnerBrowserProofAssistBundleV1 } from "./fridge-safe-link-owner-browser-proof-assist-validation-v1";

const LIB_SOURCE = readFileSync(
  path.join(process.cwd(), "scripts/lib/fridge-safe-link-owner-browser-proof-session-v1.ts"),
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  path.join(process.cwd(), "scripts/report-fridge-safe-link-owner-browser-proof-session-v1.ts"),
  "utf8",
);

function copyRepoFile(root: string, rel: string): void {
  const dst = path.join(root, rel);
  mkdirSync(path.dirname(dst), { recursive: true });
  writeFileSync(dst, readFileSync(path.join(process.cwd(), rel)));
}

describe("fridge-safe-link-owner-browser-proof-session-v1", () => {
  test("session includes all 7 slugs in manifest start order", () => {
    const bundle = loadOwnerBrowserProofAssistBundleV1(process.cwd());
    const order = deriveOwnerBrowserProofSessionOrderV1(bundle);
    assert.equal(order.length, 7);
    assert.deepEqual(
      order.map((o) => o.slug),
      ["wf3cb", "eptwfu01", "edr4rxd1", "wfcb", "ultrawf", "edr3rxd1", "fppwfu01"],
    );

    const session = buildFridgeSafeLinkOwnerBrowserProofSessionV1({ rootDir: process.cwd() });
    assert.equal(session.slug_count, 7);
    assert.deepEqual(
      session.slugs.map((s) => s.slug),
      order.map((o) => o.slug),
    );
    assert.deepEqual(new Set(session.session_order), new Set(FRIDGE_OWNER_BROWSER_PROOF_ASSIST_EXPECTED_SLUGS_V1));
  });

  test("edr3rxd1 B087PDLZL9 is DO_NOT_USE only, never a candidate URL", () => {
    const session = buildFridgeSafeLinkOwnerBrowserProofSessionV1({ rootDir: process.cwd() });
    assert.equal(session.edr3_b087_excluded_from_candidates, true);
    assert.equal(proveEdr3B087ExcludedFromSessionCandidatesV1(session), true);

    const edr3 = session.slugs.find((s) => s.slug === "edr3rxd1");
    assert.ok(edr3);
    assert.ok(edr3.candidate_urls.every((c) => !c.url.includes("B087PDLZL9")));
    assert.ok(edr3.urls_to_avoid.some((u) => u.url.includes("B087PDLZL9")));
    assert.ok(session.do_not_use.some((d) => d.url.includes("B087PDLZL9")));

    const md = buildFridgeSafeLinkOwnerBrowserProofSessionMarkdownV1(session);
    assert.ok(md.includes("B087PDLZL9"));
    assert.ok(md.includes("DO_NOT_USE"));
    assert.ok(md.includes("PASS_BROWSER_PROOF"));
    assert.ok(md.includes("Stop condition"));
  });

  test("markdown includes per-slug session sections and owner result options", () => {
    const session = buildFridgeSafeLinkOwnerBrowserProofSessionV1({ rootDir: process.cwd() });
    const md = buildFridgeSafeLinkOwnerBrowserProofSessionMarkdownV1(session);
    assert.ok(md.includes("### One-page summary table"));
    assert.ok(md.includes("### Candidate URLs to open"));
    assert.ok(md.includes("### URLs to avoid"));
    assert.ok(md.includes("### Exact visual checks"));
    assert.ok(md.includes("### Screenshot filename checklist"));
    assert.ok(md.includes("https://buckparts.com/filter/edr4rxd1"));
    for (const opt of FRIDGE_OWNER_BROWSER_PROOF_SESSION_RESULT_OPTIONS_V1) {
      assert.ok(md.includes(opt));
    }
    assert.equal((md.match(/### Final owner result/g) ?? []).length, 7);
  });

  test("writer does not touch protected paths", () => {
    assert.ok(!LIB_SOURCE.includes("buckparts.com/go"));
    assert.ok(!LIB_SOURCE.includes("/go/"));
    assert.ok(!REPORT_SOURCE.includes("/go"));
    assert.ok(!LIB_SOURCE.includes('writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")'));
    assert.ok(!LIB_SOURCE.includes('writeFileSync(path.join(args.rootDir, "data/evidence/'));
  });

  test("writeFridgeSafeLinkOwnerBrowserProofSessionDraftV1 writes only allowed draft path", () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "fridge-owner-browser-session-"));
    try {
      copyRepoFile(tempRoot, FRIDGE_OWNER_BROWSER_PROOF_ASSIST_BUNDLE_REL_V1);
      copyRepoFile(tempRoot, FRIDGE_OWNER_BROWSER_PROOF_ASSIST_CURSOR_VALIDATION_REL_V1);
      const csvBefore = readFileSync(path.join(process.cwd(), "data/retailer_links.csv"), "utf8");
      copyRepoFile(tempRoot, "data/retailer_links.csv");
      const evidenceRel = "data/evidence/amazon-edr3rxd1-aftermarket-pdp-evidence.2026-05-04.json";
      if (existsSync(path.join(process.cwd(), evidenceRel))) {
        copyRepoFile(tempRoot, evidenceRel);
        const evidenceBefore = readFileSync(path.join(tempRoot, evidenceRel), "utf8");
        const session = buildFridgeSafeLinkOwnerBrowserProofSessionV1({ rootDir: tempRoot });
        const written = writeFridgeSafeLinkOwnerBrowserProofSessionDraftV1({
          rootDir: tempRoot,
          session,
        });
        assert.equal(written.md_rel_path, FRIDGE_OWNER_BROWSER_PROOF_SESSION_MD_REL_V1);
        assert.deepEqual(
          [written.md_rel_path],
          [...FRIDGE_OWNER_BROWSER_PROOF_SESSION_ALLOWED_WRITE_REL_PATHS_V1],
        );
        assert.equal(readFileSync(path.join(tempRoot, "data/retailer_links.csv"), "utf8"), csvBefore);
        assert.equal(readFileSync(path.join(tempRoot, evidenceRel), "utf8"), evidenceBefore);
      }
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
