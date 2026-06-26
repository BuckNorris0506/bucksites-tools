/**
 * Read-only Cursor intake validation for fridge OWNER_BROWSER_PROOF_ASSIST (7-slug cohort).
 * Independent from the 14-slug SAFE_LINK_BROWSER_PROOF_BATCH path.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED,
  HYPERAGENT_BATCH_BUNDLE_CONTRACT_V1,
  HYPERAGENT_BATCH_MANIFEST_CONTRACT_V1,
  HYPERAGENT_INGEST_PACKET_CONTRACT_V1,
  INVALID_HYPERAGENT_PACKET_BODY_SOURCES_V1,
  isHyperAgentDiscoveryStatusV1,
  isHyperAgentIngestIdUuidV1,
} from "./buckparts-ops-agent-workflow-v1";
import { FRIDGE_OWNER_BROWSER_PROOF_EXCLUDED_SLUGS_V1 } from "./fridge-safe-link-owner-browser-proof-batch-validation-v1";

export const FRIDGE_OWNER_BROWSER_PROOF_ASSIST_COHORT_SIZE_V1 = 7 as const;

export const FRIDGE_OWNER_BROWSER_PROOF_ASSIST_COHORT_KEY_V1 =
  "refrigerator_water_owner_browser_proof_candidates" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_ASSIST_MISSION_TYPE_V1 =
  "OWNER_BROWSER_PROOF_ASSIST" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_ASSIST_BUNDLE_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-assist-v1.json" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_ASSIST_PROVENANCE_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-assist-v1.provenance.json" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_ASSIST_CURSOR_VALIDATION_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-assist-cursor-validation-v1.json" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_ASSIST_EXPECTED_SLUGS_V1 = [
  "edr4rxd1",
  "edr3rxd1",
  "ultrawf",
  "eptwfu01",
  "fppwfu01",
  "wf3cb",
  "wfcb",
] as const;

/** 14-slug browser-proof cohort slugs not in the 7-slug assist cohort. */
export const FRIDGE_OWNER_BROWSER_PROOF_ASSIST_EXTRA_EXCLUDED_SLUGS_V1 = [
  "frig-242086201",
  "wf2cb",
  "frig-242017801",
  "purepour",
  "smartwater-mwfp",
  "da97-17376a",
  "mswf",
] as const;

export const FRIDGE_OWNER_BROWSER_PROOF_ASSIST_B087_ASIN_V1 = "B087PDLZL9" as const;

export type OwnerBrowserProofAssistCandidateUrlV1 = {
  url: string;
  retailer?: string;
  priority?: number;
  oem_signal?: string;
  action?: string;
  [key: string]: unknown;
};

export type OwnerBrowserProofAssistPacketV1 = {
  contract: string;
  ingest_id: string;
  slug: string;
  read_only?: boolean;
  truth_closure_claimed?: boolean;
  discovery_status?: string;
  proposed_state?: string;
  candidate_urls?: OwnerBrowserProofAssistCandidateUrlV1[];
  urls_to_avoid?: OwnerBrowserProofAssistCandidateUrlV1[];
  browser_proof_worksheet?: {
    visual_checklist?: string[];
    pass_criteria?: string;
    fail_criteria?: string[] | string;
    recommended_screenshot_names?: string[];
    wrong_part_risk?: { notes?: string } | string | null;
  };
  proven_facts?: string[];
  inferred_facts?: string[];
  unknown_facts?: string[];
  materialized_from_manifest?: boolean;
  materialized_from_repo?: boolean;
  synthetic?: boolean;
  packet_body_source?: string;
  [key: string]: unknown;
};

export type OwnerBrowserProofAssistDoNotUseEntryV1 = {
  slug?: string;
  url: string;
  action?: string;
  reason?: string;
  retailer?: string;
  evidence_level?: string;
};

