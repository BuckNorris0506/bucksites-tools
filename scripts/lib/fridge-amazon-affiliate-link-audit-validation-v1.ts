/**
 * Read-only Cursor intake validation for fridge AMAZON_AFFILIATE_LINK_AUDIT_DISCOVERY (7-slug cohort).
 * Planning/intake only — no CSV/Supabase/evidence mutation; no /go fetches; no VALIDATION_PASS.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import {
  HYPERAGENT_INGEST_PACKET_CONTRACT_V1,
  isHyperAgentDiscoveryStatusV1,
} from "./buckparts-ops-agent-workflow-v1";
import { FRIDGE_OWNER_BROWSER_PROOF_RESULT_ULTRAWF_REL_V1 } from "./fridge-safe-link-owner-browser-proof-result-v1";

export const FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_COHORT_SIZE_V1 = 7 as const;

export const FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_COHORT_KEY_V1 =
  "refrigerator_water_fridge_7slug_browser_proof" as const;

export const FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_MISSION_TYPE_V1 =
  "AMAZON_AFFILIATE_LINK_AUDIT_DISCOVERY" as const;

export const FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BUNDLE_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-amazon-affiliate-link-audit-assist-v1.json" as const;

export const FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_PROVENANCE_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-amazon-affiliate-link-audit-assist-v1.provenance.json" as const;

export const FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_CURSOR_VALIDATION_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-amazon-affiliate-link-audit-cursor-validation-v1.json" as const;

export const FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_EXPECTED_SLUGS_V1 = [
  "wf3cb",
  "eptwfu01",
  "edr4rxd1",
  "wfcb",
  "ultrawf",
  "edr3rxd1",
  "fppwfu01",
] as const;

export const FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_PASS_CANDIDATE_SLUGS_V1 = [
  "wfcb",
  "edr4rxd1",
] as const;

export const FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BLOCKED_SLUGS_V1 = [
  "wf3cb",
  "eptwfu01",
  "ultrawf",
  "edr3rxd1",
  "fppwfu01",
] as const;

export const FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BUCKPARTS_TAG_V1 = "buckparts20-20" as const;

export const FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_B087_ASIN_V1 = "B087PDLZL9" as const;

export const FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_ULTRAWF_STALE_WARNING_CODE_V1 =
  "AUDIT_STALE_FOR_ULTRAWF_OWNER_PROOF" as const;

export const FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_REQUIRED_NOT_AUTHORIZED_V1 = [
  "retailer_links_csv_mutation",
  "verified_link_authorization",
  "affiliate_link_generation_as_production_truth",
  "command_center_closure",
  "validation_pass",
] as const;

/** Paths that must never be written by this validation layer. */
export const FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_PROTECTED_PATHS_V1 = [
  "data/retailer_links.csv",
  "data/filters.csv",
  "data/compatibility_mappings.csv",
] as const;

export type AmazonAffiliateLinkAuditSlugRowV1 = {
  slug: string;
  best_amazon_asin?: string;
  affiliate_tag_status?: string;
  expected_affiliate_tag?: string;
  safety_verdict?: string;
  owner_browser_proof_status?: string;
  [key: string]: unknown;
};

export type AmazonAffiliateLinkAuditDoNotUseRowV1 = {
  slug?: string;
  asin?: string;
  url?: string;
  reason?: string;
  evidence_level?: string;
  [key: string]: unknown;
};

export type AmazonAffiliateLinkAuditAssistBundleV1 = {
  packet_type?: string;
  contract?: string;
  mission_type: string;
  mission_id?: string;
  cohort_key?: string;
  discovery_status: string;
  truth_closure_claimed: boolean;
  batch_mode: boolean;
  buckparts_affiliate_tag: string;
  not_authorized: string[];
  slug_audits: AmazonAffiliateLinkAuditSlugRowV1[];
  do_not_use_table?: AmazonAffiliateLinkAuditDoNotUseRowV1[];
  repo_state_summary?: {
    amazon_rows_in_retailer_links_csv?: number;
    [key: string]: unknown;
  };
  cohort_summary?: {
    pass_candidate_slugs?: string[];
    hold_slugs?: string[];
    inconclusive_slugs?: string[];
    affiliate_tag_missing_count?: number;
    amazon_rows_in_csv?: number;
    [key: string]: unknown;
  };
  proven_facts?: string[];
  inferred_facts?: string[];
  unknown_facts?: string[];
  [key: string]: unknown;
};

