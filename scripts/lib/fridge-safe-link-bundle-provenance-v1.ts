/**
 * Bundle provenance for fridge SAFE_LINK HyperAgent ingest validation.
 * PROVEN bundle_source only when a committed sidecar documents it.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const HYPERAGENT_INGEST_BUNDLE_PROVENANCE_CONTRACT_V1 =
  "bucksites_hyperagent_ingest_bundle_provenance_v1";

export type BundleSourceV1 =
  | "hyperagent_direct_export"
  | "chat_transcript_reconstruction"
  | "unknown";

export type ProvenanceClaimV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type BundleProvenanceSidecarV1 = {
  contract?: string;
  bundle_rel?: string;
  bundle_source: BundleSourceV1;
  reconstruction_detail?: string;
  byte_for_byte_hyperagent_export_match?: boolean | "UNKNOWN";
  validation_scope?: "authenticity_and_repo_cross_check_only";
  command_center_closure_implied?: boolean;
};

export type BundleProvenanceRecordV1 = {
  bundle_source: BundleSourceV1;
  bundle_source_claim: ProvenanceClaimV1;
  byte_for_byte_hyperagent_export_match: ProvenanceClaimV1;
  validation_scope: "authenticity_and_repo_cross_check_only";
  command_center_closure_implied: false;
  sidecar_rel: string | null;
  notes: string[];
};

function sidecarRelForBundle(bundleRel: string): string {
  return bundleRel.replace(/\.json$/i, ".provenance.json");
}

function byteMatchClaim(sidecar: BundleProvenanceSidecarV1 | null): ProvenanceClaimV1 {
  if (!sidecar) return "UNKNOWN";
  const v = sidecar.byte_for_byte_hyperagent_export_match;
  if (v === true) return "PROVEN";
  if (v === false) return "PROVEN";
  return "UNKNOWN";
}

export function resolveFridgeHyperAgentBundleProvenanceV1(args: {
  root?: string;
  bundleRel: string;
  cliBundleSource?: string;
}): BundleProvenanceRecordV1 {
  const root = args.root ?? process.cwd();
  const rel = sidecarRelForBundle(args.bundleRel);
  const sidecarPath = path.join(root, rel);

  if (existsSync(sidecarPath)) {
    const sidecar = JSON.parse(readFileSync(sidecarPath, "utf8")) as BundleProvenanceSidecarV1;
    const source = sidecar.bundle_source ?? "unknown";
    return {
      bundle_source: source,
      bundle_source_claim: source === "unknown" ? "UNKNOWN" : "PROVEN",
      byte_for_byte_hyperagent_export_match: byteMatchClaim(sidecar),
      validation_scope: "authenticity_and_repo_cross_check_only",
      command_center_closure_implied: false,
      sidecar_rel: rel,
      notes: [
        ...(sidecar.reconstruction_detail ? [sidecar.reconstruction_detail] : []),
        `PROVEN: bundle provenance sidecar at ${rel}`,
      ],
    };
  }

  const cli = args.cliBundleSource;
  if (cli === "hyperagent_direct_export" || cli === "chat_transcript_reconstruction") {
    return {
      bundle_source: cli,
      bundle_source_claim: "INFERRED",
      byte_for_byte_hyperagent_export_match: "UNKNOWN",
      validation_scope: "authenticity_and_repo_cross_check_only",
      command_center_closure_implied: false,
      sidecar_rel: null,
      notes: [
        `INFERRED: --bundle-source=${cli} without committed ${rel}`,
        "Add a .provenance.json sidecar for PROVEN bundle_source",
      ],
    };
  }

  return {
    bundle_source: "unknown",
    bundle_source_claim: "UNKNOWN",
    byte_for_byte_hyperagent_export_match: "UNKNOWN",
    validation_scope: "authenticity_and_repo_cross_check_only",
    command_center_closure_implied: false,
    sidecar_rel: null,
    notes: [
      `UNKNOWN: no provenance sidecar at ${rel}`,
      "Use --bundle-source= only for INFERRED; commit sidecar for PROVEN",
    ],
  };
}