export type OwnerBrowserProofAssistBundleV1 = {
  contract: string;
  bundle_id: string;
  mission_type: string;
  packet_count?: number;
  read_only?: boolean;
  truth_closure_claimed?: boolean;
  command_center_closure_claimed?: boolean;
  apply_planning_authorized?: boolean;
  verified_link_authorized?: boolean;
  manifest: {
    contract: string;
    manifest_id: string;
    mission_type?: string;
    total_slugs: number;
    cohort_key?: string;
    apply_planning_authorized?: boolean;
    verified_link_authorized?: boolean;
    command_center_closure_claimed?: boolean;
    truth_closure_claimed?: boolean;
    session_priority_order?: Array<{ slug: string; risk?: string; reason?: string }>;
  };
  packets: OwnerBrowserProofAssistPacketV1[];
  do_not_use?: OwnerBrowserProofAssistDoNotUseEntryV1[];
};

export type AssistSlugVerdictV1 =
  | "DISCOVERY_ASSIST_OK"
  | "BLOCKED_DO_NOT_USE_PRESENT"
  | "INTEGRITY_FAIL";

export type OwnerBrowserProofAssistSlugVerdictRowV1 = {
  slug: string;
  verdict: AssistSlugVerdictV1;
  proposed_state: string;
  discovery_status: string;
  reason: string;
  candidate_url_count: number;
  urls_to_avoid_count: number;
  has_browser_proof_worksheet: boolean;
};

export type OwnerBrowserProofAssistIntegrityResultV1 = {
  authentic: boolean;
  failure_code: typeof CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED | null;
  errors: string[];
  warnings: string[];
  synthetic_packet_slugs: string[];
};

export type OwnerBrowserProofAssistValidationResultV1 = {
  integrity: OwnerBrowserProofAssistIntegrityResultV1;
  slug_verdicts: OwnerBrowserProofAssistSlugVerdictRowV1[];
  edr3_b087_excluded_as_oem: boolean;
  edr3_b087_in_do_not_use: boolean;
  edr3_b087_in_urls_to_avoid_only: boolean;
  authorization_flags_all_false: boolean;
  proven_facts: string[];
  unknown_facts: string[];
};

function loadJson<T>(rootDir: string, rel: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, rel), "utf8")) as T;
}

export function isSyntheticOwnerBrowserProofAssistPacketV1(
  packet: OwnerBrowserProofAssistPacketV1,
): { synthetic: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (packet.materialized_from_manifest === true) reasons.push("materialized_from_manifest=true");
  if (packet.materialized_from_repo === true) reasons.push("materialized_from_repo=true");
  if (packet.synthetic === true) reasons.push("synthetic=true");
  if (typeof packet.packet_body_source === "string") {
    const src = packet.packet_body_source.toLowerCase();
    if ((INVALID_HYPERAGENT_PACKET_BODY_SOURCES_V1 as readonly string[]).includes(src)) {
      reasons.push(`packet_body_source=${packet.packet_body_source}`);
    }
  }
  if (packet.ingest_id?.startsWith("materialized-")) {
    reasons.push("ingest_id has materialized- prefix");
  }
  if (!isHyperAgentIngestIdUuidV1(packet.ingest_id ?? "")) {
    reasons.push("ingest_id is not a UUID");
  }
  const ws = packet.browser_proof_worksheet;
  if (!ws?.visual_checklist?.length || !ws.pass_criteria) {
    reasons.push("missing browser_proof_worksheet visual_checklist or pass_criteria");
  }
  if (!Array.isArray(packet.candidate_urls) || packet.candidate_urls.length === 0) {
    reasons.push("missing candidate_urls array");
  } else if (packet.candidate_urls.some((c) => !c.url?.trim())) {
    reasons.push("candidate_urls missing url fields");
  }
  if (
    !Array.isArray(packet.proven_facts) &&
    !Array.isArray(packet.inferred_facts) &&
    !Array.isArray(packet.unknown_facts)
  ) {
    reasons.push("missing proven/inferred/unknown facts arrays");
  }
  return { synthetic: reasons.length > 0, reasons };
}

