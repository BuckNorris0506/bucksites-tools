import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1 } from "./ap-model-first-evidence-queue-v1";
import { DISPATCH_ALLOWLIST_ENTRIES_V1 } from "./buckparts-command-center-dispatch-allowlist-v1";
import {
  discoverExecutiveWorkV1,
  EXECUTIVE_WORK_DETECTORS_V1,
  EXECUTIVE_WORK_DISCOVERY_CONTRACT_V1,
  type ExecutiveWorkDetectorV1,
} from "./buckparts-executive-work-discovery-v1";

const REPO_ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/buckparts-executive-work-discovery-v1.ts"),
  "utf8",
);

const ALLOWLISTED_READ_ONLY =
  DISPATCH_ALLOWLIST_ENTRIES_V1.find(
    (e) => e.owner_review_required === false && e.exact_command.includes("report-buckparts-command-center"),
  )?.exact_command ?? "npx tsx scripts/report-buckparts-command-center.ts";

test("work discovery locks: read-only, no ranking, no dispatch, no NBA, no CC rebuild", async () => {
  const snap = await discoverExecutiveWorkV1({
    rootDir: REPO_ROOT,
    nowIso: "2026-08-15T00:00:00.000Z",
  });
  assert.equal(snap.contract, EXECUTIVE_WORK_DISCOVERY_CONTRACT_V1);
  assert.equal(snap.observation_kind, "business_work_set");
  assert.equal(snap.read_only, true);
  assert.equal(snap.data_mutation, false);
  assert.equal(snap.mutation_authorized, false);
  assert.equal(snap.nba_authority, false);
  assert.equal(snap.dispatch_authority, false);
  assert.equal(snap.dispatch_invoked, false);
  assert.equal(snap.steering_authority, false);
  assert.equal(snap.ranking_performed, false);
  assert.equal(snap.command_center_rebuilt, false);
  assert.equal(snap.outcome_join_consulted, false);
  assert.equal(snap.completeness_status, "INCOMPLETE");
  assert.equal(snap.executive_can_know_every_work_today, false);
});

