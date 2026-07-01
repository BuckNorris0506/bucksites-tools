import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Browser } from "playwright";
import { describe, test } from "node:test";

import { runVerifyOemRetailerLinksV1 } from "./verify-oem-retailer-links-run-v1";
import { VERIFY_OEM_RETAILER_LINKS_IO_READ_INDEX_SUPABASE_BLOCKER_V1 } from "./verify-oem-retailer-links-mutation-gate-v1";
import { loadTruthLedgerAppendEntriesV1 } from "./truth-ledger-v1";

const CSV_REL = "data/retailer_links.csv";

function writeCsvFixture(root: string) {
  mkdirSync(path.join(root, "data"), { recursive: true });
  writeFileSync(
    path.join(root, CSV_REL),
    "filter_slug,retailer_name,affiliate_url,retailer_key\nslug1,OEM,https://example.com/oem,oem_fixture\n",
    "utf8",
  );
}

function mockBrowser(): Browser {
  return {
    newContext: async () => ({
      newPage: async () => ({
        goto: async () => {},
        url: () => "https://example.com/oem",
        title: async () => "OEM Product",
        evaluate: async () => "Add to cart",
        screenshot: async () => {},
        close: async () => {},
      }),
      close: async () => {},
    }),
    close: async () => {},
  } as unknown as Browser;
}

describe("verify-oem-retailer-links-run-v1", () => {
  test("default run writes report csv without write-db ledger", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "oem-verify-run-"));
    try {
      writeCsvFixture(root);
      const { report, exit_code } = await runVerifyOemRetailerLinksV1({
        rootDir: root,
        argv: ["--fridge-only", "--limit", "1"],
        launchBrowser: async () => mockBrowser(),
      });
      assert.equal(exit_code, 0);
      assert.equal(report.write_db_requested, false);
      assert.ok(report.out_csv_path.includes("oem-browser-truth"));
      const entries = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(entries.length, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write-db blocked does not update db and appends ledger", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "oem-verify-run-blocked-"));
    try {
      writeCsvFixture(root);
      let updateCalls = 0;
      const { report, exit_code } = await runVerifyOemRetailerLinksV1({
        rootDir: root,
        argv: ["--fridge-only", "--limit", "1", "--write-db"],
        io_capability: "READ_INDEX",
        founderRows: [],
        launchBrowser: async () => mockBrowser(),
        recordTruthLedger: (args) => {
          if (args.apply_outcome === "applied") updateCalls += 1;
          return { ok: true };
        },
      });
      assert.equal(exit_code, 1);
      assert.equal(report.apply_status, "BLOCKED");
      assert.ok(
        report.mutation_preflight_blockers?.includes(
          VERIFY_OEM_RETAILER_LINKS_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
        ),
      );
      assert.equal(report.persist_counts?.updated ?? 0, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