function urlContainsB087(url: string | undefined): boolean {
  return Boolean(url?.toUpperCase().includes(FRIDGE_OWNER_BROWSER_PROOF_ASSIST_B087_ASIN_V1));
}

export function validateOwnerBrowserProofAssistBundleIntegrityV1(
  bundle: OwnerBrowserProofAssistBundleV1,
): OwnerBrowserProofAssistIntegrityResultV1 {
  const errors: string[] = [];
  const warnings: string[] = [];
  const synthetic_packet_slugs: string[] = [];

  if (bundle.contract !== HYPERAGENT_BATCH_BUNDLE_CONTRACT_V1) {
    errors.push(`contract must be ${HYPERAGENT_BATCH_BUNDLE_CONTRACT_V1}`);
  }
  if (bundle.mission_type !== FRIDGE_OWNER_BROWSER_PROOF_ASSIST_MISSION_TYPE_V1) {
    errors.push(`mission_type must be ${FRIDGE_OWNER_BROWSER_PROOF_ASSIST_MISSION_TYPE_V1}`);
  }
  if (bundle.manifest.contract !== HYPERAGENT_BATCH_MANIFEST_CONTRACT_V1) {
    errors.push(`manifest.contract must be ${HYPERAGENT_BATCH_MANIFEST_CONTRACT_V1}`);
  }
  if (bundle.manifest.total_slugs !== FRIDGE_OWNER_BROWSER_PROOF_ASSIST_COHORT_SIZE_V1) {
    errors.push(
      `manifest.total_slugs=${bundle.manifest.total_slugs} expected ${FRIDGE_OWNER_BROWSER_PROOF_ASSIST_COHORT_SIZE_V1}`,
    );
  }
  if (bundle.packets.length !== FRIDGE_OWNER_BROWSER_PROOF_ASSIST_COHORT_SIZE_V1) {
    errors.push(
      `packets.length=${bundle.packets.length} expected ${FRIDGE_OWNER_BROWSER_PROOF_ASSIST_COHORT_SIZE_V1}`,
    );
  }
  if (bundle.packet_count !== undefined) {
    if (bundle.packet_count !== FRIDGE_OWNER_BROWSER_PROOF_ASSIST_COHORT_SIZE_V1) {
      errors.push(`packet_count=${bundle.packet_count} expected ${FRIDGE_OWNER_BROWSER_PROOF_ASSIST_COHORT_SIZE_V1}`);
    }
  } else {
    warnings.push("packet_count missing at bundle top level; using packets.length");
  }

  const mustBeFalse: Array<[string, boolean | undefined]> = [
    ["bundle.truth_closure_claimed", bundle.truth_closure_claimed],
    ["bundle.command_center_closure_claimed", bundle.command_center_closure_claimed],
    ["bundle.apply_planning_authorized", bundle.apply_planning_authorized],
    ["bundle.verified_link_authorized", bundle.verified_link_authorized],
    ["manifest.apply_planning_authorized", bundle.manifest.apply_planning_authorized],
    ["manifest.verified_link_authorized", bundle.manifest.verified_link_authorized],
    ["manifest.command_center_closure_claimed", bundle.manifest.command_center_closure_claimed],
    ["manifest.truth_closure_claimed", bundle.manifest.truth_closure_claimed],
  ];
  for (const [label, value] of mustBeFalse) {
    if (value === true) errors.push(`${label} must not be true`);
  }
  if (bundle.read_only !== true) errors.push("bundle.read_only must be true");

  const expected = [...FRIDGE_OWNER_BROWSER_PROOF_ASSIST_EXPECTED_SLUGS_V1].sort();
  const slugSet = new Set<string>();

  for (const packet of bundle.packets) {
    if (packet.contract !== HYPERAGENT_INGEST_PACKET_CONTRACT_V1) {
      errors.push(`${packet.slug}: invalid packet.contract`);
    }
    if (packet.read_only !== true) errors.push(`${packet.slug}: read_only must be true`);
    if (packet.truth_closure_claimed !== false) {
      errors.push(`${packet.slug}: truth_closure_claimed must be false`);
    }
    if (packet.discovery_status && !isHyperAgentDiscoveryStatusV1(packet.discovery_status)) {
      errors.push(`${packet.slug}: invalid discovery_status=${packet.discovery_status}`);
    }
    const syn = isSyntheticOwnerBrowserProofAssistPacketV1(packet);
    if (syn.synthetic) {
      synthetic_packet_slugs.push(packet.slug);
      errors.push(`${packet.slug}: synthetic/stub body — ${syn.reasons.join("; ")}`);
    }
    slugSet.add(packet.slug);

    for (const candidate of packet.candidate_urls ?? []) {
      if (urlContainsB087(candidate.url) && packet.slug === "edr3rxd1") {
        errors.push("edr3rxd1: B087PDLZL9 must not appear in candidate_urls");
      }
    }
  }

  for (const excluded of FRIDGE_OWNER_BROWSER_PROOF_EXCLUDED_SLUGS_V1) {
    if (slugSet.has(excluded)) errors.push(`excluded slug present: ${excluded}`);
  }
  for (const excluded of FRIDGE_OWNER_BROWSER_PROOF_ASSIST_EXTRA_EXCLUDED_SLUGS_V1) {
    if (slugSet.has(excluded)) errors.push(`14-slug-only slug present in 7-slug assist: ${excluded}`);
  }
  for (const slug of expected) {
    if (!slugSet.has(slug)) errors.push(`missing expected slug: ${slug}`);
  }
  if (slugSet.size !== FRIDGE_OWNER_BROWSER_PROOF_ASSIST_COHORT_SIZE_V1) {
    errors.push(`unique slug count=${slugSet.size}`);
  }

  const authentic = errors.length === 0;
  return {
    authentic,
    failure_code: authentic ? null : CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED,
    errors,
    warnings,
    synthetic_packet_slugs,
  };
}

