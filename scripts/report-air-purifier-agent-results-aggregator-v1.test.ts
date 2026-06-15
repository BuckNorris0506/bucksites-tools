import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildAirPurifierAgentResultsAggregatorV1Report,
  normalizePacketResultCandidateV1,
  parseAgentResultFileContentV1,
  validateAgentEvidenceRowV1,
} from "./lib/air-purifier-agent-results-aggregator-v1";

const REPO_ROOT = process.cwd();

const AP_CSV_PATHS = [
  "data/air-purifier/filters.csv",
  "data/air-purifier/filter_aliases.csv",
  "data/air-purifier/compatibility_mappings.csv",
  "data/air-purifier/retailer_links.csv",
];

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    packet_id: "ap-test-v1",
    slug: "test-slug",
    decision: "PASS_DIRECT_BUYABLE",
    candidate_url: "https://example.com/search?q=TOKEN",
    final_url: "https://example.com/products/test-filter",
    browser_truth_classification: "direct_buyable",
    exact_tokens_seen: ["TOKEN"],
    wrong_family_tokens_seen: [],
    buy_action_seen: true,
    reference_only_reason: null,
    evidence_notes: "test evidence",
    recommended_csv_mutation: {
      file: "data/air-purifier/retailer_links.csv",
      filter_slug: "test-slug",
      retailer_key: "oem-catalog",
      fields: { affiliate_url: "https://example.com/products/test-filter" },
      note: "test",
    },
    owner_review_required: false,
    ...overrides,
  };
}

function writeResultsDir(rowsByFile: Record<string, unknown>): string {
  const tmp = mkdtempSync(path.join(tmpdir(), "ap-agent-results-"));
  const dir = path.join(tmp, "results");
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(rowsByFile)) {
    writeFileSync(path.join(dir, name), `${JSON.stringify(content, null, 2)}\n`, "utf8");
  }
  return dir;
}

test("parseAgentResultFileContent supports array, results, rows, and candidate_results shapes", () => {
  const row = baseRow();
  assert.deepEqual(parseAgentResultFileContentV1([row], "a.json").rows, [row]);
  assert.deepEqual(parseAgentResultFileContentV1({ results: [row] }, "b.json").rows, [row]);
  assert.deepEqual(parseAgentResultFileContentV1({ rows: [row], packet_id: "x" }, "c.json").rows, [
    row,
  ]);
  const packetResult = parseAgentResultFileContentV1(
    {
      report_name: "air_purifier_agent_packet_result_v1",
      packet_id: "ap-test-v1",
      candidate_results: [{ filter_slug: "slug-a", evidence_status: "UNKNOWN" }],
    },
    "e.json",
  );
  assert.equal(packetResult.error, null);
  assert.equal(packetResult.result_format, "air_purifier_agent_packet_result_v1");
  assert.equal(packetResult.packet_id, "ap-test-v1");
  assert.equal(packetResult.rows.length, 1);
  assert.ok(parseAgentResultFileContentV1({ bad: true }, "d.json").error);
});

test("committed ap-batch-v3 result files aggregate to 17 rows with expected evidence_status counts", () => {
  const report = buildAirPurifierAgentResultsAggregatorV1Report({
    rootDir: REPO_ROOT,
    resultsDir: "data/air-purifier/batch-production/agent-results-batch-v3",
  });
  assert.equal(report.result_file_count, 3);
  assert.equal(report.row_count, 17);
  assert.equal(report.valid_row_count, 17);
  assert.equal(report.invalid_row_count, 0);
  assert.equal(report.invalid_files.length, 0);
  assert.equal(report.source_status, "PROVEN");
  assert.equal(report.decision_counts.BLOCKED, 4);
  assert.equal(report.decision_counts.UNKNOWN, 11);
  assert.equal(report.decision_counts.FAIL, 2);
  assert.equal(report.recommended_csv_mutation_count, 0);
  assert.equal(report.recommended_catalog_action_count, 1);
  assert.equal(report.projected_coverage_delta.direct_buyable_plus, 0);
  assert.equal(report.projected_coverage_delta.official_reference_plus, 0);
  assert.equal(report.projected_coverage_delta.blocked_minus, 0);
  assert.equal(report.review_groups.catalog_task_required.length, 1);
  assert.ok(report.review_groups.catalog_task_required.some((r) => r.slug === "blueair-particle-411"));
  assert.ok(
    report.recommended_next_action.includes("No CSV apply is safe"),
    report.recommended_next_action,
  );
  assert.ok(
    report.recommended_next_action.toLowerCase().includes("catalog"),
    report.recommended_next_action,
  );
});

