/**
 * Executive Runtime v0 — WAKE + OBSERVE + EMIT + STOP.
 * Sequences existing sources only. No dispatch, mutation, NBA, ODR, or new store.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  buildFounderActionQueueV1,
  founderActionQueueInputFromCommandCenterJson,
} from "../../src/lib/owner-dashboard/founder-action-queue-v1";
import { buildFounderDecisionRegistryReadModelV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-read-model-v1";
import { scanFounderDecisionRegistryJsonFilesV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-scan-v1";
import {
  isFounderRegistryRowActiveMutationApproval,
  validateFounderDecisionRegistryDocumentV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  OWNER_DECISION_QUEUE_CC_JQ_PATH_V1,
  OWNER_DECISION_QUEUE_MANIFEST_REL_V1,
} from "../../src/lib/owner-dashboard/owner-decision-queue-v1";
import { PHASE4_OUTCOME_CAPTURE_CC_JQ_PATH_V1 } from "./buckparts-phase4-outcome-capture-v1";
import { buildOwnerDecisionQueueCommandCenterLaneV1 } from "./owner-decision-queue-command-center-v1";

export const EXECUTIVE_RUNTIME_WAKE_OBSERVE_CONTRACT_V0 =
  "buckparts_executive_runtime_wake_observe_v0" as const;

export const EXECUTIVE_RUNTIME_WAKE_OBSERVE_SOURCE_CONTRACT_REL_V0 =
  "docs/BuckParts-EXECUTIVE-RUNTIME-CONTRACT-V1.md" as const;

export const EXECUTIVE_RUNTIME_WAKE_OBSERVE_HQ_REL_V0 = "docs/BuckParts-HQ-HANDOFF.md" as const;

export const EXECUTIVE_RUNTIME_WAKE_OBSERVE_SOURCE_COMMAND_V0 =
  "node --import tsx scripts/run-buckparts-executive-runtime-wake-observe-v0.ts" as const;

export const EXECUTIVE_RUNTIME_WAKE_OBSERVE_SLICE_V0 = "WAKE_OBSERVE_STOP" as const;

export type HonestyLabelV0 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type SourceRefV0 = {
  path?: string;
  jq_path?: string;
  source_command?: string;
  honesty: HonestyLabelV0;
};

export type ExecutiveRuntimeWakeObserveSnapshotV0 = {
  contract: typeof EXECUTIVE_RUNTIME_WAKE_OBSERVE_CONTRACT_V0;
  runtime_slice: typeof EXECUTIVE_RUNTIME_WAKE_OBSERVE_SLICE_V0;
  source_contract: typeof EXECUTIVE_RUNTIME_WAKE_OBSERVE_SOURCE_CONTRACT_REL_V0;
  source_command: typeof EXECUTIVE_RUNTIME_WAKE_OBSERVE_SOURCE_COMMAND_V0;
  generated_at: string;
  cycle_status: "OBSERVED_STOP" | "FAIL_CLOSED";
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  steering_authority: false;
  nba_authority: false;
  dispatch_authority: false;
  dispatch_invoked: false;
  odr_created: false;
  selected_work: null;
  conversation_memory_used: false;
  memory_is_not_head: true;
  head: {
    sha: string | null;
    short: string | null;
    source: "git rev-parse HEAD";
    git_status_short: string | null;
    honesty: HonestyLabelV0;
  };
  sources: {
    runtime_contract: SourceRefV0;
    hq_handoff: SourceRefV0 & {
      stopping_point_heading: string | null;
      hq_recorded_commit_in_heading: string | null;
    };
    command_center: SourceRefV0 & {
      generated_at: string | null;
      observed_canonical_dispatch_status: string | null;
    };
    outcome_join: SourceRefV0 & {
      observed: boolean;
      cannot_steer: true;
      observed_steering_authority: unknown;
      observed_nba_authority: unknown;
      observed_handoff_from_confident_buy_count: unknown;
      observed_runtime_status: unknown;
    };
    founder_action_queue: SourceRefV0 & {
      contract: "founder_action_queue_v1";
      row_ids: string[];
    };
    owner_decision_queue: SourceRefV0 & {
      contract: "owner_decision_queue_v1";
      pending_count: number | null;
      request_ids: string[];
    };
    oar: SourceRefV0 & {
      contract: "founder_decision_registry_v1";
      scan_dir: "data/owner-decisions";
      active_mutation_approval_ids: string[];
      active_mutation_approvals_count: number | null;
    };
  };
  head_vs_hq: {
    head_sha_short: string | null;
    hq_recorded_commit_in_heading: string | null;
    match: boolean | "UNKNOWN";
    note: string;
  };
  blocked_reasons: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type GitHeadReadV0 = {
  sha: string;
  statusShort: string;
};

export type WakeObserveDepsV0 = {
  rootDir: string;
  now?: () => Date;
  readGitHead: () => GitHeadReadV0;
  loadCommandCenter: () => Promise<unknown> | unknown;
  readTextFile?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function strField(record: Record<string, unknown> | null, key: string): string | null {
  if (!record) return null;
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function extractHqStoppingPointHeadingV0(markdown: string): string | null {
  const match = markdown.match(/^## Current stopping point[^\n]*/m);
  return match ? match[0].trim() : null;
}

