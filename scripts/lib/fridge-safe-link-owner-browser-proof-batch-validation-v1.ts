/**
 * Read-only Cursor validation for fridge SAFE_LINK_BROWSER_PROOF_BATCH (14-slug cohort).
 * Independent from the 26-slug SAFE_LINK_BATCH validation path.
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

export const FRIDGE_OWNER_BROWSER_PROOF_BATCH_COHORT_SIZE_V1 = 14 as const;

export const FRIDGE_OWNER_BROWSER_PROOF_BATCH_COHORT_KEY_V1 =
  "refrigerator_water_owner_browser_needed" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_BATCH_MISSION_TYPE_V1 =
  "SAFE_LINK_BROWSER_PROOF_BATCH" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_BATCH_BUNDLE_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-batch-v1.json" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_BATCH_PROVENANCE_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-batch-v1.provenance.json" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_CURSOR_VALIDATION_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-cursor-validation-v1.json" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_EXPECTED_SLUGS_V1 = [
  "edr4rxd1",
  "edr3rxd1",
  "ultrawf",
  "frig-242086201",
  "eptwfu01",
  "fppwfu01",
  "wf2cb",
  "frig-242017801",
  "purepour",
  "wf3cb",
  "wfcb",
  "smartwater-mwfp",
  "da97-17376a",
  "mswf",
] as const;

export const FRIDGE_OWNER_BROWSER_PROOF_EXCLUDED_SLUGS_V1 = [
  "gswf",
  "4396508",
  "xwfe",
  "frig-242294502",
  "w10413645a",
  "xwf",
  "adq75795101",
  "gswf2",
  "opfg3f",
  "da97-19467c",
  "pfmwf",
  "4396842",
] as const;

export type OwnerBrowserProofCandidateUrlV1 = {
  url: string;
  url_type?: string;
  oem_or_compatible?: string;
  page_type?: string;
  evidence_snippet?: string;
  risks?: Record<string, string>;
};

export type OwnerBrowserProofPacketV1 = {
  contract: string;
  ingest_id: string;
  slug: string;
  read_only?: boolean;
  truth_closure_claimed?: boolean;
  discovery_status?: string;
  proposed_state?: string;
  specialist_outputs?: {
    discovery?: { summary?: string };
    truth_risk?: { summary?: string };
  };
  candidate_urls?: OwnerBrowserProofCandidateUrlV1[];
  recommended_browser_proof_urls?: string[];
  proven_facts?: string[];
  inferred_facts?: string[];
  unknown_facts?: string[];
  materialized_from_manifest?: boolean;
  materialized_from_repo?: boolean;
  synthetic?: boolean;
  packet_body_source?: string;
  [key: string]: unknown;
};

export type OwnerBrowserProofBatchBundleV1 = {
  contract: string;
  bundle_id: string;
  mission_type: string;
  packet_count: number;
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
    cohort_slugs?: string[];
    command_center_closure_claimed?: boolean;
  };
  packets: OwnerBrowserProofPacketV1[];
};

export type CandidateUrlVerdictV1 =
  | "ACCEPTABLE_OWNER_BROWSER_CANDIDATE"
  | "REJECTED_RISKY_OR_AFTERMARKET"
  | "NOT_DIRECT_BUYABLE"
  | "UNKNOWN_CAPTCHA_OR_UNVERIFIED";

export type SlugVerdictV1 =
  | "DISCOVERY_CANDIDATES_OK"
  | "BLOCKED_CONFLICT"
  | "BLOCKED_LABEL_REQUIRED"
  | "BLOCKED_DISCOVERY"
  | "INTEGRITY_FAIL"
  | "DISCREPANCY_VS_BATCH_FACTORY";

export type OwnerBrowserProofSlugVerdictRowV1 = {
  slug: string;
  verdict: SlugVerdictV1;
  proposed_state: string;
  batch_factory_state: string | null;
  reason: string;
  strongest_owner_browser_proof_candidates: string[];
  rejected_or_risky_candidates: string[];
};

export type OwnerBrowserProofCandidateVerdictRowV1 = {
  slug: string;
  url: string;
  url_type: string;
  oem_or_compatible: string;
  verdict: CandidateUrlVerdictV1;
  reason: string;
};

export type OwnerBrowserProofBatchIntegrityResultV1 = {
  authentic: boolean;
  failure_code: typeof CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED | null;
  errors: string[];
  synthetic_packet_slugs: string[];
};

export type OwnerBrowserProofBatchValidationResultV1 = {
  integrity: OwnerBrowserProofBatchIntegrityResultV1;
  slug_verdicts: OwnerBrowserProofSlugVerdictRowV1[];
  candidate_url_verdicts: OwnerBrowserProofCandidateVerdictRowV1[];
  strongest_owner_browser_proof_candidates: Array<{ slug: string; url: string }>;
  rejected_or_risky_candidates: Array<{ slug: string; url: string; reason: string }>;
  edr3_b087_excluded_as_oem: boolean;
  edr3_b087_present_as_aftermarket_only: boolean;
  purepour_remains_blocked: boolean;
  frig_242086201_remains_blocked: boolean;
  discrepancies: string[];
  unknown_facts: string[];
  proven_facts: string[];
};

const SEARCH_URL_RE =
  /search\.jsp|searchkeyword=|\/search\?|\/category\/|\/Owner-Centre\/Product-Support/i;

const STUB_SUMMARY_RE = /^(Discovery|TruthRisk) for [a-z0-9-]+$/i;

function loadJson<T>(rootDir: string, rel: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, rel), "utf8")) as T;
}

export function isSyntheticOwnerBrowserProofPacketBodyV1(
  packet: OwnerBrowserProofPacketV1,
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
  const so = packet.specialist_outputs;
  if (!so?.discovery?.summary?.trim() || !so?.truth_risk?.summary?.trim()) {
    reasons.push("specialist_outputs missing discovery/truth_risk summaries");
  } else if (
    STUB_SUMMARY_RE.test(so.discovery.summary) &&
    STUB_SUMMARY_RE.test(so.truth_risk.summary)
  ) {
    reasons.push("specialist_outputs use stub summaries");
  }
  if (!Array.isArray(packet.candidate_urls) || packet.candidate_urls.length === 0) {
    reasons.push("missing candidate_urls array");
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

export function validateOwnerBrowserProofBatchIntegrityV1(
  bundle: OwnerBrowserProofBatchBundleV1,
): OwnerBrowserProofBatchIntegrityResultV1 {
  const errors: string[] = [];
  const synthetic_packet_slugs: string[] = [];

  if (bundle.contract !== HYPERAGENT_BATCH_BUNDLE_CONTRACT_V1) {
    errors.push(`contract must be ${HYPERAGENT_BATCH_BUNDLE_CONTRACT_V1}`);
  }
  if (bundle.mission_type !== FRIDGE_OWNER_BROWSER_PROOF_BATCH_MISSION_TYPE_V1) {
    errors.push(`mission_type must be ${FRIDGE_OWNER_BROWSER_PROOF_BATCH_MISSION_TYPE_V1}`);
  }
  if (bundle.manifest.contract !== HYPERAGENT_BATCH_MANIFEST_CONTRACT_V1) {
    errors.push(`manifest.contract must be ${HYPERAGENT_BATCH_MANIFEST_CONTRACT_V1}`);
  }
  if (bundle.packet_count !== FRIDGE_OWNER_BROWSER_PROOF_BATCH_COHORT_SIZE_V1) {
    errors.push(
      `packet_count=${bundle.packet_count} expected ${FRIDGE_OWNER_BROWSER_PROOF_BATCH_COHORT_SIZE_V1}`,
    );
  }
  if (bundle.manifest.total_slugs !== FRIDGE_OWNER_BROWSER_PROOF_BATCH_COHORT_SIZE_V1) {
    errors.push(
      `manifest.total_slugs=${bundle.manifest.total_slugs} expected ${FRIDGE_OWNER_BROWSER_PROOF_BATCH_COHORT_SIZE_V1}`,
    );
  }
  if (bundle.packets.length !== FRIDGE_OWNER_BROWSER_PROOF_BATCH_COHORT_SIZE_V1) {
    errors.push(
      `packets.length=${bundle.packets.length} expected ${FRIDGE_OWNER_BROWSER_PROOF_BATCH_COHORT_SIZE_V1}`,
    );
  }
  if (bundle.command_center_closure_claimed !== false) {
    errors.push("command_center_closure_claimed must be false");
  }
  if (bundle.apply_planning_authorized !== false) {
    errors.push("apply_planning_authorized must be false");
  }
  if (bundle.verified_link_authorized !== false) {
    errors.push("verified_link_authorized must be false");
  }
  if (bundle.truth_closure_claimed !== false) {
    errors.push("truth_closure_claimed must be false");
  }

  const expected = [...FRIDGE_OWNER_BROWSER_PROOF_EXPECTED_SLUGS_V1].sort();
  const manifestSlugs = [...(bundle.manifest.cohort_slugs ?? [])].sort();
  if (JSON.stringify(manifestSlugs) !== JSON.stringify(expected)) {
    errors.push("manifest.cohort_slugs does not match expected 14-slug cohort");
  }

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
    const syn = isSyntheticOwnerBrowserProofPacketBodyV1(packet);
    if (syn.synthetic) {
      synthetic_packet_slugs.push(packet.slug);
      errors.push(`${packet.slug}: synthetic/stub body — ${syn.reasons.join("; ")}`);
    }
    slugSet.add(packet.slug);
  }

  for (const excluded of FRIDGE_OWNER_BROWSER_PROOF_EXCLUDED_SLUGS_V1) {
    if (slugSet.has(excluded)) errors.push(`excluded slug present: ${excluded}`);
  }
  if (slugSet.size !== FRIDGE_OWNER_BROWSER_PROOF_BATCH_COHORT_SIZE_V1) {
    errors.push(`unique slug count=${slugSet.size}`);
  }
  for (const slug of expected) {
    if (!slugSet.has(slug)) errors.push(`missing expected slug: ${slug}`);
  }

  const authentic = errors.length === 0;
  return {
    authentic,
    failure_code: authentic ? null : CURSOR_VALIDATION_FAILURE_FULL_PACKET_BODIES_REQUIRED,
    errors,
    synthetic_packet_slugs,
  };
}

export function classifyOwnerBrowserProofCandidateUrlV1(args: {
  slug: string;
  candidate: OwnerBrowserProofCandidateUrlV1;
  specialistSummary?: string;
  repoEvidenceAsins?: Set<string>;
}): { verdict: CandidateUrlVerdictV1; reason: string } {
  const url = args.candidate.url ?? "";
  const urlType = args.candidate.url_type ?? "unknown";
  const oem = (args.candidate.oem_or_compatible ?? "").toLowerCase();
  const pageType = args.candidate.page_type ?? "";

  if (
    urlType === "unsafe_or_irrelevant" ||
    oem.includes("aftermarket") ||
    oem.includes("excluded")
  ) {
    return {
      verdict: "REJECTED_RISKY_OR_AFTERMARKET",
      reason: `url_type=${urlType} oem_or_compatible=${args.candidate.oem_or_compatible}`,
    };
  }
  if (SEARCH_URL_RE.test(url) || pageType !== "direct_product_page") {
    return {
      verdict: "NOT_DIRECT_BUYABLE",
      reason: `not direct buyable page_type=${pageType}`,
    };
  }
  const captchaMention =
    (args.specialistSummary ?? "").includes("CAPTCHA") ||
    (args.candidate.evidence_snippet ?? "").includes("CAPTCHA");
  const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
  if (
    captchaMention &&
    asinMatch &&
    !args.repoEvidenceAsins?.has(asinMatch[1].toUpperCase())
  ) {
    return {
      verdict: "UNKNOWN_CAPTCHA_OR_UNVERIFIED",
      reason: "Amazon CAPTCHA blocked at crawl; no matching repo evidence ASIN",
    };
  }
  if (
    urlType === "official_manufacturer_pdp" ||
    urlType === "retailer_direct_pdp"
  ) {
    return {
      verdict: "ACCEPTABLE_OWNER_BROWSER_CANDIDATE",
      reason: `discovery candidate only — ${urlType}`,
    };
  }
  return {
    verdict: "NOT_DIRECT_BUYABLE",
    reason: `url_type=${urlType} not manufacturer/retailer direct PDP`,
  };
}

export function runOwnerBrowserProofBatchValidationV1(args: {
  rootDir?: string;
  bundle: OwnerBrowserProofBatchBundleV1;
}): OwnerBrowserProofBatchValidationResultV1 {
  const rootDir = args.rootDir ?? process.cwd();
  const bundle = args.bundle;
  const integrity = validateOwnerBrowserProofBatchIntegrityV1(bundle);

  const batchFactory = existsSync(
    path.join(rootDir, "data/fridge/batch-production/drafts/fridge-safe-link-batch-factory-v1.json"),
  )
    ? loadJson<{ rows: Array<{ slug: string; batch_factory_state: string }> }>(
        rootDir,
        "data/fridge/batch-production/drafts/fridge-safe-link-batch-factory-v1.json",
      )
    : null;
  const bfBySlug = new Map(
    batchFactory?.rows.map((r) => [r.slug.toLowerCase(), r.batch_factory_state]) ?? [],
  );

  const edr3EvidencePath =
    "data/evidence/amazon-edr3rxd1-aftermarket-pdp-evidence.2026-05-04.json";
  const edr3Evidence = existsSync(path.join(rootDir, edr3EvidencePath))
    ? loadJson<{ asin?: string; product_attribution?: string }>(rootDir, edr3EvidencePath)
    : null;
  const repoEvidenceAsins = new Set<string>();
  if (edr3Evidence?.asin) repoEvidenceAsins.add(edr3Evidence.asin.toUpperCase());

  const slug_verdicts: OwnerBrowserProofSlugVerdictRowV1[] = [];
  const candidate_url_verdicts: OwnerBrowserProofCandidateVerdictRowV1[] = [];
  const strongest: Array<{ slug: string; url: string }> = [];
  const rejected: Array<{ slug: string; url: string; reason: string }> = [];
  const discrepancies: string[] = [];
  const unknown_facts: string[] = [];
  const proven_facts: string[] = [];

  let edr3_b087_present_as_aftermarket_only = false;
  let edr3_b087_excluded_as_oem = true;

  for (const packet of bundle.packets) {
    const slug = packet.slug;
    const proposed = packet.proposed_state ?? "UNKNOWN";
    const bfState = bfBySlug.get(slug.toLowerCase()) ?? null;
    const specialistSummary = [
      packet.specialist_outputs?.discovery?.summary,
      packet.specialist_outputs?.truth_risk?.summary,
    ]
      .filter(Boolean)
      .join(" ");

    const localRejected: string[] = [];
    const localStrongest: string[] = [];

    for (const candidate of packet.candidate_urls ?? []) {
      const { verdict, reason } = classifyOwnerBrowserProofCandidateUrlV1({
        slug,
        candidate,
        specialistSummary,
        repoEvidenceAsins,
      });
      candidate_url_verdicts.push({
        slug,
        url: candidate.url,
        url_type: candidate.url_type ?? "unknown",
        oem_or_compatible: candidate.oem_or_compatible ?? "unknown",
        verdict,
        reason,
      });
      if (verdict === "ACCEPTABLE_OWNER_BROWSER_CANDIDATE") {
        localStrongest.push(candidate.url);
      } else if (
        verdict === "REJECTED_RISKY_OR_AFTERMARKET" ||
        verdict === "NOT_DIRECT_BUYABLE"
      ) {
        localRejected.push(`${candidate.url} (${reason})`);
        rejected.push({ slug, url: candidate.url, reason });
      }

      if (slug === "edr3rxd1" && candidate.url.includes("B087PDLZL9")) {
        if (
          candidate.url_type === "unsafe_or_irrelevant" ||
          String(candidate.oem_or_compatible).toLowerCase().includes("aftermarket")
        ) {
          edr3_b087_present_as_aftermarket_only = true;
        } else if (candidate.oem_or_compatible === "OEM") {
          edr3_b087_excluded_as_oem = false;
          discrepancies.push("edr3rxd1: B087PDLZL9 must not be classified as OEM");
        }
      }
    }

    for (const url of packet.recommended_browser_proof_urls ?? []) {
      if (!localStrongest.includes(url)) localStrongest.push(url);
    }
    for (const url of localStrongest) {
      if (!strongest.some((s) => s.slug === slug && s.url === url)) {
        strongest.push({ slug, url });
      }
    }

    let verdict: SlugVerdictV1 = "DISCOVERY_CANDIDATES_OK";
    let reason = `proposed_state=${proposed}; discovery candidates recorded`;

    if (slug === "purepour") {
      verdict =
        proposed === "CONFLICT_REQUIRES_RECONCILIATION" ||
        packet.discovery_status === "DISCOVERY_BLOCKED"
          ? "BLOCKED_CONFLICT"
          : "DISCREPANCY_VS_BATCH_FACTORY";
      reason =
        "FPPWFU01 vs FPPWFU02 mapping unresolved — owner must resolve before any apply";
      if (bfState === "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF") {
        discrepancies.push("purepour: batch_factory still owner-browser-needed; bundle marks CONFLICT");
      }
    } else if (slug === "frig-242086201") {
      verdict = proposed === "CONFLICT_REQUIRES_RECONCILIATION" ? "BLOCKED_CONFLICT" : "DISCREPANCY_VS_BATCH_FACTORY";
      reason = "242086201 vs 242086203 / WF3CB equivalence not repo-proven";
      if (bfState === "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF") {
        discrepancies.push(
          "frig-242086201: batch_factory owner-browser-needed vs bundle CONFLICT_REQUIRES_RECONCILIATION",
        );
      }
    } else if (proposed === "CONFLICT_REQUIRES_RECONCILIATION") {
      verdict = "BLOCKED_CONFLICT";
      reason = "CONFLICT_REQUIRES_RECONCILIATION — reconciliation before apply";
    } else if (proposed === "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL") {
      verdict = "BLOCKED_LABEL_REQUIRED";
      if (slug === "da97-17376a") {
        reason = "DA97-17376A → DA97-17376B supersession label required before apply";
      } else if (slug === "frig-242017801") {
        reason = "242017801 = ULTRAWF alias/canonical decision required before apply";
      } else if (slug === "smartwater-mwfp" || slug === "mswf") {
        reason = "EOL/discontinued label handling required per bundle discontinued findings";
      } else if (slug === "wf2cb") {
        reason = "Legacy/supersession compatibility label required before apply";
      } else {
        reason = "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL before apply";
      }
    } else if (packet.discovery_status === "DISCOVERY_BLOCKED") {
      verdict = "BLOCKED_DISCOVERY";
      reason = "DISCOVERY_BLOCKED";
    } else if (proposed === "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF") {
      verdict = "DISCOVERY_CANDIDATES_OK";
      reason = "Owner browser proof required — discovery candidates only, not Verified Link";
    }

    slug_verdicts.push({
      slug,
      verdict,
      proposed_state: proposed,
      batch_factory_state: bfState,
      reason,
      strongest_owner_browser_proof_candidates: localStrongest,
      rejected_or_risky_candidates: localRejected,
    });
  }

  if (edr3Evidence?.asin === "B087PDLZL9") {
    proven_facts.push(
      "PROVEN: repo evidence data/evidence/amazon-edr3rxd1-aftermarket-pdp-evidence.2026-05-04.json lists B087PDLZL9 as aftermarket_compatible",
    );
  }
  if (edr3_b087_present_as_aftermarket_only) {
    proven_facts.push(
      "PROVEN: bundle lists B087PDLZL9 as unsafe_or_irrelevant/aftermarket_excluded — not OEM",
    );
  }
  unknown_facts.push(
    "UNKNOWN: byte_for_byte_hyperagent_export_match per provenance sidecar",
    "UNKNOWN: live retailer/manufacturer pages — not re-fetched in this validation run",
    "UNKNOWN: Amazon CAPTCHA-blocked ASINs unless repo evidence exists",
    "UNKNOWN: purepour FPPWFU01 vs FPPWFU02 owner mapping in repo",
    "UNKNOWN: frig-242086201 242086203 interchange proof in repo",
  );

  const purepour_remains_blocked = slug_verdicts.some(
    (r) => r.slug === "purepour" && r.verdict === "BLOCKED_CONFLICT",
  );
  const frig_242086201_remains_blocked = slug_verdicts.some(
    (r) => r.slug === "frig-242086201" && r.verdict === "BLOCKED_CONFLICT",
  );

  return {
    integrity,
    slug_verdicts,
    candidate_url_verdicts,
    strongest_owner_browser_proof_candidates: strongest,
    rejected_or_risky_candidates: rejected,
    edr3_b087_excluded_as_oem: edr3_b087_excluded_as_oem,
    edr3_b087_present_as_aftermarket_only,
    purepour_remains_blocked,
    frig_242086201_remains_blocked,
    discrepancies,
    unknown_facts,
    proven_facts,
  };
}

export function deriveOwnerBrowserProofValidationStatusV1(
  result: OwnerBrowserProofBatchValidationResultV1,
): "VALIDATION_PASS" | "VALIDATION_FAIL" | "VALIDATION_PARTIAL" {
  if (!result.integrity.authentic) return "VALIDATION_FAIL";
  if (!result.edr3_b087_excluded_as_oem) return "VALIDATION_FAIL";
  if (result.discrepancies.length > 0) return "VALIDATION_PARTIAL";
  if (
    result.slug_verdicts.some(
      (r) =>
        r.verdict === "BLOCKED_CONFLICT" ||
        r.verdict === "BLOCKED_LABEL_REQUIRED" ||
        r.verdict === "BLOCKED_DISCOVERY",
    )
  ) {
    return "VALIDATION_PARTIAL";
  }
  if (
    result.slug_verdicts.every(
      (r) => r.verdict === "DISCOVERY_CANDIDATES_OK" && r.proposed_state === "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF",
    )
  ) {
    return "VALIDATION_PARTIAL";
  }
  return "VALIDATION_PARTIAL";
}