test("normalizePacketResultCandidateV1 reads candidate_results row path", () => {
  const normalized = normalizePacketResultCandidateV1("ap-blueair-catalog-identity-v1", {
    filter_slug: "blueair-particle-411",
    evidence_status: "BLOCKED",
    browser_truth_classification: "wrong_family",
    recommended_catalog_action: { action_type: "OWNER_APPROVED_CATALOG_IDENTITY_TASK_REQUIRED" },
  });
  assert.ok(normalized);
  assert.equal(normalized!.row.slug, "blueair-particle-411");
  assert.equal(normalized!.evidence_status, "BLOCKED");
  assert.equal(normalized!.row.decision, "CATALOG_GAP");
});

test("reads multiple result files from results dir", () => {
  const dir = writeResultsDir({
    "a.results.json": { rows: [baseRow({ slug: "slug-a" })] },
    "b.results.json": [baseRow({ slug: "slug-b", packet_id: "ap-b" })],
  });
  const report = buildAirPurifierAgentResultsAggregatorV1Report({
    rootDir: REPO_ROOT,
    resultsDir: dir,
  });
  assert.equal(report.result_file_count, 2);
  assert.equal(report.row_count, 2);
  rmSync(path.dirname(dir), { recursive: true, force: true });
});

test("invalid decision is caught", () => {
  const validated = validateAgentEvidenceRowV1(
    baseRow({ decision: "NOT_A_REAL_DECISION" }),
    "bad.json",
  );
  assert.equal(validated.ok, false);
  if (!validated.ok) {
    assert.ok(validated.invalid.reasons.includes("decision_not_in_enum"));
  }
});

test("PASS_DIRECT_BUYABLE without buy_action is not auto-eligible", () => {
  const dir = writeResultsDir({
    "x.results.json": {
      rows: [
        baseRow({
          slug: "no-buy",
          buy_action_seen: false,
        }),
      ],
    },
  });
  const report = buildAirPurifierAgentResultsAggregatorV1Report({
    rootDir: REPO_ROOT,
    resultsDir: dir,
  });
  assert.equal(report.review_groups.auto_apply_eligible.length, 0);
  assert.ok(report.invalid_rows.length > 0);
  assert.ok(report.review_groups.owner_review_required.some((r) => r.slug === "no-buy"));
  rmSync(path.dirname(dir), { recursive: true, force: true });
});

test("wrong-family tokens prevent auto-eligible", () => {
  const dir = writeResultsDir({
    "x.results.json": {
      rows: [
        baseRow({
          slug: "wrong-family",
          wrong_family_tokens_seen: ["WRONG-SKU"],
        }),
      ],
    },
  });
  const report = buildAirPurifierAgentResultsAggregatorV1Report({
    rootDir: REPO_ROOT,
    resultsDir: dir,
  });
  assert.equal(report.review_groups.auto_apply_eligible.length, 0);
  assert.ok(
    report.review_groups.owner_review_required.some((r) => r.slug === "wrong-family"),
  );
  rmSync(path.dirname(dir), { recursive: true, force: true });
});

test("owner_review_required routes to owner_review_required group", () => {
  const dir = writeResultsDir({
    "x.results.json": {
      rows: [
        baseRow({
          slug: "medify-row",
          owner_review_required: true,
          recommended_csv_mutation: {
            file: "data/air-purifier/retailer_links.csv",
            filter_slug: "medify-row",
            retailer_key: "amazon",
            fields: {},
            note: "secondary only",
          },
        }),
      ],
    },
  });
  const report = buildAirPurifierAgentResultsAggregatorV1Report({
    rootDir: REPO_ROOT,
    resultsDir: dir,
  });
  const hit = report.review_groups.owner_review_required.find((r) => r.slug === "medify-row");
  assert.ok(hit);
  assert.ok(hit!.review_reasons.some((r) => r.includes("owner_review")));
  rmSync(path.dirname(dir), { recursive: true, force: true });
});

