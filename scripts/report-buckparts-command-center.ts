import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { buildBuckpartsAffiliateTrackerReport } from "./report-buckparts-affiliate-tracker";
import { buildBuckpartsBlockedLinkMoneyQueueReport } from "./report-buckparts-blocked-link-money-queue";
import { buildBuckpartsCommandSurfaceReport } from "./report-buckparts-command-surface";
import { buildFrigidaireDeadOemLinkIdsReport } from "./report-frigidaire-dead-oem-link-ids";
import { buildFrigidaireNextMonetizableCandidatesReport } from "./report-frigidaire-next-monetizable-candidates";
import { buildOemCatalogNextMoneyCohortReport } from "./report-oem-catalog-next-money-cohort";

type FlexoffersReadinessReport = {
  report_name: string;
  targets?: Array<{
    slug?: string;
    cta_status?: string;
    demand_compat_rows?: number;
  }>;
};

type EvidenceSummary = {
  file: string;
  top_level_keys: string[];
};

type CommandCenterReport = {
  report_name: "buckparts_command_center_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  system_health_summary: {
    status: "OK" | "WARNING" | "CRITICAL";
    reasons: string[];
    recommended_next_step: string;
  };
  affiliate_readiness_summary: {
    approved_count: number;
    pending_count: number;
    pending_network_or_programs: string[];
    repairclinic_status: string | "UNKNOWN";
    affiliate_approval_pending: boolean;
  };
  top_money_queue: Array<{
    lane: string;
    exhausted: boolean;
    candidate_count: number | "UNKNOWN";
    source_report: string;
    recommended_action: string;
  }>;
  recent_learning_outcomes: {
    frigidaire_dead_oem_outcome: {
      all_resolved: boolean;
      unresolved_count: number;
      recommended_next_action: string;
    };
    evidence_files: EvidenceSummary[];
  };
  blocked_link_summary: {
    total_blocked_links: number | "UNKNOWN";
    top_blocked_state: string | "UNKNOWN";
    top_blocked_retailer_key: string | "UNKNOWN";
    recommended_first_action: string;
  };
  next_best_action: string;
  why_this_action: string;
  operator_can_be_away_status:
    | "NOT_READY"
    | "READY_FOR_ASYNC_REVIEW"
    | "READY_FOR_AUTONOMOUS_READ_ONLY";
  known_unknowns: string[];
};

type BuildOptions = {
  rootDir?: string;
  now?: () => Date;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  readDir?: (absolutePath: string) => string[];
  providers?: {
    commandSurface?: typeof buildBuckpartsCommandSurfaceReport;
    affiliateTracker?: typeof buildBuckpartsAffiliateTrackerReport;
    blockedLinkQueue?: typeof buildBuckpartsBlockedLinkMoneyQueueReport;
    oemNextMoneyCohort?: typeof buildOemCatalogNextMoneyCohortReport;
    frigidaireDeadOem?: typeof buildFrigidaireDeadOemLinkIdsReport;
    frigidaireNextCandidates?: typeof buildFrigidaireNextMonetizableCandidatesReport;
  };
};

