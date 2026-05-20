import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildBuckpartsAffiliateTrackerReport } from "./report-buckparts-affiliate-tracker";

const TRACKER_PATH = path.resolve(process.cwd(), "data/affiliate/affiliate-application-tracker.json");

test("report is read_only true and data_mutation false", () => {
  const report = buildBuckpartsAffiliateTrackerReport();
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("counts records correctly", () => {
  const report = buildBuckpartsAffiliateTrackerReport();
  assert.equal(report.record_count, 22);
});

test("counts statuses correctly", () => {
  const report = buildBuckpartsAffiliateTrackerReport();
  assert.equal(report.status_counts.REAPPLY_REQUIRED, 0);
  assert.equal(report.status_counts.DRAFTING, 6);
  assert.equal(report.status_counts.NOT_STARTED, 0);
  assert.equal(report.status_counts.SUBMITTED, 4);
  assert.equal(report.status_counts.IN_REVIEW, 3);
  assert.equal(report.status_counts.APPROVED, 3);
  assert.equal(report.status_counts.REJECTED, 5);
  assert.equal(report.status_counts.PAUSED_OR_INACTIVE, 1);
});

test("detects REAPPLY_REQUIRED records", () => {
  const report = buildBuckpartsAffiliateTrackerReport();
  assert.deepEqual(report.records_reapply_required, []);
});

test("detects DRAFTING records", () => {
  const report = buildBuckpartsAffiliateTrackerReport();
  assert.equal(report.status_counts.DRAFTING, 6);
});

test("records Rakuten Waterdrop as APPROVED without tag verification", () => {
  const report = buildBuckpartsAffiliateTrackerReport();
  assert.ok(report.records_approved.includes("rakuten-waterdrop-filter"));
  assert.ok(report.records_approved.includes("amazon-associates"));
  assert.ok(report.records_rejected.includes("rakuten-appliancepartspros"));
});

test("Waterdrop tracker row encodes operator PPC restrictions and no-CTA guard", () => {
  const raw = JSON.parse(readFileSync(TRACKER_PATH, "utf8")) as {
    id: string;
    notes: string | null;
    nextAction: string | null;
  }[];
  const waterdrop = raw.find((r) => r.id === "rakuten-waterdrop-filter");
  assert.ok(waterdrop);
  assert.match(waterdrop!.notes ?? "", /MID: 53950/);
  assert.match(waterdrop!.notes ?? "", /waterdrop refrigerator water filter/);
  assert.match(waterdrop!.notes ?? "", /www\.waterdropfilter\.com/);
  assert.match(waterdrop!.notes ?? "", /not permission to show CTAs/i);
  assert.match(waterdrop!.nextAction ?? "", /not fit proof/i);
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
    unknown_count: 21,
    unverified_records: [],
  });
});
