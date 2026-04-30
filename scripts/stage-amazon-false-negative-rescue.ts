import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildAmazonFalseNegativeRescueAudit } from "./audit-amazon-false-negative-rescue";

const MANUAL_EVIDENCE_FILE =
  "data/evidence/amazon-manual-whole-house-evidence.2026-04-29.json" as const;
const STAGING_OUTPUT_FILE =
  "data/evidence/amazon-false-negative-rescue-staging.2026-04-29.json" as const;

type RescueAction = "NOOP_ALREADY_PRESENT_DIRECT_BUYABLE" | "STAGE_INSERT_CANDIDATE";

type QueueCandidate = {
  token: string;
  canonical_dp_url: string;
  asin: string;
  source: "manual_user_provided_url";
  evidence_file: typeof MANUAL_EVIDENCE_FILE;
  current_db_presence: "PRESENT" | "ABSENT" | "UNKNOWN";
  rescue_action: RescueAction;
  browser_truth_classification_candidate: "direct_buyable";
  confidence: "exact";
  cta_status_candidate: "live";
  mutation_status: "NOT_APPLIED";
  required_before_apply: string[];
};

export type AmazonFalseNegativeRescueStagingReport = {
  report_name: "buckparts_amazon_false_negative_rescue_staging_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  staged_count: number;
  noop_count: number;
  staged_candidates: QueueCandidate[];
  noop_candidates: QueueCandidate[];
  known_unknowns: string[];
  recommended_next_action: string;
};

type BuildOptions = {
  now?: () => Date;
  runAudit?: typeof buildAmazonFalseNegativeRescueAudit;
};

type RunOptions = BuildOptions & {
  rootDir?: string;
  writeQueueFile?: boolean;
};

const REQUIRED_BEFORE_APPLY = [
  "verify filter_id/slug mapping",
  "verify no duplicate Amazon row",
  "verify Amazon tag status",
  "run full buy-link gate",
];

function candidateFromFinding(
  finding: Awaited<ReturnType<typeof buildAmazonFalseNegativeRescueAudit>>["findings"][number],
): QueueCandidate {
  let rescueAction: RescueAction = "STAGE_INSERT_CANDIDATE";
  if (
    finding.current_state_if_present?.includes("browser_truth_classification=direct_buyable") &&
    finding.db_presence === "PRESENT"
  ) {
    rescueAction = "NOOP_ALREADY_PRESENT_DIRECT_BUYABLE";
  }

  return {
    token: finding.token,
    canonical_dp_url: finding.canonical_dp_url,
    asin: finding.asin,
    source: "manual_user_provided_url",
    evidence_file: MANUAL_EVIDENCE_FILE,
    current_db_presence: finding.db_presence,
    rescue_action: rescueAction,
    browser_truth_classification_candidate: "direct_buyable",
    confidence: "exact",
    cta_status_candidate: "live",
    mutation_status: "NOT_APPLIED",
    required_before_apply: [...REQUIRED_BEFORE_APPLY],
  };
}

export async function buildAmazonFalseNegativeRescueStagingReport(
  options: BuildOptions = {},
): Promise<AmazonFalseNegativeRescueStagingReport> {
  const now = options.now ?? (() => new Date());
  const runAudit = options.runAudit ?? buildAmazonFalseNegativeRescueAudit;

  const audit = await runAudit();
  const candidates = audit.findings.map(candidateFromFinding);
  const staged = candidates.filter((candidate) => candidate.rescue_action === "STAGE_INSERT_CANDIDATE");
  const noop = candidates.filter(
    (candidate) => candidate.rescue_action === "NOOP_ALREADY_PRESENT_DIRECT_BUYABLE",
  );

  const knownUnknowns = [
    ...audit.known_unknowns,
    ...audit.findings
      .filter((finding) => finding.db_presence === "UNKNOWN")
      .map((finding) => `${finding.token}: DB presence is UNKNOWN`),
  ];

  return {
    report_name: "buckparts_amazon_false_negative_rescue_staging_v1",
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    staged_count: staged.length,
    noop_count: noop.length,
    staged_candidates: staged,
    noop_candidates: noop,
    known_unknowns: knownUnknowns,
    recommended_next_action:
      "Verify filter mappings and duplicate checks, then run full buy-link gate before any SQL/apply step.",
  };
}

export async function runAmazonFalseNegativeRescueStaging(
  options: RunOptions = {},
): Promise<AmazonFalseNegativeRescueStagingReport> {
  const rootDir = options.rootDir ?? process.cwd();
  const writeQueueFile = options.writeQueueFile ?? true;
  const report = await buildAmazonFalseNegativeRescueStagingReport(options);
  if (!writeQueueFile) return report;

  const outAbs = path.resolve(rootDir, STAGING_OUTPUT_FILE);
  mkdirSync(path.dirname(outAbs), { recursive: true });
  writeFileSync(outAbs, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  // quick sanity parse for valid JSON invariant
  JSON.parse(readFileSync(outAbs, "utf8"));
  return report;
}

export async function main(): Promise<void> {
  const report = await runAmazonFalseNegativeRescueStaging();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  console.error("[stage-amazon-false-negative-rescue] failed", error);
  process.exit(1);
});
