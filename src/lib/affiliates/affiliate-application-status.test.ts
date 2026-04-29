import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  AFFILIATE_APPLICATION_STATUSES,
  isValidAffiliateApplicationRecord,
} from "@/lib/affiliates/affiliate-application-status";

function buildValidRecord() {
  return {
    id: "awin-application",
    network: "Awin",
    retailer: null,
    programUrl: null,
    status: AFFILIATE_APPLICATION_STATUSES.REAPPLY_REQUIRED,
    submittedAt: null,
    lastStatusAt: null,
    decisionAt: null,
    rejectionReason: "generic rejection / did not meet criteria",
    nextAction: "Reapply with updated traffic and trust pages",
    nextActionDueAt: null,
    notes: null,
    tagVerified: null,
    tagVerifiedAt: null,
    tagValue: null,
  };
}

test("valid record passes", () => {
  assert.equal(isValidAffiliateApplicationRecord(buildValidRecord()), true);
});

test("bad status fails", () => {
  const record = {
    ...buildValidRecord(),
    status: "PENDING",
  };
  assert.equal(isValidAffiliateApplicationRecord(record), false);
});

test("missing id fails", () => {
  const record = {
    ...buildValidRecord(),
    id: "   ",
  };
  assert.equal(isValidAffiliateApplicationRecord(record), false);
});

test("missing network fails", () => {
  const record = {
    ...buildValidRecord(),
    network: "",
  };
  assert.equal(isValidAffiliateApplicationRecord(record), false);
});

test("bad date fails", () => {
  const record = {
    ...buildValidRecord(),
    submittedAt: "not-a-date",
  };
  assert.equal(isValidAffiliateApplicationRecord(record), false);
});

test("null dates allowed", () => {
  const record = {
    ...buildValidRecord(),
    submittedAt: null,
    lastStatusAt: null,
    decisionAt: null,
    nextActionDueAt: null,
  };
  assert.equal(isValidAffiliateApplicationRecord(record), true);
});

test("nullable fields allowed", () => {
  const record = {
    ...buildValidRecord(),
    retailer: null,
    programUrl: null,
    rejectionReason: null,
    nextAction: null,
    notes: null,
    tagVerified: null,
    tagVerifiedAt: null,
    tagValue: null,
  };
  assert.equal(isValidAffiliateApplicationRecord(record), true);
});

test("tagVerified must be boolean or null", () => {
  const record = {
    ...buildValidRecord(),
    tagVerified: "false",
  };
  assert.equal(isValidAffiliateApplicationRecord(record), false);
});

test("tagVerifiedAt must be null or ISO datetime", () => {
  const record = {
    ...buildValidRecord(),
    tagVerifiedAt: "not-a-date",
  };
  assert.equal(isValidAffiliateApplicationRecord(record), false);
});

test("tagValue must be null or non-empty string", () => {
  const record = {
    ...buildValidRecord(),
    tagValue: "   ",
  };
  assert.equal(isValidAffiliateApplicationRecord(record), false);
});

test("starter tracker JSON records all validate", () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const trackerPath = path.resolve(testDir, "../../../data/affiliate/affiliate-application-tracker.json");
  const raw = readFileSync(trackerPath, "utf8");
  const parsed = JSON.parse(raw);

  assert.equal(Array.isArray(parsed), true);
  assert.ok(parsed.length > 0);
  for (const record of parsed) {
    assert.equal(isValidAffiliateApplicationRecord(record), true);
  }
});