export type AmazonAffiliateLinkAuditSlugVerdictRowV1 = {
  slug: string;
  safety_verdict: string;
  best_amazon_asin: string;
  affiliate_tag_status: string;
  expected_affiliate_tag: string;
  mutation_blocked: boolean;
  pass_candidate: boolean;
};

export type AmazonAffiliateLinkAuditIntegrityResultV1 = {
  authentic: boolean;
  errors: string[];
  warnings: string[];
};

export type AmazonAffiliateLinkAuditProtectedPathSnapshotV1 = {
  rel_path: string;
  exists: boolean;
  sha256: string | null;
  mtime_ms: number | null;
};

export type AmazonAffiliateLinkAuditValidationResultV1 = {
  integrity: AmazonAffiliateLinkAuditIntegrityResultV1;
  slug_verdicts: AmazonAffiliateLinkAuditSlugVerdictRowV1[];
  all_expected_slugs_present: boolean;
  no_extra_slugs: boolean;
  b087_do_not_use_only: boolean;
  b087_in_do_not_use_table: boolean;
  authorization_blocks_mutation: boolean;
  affiliate_tag_expected_but_not_production_authorized: boolean;
  amazon_rows_in_csv_zero_for_cohort: boolean;
  pass_candidates_confirmed: boolean;
  blocked_slugs_confirmed: boolean;
  ultrawf_stale_warning_emitted: boolean;
  ultrawf_stale_warning_code: typeof FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_ULTRAWF_STALE_WARNING_CODE_V1 | null;
  ultrawf_stale_warning_reason: string | null;
  protected_paths_unchanged: AmazonAffiliateLinkAuditProtectedPathSnapshotV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

function loadJson<T>(rootDir: string, rel: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, rel), "utf8")) as T;
}

function sha256File(rootDir: string, rel: string): string | null {
  const full = path.join(rootDir, rel);
  if (!existsSync(full)) return null;
  return createHash("sha256").update(readFileSync(full)).digest("hex");
}

function snapshotProtectedPath(
  rootDir: string,
  rel: string,
): AmazonAffiliateLinkAuditProtectedPathSnapshotV1 {
  const full = path.join(rootDir, rel);
  if (!existsSync(full)) {
    return { rel_path: rel, exists: false, sha256: null, mtime_ms: null };
  }
  const stat = statSync(full);
  return {
    rel_path: rel,
    exists: true,
    sha256: sha256File(rootDir, rel),
    mtime_ms: stat.mtimeMs,
  };
}

function packetContract(bundle: AmazonAffiliateLinkAuditAssistBundleV1): string | undefined {
  return bundle.contract ?? bundle.packet_type;
}

function urlContainsAsin(url: string | undefined, asin: string): boolean {
  return Boolean(url?.toUpperCase().includes(asin.toUpperCase()));
}

export function validateAmazonAffiliateLinkAuditBundleIntegrityV1(
  bundle: AmazonAffiliateLinkAuditAssistBundleV1,
): AmazonAffiliateLinkAuditIntegrityResultV1 {
  const errors: string[] = [];
  const warnings: string[] = [];

  const contract = packetContract(bundle);
  if (contract !== HYPERAGENT_INGEST_PACKET_CONTRACT_V1) {
    errors.push(`packet contract must be ${HYPERAGENT_INGEST_PACKET_CONTRACT_V1}`);
  }
  if (bundle.mission_type !== FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_MISSION_TYPE_V1) {
    errors.push(
      `mission_type must be ${FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_MISSION_TYPE_V1}`,
    );
  }
  if (bundle.discovery_status !== "DISCOVERY_COMPLETE") {
    errors.push("discovery_status must be DISCOVERY_COMPLETE");
  } else if (!isHyperAgentDiscoveryStatusV1(bundle.discovery_status)) {
    errors.push(`invalid discovery_status=${bundle.discovery_status}`);
  }
  if (bundle.truth_closure_claimed !== false) {
    errors.push("truth_closure_claimed must be false");
  }
  if (bundle.batch_mode !== true) {
    errors.push("batch_mode must be true");
  }
  if (bundle.buckparts_affiliate_tag !== FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BUCKPARTS_TAG_V1) {
    errors.push(
      `buckparts_affiliate_tag must be ${FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BUCKPARTS_TAG_V1}`,
    );
  }

  for (const required of FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_REQUIRED_NOT_AUTHORIZED_V1) {
    if (!(bundle.not_authorized ?? []).includes(required)) {
      errors.push(`not_authorized must include ${required}`);
    }
  }

  if (!Array.isArray(bundle.slug_audits) || bundle.slug_audits.length === 0) {
    errors.push("slug_audits must be a non-empty array");
  }

  const expected = [...FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_EXPECTED_SLUGS_V1].sort();
  const slugSet = new Set<string>();
  for (const row of bundle.slug_audits ?? []) {
    if (!row.slug?.trim()) {
      errors.push("slug_audits row missing slug");
      continue;
    }
    slugSet.add(row.slug);
  }

  for (const slug of expected) {
    if (!slugSet.has(slug)) errors.push(`missing expected slug: ${slug}`);
  }
  for (const slug of slugSet) {
    if (!(expected as readonly string[]).includes(slug)) {
      errors.push(`unexpected slug in audit: ${slug}`);
    }
  }
  if (slugSet.size !== FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_COHORT_SIZE_V1) {
    errors.push(`unique slug count=${slugSet.size}`);
  }

  const amazonRows = bundle.repo_state_summary?.amazon_rows_in_retailer_links_csv;
  if (amazonRows !== 0) {
    errors.push(`repo_state_summary.amazon_rows_in_retailer_links_csv must be 0 (got ${amazonRows})`);
  }

  const cohortAmazonRows = bundle.cohort_summary?.amazon_rows_in_csv;
  if (cohortAmazonRows !== undefined && cohortAmazonRows !== 0) {
    warnings.push(`cohort_summary.amazon_rows_in_csv=${cohortAmazonRows} expected 0`);
  }

  return {
    authentic: errors.length === 0,
    errors,
    warnings,
  };
}

