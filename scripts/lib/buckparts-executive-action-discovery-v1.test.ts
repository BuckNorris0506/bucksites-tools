import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AP_OWNER_REVIEW_EXACT_COMMAND_V1,
  BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1,
  DISPATCH_ALLOWLIST_ENTRIES_V1,
  GE_OWNER_REVIEW_EXACT_COMMAND_V1,
} from "./buckparts-command-center-dispatch-allowlist-v1";
import {
  discoverExecutiveActionsV1,
  evaluateExactCommandEligibilityV1,
  EXECUTIVE_ACTION_DISCOVERY_CONTRACT_V1,
  EXECUTIVE_ACTION_DISCOVERY_DANGEROUS_EXACT_COMMAND_NEEDLES_V1,
} from "./buckparts-executive-action-discovery-v1";
import { AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1 } from "./ap-model-first-evidence-queue-v1";

const REPO_ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/buckparts-executive-action-discovery-v1.ts"),
  "utf8",
);

test("discovery snapshot locks: read-only, no ranking, no dispatch, no NBA, no CC rebuild", () => {
  const snap = discoverExecutiveActionsV1(REPO_ROOT, "2026-08-15T00:00:00.000Z");
  assert.equal(snap.contract, EXECUTIVE_ACTION_DISCOVERY_CONTRACT_V1);
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
  assert.equal(snap.executive_can_know_every_lawful_action_today, false);
  assert.equal(snap.catalog_epistemic, "PROVEN");
  assert.equal(snap.completeness_epistemic, "PROVEN");
  assert.equal(snap.observation_kind, "lawful_executable_action_set");
});

