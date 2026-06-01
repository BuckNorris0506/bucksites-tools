import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BUCKPARTS_GO_FIRST_HOP_RETAILER_REDIRECT_LEARNING_NOTE_V1,
  buildBuckPartsGoFirstHopSmokeReportV1,
  buildBuckPartsGoFirstHopTargetsFromCsvV1,
  validateBuckPartsGoFirstHopResponseV1,
} from "./buckparts-go-first-hop-smoke-v1";

const HEADER =
  "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at";

const ROWS = [
  ["lt1000p", "B07H9LHMR2"],
  ["lt700p", "B0042ACZU2"],
  ["lt800p", "B00X3DWMS4"],
  ["lt600p", "B07VGD8Z5Z"],
  ["mdj64844601", "B08HDD1PK1"],
  ["lt1000pc", "B07H9LHMR2"],
  ["da29-00019a", "B019HPTP3G"],
  ["da97-15217d", "B07BHZWSCQ"],
  ["edr1rxd1", "B00UXG4WR8"],
  ["edr2rxd1", "B00VBP8QPO"],
  ["4396841", "B087PDLZL9"],
  ["4396710", "B087PDLZL9"],
  ["8171413", "B01CA0V1VE"],
  ["46-9002", "B01IDH3IPU"],
] as const;

const CSV = `${HEADER}\n${ROWS.map(
  ([slug, asin]) =>
    `${slug},Amazon,https://www.amazon.com/dp/${asin}?tag=buckparts20-20,true,0,amazon,direct_buyable,,`,
).join("\n")}\n`;

test("buildBuckPartsGoFirstHopTargetsFromCsvV1 derives 14 guarded batch /go targets from CSV", () => {
  const targets = buildBuckPartsGoFirstHopTargetsFromCsvV1({
    rootDir: "/repo",
    readText: () => CSV,
  });
  assert.equal(targets.length, 14);
  assert.equal(targets.find((row) => row.slug === "4396710")?.link_id, "b2241855-b588-4884-9dfa-b0f5969becbf");
  assert.equal(targets.find((row) => row.slug === "4396710")?.expected_asin, "B087PDLZL9");
  assert.equal(targets.every((row) => row.expected_tag === "buckparts20-20"), true);
});

test("validateBuckPartsGoFirstHopResponseV1 accepts first-hop redirect and ignores final Amazon status", () => {
  const target = buildBuckPartsGoFirstHopTargetsFromCsvV1({
    rootDir: "/repo",
    readText: () => CSV,
  }).find((row) => row.slug === "edr1rxd1")!;
  const result = validateBuckPartsGoFirstHopResponseV1({
    target,
    url: `https://buckparts.test${target.go_path}`,
    response: {
      status: 302,
      location: "https://www.amazon.com/dp/B00UXG4WR8?tag=buckparts20-20",
    },
  });
  assert.equal(result.validation_status, "PASS");
  assert.deepEqual(result.blockers, []);
});

test("validateBuckPartsGoFirstHopResponseV1 rejects missing ASIN or affiliate tag", () => {
  const target = buildBuckPartsGoFirstHopTargetsFromCsvV1({
    rootDir: "/repo",
    readText: () => CSV,
  })[0]!;
  const result = validateBuckPartsGoFirstHopResponseV1({
    target,
    url: `https://buckparts.test${target.go_path}`,
    response: {
      status: 200,
      location: "https://www.amazon.com/dp/B000WRONG0",
    },
  });
  assert.equal(result.validation_status, "FAIL");
  assert.ok(result.blockers.includes("first_hop_status_not_redirect: status=200"));
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("first_hop_location_missing_expected_asin:")));
  assert.ok(result.blockers.includes("first_hop_location_missing_expected_tag: expected=buckparts20-20"));
});

test("buildBuckPartsGoFirstHopSmokeReportV1 uses injected first-hop fetch and remains read-only", async () => {
  const report = await buildBuckPartsGoFirstHopSmokeReportV1({
    rootDir: "/repo",
    baseUrl: "http://127.0.0.1:3012",
    now: () => new Date("2026-06-01T12:00:00.000Z"),
    readText: () => CSV,
    fetchFirstHop: async (url) => {
      const target = buildBuckPartsGoFirstHopTargetsFromCsvV1({
        rootDir: "/repo",
        readText: () => CSV,
      }).find((row) => url.endsWith(row.go_path))!;
      return {
        status: 307,
        location: `https://www.amazon.com/dp/${target.expected_asin}?tag=buckparts20-20`,
      };
    },
  });
  assert.equal(report.smoke_status, "PASS");
  assert.equal(report.target_count, 14);
  assert.equal(report.supabase_write_authorized, false);
  assert.equal(report.evidence_write_authorized, false);
  assert.equal(report.netlify_api_authorized, false);
  assert.equal(report.deploy_authorized, false);
  assert.equal(report.learning_note, BUCKPARTS_GO_FIRST_HOP_RETAILER_REDIRECT_LEARNING_NOTE_V1);
});

test("buildBuckPartsGoFirstHopSmokeReportV1 refuses production /go smoke by default", async () => {
  await assert.rejects(
    () =>
      buildBuckPartsGoFirstHopSmokeReportV1({
        rootDir: "/repo",
        baseUrl: "https://buckparts.com",
        readText: () => CSV,
        fetchFirstHop: async () => ({ status: 302, location: "https://www.amazon.com/dp/B00UXG4WR8?tag=buckparts20-20" }),
      }),
    /refusing_production_go_smoke_without_explicit_allow/,
  );
});
