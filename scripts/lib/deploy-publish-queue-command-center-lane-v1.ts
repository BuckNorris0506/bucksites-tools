import path from "node:path";

import type { DeployLiveSiteMonitorCommandCenterLaneV1 } from "./deploy-live-site-monitor-command-center-lane-v1";
import type {
  LiveSiteMonitorContentContractStatusV1,
  LiveSiteMonitorRouteHttpStatusV1,
  LiveSiteMonitorV1,
} from "./buckparts-command-center-v2-types";

export const DEPLOY_PUBLISH_QUEUE_COMMAND_CENTER_LANE_CONTRACT_V1 =
  "deploy_publish_queue_v1" as const;

export const NETLIFY_DEPLOY_METADATA_REL_V1 = "data/ops/netlify-deploy-metadata-v1.json" as const;

export const NETLIFY_DEPLOY_METADATA_CONTRACT_V1 = "netlify_deploy_metadata_v1" as const;

export type DeployPublishQueueReasonV1 =
  | "LIVE_CONTENT_OK"
  | "LIVE_CONTENT_INVESTIGATION_REQUIRED"
  | "READY_DEPLOY_NOT_PUBLISHED"
  | "NETLIFY_DEPLOY_STATE_UNKNOWN";

export type NetlifyDeployMetadataV1 = {
  contract: typeof NETLIFY_DEPLOY_METADATA_CONTRACT_V1;
  read_only: true;
  captured_at: string;
  capture_source: string;
  origin_main_commit: string;
  ready_deploy_id: string;
  ready_deploy_state: string;
  published_deploy_id: string | null;
  published_commit: string | null;
  ready_unpublished: boolean;
};

export type DeployPublishQueueCommandCenterLaneV1 = {
  contract: typeof DEPLOY_PUBLISH_QUEUE_COMMAND_CENTER_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: ".command_center_v2.deploy_publish_queue_v1";
  local_head_commit: string | "UNKNOWN";
  origin_main_commit: string | "UNKNOWN";
  live_site_runtime_status: LiveSiteMonitorV1["runtime_status"] | "UNKNOWN";
  live_site_route_http_status: LiveSiteMonitorRouteHttpStatusV1 | "UNKNOWN";
  live_site_content_contract_status: LiveSiteMonitorContentContractStatusV1 | "UNKNOWN";
  deploy_sync_status: LiveSiteMonitorV1["deploy_sync_status"] | "UNKNOWN";
  netlify_deploy_metadata_present: boolean;
  netlify_deploy_metadata_rel: typeof NETLIFY_DEPLOY_METADATA_REL_V1 | null;
  netlify_api_call_authorized: boolean;
  publish_required: boolean;
  reason: DeployPublishQueueReasonV1;
  recommended_owner_action: string;
  recommended_agent_action: string;
  cooldown_or_budget_note: string;
  proven_facts: string[];
  unknown_facts: string[];
};

const COOLDOWN_NOTE =
  "Netlify API/CLI is a budgeted owner exception — not routine Command Center validation. Default path: `npm run buckparts:live` (public GET smoke + trust content contracts). Log Netlify credit spend in data/ops/spend-ledger-v1.json when dashboard-proven.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNetlifyDeployMetadataV1(value: unknown): value is NetlifyDeployMetadataV1 {
  if (!isRecord(value)) return false;
  if (value.contract !== NETLIFY_DEPLOY_METADATA_CONTRACT_V1) return false;
  if (value.read_only !== true) return false;
  if (typeof value.captured_at !== "string" || !value.captured_at.trim()) return false;
  if (typeof value.origin_main_commit !== "string" || !value.origin_main_commit.trim()) return false;
  if (typeof value.ready_deploy_id !== "string" || !value.ready_deploy_id.trim()) return false;
  if (typeof value.ready_deploy_state !== "string") return false;
  if (value.published_deploy_id !== null && typeof value.published_deploy_id !== "string") return false;
  if (value.published_commit !== null && typeof value.published_commit !== "string") return false;
  return typeof value.ready_unpublished === "boolean";
}

