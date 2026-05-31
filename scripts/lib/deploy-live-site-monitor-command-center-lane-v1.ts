import type {
  LiveSiteMonitorContentContractStatusV1,
  LiveSiteMonitorDeploySyncStatusV1,
  LiveSiteMonitorRouteHttpStatusV1,
  LiveSiteMonitorV1,
  LiveSiteSmokeContentContractResultV1,
} from "./buckparts-command-center-v2-types";

export const DEPLOY_LIVE_SITE_MONITOR_COMMAND_CENTER_LANE_CONTRACT_V1 =
  "deploy_live_site_monitor_v1" as const;

export type LiveSiteMonitorArtifactSourceV1 =
  | "local_file"
  | "supabase"
  | "inline_read_only"
  | "UNKNOWN";

export type DeployLiveSiteMonitorWrongPartPreventionSummaryV1 = {
  path: "/wrong-part-prevention";
  http_ok: boolean;
  content_contract_ok: boolean;
  required_markers_ok: boolean;
  banned_phrases_absent: boolean;
  required_markers_found: string[];
  required_markers_missing: string[];
  banned_phrases_found: string[];
};

export type DeployLiveSiteMonitorInspectSummaryV1 = {
  recommended_jq_paths: {
    command_center: ".command_center_v2.deploy_live_site_monitor_v1.inspect_summary";
    deploy_lane_monitor: ".command_center_v2.deploy_live_site_status.live_site_monitor";
  };
  contract: "live_site_monitor_v1" | "UNKNOWN";
  artifact_source: LiveSiteMonitorArtifactSourceV1;
  checked_at: string | "UNKNOWN";
  target_base_url: string | "UNKNOWN";
  runtime_status: LiveSiteMonitorV1["runtime_status"] | "UNKNOWN";
  route_http_status: LiveSiteMonitorRouteHttpStatusV1 | "UNKNOWN";
  content_contract_status: LiveSiteMonitorContentContractStatusV1 | "UNKNOWN";
  deploy_sync_status: LiveSiteMonitorDeploySyncStatusV1 | "UNKNOWN";
  wrong_part_prevention: DeployLiveSiteMonitorWrongPartPreventionSummaryV1 | "UNKNOWN";
  proven_facts: string[];
  unknown_facts: string[];
};

export type DeployLiveSiteMonitorCommandCenterLaneV1 = {
  contract: typeof DEPLOY_LIVE_SITE_MONITOR_COMMAND_CENTER_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  inspect_summary: DeployLiveSiteMonitorInspectSummaryV1;
  live_site_monitor: LiveSiteMonitorV1 | null;
};

const WRONG_PART_PREVENTION_PATH = "/wrong-part-prevention" as const;

function summarizeWrongPartPrevention(
  contracts: LiveSiteSmokeContentContractResultV1[],
): DeployLiveSiteMonitorWrongPartPreventionSummaryV1 | "UNKNOWN" {
  const row = contracts.find((c) => c.path === WRONG_PART_PREVENTION_PATH);
  if (!row) return "UNKNOWN";
  return {
    path: WRONG_PART_PREVENTION_PATH,
    http_ok: row.http_ok,
    content_contract_ok: row.content_contract_ok,
    required_markers_ok: row.required_markers_ok,
    banned_phrases_absent: row.banned_phrases_absent,
    required_markers_found: row.required_markers_found,
    required_markers_missing: row.required_markers_missing,
    banned_phrases_found: row.banned_phrases_found,
  };
}

export function buildDeployLiveSiteMonitorCommandCenterLaneUnknownV1(args: {
  artifact_source?: LiveSiteMonitorArtifactSourceV1;
  reason?: string;
}): DeployLiveSiteMonitorCommandCenterLaneV1 {
  const artifact_source = args.artifact_source ?? "UNKNOWN";
  const unknown_facts = [
    "No live_site_monitor_v1 artifact loaded and inline read-only smoke was not run or not configured.",
    "Run `npm run buckparts:live` or `npm run buckparts:live-site-smoke` to refresh truth; deploy commit sync remains UNKNOWN without operator-proven LIVE_SITE_DEPLOY_COMMIT.",
  ];
  if (args.reason) unknown_facts.unshift(args.reason);

  return {
    contract: DEPLOY_LIVE_SITE_MONITOR_COMMAND_CENTER_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    live_site_monitor: null,
    inspect_summary: {
      recommended_jq_paths: {
        command_center: ".command_center_v2.deploy_live_site_monitor_v1.inspect_summary",
        deploy_lane_monitor: ".command_center_v2.deploy_live_site_status.live_site_monitor",
      },
      contract: "UNKNOWN",
      artifact_source,
      checked_at: "UNKNOWN",
      target_base_url: "UNKNOWN",
      runtime_status: "UNKNOWN",
      route_http_status: "UNKNOWN",
      content_contract_status: "UNKNOWN",
      deploy_sync_status: "UNKNOWN_DEPLOY_COMMIT",
      wrong_part_prevention: "UNKNOWN",
      proven_facts: [],
      unknown_facts,
    },
  };
}

export function buildDeployLiveSiteMonitorCommandCenterLaneV1(args: {
  monitor: LiveSiteMonitorV1;
  artifact_source: LiveSiteMonitorArtifactSourceV1;
}): DeployLiveSiteMonitorCommandCenterLaneV1 {
  const mon = args.monitor;
  const proven_facts = [
    `artifact_source=${args.artifact_source}.`,
    `checked_at=${mon.checked_at}.`,
    `target_base_url=${mon.target_base_url}.`,
    `runtime_status=${mon.runtime_status}; route_http_status=${mon.route_http_status}; content_contract_status=${mon.content_contract_status}.`,
    `deploy_sync_status=${mon.deploy_sync_status}; deployed_commit=${mon.deployed_commit}.`,
  ];
  const unknown_facts = [...mon.unknown_facts];
  if (mon.deploy_sync_status === "MATCHES_ORIGIN_MAIN" && mon.content_contract_status !== "OK") {
    unknown_facts.push(
      "deploy_sync_status MATCHES_ORIGIN_MAIN does not prove live HTML — content_contract_status must pass separately.",
    );
  }

  return {
    contract: DEPLOY_LIVE_SITE_MONITOR_COMMAND_CENTER_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    live_site_monitor: mon,
    inspect_summary: {
      recommended_jq_paths: {
        command_center: ".command_center_v2.deploy_live_site_monitor_v1.inspect_summary",
        deploy_lane_monitor: ".command_center_v2.deploy_live_site_status.live_site_monitor",
      },
      contract: "live_site_monitor_v1",
      artifact_source: args.artifact_source,
      checked_at: mon.checked_at,
      target_base_url: mon.target_base_url,
      runtime_status: mon.runtime_status,
      route_http_status: mon.route_http_status,
      content_contract_status: mon.content_contract_status,
      deploy_sync_status: mon.deploy_sync_status,
      wrong_part_prevention: summarizeWrongPartPrevention(mon.content_contracts),
      proven_facts,
      unknown_facts,
    },
  };
}

export function buildDeployLiveSiteMonitorCommandCenterLaneFromMonitor(args: {
  monitor: LiveSiteMonitorV1 | null;
  artifact_source: LiveSiteMonitorArtifactSourceV1;
}): DeployLiveSiteMonitorCommandCenterLaneV1 {
  if (!args.monitor) {
    return buildDeployLiveSiteMonitorCommandCenterLaneUnknownV1({
      artifact_source: args.artifact_source,
    });
  }
  return buildDeployLiveSiteMonitorCommandCenterLaneV1({
    monitor: args.monitor,
    artifact_source: args.artifact_source,
  });
}