export function runOwnerBrowserProofAssistValidationV1(args: {
  rootDir?: string;
  bundle: OwnerBrowserProofAssistBundleV1;
}): OwnerBrowserProofAssistValidationResultV1 {
  const rootDir = args.rootDir ?? process.cwd();
  const bundle = args.bundle;
  const integrity = validateOwnerBrowserProofAssistBundleIntegrityV1(bundle);

  const slug_verdicts: OwnerBrowserProofAssistSlugVerdictRowV1[] = [];
  const proven_facts: string[] = [];
  const unknown_facts: string[] = [
    "UNKNOWN: byte_for_byte_hyperagent_export_match per provenance sidecar",
    "UNKNOWN: live retailer/manufacturer pages — not re-fetched in this intake validation run",
  ];

  let edr3_b087_in_do_not_use = false;
  let edr3_b087_in_urls_to_avoid_only = false;
  let edr3_b087_excluded_as_oem = true;

  for (const entry of bundle.do_not_use ?? []) {
    if (urlContainsB087(entry.url) && entry.action === "HARD_DO_NOT_USE") {
      edr3_b087_in_do_not_use = true;
      proven_facts.push("PROVEN: bundle.do_not_use lists B087PDLZL9 with HARD_DO_NOT_USE");
    }
  }

  const edr3EvidencePath =
    "data/evidence/amazon-edr3rxd1-aftermarket-pdp-evidence.2026-05-04.json";
  if (existsSync(path.join(rootDir, edr3EvidencePath))) {
    if (
      readFileSync(path.join(rootDir, edr3EvidencePath), "utf8")
        .toUpperCase()
        .includes(FRIDGE_OWNER_BROWSER_PROOF_ASSIST_B087_ASIN_V1)
    ) {
      proven_facts.push(
        "PROVEN: repo evidence amazon-edr3rxd1-aftermarket-pdp-evidence lists B087PDLZL9 as aftermarket",
      );
    }
  }

  for (const packet of bundle.packets) {
    const slug = packet.slug;
    let verdict: AssistSlugVerdictV1 = "DISCOVERY_ASSIST_OK";
    let reason = `proposed_state=${packet.proposed_state ?? "UNKNOWN"}; owner browser proof assist only`;

    const b087InAvoid = (packet.urls_to_avoid ?? []).some(
      (u) =>
        urlContainsB087(u.url) &&
        (String(u.action ?? "").includes("DO_NOT_USE") ||
          String(u.action ?? "").includes("HARD_DO_NOT_USE")),
    );
    if (slug === "edr3rxd1" && b087InAvoid) {
      edr3_b087_in_urls_to_avoid_only = true;
      proven_facts.push("PROVEN: edr3rxd1 urls_to_avoid lists B087PDLZL9 as HARD_DO_NOT_USE");
    }

    const b087InCandidates = (packet.candidate_urls ?? []).some((c) => urlContainsB087(c.url));
    if (b087InCandidates) {
      edr3_b087_excluded_as_oem = false;
      verdict = "BLOCKED_DO_NOT_USE_PRESENT";
      reason = "B087PDLZL9 present in candidate_urls — must not be accepted";
    }

    slug_verdicts.push({
      slug,
      verdict: integrity.authentic ? verdict : "INTEGRITY_FAIL",
      proposed_state: packet.proposed_state ?? "UNKNOWN",
      discovery_status: packet.discovery_status ?? "UNKNOWN",
      reason,
      candidate_url_count: packet.candidate_urls?.length ?? 0,
      urls_to_avoid_count: packet.urls_to_avoid?.length ?? 0,
      has_browser_proof_worksheet: Boolean(packet.browser_proof_worksheet?.visual_checklist?.length),
    });
  }

  const authorization_flags_all_false =
    bundle.read_only === true &&
    bundle.truth_closure_claimed === false &&
    bundle.command_center_closure_claimed === false &&
    bundle.manifest.apply_planning_authorized === false &&
    bundle.manifest.verified_link_authorized === false &&
    (bundle.apply_planning_authorized === undefined || bundle.apply_planning_authorized === false) &&
    (bundle.verified_link_authorized === undefined || bundle.verified_link_authorized === false) &&
    bundle.packets.every(
      (p) => p.read_only === true && p.truth_closure_claimed === false,
    );

  return {
    integrity,
    slug_verdicts,
    edr3_b087_excluded_as_oem,
    edr3_b087_in_do_not_use,
    edr3_b087_in_urls_to_avoid_only,
    authorization_flags_all_false,
    proven_facts,
    unknown_facts,
  };
}

export function deriveOwnerBrowserProofAssistValidationStatusV1(
  result: OwnerBrowserProofAssistValidationResultV1,
): "VALIDATION_PASS" | "VALIDATION_FAIL" | "VALIDATION_PARTIAL" {
  if (!result.integrity.authentic) return "VALIDATION_FAIL";
  if (!result.edr3_b087_excluded_as_oem) return "VALIDATION_FAIL";
  if (!result.authorization_flags_all_false) return "VALIDATION_FAIL";
  if (!result.edr3_b087_in_do_not_use || !result.edr3_b087_in_urls_to_avoid_only) {
    return "VALIDATION_PARTIAL";
  }
  return "VALIDATION_PARTIAL";
}

export function loadOwnerBrowserProofAssistBundleV1(
  rootDir: string = process.cwd(),
): OwnerBrowserProofAssistBundleV1 {
  return loadJson<OwnerBrowserProofAssistBundleV1>(
    rootDir,
    FRIDGE_OWNER_BROWSER_PROOF_ASSIST_BUNDLE_REL_V1,
  );
}
