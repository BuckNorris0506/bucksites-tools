/**
 * Command Center v2 lane for wrong-code-prevention v1 (read-only HyperAgent findings projection).
 */

import {
  loadWrongCodePreventionArtifactV1,
  WRONG_CODE_PREVENTION_ARTIFACT_REL_V1,
  WRONG_CODE_PREVENTION_CONTRACT_V1,
  type WrongCodePreventionArtifactFreshnessV1,
  type WrongCodePreventionArtifactLoadStatusV1,
  type WrongCodePreventionArtifactV1,
  type WrongCodePreventionCheckV1,
  type WrongCodePreventionOverallStatusV1,
  type WrongCodePreventionSqlPlanSafetyStatusV1,
} from "./wrong-code-prevention-v1";

export const WRONG_CODE_PREVENTION_CC_LANE_CONTRACT_V1 = WRONG_CODE_PREVENTION_CONTRACT_V1;

export const WRONG_CODE_PREVENTION_CC_JQ_PATH_V1 =
  ".command_center_v2.wrong_code_prevention_v1" as const;

export type WrongCodePreventionCommandCenterLaneV1 = {
  contract: typeof WRONG_CODE_PREVENTION_CC_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  hyperagent_write_authorized: false;
  auto_commit_authorized: false;
  auto_push_authorized: false;
  production_mutation_authorized: false;
  recommended_jq_path: typeof WRONG_CODE_PREVENTION_CC_JQ_PATH_V1;
  artifact_path: typeof WRONG_CODE_PREVENTION_ARTIFACT_REL_V1;
  artifact_load_status: WrongCodePreventionArtifactLoadStatusV1;
  artifact_fresh: boolean;
  freshness: WrongCodePreventionArtifactFreshnessV1;
  generated_at: string;
  git_head_hint: string | null;
  overall_status: WrongCodePreventionOverallStatusV1;
  stale_direct_buyable_count: number | "UNKNOWN";
  dangerous_db_only_slug_count: number | "UNKNOWN";
  handoff_head_drift_commits: number | "UNKNOWN";
  sql_plan_safety_status: WrongCodePreventionSqlPlanSafetyStatusV1;
  deprecated_slug_reference_count: number | "UNKNOWN";
  checks: WrongCodePreventionCheckV1[];
  blockers: string[];
  warnings: string[];
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

function unknownNumericFields(): {
  stale_direct_buyable_count: "UNKNOWN";
  dangerous_db_only_slug_count: "UNKNOWN";
  handoff_head_drift_commits: "UNKNOWN";
  deprecated_slug_reference_count: "UNKNOWN";
  sql_plan_safety_status: "UNKNOWN";
} {
  return {
    stale_direct_buyable_count: "UNKNOWN",
    dangerous_db_only_slug_count: "UNKNOWN",
    handoff_head_drift_commits: "UNKNOWN",
    deprecated_slug_reference_count: "UNKNOWN",
    sql_plan_safety_status: "UNKNOWN",
  };
}

export function buildWrongCodePreventionCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  artifact_load_status: Exclude<WrongCodePreventionArtifactLoadStatusV1, "loaded">;
  detail: string;
  freshness?: WrongCodePreventionArtifactFreshnessV1;
}): WrongCodePreventionCommandCenterLaneV1 {
  const freshness = args.freshness ?? {
    generated_at: "UNKNOWN",
    stale_after_ms: 86_400_000,
    freshness_status: "UNKNOWN",
  };

  return {
    contract: WRONG_CODE_PREVENTION_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    hyperagent_write_authorized: false,
    auto_commit_authorized: false,
    auto_push_authorized: false,
    production_mutation_authorized: false,
    recommended_jq_path: WRONG_CODE_PREVENTION_CC_JQ_PATH_V1,
    artifact_path: WRONG_CODE_PREVENTION_ARTIFACT_REL_V1,
    artifact_load_status: args.artifact_load_status,
    artifact_fresh: false,
    freshness,
    generated_at: args.generated_at,
    git_head_hint: null,
    overall_status: "UNKNOWN",
    ...unknownNumericFields(),
    checks: [],
    blockers: [],
    warnings: [],
    recommended_next_action:
      "Commit a valid wrong-code-prevention-v1.json artifact at data/command-center/audits/wrong-code-prevention-v1.json from HyperAgent read-only audit (HyperAgent write path not enabled in-repo).",
    proven_facts: [
      "wrong_code_prevention_v1 lane is read-only; HyperAgent cannot write, commit, or push from this contract.",
    ],
    unknown_facts: [
      `UNKNOWN: wrong-code-prevention artifact ${args.artifact_load_status} — ${args.detail}`,
      "UNKNOWN: stale_direct_buyable_count, dangerous_db_only_slug_count, and handoff drift until artifact loads FRESH.",
    ],
  };
}