export function extractBacktickedCommitFromHeadingV0(heading: string): string | null {
  const match = heading.match(/`([0-9a-f]{7,40})`/i);
  return match ? match[1].toLowerCase() : null;
}

function emptySource(honesty: HonestyLabelV0 = "UNKNOWN"): SourceRefV0 {
  return { honesty };
}

export function emptyWakeObserveSnapshotV0(generated_at: string): ExecutiveRuntimeWakeObserveSnapshotV0 {
  return {
    contract: EXECUTIVE_RUNTIME_WAKE_OBSERVE_CONTRACT_V0,
    runtime_slice: EXECUTIVE_RUNTIME_WAKE_OBSERVE_SLICE_V0,
    source_contract: EXECUTIVE_RUNTIME_WAKE_OBSERVE_SOURCE_CONTRACT_REL_V0,
    source_command: EXECUTIVE_RUNTIME_WAKE_OBSERVE_SOURCE_COMMAND_V0,
    generated_at,
    cycle_status: "FAIL_CLOSED",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    steering_authority: false,
    nba_authority: false,
    dispatch_authority: false,
    dispatch_invoked: false,
    odr_created: false,
    selected_work: null,
    conversation_memory_used: false,
    memory_is_not_head: true,
    head: {
      sha: null,
      short: null,
      source: "git rev-parse HEAD",
      git_status_short: null,
      honesty: "UNKNOWN",
    },
    sources: {
      runtime_contract: emptySource(),
      hq_handoff: {
        path: EXECUTIVE_RUNTIME_WAKE_OBSERVE_HQ_REL_V0,
        stopping_point_heading: null,
        hq_recorded_commit_in_heading: null,
        honesty: "UNKNOWN",
      },
      command_center: {
        source_command: "node --import tsx scripts/report-buckparts-command-center.ts",
        jq_path: ".command_center_v2",
        generated_at: null,
        observed_canonical_dispatch_status: null,
        honesty: "UNKNOWN",
      },
      outcome_join: {
        jq_path: PHASE4_OUTCOME_CAPTURE_CC_JQ_PATH_V1,
        source_command: "node --import tsx scripts/report-buckparts-command-center.ts",
        observed: false,
        cannot_steer: true,
        observed_steering_authority: null,
        observed_nba_authority: null,
        observed_handoff_from_confident_buy_count: null,
        observed_runtime_status: null,
        honesty: "UNKNOWN",
      },
      founder_action_queue: {
        contract: "founder_action_queue_v1",
        row_ids: [],
        honesty: "UNKNOWN",
      },
      owner_decision_queue: {
        contract: "owner_decision_queue_v1",
        path: OWNER_DECISION_QUEUE_MANIFEST_REL_V1,
        jq_path: OWNER_DECISION_QUEUE_CC_JQ_PATH_V1,
        pending_count: null,
        request_ids: [],
        honesty: "UNKNOWN",
      },
      oar: {
        contract: "founder_decision_registry_v1",
        scan_dir: "data/owner-decisions",
        source_command: "node --import tsx scripts/report-founder-decision-registry.ts",
        active_mutation_approval_ids: [],
        active_mutation_approvals_count: null,
        honesty: "UNKNOWN",
      },
    },
    head_vs_hq: {
      head_sha_short: null,
      hq_recorded_commit_in_heading: null,
      match: "UNKNOWN",
      note: "UNKNOWN: HEAD and HQ stopping-point commit not both readable.",
    },
    blocked_reasons: [],
    proven_facts: [
      "PROVEN: v0 authority locks are false — no NBA, dispatch, mutation, or steering.",
      "PROVEN: selected_work=null; dispatch_invoked=false; odr_created=false.",
      "PROVEN: conversation_memory_used=false; memory_is_not_head=true.",
    ],
    inferred_facts: [],
    unknown_facts: [],
  };
}