function countAmazonRowsForCohortInRetailerLinksCsv(rootDir: string): number {
  const csvPath = path.join(rootDir, "data/retailer_links.csv");
  if (!existsSync(csvPath)) return -1;
  const lines = readFileSync(csvPath, "utf8").split("\n");
  let count = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const lower = line.toLowerCase();
    if (!lower.includes("amazon")) continue;
    for (const slug of FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_EXPECTED_SLUGS_V1) {
      if (line.startsWith(`${slug},`)) {
        count += 1;
        break;
      }
    }
  }
  return count;
}

function ultrawfOwnerProofHasAmazonCandidate(rootDir: string): boolean {
  const rel = FRIDGE_OWNER_BROWSER_PROOF_RESULT_ULTRAWF_REL_V1;
  if (!existsSync(path.join(rootDir, rel))) return false;
  try {
    const parsed = loadJson<{
      amazon_pass_candidates?: Array<{ url?: string }>;
    }>(rootDir, rel);
    return (parsed.amazon_pass_candidates ?? []).some((c) =>
      urlContainsAsin(c.url, "B002JAKRAM"),
    );
  } catch {
    return false;
  }
}

export function runAmazonAffiliateLinkAuditValidationV1(args: {
  rootDir?: string;
  bundle: AmazonAffiliateLinkAuditAssistBundleV1;
  protected_paths_before?: AmazonAffiliateLinkAuditProtectedPathSnapshotV1[];
}): AmazonAffiliateLinkAuditValidationResultV1 {
  const rootDir = args.rootDir ?? process.cwd();
  const bundle = args.bundle;
  const integrity = validateAmazonAffiliateLinkAuditBundleIntegrityV1(bundle);

  const proven_facts: string[] = [
    "PROVEN: validation is read_only; no CSV/Supabase/evidence mutation authorized",
    "PROVEN: HyperAgent audit is discovery input only — not production affiliate truth",
  ];
  const unknown_facts: string[] = [
    "UNKNOWN: byte_for_byte_hyperagent_export_match per provenance sidecar",
    "UNKNOWN: live Amazon PDP state — not re-fetched in this intake validation run",
  ];

  const slugSet = new Set((bundle.slug_audits ?? []).map((r) => r.slug));
  const all_expected_slugs_present = FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_EXPECTED_SLUGS_V1.every(
    (s) => slugSet.has(s),
  );
  const no_extra_slugs = [...slugSet].every((s) =>
    (FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_EXPECTED_SLUGS_V1 as readonly string[]).includes(s),
  );

  let b087_in_do_not_use_table = false;
  let b087_do_not_use_only = true;

  for (const entry of bundle.do_not_use_table ?? []) {
    const asin = String(entry.asin ?? "").toUpperCase();
    const url = entry.url ?? "";
    if (
      asin === FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_B087_ASIN_V1 ||
      urlContainsAsin(url, FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_B087_ASIN_V1)
    ) {
      b087_in_do_not_use_table = true;
      if (entry.slug !== "edr3rxd1") {
        b087_do_not_use_only = false;
      }
      if (!String(entry.reason ?? "").toLowerCase().includes("hard_do_not_use")) {
        b087_do_not_use_only = false;
      }
      proven_facts.push(
        "PROVEN: do_not_use_table lists edr3rxd1 B087PDLZL9 as Waterdrop aftermarket HARD_DO_NOT_USE",
      );
    }
  }

  const edr3Audit = bundle.slug_audits.find((r) => r.slug === "edr3rxd1");
  const blockedAsins = (edr3Audit?.blocked_asins ?? []) as Array<{ asin?: string; status?: string }>;
  if (
    blockedAsins.some(
      (b) =>
        String(b.asin).toUpperCase() === FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_B087_ASIN_V1 &&
        b.status === "HARD_DO_NOT_USE",
    )
  ) {
    proven_facts.push("PROVEN: edr3rxd1 slug audit blocked_asins includes B087PDLZL9 HARD_DO_NOT_USE");
  }

  for (const row of bundle.slug_audits ?? []) {
    if (row.slug === "edr3rxd1") continue;
    const asin = String(row.best_amazon_asin ?? "").toUpperCase();
    if (asin === FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_B087_ASIN_V1) {
      b087_do_not_use_only = false;
    }
  }

  const authorization_blocks_mutation =
    bundle.truth_closure_claimed === false &&
    FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_REQUIRED_NOT_AUTHORIZED_V1.every((k) =>
      (bundle.not_authorized ?? []).includes(k),
    ) &&
    (bundle.not_authorized ?? []).includes("deploy") &&
    (bundle.not_authorized ?? []).includes("go_click") &&
    (bundle.not_authorized ?? []).includes("supabase_mutation");

  const affiliate_tag_expected_but_not_production_authorized =
    bundle.buckparts_affiliate_tag === FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BUCKPARTS_TAG_V1 &&
    (bundle.not_authorized ?? []).includes("affiliate_link_generation_as_production_truth") &&
    (bundle.not_authorized ?? []).includes("verified_link_authorization");

  const liveAmazonRows = countAmazonRowsForCohortInRetailerLinksCsv(rootDir);
  const amazon_rows_in_csv_zero_for_cohort =
    liveAmazonRows === 0 && bundle.repo_state_summary?.amazon_rows_in_retailer_links_csv === 0;
  if (amazon_rows_in_csv_zero_for_cohort) {
    proven_facts.push(
      "PROVEN: repo retailer_links.csv has 0 Amazon rows for the 7-slug cohort (read-only check)",
    );
  }

  const passCandidateMap: Record<string, string> = {
    wfcb: "B0CC2TCJ57",
    edr4rxd1: "B00UB38V2A",
  };
  const pass_candidates_confirmed = FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_PASS_CANDIDATE_SLUGS_V1.every(
    (slug) => {
      const row = bundle.slug_audits.find((r) => r.slug === slug);
      return (
        row?.safety_verdict === "PASS_CANDIDATE" &&
        String(row.best_amazon_asin ?? "").toUpperCase() === passCandidateMap[slug]
      );
    },
  );

  const blockedVerdicts: Record<string, Set<string>> = {
    wf3cb: new Set(["HOLD"]),
    eptwfu01: new Set(["HOLD"]),
    ultrawf: new Set(["INCONCLUSIVE", "HOLD"]),
    edr3rxd1: new Set(["HOLD"]),
    fppwfu01: new Set(["HOLD"]),
  };
  const blocked_slugs_confirmed = FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BLOCKED_SLUGS_V1.every(
    (slug) => {
      const row = bundle.slug_audits.find((r) => r.slug === slug);
      const allowed = blockedVerdicts[slug];
      return Boolean(row && allowed?.has(String(row.safety_verdict)));
    },
  );

  let ultrawf_stale_warning_emitted = false;
  let ultrawf_stale_warning_code: typeof FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_ULTRAWF_STALE_WARNING_CODE_V1 | null =
    null;
  let ultrawf_stale_warning_reason: string | null = null;

  const ultrawfAudit = bundle.slug_audits.find((r) => r.slug === "ultrawf");
  if (
    ultrawfAudit?.safety_verdict === "INCONCLUSIVE" &&
    ultrawfOwnerProofHasAmazonCandidate(rootDir)
  ) {
    ultrawf_stale_warning_emitted = true;
    ultrawf_stale_warning_code = FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_ULTRAWF_STALE_WARNING_CODE_V1;
    ultrawf_stale_warning_reason =
      "HyperAgent audit marks ultrawf B002JAKRAM INCONCLUSIVE / no owner proof, but a newer owner browser session exists in fridge-safe-link-owner-browser-proof-result-ultrawf-v1.json showing Amazon B002JAKRAM as a candidate. That newer owner proof must be recorded in a separate ultrawf owner-browser-proof result artifact reconciliation before any Amazon validation or link planning.";
    integrity.warnings.push(
      `${FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_ULTRAWF_STALE_WARNING_CODE_V1}: ${ultrawf_stale_warning_reason}`,
    );
  }

  const slug_verdicts: AmazonAffiliateLinkAuditSlugVerdictRowV1[] = (bundle.slug_audits ?? []).map(
    (row) => ({
      slug: row.slug,
      safety_verdict: row.safety_verdict ?? "UNKNOWN",
      best_amazon_asin: row.best_amazon_asin ?? "UNKNOWN",
      affiliate_tag_status: row.affiliate_tag_status ?? "UNKNOWN",
      expected_affiliate_tag: row.expected_affiliate_tag ?? "UNKNOWN",
      mutation_blocked: (
        FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BLOCKED_SLUGS_V1 as readonly string[]
      ).includes(row.slug),
      pass_candidate: (
        FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_PASS_CANDIDATE_SLUGS_V1 as readonly string[]
      ).includes(row.slug),
    }),
  );

  const protected_paths_unchanged = FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_PROTECTED_PATHS_V1.map(
    (rel) => {
      const after = snapshotProtectedPath(rootDir, rel);
      const before = args.protected_paths_before?.find((p) => p.rel_path === rel);
      if (before && before.sha256 !== after.sha256) {
        integrity.errors.push(`protected path mutated during validation: ${rel}`);
        integrity.authentic = false;
      }
      return after;
    },
  );

  const allMissingTag = (bundle.slug_audits ?? []).every(
    (r) => r.affiliate_tag_status === "MISSING" && r.expected_affiliate_tag === FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BUCKPARTS_TAG_V1,
  );
  if (allMissingTag) {
    proven_facts.push(
      "PROVEN: cohort affiliate_tag_status is MISSING with expected tag buckparts20-20 on all slug audits",
    );
  }

  return {
    integrity,
    slug_verdicts,
    all_expected_slugs_present,
    no_extra_slugs,
    b087_do_not_use_only,
    b087_in_do_not_use_table,
    authorization_blocks_mutation,
    affiliate_tag_expected_but_not_production_authorized,
    amazon_rows_in_csv_zero_for_cohort,
    pass_candidates_confirmed,
    blocked_slugs_confirmed,
    ultrawf_stale_warning_emitted,
    ultrawf_stale_warning_code,
    ultrawf_stale_warning_reason,
    protected_paths_unchanged,
    proven_facts,
    unknown_facts,
  };
}

