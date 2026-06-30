/**
 * BuckParts Truth MCP v2 — manufacturer browser proof execution factory (read-only).
 * Projects committed execution factory artifacts only; no live rebuild.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { BuckPartsMcpDepsV1 } from "./buckparts-mcp-truth-context-v1";
import {
  loadManufacturerBrowserProofExecutionFactoryReportV1,
  MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CONTRACT_V1,
  MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_JSON_REL_V1,
  MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_SOURCE_COMMAND_V1,
  manufacturerBrowserProofExecutionManifestRelV1,
  manufacturerBrowserProofGeNormalizationExecutionPacketRelV1,
  manufacturerBrowserProofOwnerSessionPacketRelV1,
  type ManufacturerBrowserProofExecutionManifestV1,
  type ManufacturerBrowserProofGeNormalizationExecutionPacketV1,
  type ManufacturerBrowserProofOwnerSessionPacketV1,
} from "./manufacturer-browser-proof-execution-factory-v1";
import { MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CC_JQ_PATH_V1 } from "./manufacturer-browser-proof-execution-factory-command-center-v1";

export const BUCKPARTS_MCP_MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CONTRACT_V1 =
  "buckparts_mcp_manufacturer_browser_proof_execution_factory_v1" as const;

type McpReadOnlyEnvelopeV1 = {
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
};

type FactoryLoadResultV1 =
  | {
      ok: true;
      report: NonNullable<ReturnType<typeof loadManufacturerBrowserProofExecutionFactoryReportV1>>;
      repo_paths_read: string[];
    }
  | {
      ok: false;
      truth_status: "UNKNOWN";
      repo_paths_read: string[];
      truth_note: string;
    };

function envelope(): McpReadOnlyEnvelopeV1 & {
  contract: typeof BUCKPARTS_MCP_MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CONTRACT_V1;
} {
  return {
    contract: BUCKPARTS_MCP_MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
  };
}

function loadFactoryArtifact(deps: BuckPartsMcpDepsV1): FactoryLoadResultV1 {
  const report = loadManufacturerBrowserProofExecutionFactoryReportV1({
    rootDir: deps.rootDir,
  });
  if (!report) {
    return {
      ok: false,
      truth_status: "UNKNOWN",
      repo_paths_read: [MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_JSON_REL_V1],
      truth_note: `Committed execution factory artifact missing or invalid. Run ${MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_SOURCE_COMMAND_V1} locally; MCP does not rebuild upstream systems.`,
    };
  }
  return {
    ok: true,
    report,
    repo_paths_read: [
      MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_JSON_REL_V1,
      ...report.execution_packet_rels,
      ...report.owner_session_packet_rels,
      ...report.ge_normalization_packet_rels,
      ...report.manufacturer_execution_manifest_rels,
    ],
  };
}

function normalizeManufacturerKey(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function readJsonArtifact<T>(rootDir: string, relPath: string): T | null {
  const abs = path.join(rootDir, relPath);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as T;
  } catch {
    return null;
  }
}

export function manufacturerBrowserProofExecutionFactoryV1(deps: BuckPartsMcpDepsV1) {
  const loaded = loadFactoryArtifact(deps);
  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "manufacturer_browser_proof_execution_factory",
      truth_status: loaded.truth_status,
      execution_factory_contract: "UNKNOWN",
      command_center_jq_path: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CC_JQ_PATH_V1,
      intake_complete: false,
      scheduled_slug_count: 0,
      manufacturer_execution_batch_count: 0,
      auto_pass_forbidden: true,
      browser_automation_authorized: false,
      coverage_unlocked: false,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  const { report } = loaded;
  return {
    ...envelope(),
    tool: "manufacturer_browser_proof_execution_factory",
    truth_status: "PROVEN" as const,
    execution_factory_contract: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CONTRACT_V1,
    command_center_jq_path: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CC_JQ_PATH_V1,
    intake_complete: report.intake_complete,
    scheduled_slug_count: report.scheduled_slug_count,
    manufacturer_execution_batch_count: report.manufacturer_execution_batch_count,
    inspect_summary: report.inspect_summary,
    execution_packet_rels: report.execution_packet_rels,
    owner_session_packet_rels: report.owner_session_packet_rels,
    ge_normalization_packet_rels: report.ge_normalization_packet_rels,
    manufacturer_execution_manifest_rels: report.manufacturer_execution_manifest_rels,
    auto_pass_forbidden: report.auto_pass_forbidden,
    browser_automation_authorized: report.browser_automation_authorized,
    coverage_unlocked: false,
    repo_paths_read: loaded.repo_paths_read,
    truth_note:
      "Execution factory projected from committed manufacturer_browser_proof_execution_factory_v1 artifact only.",
  };
}

export function manufacturerBrowserProofExecutionManifestV1(
  deps: BuckPartsMcpDepsV1,
  manufacturerKey: string,
) {
  const loaded = loadFactoryArtifact(deps);
  const manifestRel = manufacturerBrowserProofExecutionManifestRelV1(manufacturerKey);
  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "manufacturer_browser_proof_execution_manifest",
      truth_status: loaded.truth_status,
      found: false,
      manufacturer_key: manufacturerKey,
      manifest: null as ManufacturerBrowserProofExecutionManifestV1 | null,
      manifest_artifact_rel: manifestRel,
      auto_pass_forbidden: true,
      browser_automation_authorized: false,
      coverage_unlocked: false,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  const manifest =
    loaded.report.manufacturer_execution_manifests.find(
      (row) => normalizeManufacturerKey(row.manufacturer_key) === normalizeManufacturerKey(manufacturerKey),
    ) ??
  readJsonArtifact<ManufacturerBrowserProofExecutionManifestV1>(deps.rootDir, manifestRel);

  if (!manifest) {
    return {
      ...envelope(),
      tool: "manufacturer_browser_proof_execution_manifest",
      truth_status: "UNKNOWN" as const,
      found: false,
      manufacturer_key: manufacturerKey,
      manifest: null,
      manifest_artifact_rel: manifestRel,
      auto_pass_forbidden: true,
      browser_automation_authorized: false,
      coverage_unlocked: false,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: `No execution manifest for manufacturer_key=${manufacturerKey} in committed factory artifact.`,
    };
  }

  return {
    ...envelope(),
    tool: "manufacturer_browser_proof_execution_manifest",
    truth_status: "PROVEN" as const,
    found: true,
    manufacturer_key: manifest.manufacturer_key,
    manifest,
    manifest_artifact_rel: manifestRel,
    auto_pass_forbidden: manifest.auto_pass_forbidden,
    browser_automation_authorized: manifest.browser_automation_authorized,
    coverage_unlocked: false,
    repo_paths_read: [...loaded.repo_paths_read, manifestRel],
    truth_note: "Execution manifest projected from committed execution factory artifact.",
  };
}

export function manufacturerBrowserProofOwnerSessionPacketV1(
  deps: BuckPartsMcpDepsV1,
  manufacturerKey: string,
) {
  const loaded = loadFactoryArtifact(deps);
  const packetRel = manufacturerBrowserProofOwnerSessionPacketRelV1(manufacturerKey);
  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "manufacturer_browser_proof_owner_session_packet",
      truth_status: loaded.truth_status,
      found: false,
      manufacturer_key: manufacturerKey,
      owner_session_packet: null as ManufacturerBrowserProofOwnerSessionPacketV1 | null,
      owner_session_packet_rel: packetRel,
      auto_pass_forbidden: true,
      browser_automation_authorized: false,
      coverage_unlocked: false,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  const packet =
    loaded.report.owner_session_packets.find(
      (row) => normalizeManufacturerKey(row.manufacturer_key) === normalizeManufacturerKey(manufacturerKey),
    ) ?? readJsonArtifact<ManufacturerBrowserProofOwnerSessionPacketV1>(deps.rootDir, packetRel);

  if (!packet) {
    return {
      ...envelope(),
      tool: "manufacturer_browser_proof_owner_session_packet",
      truth_status: "UNKNOWN" as const,
      found: false,
      manufacturer_key: manufacturerKey,
      owner_session_packet: null,
      owner_session_packet_rel: packetRel,
      auto_pass_forbidden: true,
      browser_automation_authorized: false,
      coverage_unlocked: false,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: `No owner session packet for manufacturer_key=${manufacturerKey} in committed factory artifact.`,
    };
  }

  return {
    ...envelope(),
    tool: "manufacturer_browser_proof_owner_session_packet",
    truth_status: "PROVEN" as const,
    found: true,
    manufacturer_key: packet.manufacturer_key,
    owner_session_packet: packet,
    owner_session_packet_rel: packetRel,
    auto_pass_forbidden: packet.auto_pass_forbidden,
    browser_automation_authorized: packet.browser_automation_authorized,
    coverage_unlocked: false,
    repo_paths_read: [...loaded.repo_paths_read, packetRel],
    truth_note: "Owner session packet projected from committed execution factory artifact.",
  };
}

export function manufacturerBrowserProofGeNormalizationPacketV1(
  deps: BuckPartsMcpDepsV1,
  slug: string,
) {
  const loaded = loadFactoryArtifact(deps);
  const packetRel = manufacturerBrowserProofGeNormalizationExecutionPacketRelV1(slug);
  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "manufacturer_browser_proof_ge_normalization_packet",
      truth_status: loaded.truth_status,
      found: false,
      filter_slug: slug,
      ge_normalization_packet: null as ManufacturerBrowserProofGeNormalizationExecutionPacketV1 | null,
      ge_normalization_packet_rel: packetRel,
      auto_pass_forbidden: true,
      browser_automation_authorized: false,
      coverage_unlocked: false,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  const packet =
    loaded.report.ge_normalization_packets.find(
      (row) => normalizeSlug(row.filter_slug) === normalizeSlug(slug),
    ) ?? readJsonArtifact<ManufacturerBrowserProofGeNormalizationExecutionPacketV1>(deps.rootDir, packetRel);

  if (!packet) {
    return {
      ...envelope(),
      tool: "manufacturer_browser_proof_ge_normalization_packet",
      truth_status: "UNKNOWN" as const,
      found: false,
      filter_slug: slug,
      ge_normalization_packet: null,
      ge_normalization_packet_rel: packetRel,
      auto_pass_forbidden: true,
      browser_automation_authorized: false,
      coverage_unlocked: false,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: `No GE normalization packet for filter_slug=${slug} in committed factory artifact.`,
    };
  }

  return {
    ...envelope(),
    tool: "manufacturer_browser_proof_ge_normalization_packet",
    truth_status: "PROVEN" as const,
    found: true,
    filter_slug: packet.filter_slug,
    ge_normalization_packet: packet,
    ge_normalization_packet_rel: packetRel,
    auto_pass_forbidden: packet.auto_pass_forbidden,
    browser_automation_authorized: packet.browser_automation_authorized,
    coverage_unlocked: false,
    repo_paths_read: [...loaded.repo_paths_read, packetRel],
    truth_note: "GE normalization packet projected from committed execution factory artifact.",
  };
}
