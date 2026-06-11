/**
 * Command Center Issue Re-Audit v1 — bounded re-audit plan for DEPLOYED issues (read-only).
 * Feeds HyperAgent; does not mutate issue JSON or mark CLOSED_PROVEN.
 */

import { execSync } from "node:child_process";
import path from "node:path";

import type { LiveSiteMonitorV1 } from "./buckparts-command-center-v2-types";
import type { CommandCenterIssueRegistryLaneV1 } from "./command-center-issue-registry-command-center-v1";
import { buildEffectiveIssueStatusMapV1 } from "./command-center-issue-registry-steering-v1";
import {
  compareCommandCenterIssuesByPriorityV1,
  isCommandCenterIssueClosedV1,
  sortCommandCenterIssuesByPriorityV1,
  type CommandCenterIssueRecordV1,
  type CommandCenterIssueSeverityV1,
  type CommandCenterIssueStatusV1,
} from "./command-center-issue-registry-v1";

export const COMMAND_CENTER_ISSUE_REAUDIT_CONTRACT_V1 = "command_center_issue_reaudit_v1" as const;

export const COMMAND_CENTER_ISSUE_REAUDIT_CC_JQ_PATH_V1 =
  ".command_center_v2.command_center_issue_reaudit_v1" as const;

export const ISSUE_REAUDIT_TYPES_V1 = [
  "REPO_GUARD_PROBE",
  "LIVE_ROUTE_PROBE",
  "MIXED_REPO_AND_LIVE",
  "UNKNOWN",
] as const;

export type IssueReauditTypeV1 = (typeof ISSUE_REAUDIT_TYPES_V1)[number];

export type ReauditCandidateV1 = {
  issue_id: string;
  title: string;
  severity: CommandCenterIssueSeverityV1;
  status: CommandCenterIssueStatusV1;
  repair_commit: string | null;
  affected_routes: string[];
  reaudit_type: IssueReauditTypeV1;
  expected_closed_condition: string;
  required_probes: string[];
  suggested_hyperagent_prompt: string;
  cursor_followup_if_failed: string;
  can_close_from_repo_only: boolean;
  requires_live_probe: boolean;
  close_allowed: false;
  reason_close_not_allowed: string;
};

