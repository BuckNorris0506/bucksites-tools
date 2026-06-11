/**
 * Read-only retrospective authority snapshot history — append-only JSON under data/command-center/.
 * Does not mutate product data, NBA, or Customer Reality scoring.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { CustomerAuthorityScoreV1 } from "./customer-authority-score-v1";
import type { CustomerClosureReportV1 } from "./customer-closure-report-v1";
import type { CustomerSteeringComparisonV1 } from "./customer-steering-comparison-v1";
import type { CustomerRealityAuthorityModeV1 } from "./customer-authority-gates-v1";
import type { CustomerAuthorityClosureConfidenceV1 } from "./customer-authority-score-v1";

export const CUSTOMER_AUTHORITY_HISTORY_SNAPSHOT_CONTRACT_V1 =
  "customer_authority_history_snapshot_v1" as const;

export const CUSTOMER_AUTHORITY_HISTORY_STATUS_CONTRACT_V1 =
  "customer_authority_history_status_v1" as const;

export const CUSTOMER_AUTHORITY_HISTORY_DIR_REL_V1 =
  "data/command-center/customer-authority-history" as const;

export const CUSTOMER_AUTHORITY_HISTORY_STATUS_CC_JQ_PATH_V1 =
  ".command_center_v2.customer_authority_history_status_v1" as const;

export const CUSTOMER_AUTHORITY_HISTORY_WRITE_COMMAND_V1 =
  "npm run buckparts:command-center -- --write-authority-history" as const;

export const CUSTOMER_AUTHORITY_HISTORY_ALLOWED_WRITE_REL_PATHS_V1 = [
  `${CUSTOMER_AUTHORITY_HISTORY_DIR_REL_V1}/*.json`,
] as const;

export type CustomerAuthorityHistorySnapshotCapturesV1 = {
  authority_score_100: number | "UNKNOWN";
  authority_mode: CustomerRealityAuthorityModeV1 | "UNKNOWN";
  authority_claim_permitted: boolean | "UNKNOWN";
  customer_action: string | null;
  customer_tier: number | "UNKNOWN";
  blocks_discovery: boolean | "UNKNOWN";
  factory_next_best_action: string;
  conflicts_with_factory: boolean | "UNKNOWN";
  customer_visible_closures_count: number | "UNKNOWN";
  closure_confidence: CustomerAuthorityClosureConfidenceV1;
  all_wedge_coverage_percent: number | "UNKNOWN";
  marketing_high_risk_opportunity_count: number | "UNKNOWN";
  closure_target_slug: string | null;
};

export type CustomerAuthorityHistorySnapshotV1 = {
  contract: typeof CUSTOMER_AUTHORITY_HISTORY_SNAPSHOT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  snapshot_generated_at: string;
  snapshot_date_utc: string;
  source_command: typeof CUSTOMER_AUTHORITY_HISTORY_WRITE_COMMAND_V1;
  source_lanes: [
    "customer_authority_score_v1",
    "customer_steering_comparison_v1",
    "customer_closure_report_v1",
    "next_best_action",
  ];
  captures: CustomerAuthorityHistorySnapshotCapturesV1;
  proven_facts: string[];
  unknown_facts: string[];
};

export type CustomerAuthorityHistorySnapshotRefV1 = {
  snapshot_date_utc: string;
  snapshot_generated_at: string;
  rel_path: string;
};

export type CustomerAuthorityHistoryAppendResultV1 = {
  wrote: boolean;
  skipped_reason: string | null;
  rel_path: string | null;
};

export type CustomerAuthorityHistoryStatusV1 = {
  contract: typeof CUSTOMER_AUTHORITY_HISTORY_STATUS_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof CUSTOMER_AUTHORITY_HISTORY_STATUS_CC_JQ_PATH_V1;
  generated_at: string;
  history_dir_rel: typeof CUSTOMER_AUTHORITY_HISTORY_DIR_REL_V1;
  snapshot_count: number;
  newest_snapshot: CustomerAuthorityHistorySnapshotRefV1 | null;
  oldest_snapshot: CustomerAuthorityHistorySnapshotRefV1 | null;
  trend_measurable: boolean;
  steering_history_logged: boolean;
  last_append_attempt: CustomerAuthorityHistoryAppendResultV1 | null;
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildCustomerAuthorityHistorySnapshotV1Input = {
  generated_at: string;
  authorityScore: CustomerAuthorityScoreV1 | null | undefined;
  steering: CustomerSteeringComparisonV1 | null | undefined;
  closure: CustomerClosureReportV1 | null | undefined;
  root_next_best_action: string;
};

export type CustomerAuthorityHistoryFsV1 = {
  fileExists: (absolutePath: string) => boolean;
  readDir: (absolutePath: string) => string[];
  readTextFile: (absolutePath: string) => string;
  writeTextFile: (absolutePath: string, contents: string) => void;
  mkdirp: (absolutePath: string) => void;
};

const SNAPSHOT_DATE_RE_V1 = /^\d{4}-\d{2}-\d{2}$/;

export function snapshotDateUtcFromIsoV1(isoTimestamp: string): string {
  const parsed = Date.parse(isoTimestamp);
  if (Number.isNaN(parsed)) {
    return isoTimestamp.slice(0, 10);
  }
  return new Date(parsed).toISOString().slice(0, 10);
}

export function buildCustomerAuthorityHistorySnapshotV1(
  input: BuildCustomerAuthorityHistorySnapshotV1Input,
): CustomerAuthorityHistorySnapshotV1 {
  const proven_facts: string[] = [
    "PROVEN: customer_authority_history_snapshot_v1 is derived from existing Command Center lanes only.",
  ];
  const unknown_facts: string[] = [];

  const score = input.authorityScore;
  const steering = input.steering;
  const closure = input.closure;
  const comp = steering?.comparison;
  const customerDryRun = steering?.next_customer_action_dry_run;

  const lanesReady =
    score?.contract === "customer_authority_score_v1" &&
    steering?.contract === "customer_steering_comparison_v1" &&
    closure?.contract === "customer_closure_report_v1";

  if (!lanesReady) {
    unknown_facts.push(
      "UNKNOWN: one or more source lanes missing — capture fields may be UNKNOWN.",
    );
  }

  const snapshot_date_utc = snapshotDateUtcFromIsoV1(input.generated_at);

  return {
    contract: CUSTOMER_AUTHORITY_HISTORY_SNAPSHOT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    snapshot_generated_at: input.generated_at,
    snapshot_date_utc,
    source_command: CUSTOMER_AUTHORITY_HISTORY_WRITE_COMMAND_V1,
    source_lanes: [
      "customer_authority_score_v1",
      "customer_steering_comparison_v1",
      "customer_closure_report_v1",
      "next_best_action",
    ],
    captures: {
      authority_score_100: lanesReady && score ? score.authority_score_100 : "UNKNOWN",
      authority_mode: lanesReady && score ? score.authority_mode : "UNKNOWN",
      authority_claim_permitted: lanesReady && score ? score.authority_claim_permitted : "UNKNOWN",
      customer_action: customerDryRun?.action ?? null,
      customer_tier: lanesReady && comp ? comp.customer_tier : "UNKNOWN",
      blocks_discovery: lanesReady && comp ? comp.blocks_discovery : "UNKNOWN",
      factory_next_best_action: input.root_next_best_action,
      conflicts_with_factory:
        lanesReady && comp ? comp.conflicts_with_next_best_action : "UNKNOWN",
      customer_visible_closures_count:
        lanesReady && closure ? closure.customer_visible_closures_count : "UNKNOWN",
      closure_confidence: lanesReady && closure ? closure.closure_confidence : "UNKNOWN",
      all_wedge_coverage_percent: lanesReady && score
        ? score.components.buyer_path_coverage.all_wedge_coverage_percent
        : "UNKNOWN",
      marketing_high_risk_opportunity_count: lanesReady && score
        ? score.components.wrong_part_exposure.high_risk_opportunity_count
        : "UNKNOWN",
      closure_target_slug: lanesReady && customerDryRun ? customerDryRun.closure_target_slug : null,
    },
    proven_facts,
    unknown_facts,
  };
}

function parseSnapshotFile(
  relPath: string,
  readTextFile: (absolutePath: string) => string,
  rootDir: string,
): CustomerAuthorityHistorySnapshotRefV1 | null {
  try {
    const parsed = JSON.parse(
      readTextFile(path.join(rootDir, relPath)),
    ) as CustomerAuthorityHistorySnapshotV1;
    if (parsed.contract !== CUSTOMER_AUTHORITY_HISTORY_SNAPSHOT_CONTRACT_V1) {
      return null;
    }
    return {
      snapshot_date_utc: parsed.snapshot_date_utc,
      snapshot_generated_at: parsed.snapshot_generated_at,
      rel_path: relPath,
    };
  } catch {
    return null;
  }
}

export function listCustomerAuthorityHistorySnapshotsV1(args: {
  rootDir: string;
  fs?: Partial<CustomerAuthorityHistoryFsV1>;
}): CustomerAuthorityHistorySnapshotRefV1[] {
  const fileExists = args.fs?.fileExists ?? existsSync;
  const readDir = args.fs?.readDir ?? readdirSync;
  const readTextFile = args.fs?.readTextFile ?? ((abs) => readFileSync(abs, "utf8"));

  const dirAbs = path.join(args.rootDir, CUSTOMER_AUTHORITY_HISTORY_DIR_REL_V1);
  if (!fileExists(dirAbs)) {
    return [];
  }

  const refs: CustomerAuthorityHistorySnapshotRefV1[] = [];
  for (const filename of readDir(dirAbs)) {
    if (!filename.endsWith(".json")) continue;
    const relPath = `${CUSTOMER_AUTHORITY_HISTORY_DIR_REL_V1}/${filename}`;
    const ref = parseSnapshotFile(relPath, readTextFile, args.rootDir);
    if (ref) refs.push(ref);
  }

  return refs.sort((a, b) => a.snapshot_date_utc.localeCompare(b.snapshot_date_utc));
}

export function appendCustomerAuthorityHistorySnapshotV1(args: {
  rootDir: string;
  snapshot: CustomerAuthorityHistorySnapshotV1;
  fs?: Partial<CustomerAuthorityHistoryFsV1>;
}): CustomerAuthorityHistoryAppendResultV1 {
  const fileExists = args.fs?.fileExists ?? existsSync;
  const writeTextFile = args.fs?.writeTextFile ?? ((abs, c) => writeFileSync(abs, c, "utf8"));
  const mkdirp = args.fs?.mkdirp ?? ((abs) => mkdirSync(abs, { recursive: true }));

  const date = args.snapshot.snapshot_date_utc;
  if (!SNAPSHOT_DATE_RE_V1.test(date)) {
    return {
      wrote: false,
      skipped_reason: `invalid snapshot_date_utc: ${date}`,
      rel_path: null,
    };
  }

  const relPath = `${CUSTOMER_AUTHORITY_HISTORY_DIR_REL_V1}/${date}.json`;
  const absPath = path.join(args.rootDir, relPath);

  if (fileExists(absPath)) {
    return {
      wrote: false,
      skipped_reason: `append-only: snapshot already exists for ${date}`,
      rel_path: relPath,
    };
  }

  mkdirp(path.dirname(absPath));
  writeTextFile(absPath, `${JSON.stringify(args.snapshot, null, 2)}\n`);
  return { wrote: true, skipped_reason: null, rel_path: relPath };
}

export function buildCustomerAuthorityHistoryStatusV1(args: {
  generated_at: string;
  rootDir: string;
  last_append_attempt?: CustomerAuthorityHistoryAppendResultV1 | null;
  fs?: Partial<CustomerAuthorityHistoryFsV1>;
}): CustomerAuthorityHistoryStatusV1 {
  const snapshots = listCustomerAuthorityHistorySnapshotsV1({
    rootDir: args.rootDir,
    fs: args.fs,
  });
  const snapshot_count = snapshots.length;
  const newest_snapshot = snapshot_count > 0 ? snapshots[snapshot_count - 1]! : null;
  const oldest_snapshot = snapshot_count > 0 ? snapshots[0]! : null;
  const steering_history_logged = snapshot_count >= 1;
  const trend_measurable = snapshot_count >= 2;

  const proven_facts = [
    "PROVEN: customer_authority_history_status_v1 reads append-only JSON under data/command-center/customer-authority-history/.",
    `PROVEN: snapshot_count=${String(snapshot_count)}.`,
    `PROVEN: steering_history_logged=${String(steering_history_logged)}.`,
    `PROVEN: trend_measurable=${String(trend_measurable)}.`,
  ];

  const unknown_facts: string[] = [];
  if (snapshot_count === 0) {
    unknown_facts.push(
      "UNKNOWN: no authority history snapshots on disk — run npm run buckparts:command-center -- --write-authority-history to append the first snapshot.",
    );
  }
  if (snapshot_count === 1) {
    unknown_facts.push(
      "UNKNOWN: trend_measurable requires at least two snapshots on different dates.",
    );
  }

  return {
    contract: CUSTOMER_AUTHORITY_HISTORY_STATUS_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: CUSTOMER_AUTHORITY_HISTORY_STATUS_CC_JQ_PATH_V1,
    generated_at: args.generated_at,
    history_dir_rel: CUSTOMER_AUTHORITY_HISTORY_DIR_REL_V1,
    snapshot_count,
    newest_snapshot,
    oldest_snapshot,
    trend_measurable,
    steering_history_logged,
    last_append_attempt: args.last_append_attempt ?? null,
    proven_facts,
    unknown_facts,
  };
}
