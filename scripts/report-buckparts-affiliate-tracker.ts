import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AFFILIATE_APPLICATION_STATUSES,
  type AffiliateApplicationRecord,
  type AffiliateApplicationStatus,
  isValidAffiliateApplicationRecord,
} from "@/lib/affiliates/affiliate-application-status";

const TRACKER_RELATIVE_PATH = "data/affiliate/affiliate-application-tracker.json";

export type AffiliateTrackerReport = {
  report_name: string;
  generated_at: string;
  read_only: true;
  data_mutation: false;
  record_count: number;
  status_counts: Record<AffiliateApplicationStatus, number>;
  records_missing_next_action: string[];
  records_reapply_required: string[];
  records_approved: string[];
  records_rejected: string[];
  tag_verification: {
    verified_count: number;
    unverified_count: number;
    unknown_count: number;
    unverified_records: string[];
  };
  known_unknowns: string[];
  recommended_next_action: string;
};

type BuildOptions = {
  rootDir?: string;
  now?: () => Date;
  readTextFile?: (absolutePath: string) => string;
};

function getRecommendedNextAction(statusCounts: Record<AffiliateApplicationStatus, number>): string {
  if (statusCounts.REAPPLY_REQUIRED > 0) {
    return "Resolve reapply-required affiliate applications before expanding monetized link volume.";
  }
  if (statusCounts.DRAFTING > 0) {
    return "Finish drafting affiliate applications.";
  }
  return "Keep tracker updated as applications change.";
}

function buildStatusCounts(
  records: AffiliateApplicationRecord[],
): Record<AffiliateApplicationStatus, number> {
  const counts: Record<AffiliateApplicationStatus, number> = {
    NOT_STARTED: 0,
    DRAFTING: 0,
    SUBMITTED: 0,
    IN_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
    REAPPLY_REQUIRED: 0,
    PAUSED_OR_INACTIVE: 0,
  };
  for (const record of records) {
    counts[record.status] += 1;
  }
  return counts;
}

function parseTrackerRecords(text: string): AffiliateApplicationRecord[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in affiliate tracker: ${(error as Error).message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Affiliate tracker must be a JSON array.");
  }

  const invalidIndexes: number[] = [];
  const records: AffiliateApplicationRecord[] = [];
  parsed.forEach((item, index) => {
    if (!isValidAffiliateApplicationRecord(item)) {
      invalidIndexes.push(index);
      return;
    }
    records.push(item);
  });

  if (invalidIndexes.length > 0) {
    throw new Error(`Invalid affiliate tracker record(s) at index: ${invalidIndexes.join(", ")}`);
  }

  return records;
}

export function buildBuckpartsAffiliateTrackerReport(
  options: BuildOptions = {},
): AffiliateTrackerReport {
  const rootDir = options.rootDir ?? process.cwd();
  const now = options.now ?? (() => new Date());
  const readTextFile = options.readTextFile ?? ((absolutePath: string) => readFileSync(absolutePath, "utf8"));
  const trackerPath = path.resolve(rootDir, TRACKER_RELATIVE_PATH);

  const records = parseTrackerRecords(readTextFile(trackerPath));
  const status_counts = buildStatusCounts(records);

  const records_missing_next_action = records
    .filter((record) => record.nextAction === null || record.nextAction.trim().length === 0)
    .map((record) => record.id);
  const records_reapply_required = records
    .filter((record) => record.status === AFFILIATE_APPLICATION_STATUSES.REAPPLY_REQUIRED)
    .map((record) => record.id);
  const records_approved = records
    .filter((record) => record.status === AFFILIATE_APPLICATION_STATUSES.APPROVED)
    .map((record) => record.id);
  const records_rejected = records
    .filter((record) => record.status === AFFILIATE_APPLICATION_STATUSES.REJECTED)
    .map((record) => record.id);
  const tag_verification = {
    verified_count: records.filter((record) => record.tagVerified === true).length,
    unverified_count: records.filter((record) => record.tagVerified === false).length,
    unknown_count: records.filter((record) => record.tagVerified === null).length,
    unverified_records: records
      .filter((record) => record.tagVerified === false)
      .map((record) => record.id),
  };

  const known_unknowns = records
    .filter((record) => typeof record.notes === "string" && record.notes.toUpperCase().includes("UNKNOWN"))
    .map((record) => `${record.id}: notes include UNKNOWN`);

  return {
    report_name: "buckparts_affiliate_tracker_v1",
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    record_count: records.length,
    status_counts,
    records_missing_next_action,
    records_reapply_required,
    records_approved,
    records_rejected,
    tag_verification,
    known_unknowns,
    recommended_next_action: getRecommendedNextAction(status_counts),
  };
}

export function main(): void {
  const report = buildBuckpartsAffiliateTrackerReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main();
}
