import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildDeployLiveSiteMonitorCommandCenterLaneFromMonitor,
} from "./deploy-live-site-monitor-command-center-lane-v1";
import {
  buildDeployPublishQueueCommandCenterLaneV1,
  DEPLOY_PUBLISH_QUEUE_COMMAND_CENTER_LANE_CONTRACT_V1,
  NETLIFY_DEPLOY_METADATA_REL_V1,
  netlifyMetadataProvesReadyUnpublishedForOriginMainV1,
} from "./deploy-publish-queue-command-center-lane-v1";
import type { LiveSiteMonitorV1 } from "./buckparts-command-center-v2-types";

const REPO_ROOT = process.cwd();

function liveMonitorFixture(overrides: Partial<LiveSiteMonitorV1> = {}): LiveSiteMonitorV1 {
  return {
    contract: "live_site_monitor_v1",
    checked_at: "2026-05-31T00:00:00.000Z",
    source: "test",
    primary_target_base_url: "https://example.com",
    target_source: "NEXT_PUBLIC_SITE_URL",
    custom_domain_base_url: "UNKNOWN",
    custom_domain_checked: false,
    netlify_fallback_base_url: "UNKNOWN",
    netlify_domain_checked: "UNKNOWN",
    target_base_url: "https://example.com",
    route_http_status: "OK",
    content_contract_status: "OK",
    content_contracts: [],
    runtime_status: "OK",
    routes: [{ path: "/", status_code: 200, ok: true, latency_ms: 1, marker_found: true }],
    local_head_commit: "localsha",
    origin_main_commit: "originsha",
    deployed_commit: "UNKNOWN",
    deploy_sync_status: "UNKNOWN_DEPLOY_COMMIT",
    proven_facts: [],
    unknown_facts: [],
    ...overrides,
  };
}

function deployLaneFromMonitor(mon: LiveSiteMonitorV1 | null) {
  return buildDeployLiveSiteMonitorCommandCenterLaneFromMonitor({
    monitor: mon,
    artifact_source: mon ? "local_file" : "UNKNOWN",
  });
}

test("live smoke OK => no Netlify API call authorized even when deploy sync unknown", () => {
  const lane = buildDeployPublishQueueCommandCenterLaneV1({
    deploy_live_site_monitor_v1: deployLaneFromMonitor(liveMonitorFixture()),
    netlify_deploy_metadata: null,
  });
  assert.equal(lane.contract, DEPLOY_PUBLISH_QUEUE_COMMAND_CENTER_LANE_CONTRACT_V1);
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.netlify_api_call_authorized, false);
  assert.equal(lane.publish_required, false);
  assert.equal(lane.reason, "LIVE_CONTENT_OK");
  assert.equal(lane.deploy_sync_status, "UNKNOWN_DEPLOY_COMMIT");
});

test("content contract failure => investigation, publish not automatic, no Netlify API", () => {
  const lane = buildDeployPublishQueueCommandCenterLaneV1({
    deploy_live_site_monitor_v1: deployLaneFromMonitor(
      liveMonitorFixture({
        runtime_status: "ATTENTION",
        content_contract_status: "ATTENTION",
        route_http_status: "OK",
      }),
    ),
    netlify_deploy_metadata: null,
  });
  assert.equal(lane.netlify_api_call_authorized, false);
  assert.equal(lane.publish_required, false);
  assert.equal(lane.reason, "LIVE_CONTENT_INVESTIGATION_REQUIRED");
  assert.match(lane.recommended_owner_action, /buckparts:live/i);
});

test("route HTTP ATTENTION => investigation authorized, no Netlify API", () => {
  const lane = buildDeployPublishQueueCommandCenterLaneV1({
    deploy_live_site_monitor_v1: deployLaneFromMonitor(
      liveMonitorFixture({
        runtime_status: "ATTENTION",
        route_http_status: "ATTENTION",
        content_contract_status: "OK",
      }),
    ),
    netlify_deploy_metadata: null,
  });
  assert.equal(lane.netlify_api_call_authorized, false);
  assert.equal(lane.reason, "LIVE_CONTENT_INVESTIGATION_REQUIRED");
});

test("local ready-unpublished deploy metadata => Netlify publish may be recommended", () => {
  const metadata = {
    contract: "netlify_deploy_metadata_v1" as const,
    read_only: true as const,
    captured_at: "2026-05-31T00:00:00.000Z",
    capture_source: "manual:netlify-dashboard",
    origin_main_commit: "originsha",
    ready_deploy_id: "deploy-ready-1",
    ready_deploy_state: "ready",
    published_deploy_id: "deploy-old-1",
    published_commit: "oldsha",
    ready_unpublished: true,
  };
  assert.ok(
    netlifyMetadataProvesReadyUnpublishedForOriginMainV1({
      metadata,
      origin_main_commit: "originsha",
    }),
  );
  const lane = buildDeployPublishQueueCommandCenterLaneV1({
    deploy_live_site_monitor_v1: deployLaneFromMonitor(null),
    netlify_deploy_metadata: metadata,
  });
  assert.equal(lane.netlify_api_call_authorized, true);
  assert.equal(lane.publish_required, true);
  assert.equal(lane.reason, "READY_DEPLOY_NOT_PUBLISHED");
});

test("missing Netlify metadata => UNKNOWN deploy state, no API call authorized", () => {
  const lane = buildDeployPublishQueueCommandCenterLaneV1({
    deploy_live_site_monitor_v1: deployLaneFromMonitor(null),
    netlify_deploy_metadata: null,
  });
  assert.equal(lane.netlify_api_call_authorized, false);
  assert.equal(lane.publish_required, false);
  assert.equal(lane.reason, "NETLIFY_DEPLOY_STATE_UNKNOWN");
  assert.ok(lane.unknown_facts.some((f) => f.includes("buckparts:live")));
});

test("deploy publish queue lane source does not import or invoke Netlify CLI/API", () => {
  const src = readFileSync(
    path.join(REPO_ROOT, "scripts/lib/deploy-publish-queue-command-center-lane-v1.ts"),
    "utf8",
  );
  assert.ok(!src.includes("npx netlify"));
  assert.ok(!src.includes("@netlify/"));
  assert.ok(!src.includes('from "netlify'));
  assert.match(src, /never executes Netlify/);
});

test("command center report does not import Netlify CLI or execute npx netlify", () => {
  const src = readFileSync(path.join(REPO_ROOT, "scripts/report-buckparts-command-center.ts"), "utf8");
  assert.ok(!src.includes("npx netlify"));
  assert.ok(!src.includes("@netlify/cli"));
  assert.ok(!src.includes('from "netlify'));
});
