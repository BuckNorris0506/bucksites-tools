import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AP_AGENT_PACKET_DEFAULT_OUT_DIR_V1,
  AP_AGENT_PACKET_FORBIDDEN_ACTIONS_V1,
  buildAirPurifierAgentPacketsV1Report,
  mergeFactoryAndSupplementalPackets,
} from "./lib/air-purifier-agent-packets-v1";
import { buildAirPurifierBatchProductionLaneV1Report } from "./lib/air-purifier-batch-production-lane-v1";

const REPO_ROOT = process.cwd();

const AP_CSV_PATHS = [
  "data/air-purifier/filters.csv",
  "data/air-purifier/filter_aliases.csv",
  "data/air-purifier/compatibility_mappings.csv",
  "data/air-purifier/retailer_links.csv",
];

async function buildLiveLane() {
  return buildAirPurifierBatchProductionLaneV1Report({
    rootDir: REPO_ROOT,
    loadGscArtifact: async () => ({ ok: false, reason: "test" }),
  });
}

test("packet generator is read-only on stdout", async () => {
  const report = await buildAirPurifierAgentPacketsV1Report({ rootDir: REPO_ROOT });
  assert.equal(report.report_name, "air_purifier_agent_packets_v1");
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.out_dir, null);
  assert.equal(report.files_written.length, 0);
  assert.ok(report.packet_count >= 3);
});

test("packet files written only with --out-dir", async () => {
  const without = await buildAirPurifierAgentPacketsV1Report({ rootDir: REPO_ROOT });
  assert.equal(without.files_written.length, 0);

  const tmp = mkdtempSync(path.join(tmpdir(), "ap-agent-packets-"));
  const outDir = path.join(tmp, "data/air-purifier/batch-production/agent-packets");
  const withOut = await buildAirPurifierAgentPacketsV1Report({
    rootDir: REPO_ROOT,
    outDir,
  });
  assert.ok(withOut.files_written.length > 0);
  assert.ok(existsSync(path.join(outDir, "manifest.json")));
  assert.ok(existsSync(path.join(outDir, "ap-blueair-catalog-identity-v1.json")));
  rmSync(tmp, { recursive: true, force: true });
});

test("packet count matches factory packets plus supplemental amazon when owner_review exists", async () => {
  const lane = await buildLiveLane();
  const merged = mergeFactoryAndSupplementalPackets(lane);
  const report = await buildAirPurifierAgentPacketsV1Report({ rootDir: REPO_ROOT });
  assert.equal(report.packet_count, merged.length);
  assert.equal(report.packets.length, merged.length);
  const amazon = report.packets.find((p) => p.packet_id === "ap-amazon-secondary-v1");
  if (lane.state_counts.owner_review > 0) {
    assert.ok(amazon, "expected amazon packet when owner_review candidates exist");
  }
});

test("Blueair packet requires owner review and includes catalog gaps", async () => {
  const report = await buildAirPurifierAgentPacketsV1Report({ rootDir: REPO_ROOT });
  const blueair = report.packets.find((p) => p.packet_id === "ap-blueair-catalog-identity-v1");
  assert.ok(blueair);
  assert.equal(blueair!.owner_review_required, true);
  assert.ok(blueair!.catalog_identity_gaps?.length);
  assert.match(blueair!.reject_rules.join(" "), /alias/i);
});

test("OEM search packet forbids direct mutation without browser proof", async () => {
  const report = await buildAirPurifierAgentPacketsV1Report({ rootDir: REPO_ROOT });
  const oem = report.packets.find((p) => p.packet_id === "ap-oem-search-placeholder-v1");
  assert.ok(oem);
  assert.ok(
    oem!.forbidden_actions.some((a) => /direct_buyable without Add to Cart/i.test(a)),
  );
  assert.ok(oem!.validation_checklist.some((c) => /recommended_csv_mutation is null/i.test(c)));
  assert.ok(oem!.expected_output_schema.decisions.includes("PASS_DIRECT_BUYABLE"));
});

test("expected output schema is included on every packet", async () => {
  const report = await buildAirPurifierAgentPacketsV1Report({ rootDir: REPO_ROOT });
  for (const packet of report.packets) {
    assert.equal(packet.expected_output_schema.contract, "air_purifier_agent_evidence_result_v1");
    assert.ok(packet.expected_output_schema.results_path_hint.includes("agent-results"));
    assert.equal(packet.no_commit, true);
    assert.equal(packet.no_deploy, true);
    assert.ok(AP_AGENT_PACKET_FORBIDDEN_ACTIONS_V1.length >= 5);
  }
});

test("CSV files are not mutated by packet generation", async () => {
  const before = AP_CSV_PATHS.map((rel) => {
    const abs = path.join(REPO_ROOT, rel);
    return { rel, content: readFileSync(abs, "utf8"), mtimeMs: statSync(abs).mtimeMs };
  });

  await buildAirPurifierAgentPacketsV1Report({ rootDir: REPO_ROOT });
  const tmp = mkdtempSync(path.join(tmpdir(), "ap-packets-out-"));
  await buildAirPurifierAgentPacketsV1Report({
    rootDir: REPO_ROOT,
    outDir: path.join(tmp, "data/air-purifier/batch-production/agent-packets"),
  });
  rmSync(tmp, { recursive: true, force: true });

  for (const snap of before) {
    const abs = path.join(REPO_ROOT, snap.rel);
    assert.equal(readFileSync(abs, "utf8"), snap.content, `${snap.rel} content changed`);
  }
});

test("default out dir constant matches documented path", () => {
  assert.equal(
    AP_AGENT_PACKET_DEFAULT_OUT_DIR_V1,
    "data/air-purifier/batch-production/agent-packets",
  );
});