export function buildWrongCodePreventionCommandCenterLaneFromArtifactV1(args: {
  artifact: WrongCodePreventionArtifactV1;
  freshness: WrongCodePreventionArtifactFreshnessV1;
}): WrongCodePreventionCommandCenterLaneV1 {
  const { artifact, freshness } = args;
  return {
    contract: WRONG_CODE_PREVENTION_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    hyperagent_write_authorized: false,
    auto_commit_authorized: false,
    auto_push_authorized: false,
    production_mutation_authorized: false,
    recommended_jq_path: WRONG_CODE_PREVENTION_CC_JQ_PATH_V1,
    artifact_path: WRONG_CODE_PREVENTION_ARTIFACT_REL_V1,
    artifact_load_status: "loaded",
    artifact_fresh: freshness.freshness_status === "FRESH",
    freshness,
    generated_at: artifact.generated_at,
    git_head_hint: artifact.git_head_hint,
    overall_status: artifact.overall_status,
    stale_direct_buyable_count: artifact.stale_direct_buyable_count,
    dangerous_db_only_slug_count: artifact.dangerous_db_only_slug_count,
    handoff_head_drift_commits: artifact.handoff_head_drift_commits,
    sql_plan_safety_status: artifact.sql_plan_safety_status,
    deprecated_slug_reference_count: artifact.deprecated_slug_reference_count,
    checks: artifact.checks,
    blockers: artifact.blockers,
    warnings: artifact.warnings,
    recommended_next_action: artifact.recommended_next_action,
    proven_facts: [
      "wrong_code_prevention_v1 artifact loaded from committed repo truth.",
      `overall_status=${artifact.overall_status}; artifact generated_at=${artifact.generated_at}.`,
      "HyperAgent write/commit/push authority remains false for this lane.",
      `check_count=${artifact.checks.length}; blockers=${artifact.blockers.length}; warnings=${artifact.warnings.length}.`,
    ],
    unknown_facts:
      artifact.overall_status === "UNKNOWN"
        ? ["UNKNOWN: overall_status on artifact — treat wrong-code-prevention steering as non-authoritative."]
        : [],
  };
}

export function buildWrongCodePreventionCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
}): WrongCodePreventionCommandCenterLaneV1 {
  const now = args.now ?? (() => new Date());
  const loaded = loadWrongCodePreventionArtifactV1({ rootDir: args.rootDir, now });

  if (loaded.status === "loaded") {
    const lane = buildWrongCodePreventionCommandCenterLaneFromArtifactV1({
      artifact: loaded.artifact,
      freshness: loaded.freshness,
    });
    if (loaded.freshness.freshness_status === "STALE") {
      return {
        ...lane,
        artifact_fresh: false,
        warnings: [...lane.warnings, "artifact_stale_refresh_required"],
        recommended_next_action:
          "Refresh wrong-code-prevention-v1.json; artifact is older than stale window but last snapshot is shown for visibility.",
        unknown_facts: [
          ...lane.unknown_facts,
          `STALE: artifact generated_at=${loaded.artifact.generated_at} exceeds stale_after_ms.`,
        ],
      };
    }
    return lane;
  }

  return buildWrongCodePreventionCommandCenterLaneUnknownV1({
    generated_at: now().toISOString(),
    artifact_load_status: loaded.status,
    detail: loaded.detail,
    freshness: loaded.freshness,
  });
}