export type CommandCenterIssueReauditLaneV1 = {
  contract: typeof COMMAND_CENTER_ISSUE_REAUDIT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  recommended_jq_path: typeof COMMAND_CENTER_ISSUE_REAUDIT_CC_JQ_PATH_V1;
  local_head_commit: string | "UNKNOWN";
  origin_main_commit: string | "UNKNOWN";
  live_site_monitor_present: boolean;
  live_route_probe_available: boolean;
  total_deployed_awaiting_reaudit: number;
  top_reaudit_candidate: ReauditCandidateV1 | null;
  candidates: ReauditCandidateV1[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

type IssueReauditProfileV1 = {
  expected_closed_condition: string;
  repo_probes: string[];
  sample_slugs: string[];
  live_route_hints: string[];
  can_close_from_repo_only: boolean;
};

const ISSUE_REAUDIT_PROFILES_V1: Record<string, IssueReauditProfileV1> = {
  trust_gate_wrong_filter_block_exposure: {
    expected_closed_condition:
      "BLOCK aggregate_verdict fridge models are quarantined on live /fridge/[slug] pages and search no longer surfaces confident buy for blocked models.",
    repo_probes: [
      "node --import tsx --test src/lib/fridge/fridge-learned-failure-customer-guard-v1.test.ts",
      "resolveFridgeCustomerSafetyV1({ fridgeModelSlug: \"samsung-rf18hfenbww\" }) → quarantine",
    ],
    sample_slugs: ["samsung-rf18hfenbww"],
    live_route_hints: ["/fridge/samsung-rf18hfenbww", "/search?q=samsung-rf18hfenbww"],
    can_close_from_repo_only: false,
  },
  trust_gate_filter_pdp_quarantine_exposure: {
    expected_closed_condition:
      "Filter PDP compat lists hide BLOCK quarantined models and search suppresses typical-replacement for quarantined fridge hits.",
    repo_probes: [
      "node --import tsx --test src/lib/fridge/fridge-filter-pdp-customer-safety-v1.test.ts",
      "filterCompatModelsForCustomerDisplayV1 hides BLOCK samsung-rf18hfenbww",
    ],
    sample_slugs: ["samsung-rf18hfenbww"],
    live_route_hints: ["/filter/da97-15217d", "/search?q=samsung-rf18hfenbww"],
    can_close_from_repo_only: false,
  },
  trust_gate_gswf_single_filter_family_ambiguity: {
    expected_closed_condition:
      "GSWF/GSWF2 WARN-ambiguous models stay visible with caution notes and show_caution_buy (not confident buy) on filter PDP and search.",
    repo_probes: [
      "node --import tsx --test src/lib/fridge/fridge-filter-pdp-customer-safety-v1.test.ts",
      "resolveFridgeSearchModelHitDisplayV1 suppresses typical replacement for GSWF WARN slugs",
    ],
    sample_slugs: ["ge-gpf6p", "ge-gpf6p2"],
    live_route_hints: ["/filter/gswf", "/fridge/ge-gpf6p"],
    can_close_from_repo_only: false,
  },
  trust_gate_frigidaire_confusion_family_model_page: {
    expected_closed_condition:
      "12 Frigidaire confusion-family WARN slugs show model-page caution (show_caution_buy) and disputed-anchor slugs prefer noindex metadata.",
    repo_probes: [
      "node --import tsx --test src/lib/fridge/fridge-model-pdp-customer-safety-v1.test.ts",
      "resolveFridgeModelPdpCustomerSafetyV1({ fridgeModelSlug: \"frigidaire-fghb2868pf\" }) → prefer_noindex",
    ],
    sample_slugs: ["frigidaire-fghb2868pf", "frigidaire-ffhn2740tw"],
    live_route_hints: ["/fridge/frigidaire-fghb2868pf", "/fridge/frigidaire-ffhn2740tw"],
    can_close_from_repo_only: false,
  },
};

const CLOSE_NOT_ALLOWED_REASON_V1 =
  "Re-audit lane is read-only; CLOSED_PROVEN requires live/public proof plus owner-approved issue JSON update with re_audit_outcome PASS.";

function gitRev(rootDir: string, ref: string): string | "UNKNOWN" {
  try {
    return execSync(`git rev-parse ${ref}`, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "UNKNOWN";
  }
}

function defaultProfile(issue: CommandCenterIssueRecordV1): IssueReauditProfileV1 {
  return {
    expected_closed_condition: `Customer-facing routes ${issue.affected_routes.join(", ")} reflect repair ${issue.repair_commit ?? "UNKNOWN"} without wrong-part exposure.`,
    repo_probes: issue.evidence_files
      .filter((f) => f.endsWith(".test.ts"))
      .map((f) => `node --import tsx --test ${f}`),
    sample_slugs: [],
    live_route_hints: issue.affected_routes.map((route) =>
      route.replace("[slug]", "sample-slug"),
    ),
    can_close_from_repo_only: false,
  };
}

function resolveReauditType(args: {
  issue: CommandCenterIssueRecordV1;
  live_route_probe_available: boolean;
}): IssueReauditTypeV1 {
  const hasRepoGuard = args.issue.evidence_files.some(
    (f) => f.startsWith("src/lib/") && f.endsWith(".ts"),
  );
  const hasCustomerRoutes = args.issue.affected_routes.length > 0;
  if (hasRepoGuard && hasCustomerRoutes && args.live_route_probe_available) {
    return "MIXED_REPO_AND_LIVE";
  }
  if (hasRepoGuard && hasCustomerRoutes) return "REPO_GUARD_PROBE";
  if (hasCustomerRoutes && args.live_route_probe_available) return "LIVE_ROUTE_PROBE";
  return "UNKNOWN";
}

function buildHyperagentPrompt(args: {
  candidate: Omit<ReauditCandidateV1, "suggested_hyperagent_prompt" | "cursor_followup_if_failed">;
  profile: IssueReauditProfileV1;
  live_site_monitor_present: boolean;
}): string {
  const lines = [
    `BuckParts Issue Re-Audit v1 — ${args.candidate.issue_id}`,
    "",
    "Truth contract:",
    "- Read-only re-audit; do not mutate issue JSON, CSV, Supabase, or retailer_links.",
    "- Do not mark CLOSED_PROVEN or set re_audit_outcome without explicit owner proof.",
    "- Repo guard tests passing is necessary but not sufficient for closure.",
    "",
    `Issue: ${args.candidate.issue_id} — ${args.candidate.title}`,
    `Severity: ${args.candidate.severity}`,
    `Status: ${args.candidate.status} (awaiting RE_AUDITED)`,
    `Repair commit: ${args.candidate.repair_commit ?? "UNKNOWN"}`,
    `Affected routes: ${args.candidate.affected_routes.join(", ")}`,
    `Re-audit type: ${args.candidate.reaudit_type}`,
    "",
    "Expected closed condition:",
    args.candidate.expected_closed_condition,
    "",
    "Required repo probes:",
    ...args.candidate.required_probes.map((probe) => `- ${probe}`),
    "",
    "Sample slugs to verify:",
    ...args.profile.sample_slugs.map((slug) => `- ${slug}`),
    "",
    "Live route hints:",
    ...args.profile.live_route_hints.map((route) => `- ${route}`),
    `Live site monitor present: ${String(args.live_site_monitor_present)}`,
    "",
    "Deliver:",
    "- PROVEN / INFERRED / UNKNOWN findings per probe",
    "- Whether live customer surfaces match repo guard behavior",
    "- Recommended re_audit_outcome: PASS | STILL_OPEN | REGRESSED (evidence only — no JSON write)",
    "- If STILL_OPEN or REGRESSED: exact remaining exposure and smallest safe fix path",
  ];
  return lines.join("\n");
}

function buildCursorFollowup(candidate: ReauditCandidateV1): string {
  return `If HyperAgent re-audit for ${candidate.issue_id} fails live probes: run repo probes (${candidate.required_probes.slice(0, 2).join("; ")}), compare to repair_commit ${candidate.repair_commit ?? "UNKNOWN"}, and open a display-layer fix packet — do not mutate issue JSON without owner approval.`;
}

export function isIssueAwaitingReauditV1(args: {
  issue: CommandCenterIssueRecordV1;
  effectiveStatus: CommandCenterIssueStatusV1;
}): boolean {
  if (isCommandCenterIssueClosedV1(args.issue.status)) return false;
  if (args.issue.re_audit_outcome === "PASS") return false;
  if (args.effectiveStatus !== "DEPLOYED") return false;
  return true;
}

export function buildReauditCandidateV1(args: {
  issue: CommandCenterIssueRecordV1;
  effectiveStatus: CommandCenterIssueStatusV1;
  live_site_monitor_present: boolean;
  live_route_probe_available: boolean;
}): ReauditCandidateV1 {
  const profile = ISSUE_REAUDIT_PROFILES_V1[args.issue.issue_type] ?? defaultProfile(args.issue);
  const reaudit_type = resolveReauditType({
    issue: args.issue,
    live_route_probe_available: args.live_route_probe_available,
  });
  const requires_live_probe =
    args.issue.affected_routes.length > 0 && !profile.can_close_from_repo_only;

  const required_probes = [
    ...profile.repo_probes,
    ...profile.live_route_hints.map((route) => `LIVE_ROUTE_PROBE:${route}`),
  ];

  const base: Omit<ReauditCandidateV1, "suggested_hyperagent_prompt" | "cursor_followup_if_failed"> = {
    issue_id: args.issue.issue_id,
    title: args.issue.title,
    severity: args.issue.severity,
    status: args.effectiveStatus,
    repair_commit: args.issue.repair_commit,
    affected_routes: args.issue.affected_routes,
    reaudit_type,
    expected_closed_condition: profile.expected_closed_condition,
    required_probes,
    can_close_from_repo_only: profile.can_close_from_repo_only,
    requires_live_probe,
    close_allowed: false,
    reason_close_not_allowed: CLOSE_NOT_ALLOWED_REASON_V1,
  };

  const suggested_hyperagent_prompt = buildHyperagentPrompt({
    candidate: base,
    profile,
    live_site_monitor_present: args.live_site_monitor_present,
  });

  const candidate: ReauditCandidateV1 = {
    ...base,
    suggested_hyperagent_prompt,
    cursor_followup_if_failed: "",
  };
  candidate.cursor_followup_if_failed = buildCursorFollowup(candidate);
  return candidate;
}

export function selectTopReauditCandidateV1(
  candidates: ReauditCandidateV1[],
  issues: CommandCenterIssueRecordV1[],
): ReauditCandidateV1 | null {
  if (candidates.length === 0) return null;
  const issueById = new Map(issues.map((issue) => [issue.issue_id, issue]));
  const sortedIssues = sortCommandCenterIssuesByPriorityV1(
    candidates
      .map((c) => issueById.get(c.issue_id))
      .filter((issue): issue is CommandCenterIssueRecordV1 => issue != null),
  );
  const topIssueId = sortedIssues[0]?.issue_id;
  return candidates.find((c) => c.issue_id === topIssueId) ?? candidates[0] ?? null;
}

export function buildCommandCenterIssueReauditLaneV1(args: {
  rootDir: string;
  issue_registry: CommandCenterIssueRegistryLaneV1;
  live_site_monitor?: LiveSiteMonitorV1 | null;
  now?: () => Date;
}): CommandCenterIssueReauditLaneV1 {
  const now = args.now ?? (() => new Date());
  const effectiveStatusByIssueId = buildEffectiveIssueStatusMapV1(
    args.issue_registry.lifecycle_audit_v1.rows,
  );
  const live_site_monitor_present = args.live_site_monitor != null;
  const live_route_probe_available =
    live_site_monitor_present &&
    (args.live_site_monitor?.routes.length ?? 0) > 0 &&
    args.live_site_monitor?.primary_target_base_url !== "UNKNOWN";

  const awaitingIssues = args.issue_registry.issues.filter((issue) =>
    isIssueAwaitingReauditV1({
      issue,
      effectiveStatus: effectiveStatusByIssueId.get(issue.issue_id) ?? issue.status,
    }),
  );

  const candidates = awaitingIssues.map((issue) =>
    buildReauditCandidateV1({
      issue,
      effectiveStatus: effectiveStatusByIssueId.get(issue.issue_id) ?? issue.status,
      live_site_monitor_present,
      live_route_probe_available,
    }),
  );

  const top_reaudit_candidate = selectTopReauditCandidateV1(
    candidates,
    args.issue_registry.issues,
  );

  const local_head_commit = gitRev(args.rootDir, "HEAD");
  const origin_main_commit = gitRev(args.rootDir, "origin/main");

  const proven_facts = [
    `PROVEN: Re-audit lane is read-only at ${COMMAND_CENTER_ISSUE_REAUDIT_CC_JQ_PATH_V1}.`,
    `PROVEN: total_deployed_awaiting_reaudit=${String(candidates.length)}.`,
    `PROVEN: local_head_commit=${local_head_commit}; origin_main_commit=${origin_main_commit}.`,
    `PROVEN: issue_registry steering_override_active=${String(args.issue_registry.steering_override_active)}.`,
  ];
  if (top_reaudit_candidate) {
    proven_facts.push(
      `PROVEN: top_reaudit_candidate=${top_reaudit_candidate.issue_id} severity=${top_reaudit_candidate.severity} reaudit_type=${top_reaudit_candidate.reaudit_type}.`,
    );
  }

  const inferred_facts: string[] = [];
  if (candidates.length > 0 && !args.issue_registry.steering_override_active) {
    inferred_facts.push(
      "INFERRED: Deployed issues awaiting re-audit may steer next_best_action when no repair-eligible issue exists.",
    );
  }

  const unknown_facts: string[] = [];
  if (!live_site_monitor_present) {
    unknown_facts.push(
      "UNKNOWN: live_site_monitor artifact absent — live route probes are plan-only until buckparts:live-site-smoke runs.",
    );
  } else if (!live_route_probe_available) {
    unknown_facts.push(
      "UNKNOWN: live site monitor present but route probe base URL or routes unavailable.",
    );
  }
  for (const candidate of candidates) {
    if (candidate.requires_live_probe && !live_route_probe_available) {
      unknown_facts.push(
        `UNKNOWN: ${candidate.issue_id} requires live probe but live route data is unavailable.`,
      );
    }
  }

  return {
    contract: COMMAND_CENTER_ISSUE_REAUDIT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    recommended_jq_path: COMMAND_CENTER_ISSUE_REAUDIT_CC_JQ_PATH_V1,
    local_head_commit,
    origin_main_commit,
    live_site_monitor_present,
    live_route_probe_available,
    total_deployed_awaiting_reaudit: candidates.length,
    top_reaudit_candidate,
    candidates,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
