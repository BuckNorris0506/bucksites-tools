import assert from "node:assert/strict";
import test from "node:test";

import { buildBuckpartsCommandCenterReport } from "./report-buckparts-command-center";

const BASE_TRACKER = JSON.stringify([
  {
    id: "repairclinic",
    network: "UNKNOWN",
    retailer: "RepairClinic",
    programUrl: null,
    status: "DRAFTING",
    submittedAt: null,
    lastStatusAt: null,
    decisionAt: null,
    rejectionReason: null,
    nextAction: "Prepare submission",
    nextActionDueAt: null,
    notes: null,
    tagVerified: null,
    tagVerifiedAt: null,
    tagValue: null,
  },
]);

function baseProviders() {
  return {
    commandSurface: async () =>
      ({
        system_health: { status: "WARNING", reasons: ["warning"] },
        recommended_next_step: "Resolve warning-level command-surface issues before expanding.",
        known_unknowns: [],
      }) as never,
    affiliateTracker: () =>
      ({
        status_counts: {
          NOT_STARTED: 0,
          DRAFTING: 1,
          SUBMITTED: 0,
          IN_REVIEW: 0,
          APPROVED: 0,
          REJECTED: 0,
          REAPPLY_REQUIRED: 0,
          PAUSED_OR_INACTIVE: 0,
        },
        records_approved: [],
        known_unknowns: [],
      }) as never,
    blockedLinkQueue: async () =>
      ({
        report_name: "buckparts_blocked_link_money_queue_v1",
        total_blocked_links: 5,
        top_blocked_states: [{ state: "BLOCKED_SEARCH_OR_DISCOVERY", count: 5 }],
        top_blocked_retailer_keys: [{ retailer_key: "oem-catalog", blocked_count: 5, inferred_importance_count: 5 }],
        recommended_first_action: "Replace search/discovery URLs with direct PDP URLs for highest-volume retailer keys.",
        known_unknowns: [],
      }) as never,
    oemNextMoneyCohort: async () =>
      ({
        report_name: "buckparts_oem_catalog_next_money_cohort_v1",
        total_remaining_rows: 4,
        recommended_next_cohort: "Start with retailer_links rows on domain www.repairclinic.com.",
        known_unknowns: [],
      }) as never,
    frigidaireDeadOem: async () =>
      ({
        all_resolved: true,
        targets: [{ found: true }],
        recommended_next_action: "Use resolved link IDs.",
        known_unknowns: [],
      }) as never,
    frigidaireNextCandidates: async () =>
      ({
        report_name: "buckparts_frigidaire_next_monetizable_candidates_v1",
        runtime_status: "OK",
        candidates: [{ filter_slug: "foo" }],
        recommended_next_action: "Start with candidates already containing direct_buyable non-OEM links.",
        known_unknowns: [],
      }) as never,
  };
}

test("command center is read_only true and data_mutation false", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("includes recent evidence/outcome files", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("data/evidence"),
    readDir: () => [
      "frigidaire-routing-outcome.2026-04-29.json",
      "frigidaire-oem-pdp-evidence.2026-04-29.json",
    ],
    readTextFile: (p) =>
      p.endsWith("affiliate-application-tracker.json")
        ? BASE_TRACKER
        : JSON.stringify({ kind: "evidence", value: 1 }),
  });
  assert.equal(report.recent_learning_outcomes.evidence_files.length, 2);
  assert.equal(
    report.recent_learning_outcomes.evidence_files.some((item) =>
      item.file.includes("frigidaire-routing-outcome"),
    ),
    true,
  );
});

test("does not recommend RepairClinic evidence if RepairClinic is NOT_STARTED/DRAFTING", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  assert.equal(/repairclinic evidence/i.test(report.next_best_action), false);
});

test("marks Frigidaire lane exhausted when candidate report has no candidates", async () => {
  const providers = baseProviders();
  providers.frigidaireNextCandidates = async () =>
    ({
      report_name: "buckparts_frigidaire_next_monetizable_candidates_v1",
      runtime_status: "OK",
      candidates: [],
      recommended_next_action: "No Frigidaire candidate with blocked OEM plus non-OEM link exists in current data.",
      known_unknowns: [],
    }) as never;

  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const lane = report.top_money_queue.find((item) => item.lane === "frigidaire_next_monetizable");
  assert.equal(Boolean(lane), true);
  assert.equal(lane?.exhausted, true);
});

test("emits one concrete next_best_action", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  assert.equal(typeof report.next_best_action, "string");
  assert.equal(report.next_best_action.trim().length > 0, true);
});