function safeJsonParse(input: string): unknown | null {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function listEvidenceSummaries(args: {
  evidenceDirAbs: string;
  fileExists: (absolutePath: string) => boolean;
  readDir: (absolutePath: string) => string[];
  readTextFile: (absolutePath: string) => string;
}): EvidenceSummary[] {
  if (!args.fileExists(args.evidenceDirAbs)) return [];
  const files = args.readDir(args.evidenceDirAbs).filter((name) => name.endsWith(".json")).sort();
  return files.map((file) => {
    const abs = path.resolve(args.evidenceDirAbs, file);
    const parsed = safeJsonParse(args.readTextFile(abs));
    const topLevelKeys =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? Object.keys(parsed as Record<string, unknown>).sort()
        : [];
    return {
      file,
      top_level_keys: topLevelKeys,
    };
  });
}

function getFlexoffersReadiness(args: {
  reportAbsPath: string;
  fileExists: (absolutePath: string) => boolean;
  readTextFile: (absolutePath: string) => string;
}): FlexoffersReadinessReport | null {
  if (!args.fileExists(args.reportAbsPath)) return null;
  const parsed = safeJsonParse(args.readTextFile(args.reportAbsPath));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return parsed as FlexoffersReadinessReport;
}

export async function buildBuckpartsCommandCenterReport(
  options: BuildOptions = {},
): Promise<CommandCenterReport> {
  const rootDir = options.rootDir ?? process.cwd();
  const now = options.now ?? (() => new Date());
  const fileExists = options.fileExists ?? existsSync;
  const readTextFile = options.readTextFile ?? ((absolutePath: string) => readFileSync(absolutePath, "utf8"));
  const readDir = options.readDir ?? readdirSync;
  const providers = options.providers ?? {};

  const commandSurfaceBuilder = providers.commandSurface ?? buildBuckpartsCommandSurfaceReport;
  const affiliateTrackerBuilder = providers.affiliateTracker ?? buildBuckpartsAffiliateTrackerReport;
  const blockedQueueBuilder = providers.blockedLinkQueue ?? buildBuckpartsBlockedLinkMoneyQueueReport;
  const oemNextBuilder = providers.oemNextMoneyCohort ?? buildOemCatalogNextMoneyCohortReport;
  const frigidaireDeadBuilder = providers.frigidaireDeadOem ?? buildFrigidaireDeadOemLinkIdsReport;
  const frigidaireNextBuilder =
    providers.frigidaireNextCandidates ?? buildFrigidaireNextMonetizableCandidatesReport;

  const [
    commandSurface,
    affiliateTracker,
    blockedQueue,
    oemNextMoney,
    frigidaireDeadOem,
    frigidaireNextCandidates,
  ] = await Promise.all([
    commandSurfaceBuilder({ rootDir }),
    Promise.resolve(affiliateTrackerBuilder({ rootDir })),
    blockedQueueBuilder(),
    oemNextBuilder(),
    frigidaireDeadBuilder(),
    frigidaireNextBuilder(),
  ]);

  const evidenceDirAbs = path.resolve(rootDir, "data/evidence");
  const evidenceFiles = listEvidenceSummaries({
    evidenceDirAbs,
    fileExists,
    readDir,
    readTextFile,
  });
  const flexoffersReadiness = getFlexoffersReadiness({
    reportAbsPath: path.resolve(rootDir, "data/reports/flexoffers-readiness-refrigerator-water.json"),
    fileExists,
    readTextFile,
  });

  const pendingStatuses = new Set(["NOT_STARTED", "DRAFTING", "SUBMITTED", "IN_REVIEW", "REAPPLY_REQUIRED"]);
  const pendingNetworkOrPrograms: string[] = [];
  for (const [status, count] of Object.entries(affiliateTracker.status_counts)) {
    if (pendingStatuses.has(status) && count > 0) {
      pendingNetworkOrPrograms.push(`${status}:${count}`);
    }
  }
  const repairclinicRecord = safeJsonParse(
    readTextFile(path.resolve(rootDir, "data/affiliate/affiliate-application-tracker.json")),
  );
  let repairclinicStatus: string | "UNKNOWN" = "UNKNOWN";
  if (Array.isArray(repairclinicRecord)) {
    const record = repairclinicRecord.find(
      (item) =>
        item &&
        typeof item === "object" &&
        (item as { id?: string }).id === "repairclinic",
    ) as { status?: string } | undefined;
    if (record?.status) repairclinicStatus = record.status;
  }

  const affiliateApprovalPending = pendingNetworkOrPrograms.length > 0;
  const frigidaireLaneExhausted =
    frigidaireNextCandidates.runtime_status === "OK" &&
    frigidaireNextCandidates.candidates.length === 0;

  const topMoneyQueue: CommandCenterReport["top_money_queue"] = [
    {
      lane: "oem_catalog_next_money",
      exhausted:
        oemNextMoney.total_remaining_rows !== "UNKNOWN" &&
        oemNextMoney.total_remaining_rows === 0,
      candidate_count: oemNextMoney.total_remaining_rows,
      source_report: oemNextMoney.report_name,
      recommended_action: oemNextMoney.recommended_next_cohort,
    },
    {
      lane: "frigidaire_next_monetizable",
      exhausted: frigidaireLaneExhausted,
      candidate_count:
        frigidaireNextCandidates.runtime_status === "OK"
          ? frigidaireNextCandidates.candidates.length
          : "UNKNOWN",
      source_report: frigidaireNextCandidates.report_name,
      recommended_action: frigidaireNextCandidates.recommended_next_action,
    },
    {
      lane: "flexoffers_readiness_refrigerator_water",
      exhausted:
        flexoffersReadiness !== null &&
        Array.isArray(flexoffersReadiness.targets) &&
        flexoffersReadiness.targets.length === 0,
      candidate_count:
        flexoffersReadiness !== null && Array.isArray(flexoffersReadiness.targets)
          ? flexoffersReadiness.targets.length
          : "UNKNOWN",
      source_report: flexoffersReadiness?.report_name ?? "flexoffers_readiness_report_missing",
      recommended_action:
        flexoffersReadiness !== null
          ? "Prepare pending FlexOffers slots for listed weak/zero-CTA slugs (no link insert)."
          : "Generate FlexOffers readiness report for refrigerator-water weak/zero-CTA demand slugs.",
    },
  ];

  let nextBestAction = "";
  let whyThisAction = "";
  if (affiliateApprovalPending) {
    nextBestAction =
      "Rerun affiliate tracker + command surface and keep FlexOffers readiness queue current until at least one non-Amazon network lane reaches APPROVED.";
    whyThisAction =
      "Affiliate approvals are still pending, so retailer-specific evidence work that cannot monetize now is deprioritized by policy.";
  } else if (!topMoneyQueue[0].exhausted && topMoneyQueue[0].candidate_count !== "UNKNOWN") {
    nextBestAction = topMoneyQueue[0].recommended_action;
    whyThisAction = "OEM catalog money cohort has concrete remaining blocked rows and is currently monetizable.";
  } else if (!topMoneyQueue[1].exhausted) {
    nextBestAction = topMoneyQueue[1].recommended_action;
    whyThisAction = "Frigidaire lane still has candidates after OEM next-money cohort is exhausted.";
  } else if (!topMoneyQueue[2].exhausted) {
    nextBestAction = topMoneyQueue[2].recommended_action;
    whyThisAction = "FlexOffers readiness queue remains available as the next monetization-prep lane.";
  } else {
    nextBestAction = "No actionable queue available; regenerate source reports and re-evaluate lane inputs.";
    whyThisAction = "All current lanes are exhausted or unknown.";
  }

  // Explicit safeguard: never recommend RepairClinic evidence when affiliate is not launch-ready.
  if (
    (repairclinicStatus === "NOT_STARTED" || repairclinicStatus === "DRAFTING") &&
    /repairclinic/i.test(nextBestAction)
  ) {
    nextBestAction =
      "Advance non-RepairClinic queues only (OEM cohort, FlexOffers readiness, and affiliate approvals) until RepairClinic status is submit/review approved.";
    whyThisAction =
      "RepairClinic affiliate lane is not approval-ready, so RepairClinic evidence work is intentionally suppressed.";
  }

  const operatorAwayStatus: CommandCenterReport["operator_can_be_away_status"] =
    nextBestAction.length === 0
      ? "NOT_READY"
      : "READY_FOR_AUTONOMOUS_READ_ONLY";

  const knownUnknowns = [
    ...commandSurface.known_unknowns,
    ...affiliateTracker.known_unknowns.map((item) => `Affiliate tracker: ${item}`),
    ...blockedQueue.known_unknowns.map((item) => `Blocked queue: ${item}`),
    ...oemNextMoney.known_unknowns.map((item) => `OEM next money: ${item}`),
    ...frigidaireNextCandidates.known_unknowns.map((item) => `Frigidaire next candidates: ${item}`),
    ...frigidaireDeadOem.known_unknowns.map((item) => `Frigidaire dead OEM: ${item}`),
    flexoffersReadiness === null
      ? "FlexOffers readiness report missing: data/reports/flexoffers-readiness-refrigerator-water.json"
      : null,
  ].filter((value): value is string => typeof value === "string");

  return {
    report_name: "buckparts_command_center_v1",
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    system_health_summary: {
      status: commandSurface.system_health.status,
      reasons: commandSurface.system_health.reasons,
      recommended_next_step: commandSurface.recommended_next_step,
    },
    affiliate_readiness_summary: {
      approved_count: affiliateTracker.records_approved.length,
      pending_count: pendingNetworkOrPrograms.length,
      pending_network_or_programs: pendingNetworkOrPrograms,
      repairclinic_status: repairclinicStatus,
      affiliate_approval_pending: affiliateApprovalPending,
    },
    top_money_queue: topMoneyQueue,
    recent_learning_outcomes: {
      frigidaire_dead_oem_outcome: {
        all_resolved: frigidaireDeadOem.all_resolved,
        unresolved_count: frigidaireDeadOem.targets.filter((target) => !target.found).length,
        recommended_next_action: frigidaireDeadOem.recommended_next_action,
      },
      evidence_files: evidenceFiles,
    },
    blocked_link_summary: {
      total_blocked_links: blockedQueue.total_blocked_links,
      top_blocked_state:
        blockedQueue.top_blocked_states === "UNKNOWN"
          ? "UNKNOWN"
          : (blockedQueue.top_blocked_states[0]?.state ?? "UNKNOWN"),
      top_blocked_retailer_key:
        blockedQueue.top_blocked_retailer_keys === "UNKNOWN"
          ? "UNKNOWN"
          : (blockedQueue.top_blocked_retailer_keys[0]?.retailer_key ?? "UNKNOWN"),
      recommended_first_action: blockedQueue.recommended_first_action,
    },
    next_best_action: nextBestAction,
    why_this_action: whyThisAction,
    operator_can_be_away_status: operatorAwayStatus,
    known_unknowns: knownUnknowns,
  };
}

export async function main(): Promise<void> {
  const report = await buildBuckpartsCommandCenterReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  console.error("[report-buckparts-command-center] failed", error);
  process.exit(1);
});