export function loadNetlifyDeployMetadataV1(args: {
  rootDir: string;
  fileExists: (absolutePath: string) => boolean;
  readTextFile: (absolutePath: string) => string;
}): NetlifyDeployMetadataV1 | null {
  const abs = path.resolve(args.rootDir, NETLIFY_DEPLOY_METADATA_REL_V1);
  if (!args.fileExists(abs)) return null;
  try {
    const parsed: unknown = JSON.parse(args.readTextFile(abs));
    return isNetlifyDeployMetadataV1(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function commitsMatch(a: string | "UNKNOWN", b: string): boolean {
  if (a === "UNKNOWN") return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function netlifyMetadataProvesReadyUnpublishedForOriginMainV1(args: {
  metadata: NetlifyDeployMetadataV1;
  origin_main_commit: string | "UNKNOWN";
}): boolean {
  if (!args.metadata.ready_unpublished) return false;
  if (args.metadata.ready_deploy_state.trim().toLowerCase() !== "ready") return false;
  if (!commitsMatch(args.origin_main_commit, args.metadata.origin_main_commit)) return false;
  if (
    args.metadata.published_deploy_id != null &&
    args.metadata.published_deploy_id.trim() === args.metadata.ready_deploy_id.trim()
  ) {
    return false;
  }
  if (
    args.metadata.published_commit != null &&
    commitsMatch(args.metadata.published_commit, args.metadata.origin_main_commit)
  ) {
    return false;
  }
  return true;
}

function liveContentOk(args: {
  runtime_status: LiveSiteMonitorV1["runtime_status"] | "UNKNOWN";
  content_contract_status: LiveSiteMonitorContentContractStatusV1 | "UNKNOWN";
}): boolean {
  return args.runtime_status === "OK" && args.content_contract_status === "OK";
}

function needsLiveInvestigation(args: {
  runtime_status: LiveSiteMonitorV1["runtime_status"] | "UNKNOWN";
  route_http_status: LiveSiteMonitorRouteHttpStatusV1 | "UNKNOWN";
  content_contract_status: LiveSiteMonitorContentContractStatusV1 | "UNKNOWN";
}): boolean {
  return (
    args.runtime_status === "ATTENTION" ||
    args.route_http_status === "ATTENTION" ||
    args.content_contract_status === "ATTENTION"
  );
}

export function buildDeployPublishQueueCommandCenterLaneV1(args: {
  deploy_live_site_monitor_v1: DeployLiveSiteMonitorCommandCenterLaneV1;
  netlify_deploy_metadata: NetlifyDeployMetadataV1 | null;
}): DeployPublishQueueCommandCenterLaneV1 {
  const inspect = args.deploy_live_site_monitor_v1.inspect_summary;
  const mon = args.deploy_live_site_monitor_v1.live_site_monitor;
  const metadata = args.netlify_deploy_metadata;

  const local_head_commit = mon?.local_head_commit ?? "UNKNOWN";
  const origin_main_commit =
    mon?.origin_main_commit && mon.origin_main_commit !== "UNKNOWN"
      ? mon.origin_main_commit
      : metadata?.origin_main_commit ?? "UNKNOWN";
  const live_site_runtime_status = inspect.runtime_status;
  const live_site_route_http_status = inspect.route_http_status;
  const live_site_content_contract_status = inspect.content_contract_status;
  const deploy_sync_status = inspect.deploy_sync_status;

  const proven_facts: string[] = [
    "PROVEN: deploy_publish_queue_v1 is read-only — this lane never executes Netlify API or CLI.",
    `PROVEN: local_head_commit=${local_head_commit}; origin_main_commit=${origin_main_commit}.`,
    `PROVEN: live_site runtime_status=${live_site_runtime_status}; route_http_status=${live_site_route_http_status}; content_contract_status=${live_site_content_contract_status}.`,
    `PROVEN: deploy_sync_status=${deploy_sync_status}.`,
    `PROVEN: netlify_deploy_metadata_present=${String(metadata != null)}.`,
  ];
  const unknown_facts: string[] = [];

  if (liveContentOk({ runtime_status: live_site_runtime_status, content_contract_status: live_site_content_contract_status })) {
    if (deploy_sync_status === "UNKNOWN_DEPLOY_COMMIT") {
      unknown_facts.push(
        "UNKNOWN: Deployed commit on live origin is not proven — LIVE_SITE_DEPLOY_COMMIT not injected — but live HTTP + trust content contracts passed; Netlify API not required for routine validation.",
      );
    }
    return {
      contract: DEPLOY_PUBLISH_QUEUE_COMMAND_CENTER_LANE_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      recommended_jq_path: ".command_center_v2.deploy_publish_queue_v1",
      local_head_commit,
      origin_main_commit,
      live_site_runtime_status,
      live_site_route_http_status,
      live_site_content_contract_status,
      deploy_sync_status,
      netlify_deploy_metadata_present: metadata != null,
      netlify_deploy_metadata_rel: metadata != null ? NETLIFY_DEPLOY_METADATA_REL_V1 : null,
      netlify_api_call_authorized: false,
      publish_required: false,
      reason: "LIVE_CONTENT_OK",
      recommended_owner_action:
        "No Netlify publish needed for routine validation — live public smoke and trust content contracts are OK.",
      recommended_agent_action:
        "Do not call Netlify API. Continue read-only lanes (`npm run buckparts:live`, Command Center inspect).",
      cooldown_or_budget_note: COOLDOWN_NOTE,
      proven_facts,
      unknown_facts,
    };
  }

  if (
    needsLiveInvestigation({
      runtime_status: live_site_runtime_status,
      route_http_status: live_site_route_http_status,
      content_contract_status: live_site_content_contract_status,
    })
  ) {
    unknown_facts.push(
      "UNKNOWN: Root cause of live route/content failure until owner inspects smoke output and live HTML.",
    );
    return {
      contract: DEPLOY_PUBLISH_QUEUE_COMMAND_CENTER_LANE_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      recommended_jq_path: ".command_center_v2.deploy_publish_queue_v1",
      local_head_commit,
      origin_main_commit,
      live_site_runtime_status,
      live_site_route_http_status,
      live_site_content_contract_status,
      deploy_sync_status,
      netlify_deploy_metadata_present: metadata != null,
      netlify_deploy_metadata_rel: metadata != null ? NETLIFY_DEPLOY_METADATA_REL_V1 : null,
      netlify_api_call_authorized: false,
      publish_required: false,
      reason: "LIVE_CONTENT_INVESTIGATION_REQUIRED",
      recommended_owner_action:
        "Investigate live-site failures first: run `npm run buckparts:live`, read route_http_status and content_contract_status, fix trust-page/content drift. Do not auto-publish via Netlify.",
      recommended_agent_action:
        "Read-only investigation only — refresh live_site_monitor via public GET smoke; no Netlify API calls.",
      cooldown_or_budget_note: COOLDOWN_NOTE,
      proven_facts,
      unknown_facts,
    };
  }

  if (
    metadata != null &&
    netlifyMetadataProvesReadyUnpublishedForOriginMainV1({ metadata, origin_main_commit })
  ) {
    proven_facts.push(
      `PROVEN: Local metadata ${NETLIFY_DEPLOY_METADATA_REL_V1} marks ready_unpublished=true for origin_main_commit=${metadata.origin_main_commit}.`,
    );
    return {
      contract: DEPLOY_PUBLISH_QUEUE_COMMAND_CENTER_LANE_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      recommended_jq_path: ".command_center_v2.deploy_publish_queue_v1",
      local_head_commit,
      origin_main_commit,
      live_site_runtime_status,
      live_site_route_http_status,
      live_site_content_contract_status,
      deploy_sync_status,
      netlify_deploy_metadata_present: true,
      netlify_deploy_metadata_rel: NETLIFY_DEPLOY_METADATA_REL_V1,
      netlify_api_call_authorized: true,
      publish_required: true,
      reason: "READY_DEPLOY_NOT_PUBLISHED",
      recommended_owner_action:
        "Owner may publish the ready Netlify deploy for origin/main via dashboard or budgeted CLI/API — lane recommends only; it does not execute Netlify.",
      recommended_agent_action:
        "Do not run Netlify CLI/API autonomously. Surface READY_DEPLOY_NOT_PUBLISHED to owner with spend-ledger budget note.",
      cooldown_or_budget_note: COOLDOWN_NOTE,
      proven_facts,
      unknown_facts: [
        "UNKNOWN: Whether publishing the ready deploy will fix live content until post-publish smoke passes.",
      ],
    };
  }

  if (!mon) {
    unknown_facts.push(
      "UNKNOWN: Live site monitor not loaded — run `npm run buckparts:live` before any Netlify deploy investigation.",
    );
  } else if (metadata == null) {
    unknown_facts.push(
      `UNKNOWN: Netlify deploy publish state — no local metadata at ${NETLIFY_DEPLOY_METADATA_REL_V1}; lane will not call Netlify API to discover deploy state.`,
    );
  } else {
    unknown_facts.push(
      "UNKNOWN: Local Netlify metadata present but does not prove ready-unpublished for current origin/main.",
    );
  }

  return {
    contract: DEPLOY_PUBLISH_QUEUE_COMMAND_CENTER_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: ".command_center_v2.deploy_publish_queue_v1",
    local_head_commit,
    origin_main_commit,
    live_site_runtime_status,
    live_site_route_http_status,
    live_site_content_contract_status,
    deploy_sync_status,
    netlify_deploy_metadata_present: metadata != null,
    netlify_deploy_metadata_rel: metadata != null ? NETLIFY_DEPLOY_METADATA_REL_V1 : null,
    netlify_api_call_authorized: false,
    publish_required: false,
    reason: "NETLIFY_DEPLOY_STATE_UNKNOWN",
    recommended_owner_action:
      "Run public live smoke first (`npm run buckparts:live`). Only capture Netlify deploy metadata locally if owner needs publish budget decision.",
    recommended_agent_action:
      "Do not call Netlify API. Refresh deploy_live_site_monitor_v1 via read-only smoke; inspect Command Center lanes.",
    cooldown_or_budget_note: COOLDOWN_NOTE,
    proven_facts,
    unknown_facts,
  };
}