test("does not import Command Center compose, Outcome Join, or apply executors", () => {
  assert.doesNotMatch(LIB_SOURCE, /from ["'][^"']*report-buckparts-command-center/);
  assert.doesNotMatch(LIB_SOURCE, /from ["'][^"']*buckparts-command-center-v2/);
  assert.doesNotMatch(LIB_SOURCE, /from ["'][^"']*phase4-outcome/);
  assert.doesNotMatch(LIB_SOURCE, /from ["'][^"']*outcome-join/);
  assert.equal(LIB_SOURCE.includes("buildBuckpartsCommandCenter"), false);
  assert.equal(LIB_SOURCE.includes("nba_authority: true"), false);
});

test("catalog order is allowlist order; not ranked by eligibility", () => {
  const snap = discoverExecutiveActionsV1(REPO_ROOT, "2026-08-15T00:00:00.000Z");
  const allowlisted = snap.actions.filter((a) => a.catalog_source === "dispatch_allowlist");
  assert.equal(allowlisted.length, DISPATCH_ALLOWLIST_ENTRIES_V1.length);
  for (let i = 0; i < DISPATCH_ALLOWLIST_ENTRIES_V1.length; i += 1) {
    assert.equal(allowlisted[i]?.exact_command, DISPATCH_ALLOWLIST_ENTRIES_V1[i]?.exact_command);
  }
  assert.equal(
    snap.actions.some((a) => "rank" in a || "score" in a || "next_best_action" in a),
    false,
  );
});

test("executable_actions is the eligibility=true subset in catalog order", () => {
  const snap = discoverExecutiveActionsV1(REPO_ROOT, "2026-08-15T00:00:00.000Z");
  const expected = snap.actions.filter((a) => a.eligibility);
  assert.deepEqual(
    snap.executable_actions.map((a) => a.action_id),
    expected.map((a) => a.action_id),
  );
  assert.ok(snap.executable_actions.length > 0);
  for (const action of snap.executable_actions) {
    assert.equal(action.eligibility, true);
    assert.equal(action.ineligible_reason, null);
    assert.ok(typeof action.exact_command === "string" && action.exact_command.length > 0);
    assert.equal(action.exact_command.includes("--apply"), false);
    assert.equal(action.catalog_source, "dispatch_allowlist");
    assert.equal(action.founder_gate, "not_required_for_read_only_dispatch");
  }
});

test("owner_review_required allowlist entries are ineligible", () => {
  const snap = discoverExecutiveActionsV1(REPO_ROOT, "2026-08-15T00:00:00.000Z");
  const ownerReviewCommands = new Set(
    DISPATCH_ALLOWLIST_ENTRIES_V1.filter((e) => e.owner_review_required).map((e) => e.exact_command),
  );
  assert.ok(ownerReviewCommands.has(AP_OWNER_REVIEW_EXACT_COMMAND_V1));
  assert.ok(ownerReviewCommands.has(GE_OWNER_REVIEW_EXACT_COMMAND_V1));
  const hits = snap.actions.filter(
    (a) => a.exact_command !== null && ownerReviewCommands.has(a.exact_command),
  );
  assert.equal(hits.length, ownerReviewCommands.size);
  for (const action of hits) {
    assert.equal(action.eligibility, false);
    assert.equal(action.ineligible_reason, "dispatch_runner_refuses_owner_review_required");
    assert.equal(action.founder_gate, "owner_review_required_dispatch_refused");
  }
});

test("guarded apply write command is cataloged and ineligible without inventing OAR authority", () => {
  const snap = discoverExecutiveActionsV1(REPO_ROOT, "2026-08-15T00:00:00.000Z");
  const apply = snap.actions.find(
    (a) => a.action_id === "explicitly_excluded_guarded_apply:retailer_link_parity",
  );
  assert.ok(apply);
  assert.equal(apply?.exact_command, BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1);
  assert.equal(apply?.eligibility, false);
  assert.ok(
    apply?.ineligible_reason === "exact_command_has_unresolved_placeholder" ||
      apply?.ineligible_reason === "guarded_apply_explicitly_excluded_from_dispatch_allowlist" ||
      apply?.ineligible_reason === "exact_command_contains_apply_or_mutation_needle",
  );
  assert.equal(apply?.founder_gate, "founder_explicit_apply_required");
});

test("canonical source commands not on allowlist are ineligible", () => {
  const snap = discoverExecutiveActionsV1(REPO_ROOT, "2026-08-15T00:00:00.000Z");
  const apQueue = snap.actions.find((a) => a.exact_command === AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1);
  assert.ok(apQueue);
  assert.equal(apQueue?.eligibility, false);
  assert.equal(apQueue?.ineligible_reason, "exact_command_not_on_dispatch_allowlist");
  assert.equal(apQueue?.catalog_source, "canonical_source_command");
});

test("agent dispatch template has no exact_command and is ineligible", () => {
  const snap = discoverExecutiveActionsV1(REPO_ROOT, "2026-08-15T00:00:00.000Z");
  const agent = snap.actions.find((a) => a.catalog_source === "agent_dispatch_template");
  assert.ok(agent);
  assert.equal(agent?.exact_command, null);
  assert.equal(agent?.eligibility, false);
  assert.equal(agent?.ineligible_reason, "no_proven_exact_command");
});

test("missing entrypoint is ineligible (fail closed)", () => {
  const judged = evaluateExactCommandEligibilityV1({
    rootDir: mkdtempSync(path.join(tmpdir(), "ead-missing-entry-")),
    exact_command: "npx tsx scripts/does-not-exist-executive-action-discovery-v1.ts",
    allowlist_entry: {
      exact_command: "npx tsx scripts/does-not-exist-executive-action-discovery-v1.ts",
      selected_subsystem: "test:missing",
      command_kind: "read_only_report",
      owner_review_required: false,
      artifact_write_behavior: "optional",
      no_artifact_allowed: true,
      mutation_posture: { read_only: true, data_mutation: false, mutation_allowed: false },
    },
    catalog_source: "dispatch_allowlist",
    package_scripts: {},
  });
  assert.equal(judged.eligibility, false);
  assert.equal(judged.ineligible_reason, "entrypoint_missing");
});

test("dangerous needles include --apply; --apply command is ineligible", () => {
  assert.ok(
    (EXECUTIVE_ACTION_DISCOVERY_DANGEROUS_EXACT_COMMAND_NEEDLES_V1 as readonly string[]).includes(
      "--apply",
    ),
  );
  const judged = evaluateExactCommandEligibilityV1({
    rootDir: REPO_ROOT,
    exact_command: "npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --apply --plan x",
    allowlist_entry: null,
    catalog_source: "dispatch_allowlist",
    package_scripts: {},
  });
  assert.equal(judged.eligibility, false);
  assert.equal(judged.ineligible_reason, "exact_command_contains_apply_or_mutation_needle");
});

test("owner-decisions are not used as inferred exact_command authority", () => {
  const snap = discoverExecutiveActionsV1(REPO_ROOT, "2026-08-15T00:00:00.000Z");
  assert.equal(snap.founder_decision_registry.owner_note_prose_not_scanned_for_commands, true);
  assert.equal(snap.founder_decision_registry.structured_exact_command_epistemic, "PROVEN");
  assert.equal(snap.founder_decision_registry.structured_exact_command_count, 0);
  assert.ok(snap.founder_decision_registry.json_file_count > 0);
});

test("completeness names the missing executable-action sources", () => {
  const snap = discoverExecutiveActionsV1(REPO_ROOT, "2026-08-15T00:00:00.000Z");
  const ids = snap.missing_sources.map((s) => s.source_id);
  assert.ok(ids.includes("package_json_buckparts_scripts"));
  assert.ok(ids.includes("canonical_final_operating_decision_v1_live_winner"));
  assert.ok(ids.includes("executive_worker_registry"));
  assert.ok(ids.includes("fridge_expansion_worker_v1"));
  assert.ok(ids.includes("supabase_write_guarded_inventory_exact_commands"));
  assert.ok(ids.includes("founder_decision_registry_structured_exact_command"));
  assert.ok(ids.includes("buckparts_runner_mission_step_commands"));
  const registry = snap.missing_sources.find((s) => s.source_id === "executive_worker_registry");
  assert.equal(registry?.present_on_head, false);
  const fridge = snap.missing_sources.find((s) => s.source_id === "fridge_expansion_worker_v1");
  assert.equal(fridge?.present_on_head, false);
});

test("action_ids are unique; every action has required fields", () => {
  const snap = discoverExecutiveActionsV1(REPO_ROOT, "2026-08-15T00:00:00.000Z");
  const ids = snap.actions.map((a) => a.action_id);
  assert.equal(new Set(ids).size, ids.length);
  for (const action of snap.actions) {
    assert.ok(action.action_id.length > 0);
    assert.ok(action.human_description.length > 0);
    assert.ok(Array.isArray(action.evidence_used));
    assert.ok(action.evidence_used.length > 0);
    assert.equal(action.catalog_epistemic, "PROVEN");
    if (action.eligibility) {
      assert.equal(action.ineligible_reason, null);
    } else {
      assert.ok(typeof action.ineligible_reason === "string" && action.ineligible_reason.length > 0);
    }
  }
});

test("temp owner-decisions with structured exact_command are counted but do not authorize eligibility", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ead-oar-"));
  mkdirSync(path.join(dir, "data", "owner-decisions"), { recursive: true });
  writeFileSync(
    path.join(dir, "data", "owner-decisions", "fake.json"),
    JSON.stringify({
      contract: "founder_decision_registry_v1",
      rows: [{ exact_command: "npm run totally-invented-apply -- --apply" }],
    }),
  );
  writeFileSync(path.join(dir, "package.json"), JSON.stringify({ scripts: {} }));
  const snap = discoverExecutiveActionsV1(dir, "2026-08-15T00:00:00.000Z");
  assert.equal(snap.founder_decision_registry.structured_exact_command_count, 1);
  assert.equal(
    snap.executable_actions.some((a) => a.exact_command?.includes("totally-invented-apply")),
    false,
  );
  assert.equal(snap.mutation_authorized, false);
});
