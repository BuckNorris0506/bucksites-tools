import assert from "node:assert/strict";
import test from "node:test";

import { buildBuckpartsAffiliateTrackerReport } from "./report-buckparts-affiliate-tracker";

test("report is read_only true and data_mutation false", () => {
  const report = buildBuckpartsAffiliateTrackerReport();
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("counts records correctly", () => {
  const report = buildBuckpartsAffiliateTrackerReport();
  assert.equal(report.record_count, 13);
});

test("counts statuses correctly", () => {
  const report = buildBuckpartsAffiliateTrackerReport();
  assert.equal(report.status_counts.REAPPLY_REQUIRED, 0);
  assert.equal(report.status_counts.DRAFTING, 7);
  assert.equal(report.status_counts.NOT_STARTED, 1);
  assert.equal(report.status_counts.SUBMITTED, 1);
  assert.equal(report.status_counts.IN_REVIEW, 2);
  assert.equal(report.status_counts.APPROVED, 1);
  assert.equal(report.status_counts.REJECTED, 1);
  assert.equal(report.status_counts.PAUSED_OR_INACTIVE, 0);
});

test("detects REAPPLY_REQUIRED records", () => {
  const report = buildBuckpartsAffiliateTrackerReport();
  assert.deepEqual(report.records_reapply_required, []);
});

test("detects DRAFTING records", () => {
  const report = buildBuckpartsAffiliateTrackerReport();
  assert.equal(report.status_counts.DRAFTING, 7);
});

test("invalid tracker record fails", () => {
  assert.throws(
    () =>
      buildBuckpartsAffiliateTrackerReport({
        readTextFile: () =>
          JSON.stringify([
            {
              id: "",
              network: "Awin",
              retailer: null,
              programUrl: null,
              status: "REAPPLY_REQUIRED",
              submittedAt: null,
              lastStatusAt: null,
              decisionAt: null,
              rejectionReason: null,
              nextAction: null,
              nextActionDueAt: null,
              notes: null,
              tagVerified: null,
              tagVerifiedAt: null,
              tagValue: null,
            },
          ]),
      }),
    /Invalid affiliate tracker record/,
  );
});

test("recommended next action prioritizes REAPPLY_REQUIRED over DRAFTING", () => {
  const report = buildBuckpartsAffiliateTrackerReport({
    readTextFile: () =>
      JSON.stringify([
        {
          id: "a",
          network: "Awin",
          retailer: null,
          programUrl: null,
          status: "REAPPLY_REQUIRED",
          submittedAt: null,
          lastStatusAt: null,
          decisionAt: null,
          rejectionReason: null,
          nextAction: "Reapply",
          nextActionDueAt: null,
          notes: null,
          tagVerified: null,
          tagVerifiedAt: null,
          tagValue: null,
        },
        {
          id: "b",
          network: "CJ",
          retailer: null,
          programUrl: null,
          status: "DRAFTING",
          submittedAt: null,
          lastStatusAt: null,
          decisionAt: null,
          rejectionReason: null,
          nextAction: "Draft",
          nextActionDueAt: null,
          notes: null,
          tagVerified: null,
          tagVerifiedAt: null,
          tagValue: null,
        },
      ]),
  });

  assert.equal(
    report.recommended_next_action,
    "Resolve reapply-required affiliate applications before expanding monetized link volume.",
  );
});

test("includes tag verification summary", () => {
  const report = buildBuckpartsAffiliateTrackerReport();
  assert.deepEqual(report.tag_verification, {
    verified_count: 1,
    unverified_count: 0,
    unknown_count: 12,
    unverified_records: [],
  });
});