test("NO_SAFE_PATH routes to no_safe_path", () => {
  const dir = writeResultsDir({
    "x.results.json": {
      rows: [
        {
          ...baseRow({
            slug: "meta-air",
            decision: "NO_SAFE_PATH",
            browser_truth_classification: null,
            buy_action_seen: false,
            exact_tokens_seen: [],
            recommended_csv_mutation: null,
          }),
        },
      ],
    },
  });
  const report = buildAirPurifierAgentResultsAggregatorV1Report({
    rootDir: REPO_ROOT,
    resultsDir: dir,
  });
  assert.ok(report.review_groups.no_safe_path.some((r) => r.slug === "meta-air"));
  rmSync(path.dirname(dir), { recursive: true, force: true });
});

test("projected coverage delta counts direct and reference candidates", () => {
  const dir = writeResultsDir({
    "x.results.json": {
      rows: [
        baseRow({ slug: "buy-1" }),
        baseRow({
          slug: "ref-1",
          decision: "PASS_REFERENCE",
          browser_truth_classification: "likely_valid",
          buy_action_seen: false,
          recommended_csv_mutation: {
            file: "data/air-purifier/retailer_links.csv",
            filter_slug: "ref-1",
            retailer_key: "shark-official",
            fields: {},
            note: "ref",
          },
        }),
      ],
    },
  });
  const report = buildAirPurifierAgentResultsAggregatorV1Report({
    rootDir: REPO_ROOT,
    resultsDir: dir,
  });
  assert.equal(report.projected_coverage_delta.direct_buyable_plus, 1);
  assert.equal(report.projected_coverage_delta.official_reference_plus, 1);
  assert.equal(report.projected_coverage_delta.blocked_minus, 2);
  rmSync(path.dirname(dir), { recursive: true, force: true });
});

test("aggregator does not mutate CSVs", () => {
  const before = AP_CSV_PATHS.map((rel) => ({
    rel,
    content: readFileSync(path.join(REPO_ROOT, rel), "utf8"),
  }));

  buildAirPurifierAgentResultsAggregatorV1Report({ rootDir: REPO_ROOT });
  buildAirPurifierAgentResultsAggregatorV1Report({
    rootDir: REPO_ROOT,
    resultsDir: "data/air-purifier/batch-production/agent-results",
  });

  for (const snap of before) {
    assert.equal(readFileSync(path.join(REPO_ROOT, snap.rel), "utf8"), snap.content);
  }
});

test("live agent results approximate expected grouping buckets", () => {
  const report = buildAirPurifierAgentResultsAggregatorV1Report({
    rootDir: REPO_ROOT,
    resultsDir: "data/air-purifier/batch-production/agent-results",
  });
  assert.ok(report.result_file_count >= 3);

  const autoSlugs = new Set(report.review_groups.auto_apply_eligible.map((r) => r.slug));
  for (const slug of [
    "levoit-rf-rar040",
    "levoit-rf-rar060",
    "levoit-rf-lv-h133",
    "levoit-rf-c131",
    "levoit-rf-cr200",
    "levoit-rf-lv-h128",
    "levoit-vital100-rf",
    "medify-ma18-rf",
    "medify-ma22-rf",
    "medify-ma25-rf",
    "medify-ma40-rf",
    "medify-ma50-rf",
    "medify-ma112-rf",
  ]) {
    assert.ok(autoSlugs.has(slug), `expected auto_apply ${slug}`);
  }

  const ownerSlugs = new Set(report.review_groups.owner_review_required.map((r) => r.slug));
  assert.ok(
    ownerSlugs.has("winix-hepa-115115"),
    "winix-hepa-115115 has wrong_family_tokens in agent file — owner review not auto_apply",
  );
  for (const slug of ["winix-carbon-116131", "shark-hepa-hp100", "rabbit-biogs-minusa2"]) {
    assert.ok(ownerSlugs.has(slug), `expected owner_review ${slug}`);
  }

  const noSafe = new Set(report.review_groups.no_safe_path.map((r) => r.slug));
  for (const slug of ["levoit-rf-meta-air", "shark-carbon-foam"]) {
    assert.ok(noSafe.has(slug), `expected no_safe_path ${slug}`);
  }

  assert.ok(
    ownerSlugs.has("holmes-hapf30") || report.review_groups.reference_eligible.some((r) => r.slug === "holmes-hapf30"),
    "holmes expected in reference or owner review",
  );
  assert.ok(
    ownerSlugs.has("shark-hepa-hp100") ||
      report.review_groups.reference_eligible.some((r) => r.slug === "shark-hepa-hp100"),
    "shark-hepa-hp100 expected in reference or owner review",
  );
});