export function readGitHeadFromRepoV0(rootDir: string): GitHeadReadV0 {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: rootDir,
    encoding: "utf8",
  }).trim();
  if (!/^[0-9a-f]{7,40}$/i.test(sha)) {
    throw new Error("git rev-parse HEAD did not return a commit sha");
  }
  const statusShort = execFileSync("git", ["status", "--short"], {
    cwd: rootDir,
    encoding: "utf8",
  });
  return { sha, statusShort };
}

export async function runExecutiveRuntimeWakeObserveV0(
  deps: WakeObserveDepsV0,
): Promise<{ ok: boolean; snapshot: ExecutiveRuntimeWakeObserveSnapshotV0 }> {
  const generated_at = (deps.now ?? (() => new Date()))().toISOString();
  const snapshot = emptyWakeObserveSnapshotV0(generated_at);
  const blocked: string[] = [];
  const exists = deps.fileExists ?? existsSync;
  const readText = deps.readTextFile ?? ((abs: string) => readFileSync(abs, "utf8"));
  const root = deps.rootDir;

  const contractAbs = path.join(root, EXECUTIVE_RUNTIME_WAKE_OBSERVE_SOURCE_CONTRACT_REL_V0);
  if (!exists(contractAbs)) {
    blocked.push(`missing_required_source:${EXECUTIVE_RUNTIME_WAKE_OBSERVE_SOURCE_CONTRACT_REL_V0}`);
    snapshot.sources.runtime_contract = {
      path: EXECUTIVE_RUNTIME_WAKE_OBSERVE_SOURCE_CONTRACT_REL_V0,
      honesty: "UNKNOWN",
    };
  } else {
    snapshot.sources.runtime_contract = {
      path: EXECUTIVE_RUNTIME_WAKE_OBSERVE_SOURCE_CONTRACT_REL_V0,
      honesty: "PROVEN",
    };
  }

  try {
    const git = deps.readGitHead();
    const sha = git.sha.trim();
    if (!/^[0-9a-f]{7,40}$/i.test(sha)) {
      throw new Error("HEAD sha unreadable");
    }
    snapshot.head = {
      sha,
      short: sha.slice(0, 7),
      source: "git rev-parse HEAD",
      git_status_short: git.statusShort,
      honesty: "PROVEN",
    };
  } catch (error) {
    blocked.push(
      `missing_required_source:git_HEAD (${error instanceof Error ? error.message : String(error)})`,
    );
    snapshot.head.honesty = "UNKNOWN";
  }

  const hqAbs = path.join(root, EXECUTIVE_RUNTIME_WAKE_OBSERVE_HQ_REL_V0);
  if (!exists(hqAbs)) {
    blocked.push(`missing_required_source:${EXECUTIVE_RUNTIME_WAKE_OBSERVE_HQ_REL_V0}`);
    snapshot.sources.hq_handoff.honesty = "UNKNOWN";
  } else {
    try {
      const heading = extractHqStoppingPointHeadingV0(readText(hqAbs));
      if (!heading) {
        blocked.push("missing_required_source:hq_stopping_point_heading");
        snapshot.sources.hq_handoff.honesty = "UNKNOWN";
      } else {
        const hqCommit = extractBacktickedCommitFromHeadingV0(heading);
        snapshot.sources.hq_handoff = {
          path: EXECUTIVE_RUNTIME_WAKE_OBSERVE_HQ_REL_V0,
          stopping_point_heading: heading,
          hq_recorded_commit_in_heading: hqCommit,
          honesty: "PROVEN",
        };
      }
    } catch (error) {
      blocked.push(
        `missing_required_source:hq_handoff_unreadable (${error instanceof Error ? error.message : String(error)})`,
      );
      snapshot.sources.hq_handoff.honesty = "UNKNOWN";
    }
  }

  let commandCenter: unknown = null;
  try {
    commandCenter = await deps.loadCommandCenter();
  } catch (error) {
    blocked.push(
      `missing_required_source:command_center (${error instanceof Error ? error.message : String(error)})`,
    );
    snapshot.sources.command_center.honesty = "UNKNOWN";
  }

  const ccRoot = asRecord(commandCenter);
  const v2 = asRecord(ccRoot?.command_center_v2);
  if (commandCenter !== null && !v2) {
    blocked.push("missing_required_source:command_center_v2");
    snapshot.sources.command_center.honesty = "UNKNOWN";
  } else if (v2) {
    const canonical = asRecord(v2.canonical_final_operating_decision_v1);
    snapshot.sources.command_center = {
      source_command: "node --import tsx scripts/report-buckparts-command-center.ts",
      jq_path: ".command_center_v2",
      generated_at: strField(ccRoot, "generated_at"),
      observed_canonical_dispatch_status: strField(canonical, "dispatch_status"),
      honesty: "PROVEN",
    };
  }

  const outcomeJoin = v2 ? asRecord(v2.phase4_outcome_capture_v1) : null;
  if (!outcomeJoin) {
    if (v2 || commandCenter !== null) {
      blocked.push("missing_required_source:phase4_outcome_capture_v1");
    }
    snapshot.sources.outcome_join.honesty = "UNKNOWN";
    snapshot.sources.outcome_join.observed = false;
  } else {
    snapshot.sources.outcome_join = {
      jq_path: PHASE4_OUTCOME_CAPTURE_CC_JQ_PATH_V1,
      source_command: "node --import tsx scripts/report-buckparts-command-center.ts",
      observed: true,
      cannot_steer: true,
      observed_steering_authority: outcomeJoin.steering_authority ?? null,
      observed_nba_authority: outcomeJoin.nba_authority ?? null,
      observed_handoff_from_confident_buy_count:
        outcomeJoin.handoff_from_confident_buy_count ?? null,
      observed_runtime_status: outcomeJoin.runtime_status ?? null,
      honesty: "PROVEN",
    };
  }

  if (ccRoot && blocked.every((reason) => !reason.startsWith("missing_required_source:command_center"))) {
    try {
      const queue = buildFounderActionQueueV1(founderActionQueueInputFromCommandCenterJson(ccRoot));
      snapshot.sources.founder_action_queue = {
        contract: "founder_action_queue_v1",
        row_ids: queue.rows.map((row) => row.id),
        honesty: "PROVEN",
      };
    } catch (error) {
      blocked.push(
        `missing_required_source:founder_action_queue (${error instanceof Error ? error.message : String(error)})`,
      );
      snapshot.sources.founder_action_queue.honesty = "UNKNOWN";
    }
  }

  try {
    const odq = buildOwnerDecisionQueueCommandCenterLaneV1({
      rootDir: root,
      now: deps.now,
    });
    snapshot.sources.owner_decision_queue = {
      contract: "owner_decision_queue_v1",
      path: OWNER_DECISION_QUEUE_MANIFEST_REL_V1,
      jq_path: OWNER_DECISION_QUEUE_CC_JQ_PATH_V1,
      pending_count: odq.pending_count,
      request_ids: odq.top_pending_decisions.map((row) => row.decision_request_id),
      honesty: "PROVEN",
    };
  } catch (error) {
    blocked.push(
      `missing_required_source:owner_decision_queue (${error instanceof Error ? error.message : String(error)})`,
    );
    snapshot.sources.owner_decision_queue.honesty = "UNKNOWN";
  }

  try {
    const nowIso = generated_at;
    const files = scanFounderDecisionRegistryJsonFilesV1(root);
    const model = buildFounderDecisionRegistryReadModelV1(files, {
      generated_at: nowIso,
      reference_time_iso: nowIso,
    });
    const activeIds: string[] = [];
    for (const file of files) {
      if (!("parsed" in file)) continue;
      const validated = validateFounderDecisionRegistryDocumentV1(file.parsed);
      if (!validated.ok) continue;
      for (const row of validated.doc.rows) {
        if (isFounderRegistryRowActiveMutationApproval(row, nowIso)) {
          activeIds.push(row.decision_id);
        }
      }
    }
    snapshot.sources.oar = {
      contract: "founder_decision_registry_v1",
      scan_dir: "data/owner-decisions",
      source_command: "node --import tsx scripts/report-founder-decision-registry.ts",
      active_mutation_approval_ids: activeIds,
      active_mutation_approvals_count: model.active_mutation_approvals,
      honesty: "PROVEN",
    };
  } catch (error) {
    blocked.push(
      `missing_required_source:oar (${error instanceof Error ? error.message : String(error)})`,
    );
    snapshot.sources.oar.honesty = "UNKNOWN";
  }

  const headShort = snapshot.head.short;
  const hqCommit = snapshot.sources.hq_handoff.hq_recorded_commit_in_heading;
  if (headShort && hqCommit) {
    const match =
      headShort === hqCommit ||
      (snapshot.head.sha ?? "").toLowerCase().startsWith(hqCommit) ||
      hqCommit.startsWith(headShort);
    snapshot.head_vs_hq = {
      head_sha_short: headShort,
      hq_recorded_commit_in_heading: hqCommit,
      match,
      note: match
        ? "PROVEN: git HEAD matches the commit token recorded in the HQ stopping-point heading."
        : "PROVEN: git HEAD and HQ stopping-point heading record different commits — both kept; neither invented.",
    };
  } else {
    snapshot.head_vs_hq = {
      head_sha_short: headShort,
      hq_recorded_commit_in_heading: hqCommit,
      match: "UNKNOWN",
      note: "UNKNOWN: cannot compare HEAD to HQ stopping-point commit until both are readable.",
    };
  }

  if (snapshot.sources.outcome_join.observed) {
    snapshot.proven_facts.push(
      "PROVEN: Outcome Join observed from Command Center path; v0 cannot_steer=true and does not select work from it.",
    );
  }
  if (snapshot.head.honesty === "PROVEN" && snapshot.head.sha) {
    snapshot.proven_facts.push(`PROVEN: git HEAD=${snapshot.head.sha}`);
  }
  snapshot.unknown_facts.push(
    "UNKNOWN: live click_events / production deploy SHA unless Command Center/Outcome Join already emitted them.",
  );

  snapshot.blocked_reasons = blocked;
  snapshot.cycle_status = blocked.length === 0 ? "OBSERVED_STOP" : "FAIL_CLOSED";
  return { ok: blocked.length === 0, snapshot };
}