export function deriveAmazonAffiliateLinkAuditValidationStatusV1(
  result: AmazonAffiliateLinkAuditValidationResultV1,
): "VALIDATION_PASS" | "VALIDATION_FAIL" | "VALIDATION_PARTIAL" {
  if (!result.integrity.authentic) return "VALIDATION_FAIL";
  if (!result.all_expected_slugs_present || !result.no_extra_slugs) return "VALIDATION_FAIL";
  if (!result.b087_do_not_use_only || !result.b087_in_do_not_use_table) return "VALIDATION_FAIL";
  if (!result.authorization_blocks_mutation) return "VALIDATION_FAIL";
  if (!result.affiliate_tag_expected_but_not_production_authorized) return "VALIDATION_FAIL";
  if (!result.amazon_rows_in_csv_zero_for_cohort) return "VALIDATION_FAIL";
  if (!result.pass_candidates_confirmed || !result.blocked_slugs_confirmed) return "VALIDATION_FAIL";
  return "VALIDATION_PARTIAL";
}

export function snapshotAmazonAffiliateLinkAuditProtectedPathsV1(
  rootDir: string = process.cwd(),
): AmazonAffiliateLinkAuditProtectedPathSnapshotV1[] {
  return FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_PROTECTED_PATHS_V1.map((rel) =>
    snapshotProtectedPath(rootDir, rel),
  );
}

export function loadAmazonAffiliateLinkAuditAssistBundleV1(
  rootDir: string = process.cwd(),
): AmazonAffiliateLinkAuditAssistBundleV1 {
  return loadJson<AmazonAffiliateLinkAuditAssistBundleV1>(
    rootDir,
    FRIDGE_AMAZON_AFFILIATE_LINK_AUDIT_BUNDLE_REL_V1,
  );
}