test("does not import Command Center compose or Outcome Join", () => {
  assert.doesNotMatch(LIB_SOURCE, /from ["'][^"']*report-buckparts-command-center/);
  assert.doesNotMatch(LIB_SOURCE, /from ["'][^"']*buckparts-command-center-v2/);
  assert.doesNotMatch(LIB_SOURCE, /from ["'][^"']*phase4-outcome/);
  assert.equal(LIB_SOURCE.includes("buildBuckpartsCommandCenter"), false);
  assert.equal(LIB_SOURCE.includes("nba_authority: true"), false);
});

test("does not emit lint/build/command-catalog rows as work", async () => {
  const snap = await discoverExecutiveWorkV1({ rootDir: REPO_ROOT });
  assert.equal(snap.work.some((w) => w.work_id.includes("lint") || w.work_id.includes("build")), false);
  assert.equal(snap.work.some((w) => w.work_id.startsWith("dispatch_allowlist:")), false);
  assert.equal(
    EXECUTIVE_WORK_DETECTORS_V1.some((d) => d.work_id === "dispatch_allowlist:build:lint"),
    false,
  );
});

test("no_work detectors do not invent work items", async () => {
  const detectors: ExecutiveWorkDetectorV1[] = [
    {
      work_id: "empty_fixture",
      business_objective: "Should not appear",
      detect: async () => ({ kind: "no_work", evidence: ["count=0"] }),
    },
  ];
  const snap = await discoverExecutiveWorkV1({ rootDir: REPO_ROOT, detectors });
  assert.equal(snap.work.length, 0);
  assert.equal(snap.executable_work.length, 0);
  assert.equal(snap.unobserved_detectors.length, 0);
});

test("unobserved detectors are not invented as work", async () => {
  const detectors: ExecutiveWorkDetectorV1[] = [
    {
      work_id: "cannot_see",
      business_objective: "Should not appear as work",
      detect: async () => ({
        kind: "unobserved",
        epistemic: "UNKNOWN",
        reason: "dependency missing",
        evidence: ["gsc missing"],
      }),
    },
  ];
  const snap = await discoverExecutiveWorkV1({ rootDir: REPO_ROOT, detectors });
  assert.equal(snap.work.length, 0);
  assert.equal(snap.unobserved_detectors.length, 1);
  assert.equal(snap.unobserved_detectors[0]?.detector_id, "cannot_see");
  assert.equal(snap.unobserved_detectors[0]?.epistemic, "UNKNOWN");
});

test("work plus allowlisted command is executable; exact_command only then", async () => {
  const detectors: ExecutiveWorkDetectorV1[] = [
    {
      work_id: "fixture_allowlisted",
      business_objective: "Rebuild Command Center report (fixture)",
      detect: async () => ({
        kind: "work",
        bound_command: ALLOWLISTED_READ_ONLY,
        authority_required: "dispatch_allowlist_metadata",
        work_exists_epistemic: "PROVEN",
        evidence: ["fixture work exists"],
      }),
    },
  ];
  const snap = await discoverExecutiveWorkV1({ rootDir: REPO_ROOT, detectors });
  assert.equal(snap.work.length, 1);
  assert.equal(snap.work[0]?.executable, true);
  assert.equal(snap.work[0]?.blocking_reason, null);
  assert.equal(snap.work[0]?.exact_command, ALLOWLISTED_READ_ONLY);
  assert.deepEqual(
    snap.executable_work.map((w) => w.work_id),
    ["fixture_allowlisted"],
  );
});

test("work without a proven command is not executable", async () => {
  const detectors: ExecutiveWorkDetectorV1[] = [
    {
      work_id: "fixture_no_command",
      business_objective: "Founder-only work",
      detect: async () => ({
        kind: "work",
        bound_command: null,
        authority_required: "founder_owner_decision",
        work_exists_epistemic: "PROVEN",
        evidence: ["pending founder decision"],
      }),
    },
  ];
  const snap = await discoverExecutiveWorkV1({ rootDir: REPO_ROOT, detectors });
  assert.equal(snap.work[0]?.executable, false);
  assert.equal(snap.work[0]?.exact_command, null);
  assert.equal(snap.work[0]?.blocking_reason, "no_proven_exact_command");
  assert.equal(snap.executable_work.length, 0);
});

test("catalog order is detector order, not ranked by executable", async () => {
  const detectors: ExecutiveWorkDetectorV1[] = [
    {
      work_id: "blocked_first",
      business_objective: "Blocked",
      detect: async () => ({
        kind: "work",
        bound_command: null,
        authority_required: "none_no_proven_command",
        work_exists_epistemic: "PROVEN",
        evidence: ["a"],
      }),
    },
    {
      work_id: "executable_second",
      business_objective: "Runnable",
      detect: async () => ({
        kind: "work",
        bound_command: ALLOWLISTED_READ_ONLY,
        authority_required: "dispatch_allowlist_metadata",
        work_exists_epistemic: "PROVEN",
        evidence: ["b"],
      }),
    },
  ];
  const snap = await discoverExecutiveWorkV1({ rootDir: REPO_ROOT, detectors });
  assert.deepEqual(
    snap.work.map((w) => w.work_id),
    ["blocked_first", "executable_second"],
  );
  assert.equal(snap.work[0]?.executable, false);
  assert.equal(snap.work[1]?.executable, true);
  assert.equal("rank" in (snap.work[0] ?? {}), false);
});

test("live HEAD: ap_model_first_evidence is the first Executive-executable business work when present", async () => {
  const snap = await discoverExecutiveWorkV1({ rootDir: REPO_ROOT });
  const evidence = snap.work.find((w) => w.work_id === "ap_model_first_evidence");
  if (!evidence) return;
  assert.equal(evidence.executable, true);
  assert.equal(evidence.blocking_reason, null);
  assert.equal(evidence.exact_command, AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1);
  assert.equal(evidence.executable_epistemic, "PROVEN");
  assert.equal(snap.executable_work[0]?.work_id, "ap_model_first_evidence");
  assert.ok(snap.executable_work.length >= 1);
});

test("live HEAD: required fields; executable_work is eligibility subset", async () => {
  const snap = await discoverExecutiveWorkV1({ rootDir: REPO_ROOT });
  const ids = snap.work.map((w) => w.work_id);
  assert.equal(new Set(ids).size, ids.length);
  for (const item of snap.work) {
    assert.ok(item.work_id.length > 0);
    assert.ok(item.business_objective.length > 0);
    assert.ok(item.evidence.length > 0);
    assert.equal(item.work_exists_epistemic, "PROVEN");
    if (item.executable) {
      assert.equal(item.blocking_reason, null);
      assert.ok(typeof item.exact_command === "string" && item.exact_command.length > 0);
      assert.equal(item.exact_command.includes("--apply"), false);
    } else {
      assert.ok(typeof item.blocking_reason === "string" && item.blocking_reason.length > 0);
      assert.equal(item.exact_command, null);
    }
  }
  assert.deepEqual(
    snap.executable_work.map((w) => w.work_id),
    snap.work.filter((w) => w.executable).map((w) => w.work_id),
  );
});

test("live HEAD does not invent open-issue work when issues are closed", async () => {
  const snap = await discoverExecutiveWorkV1({ rootDir: REPO_ROOT });
  const issueWork = snap.work.find((w) => w.work_id === "issue_registry_open");
  if (issueWork) {
    assert.ok(issueWork.evidence.some((e) => e.includes("open_issue_count=")));
    const countLine = issueWork.evidence.find((e) => e.startsWith("open_issue_count="));
    const count = Number(countLine?.split("=")[1]);
    assert.ok(count > 0);
  }
});

test("live HEAD names missing work sources", async () => {
  const snap = await discoverExecutiveWorkV1({ rootDir: REPO_ROOT });
  const ids = snap.missing_work_sources.map((s) => s.source_id);
  assert.ok(ids.includes("package_json_buckparts_scripts"));
  assert.ok(ids.includes("canonical_final_operating_decision_v1"));
  assert.ok(ids.includes("executive_worker_registry"));
});

test("throwing detector is unobserved, not invented work", async () => {
  const detectors: ExecutiveWorkDetectorV1[] = [
    {
      work_id: "throws",
      business_objective: "Should not appear",
      detect: async () => {
        throw new Error("boom");
      },
    },
  ];
  const snap = await discoverExecutiveWorkV1({ rootDir: REPO_ROOT, detectors });
  assert.equal(snap.work.length, 0);
  assert.equal(snap.unobserved_detectors[0]?.detector_id, "throws");
  assert.equal(snap.unobserved_detectors[0]?.reason, "boom");
});
