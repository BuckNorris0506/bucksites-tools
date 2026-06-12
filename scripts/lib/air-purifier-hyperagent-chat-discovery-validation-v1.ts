/**
 * Read-only mechanical validation for ap_hyperagent_chat_discovery_output_v1 packets.
 * No CSV/Supabase/evidence mutation; no Command Center lane writes.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  isManufacturerSiteSearchUrl,
  isOfficialReferencePdpUrl,
} from "@/lib/retailers/launch-buy-links";

import {
  AP_AGENT_EVIDENCE_DECISIONS_V1,
  type ApAgentEvidenceDecisionV1,
} from "./air-purifier-agent-packets-v1";
import {
  loadApOwnerReviewEvidenceIndexV1,
  type ApOwnerReviewEvidenceIndexV1,
} from "./air-purifier-owner-review-evidence-index-v1";
import { CURSOR_VALIDATION_STATUSES_V1 } from "./buckparts-ops-agent-workflow-v1";

export const AP_HYPERAGENT_CHAT_DISCOVERY_OUTPUT_CONTRACT_V1 =
  "ap_hyperagent_chat_discovery_output_v1" as const;

export const AP_HYPERAGENT_CHAT_DISCOVERY_VALIDATION_RESULT_CONTRACT_V1 =
  "ap_hyperagent_chat_discovery_validation_result_v1" as const;

export const AP_HYPERAGENT_CHAT_DISCOVERY_HOLMES_FIXTURE_REL_V1 =
  "data/air-purifier/batch-production/fixtures/ap-hyperagent-chat-discovery-holmes-hapf30-corrected-v1.json" as const;

export const AP_HYPERAGENT_DISCOVERY_STATUSES_V1 = [
  "DISCOVERY_OPEN",
  "DISCOVERY_COMPLETE",
  "DISCOVERY_BLOCKED",
] as const;

export const AP_HYPERAGENT_CHAT_DISCOVERY_PROTECTED_PATHS_V1 = [
  "data/air-purifier/retailer_links.csv",
  "data/air-purifier/filters.csv",
  "data/air-purifier/batch-production/agent-results",
] as const;

export type ApHyperagentChatDiscoveryCandidateRowV1 = {
  filter_slug: string;
  repo_csv_primary_url: string;
  searched_url: string;
  final_url: string;
  pdp_like_final_url: boolean;
  exact_tokens_seen: string[];
  wrong_family_tokens_seen: string[];
  exact_token_in_primary_slice: boolean;
  buy_action_seen: boolean | null;
  stock_state: string;
  browser_truth_classification_recommendation: string | null;
  recommendation: string;
  reference_only_reason?: string | null;
  search_placeholder_defect: boolean;
  alternate_discovery_path?: string | null;
  evidence_confidence: string;
  evidence_notes: string;
  owner_review_required: boolean;
  recommended_csv_mutation: unknown;
  prior_repo_pass_reference_url?: string | null;
};

export type ApHyperagentChatDiscoveryOutputV1 = {
  contract: string;
  packet_id: string;
  wedge: string;
  discovery_status: string;
  truth_closure_claimed: boolean;
  mutation_authorized: boolean;
  read_only: boolean;
  data_mutation: boolean;
  not_canonical_evidence: boolean;
  not_apply_eligible: boolean;
  owner_decision: string;
  candidate_rows: ApHyperagentChatDiscoveryCandidateRowV1[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type ApHyperagentChatDiscoveryMechanicalCheckSeverityV1 = "pass" | "partial" | "fail";

export type ApHyperagentChatDiscoveryMechanicalCheckV1 = {
  check_id: string;
  passed: boolean;
  severity: ApHyperagentChatDiscoveryMechanicalCheckSeverityV1;
  message: string;
};

export type ApHyperagentChatDiscoveryValidationResultV1 = {
  contract: typeof AP_HYPERAGENT_CHAT_DISCOVERY_VALIDATION_RESULT_CONTRACT_V1;
  validation_status: (typeof CURSOR_VALIDATION_STATUSES_V1)[number];
  hyperagent_contract: typeof AP_HYPERAGENT_CHAT_DISCOVERY_OUTPUT_CONTRACT_V1;
  approved_scope_slugs: string[];
  packet_scope_slugs: string[];
  findings: string[];
  mechanical_checks: ApHyperagentChatDiscoveryMechanicalCheckV1[];
  mechanical_checks_passed_count: number;
  mechanical_checks_failed_count: number;
  judgment_required: string[];
  mutation_authority_changed: false;
  read_only: true;
  data_mutation: false;
  not_canonical_evidence: true;
  not_apply_eligible: true;
};

function isPdpLikeFinalUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  if (isManufacturerSiteSearchUrl(url)) return false;
  return isOfficialReferencePdpUrl(url) || /\.html$/i.test(url) || /\/product\//i.test(url);
}

function parseCsvRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(","));
}

function loadFilterSlugsFromCsv(rootDir: string): Set<string> {
  const abs = path.join(rootDir, "data/air-purifier/filters.csv");
  if (!existsSync(abs)) return new Set();
  const rows = parseCsvRows(readFileSync(abs, "utf8"));
  const slugs = new Set<string>();
  for (let i = 1; i < rows.length; i += 1) {
    const slug = rows[i]?.[1]?.trim();
    if (slug) slugs.add(slug);
  }
  return slugs;
}

function loadPrimaryRetailerUrlBySlug(rootDir: string): Map<string, string> {
  const abs = path.join(rootDir, "data/air-purifier/retailer_links.csv");
  const bySlug = new Map<string, string>();
  if (!existsSync(abs)) return bySlug;
  const rows = parseCsvRows(readFileSync(abs, "utf8"));
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;
    const slug = row[0]?.trim();
    const isPrimary = row[3]?.trim().toLowerCase() === "true";
    const destinationUrl = row[6]?.trim();
    if (slug && isPrimary && destinationUrl) {
      bySlug.set(slug, destinationUrl);
    }
  }
  return bySlug;
}

function pushCheck(
  checks: ApHyperagentChatDiscoveryMechanicalCheckV1[],
  check: ApHyperagentChatDiscoveryMechanicalCheckV1,
): void {
  checks.push(check);
}

function addBooleanGateCheck(
  checks: ApHyperagentChatDiscoveryMechanicalCheckV1[],
  checkId: string,
  actual: unknown,
  expected: boolean,
  label: string,
): void {
  const passed = actual === expected;
  pushCheck(checks, {
    check_id: checkId,
    passed,
    severity: passed ? "pass" : "fail",
    message: passed
      ? `${label} === ${String(expected)}`
      : `${label} must be ${String(expected)} (got ${String(actual)})`,
  });
}

export function loadApHyperagentChatDiscoveryHolmesFixtureV1(
  rootDir: string,
): ApHyperagentChatDiscoveryOutputV1 {
  const abs = path.join(rootDir, AP_HYPERAGENT_CHAT_DISCOVERY_HOLMES_FIXTURE_REL_V1);
  return JSON.parse(readFileSync(abs, "utf8")) as ApHyperagentChatDiscoveryOutputV1;
}

export function deriveApHyperagentChatDiscoveryValidationStatusV1(
  checks: ApHyperagentChatDiscoveryMechanicalCheckV1[],
): (typeof CURSOR_VALIDATION_STATUSES_V1)[number] {
  const failedHard = checks.some((c) => !c.passed && c.severity === "fail");
  if (failedHard) return "VALIDATION_FAIL";
  const failedPartial = checks.some((c) => !c.passed && c.severity === "partial");
  if (failedPartial) return "VALIDATION_PARTIAL";
  return "VALIDATION_PASS";
}

function buildJudgmentRequired(args: {
  packet: ApHyperagentChatDiscoveryOutputV1;
  evidenceIndex: ApOwnerReviewEvidenceIndexV1 | null;
}): string[] {
  const items: string[] = [
    "Confirm Command Center mutation flags remain false (batch_start_authorized, csv_apply_authorized, evidence_write_authorized).",
    "Do not write data/air-purifier/batch-production/agent-results/*.results.json from validation alone.",
    "Do not create data/owner-decisions/ rows from validation alone.",
    "Chat discovery remains not canonical evidence and not apply-eligible until owner authorizes evidence write.",
  ];

  if (args.evidenceIndex) {
    for (const row of args.packet.candidate_rows) {
      const entry = args.evidenceIndex.entries_by_slug.get(row.filter_slug);
      if (entry) {
        items.push(
          `Reconcile ${row.filter_slug} with evidence disposition ${entry.disposition}: ${entry.rationale}`,
        );
      } else {
        items.push(`Reconcile ${row.filter_slug} with loadApOwnerReviewEvidenceIndexV1() — no prior entry found.`);
      }
    }
  }

  return items;
}

export function validateApHyperagentChatDiscoveryOutputV1(args: {
  packet: ApHyperagentChatDiscoveryOutputV1;
  approved_scope_slugs: string[];
  rootDir?: string;
  filter_slugs?: Set<string>;
  primary_url_by_slug?: Map<string, string>;
  evidence_index?: ApOwnerReviewEvidenceIndexV1 | null;
  include_judgment_required?: boolean;
}): ApHyperagentChatDiscoveryValidationResultV1 {
  const checks: ApHyperagentChatDiscoveryMechanicalCheckV1[] = [];
  const findings: string[] = [];
  const packet = args.packet;
  const rootDir = args.rootDir ?? process.cwd();
  const filterSlugs = args.filter_slugs ?? loadFilterSlugsFromCsv(rootDir);
  const primaryUrlBySlug = args.primary_url_by_slug ?? loadPrimaryRetailerUrlBySlug(rootDir);
  const approvedScope = args.approved_scope_slugs.map((s) => s.trim()).filter(Boolean);
  const packetScope = packet.candidate_rows.map((r) => r.filter_slug.trim());

  pushCheck(checks, {
    check_id: "contract",
    passed: packet.contract === AP_HYPERAGENT_CHAT_DISCOVERY_OUTPUT_CONTRACT_V1,
    severity: packet.contract === AP_HYPERAGENT_CHAT_DISCOVERY_OUTPUT_CONTRACT_V1 ? "pass" : "fail",
    message:
      packet.contract === AP_HYPERAGENT_CHAT_DISCOVERY_OUTPUT_CONTRACT_V1
        ? "contract === ap_hyperagent_chat_discovery_output_v1"
        : `contract must be ${AP_HYPERAGENT_CHAT_DISCOVERY_OUTPUT_CONTRACT_V1}`,
  });

  pushCheck(checks, {
    check_id: "wedge",
    passed: packet.wedge === "air_purifier",
    severity: packet.wedge === "air_purifier" ? "pass" : "fail",
    message:
      packet.wedge === "air_purifier" ? "wedge === air_purifier" : "wedge must be air_purifier",
  });

  addBooleanGateCheck(checks, "truth_closure_claimed", packet.truth_closure_claimed, false, "truth_closure_claimed");
  addBooleanGateCheck(checks, "mutation_authorized", packet.mutation_authorized, false, "mutation_authorized");
  addBooleanGateCheck(checks, "read_only", packet.read_only, true, "read_only");
  addBooleanGateCheck(checks, "data_mutation", packet.data_mutation, false, "data_mutation");
  addBooleanGateCheck(
    checks,
    "not_canonical_evidence",
    packet.not_canonical_evidence,
    true,
    "not_canonical_evidence",
  );
  addBooleanGateCheck(checks, "not_apply_eligible", packet.not_apply_eligible, true, "not_apply_eligible");

  const discoveryOk = (AP_HYPERAGENT_DISCOVERY_STATUSES_V1 as readonly string[]).includes(
    packet.discovery_status,
  );
  pushCheck(checks, {
    check_id: "discovery_status",
    passed: discoveryOk,
    severity: discoveryOk ? "pass" : "fail",
    message: discoveryOk
      ? `discovery_status=${packet.discovery_status}`
      : `discovery_status must be one of ${AP_HYPERAGENT_DISCOVERY_STATUSES_V1.join("|")}`,
  });

  const rowsNonEmpty = Array.isArray(packet.candidate_rows) && packet.candidate_rows.length > 0;
  pushCheck(checks, {
    check_id: "candidate_rows_nonempty",
    passed: rowsNonEmpty,
    severity: rowsNonEmpty ? "pass" : "fail",
    message: rowsNonEmpty ? "candidate_rows is non-empty" : "candidate_rows must be non-empty",
  });

  for (const arrayName of ["proven_facts", "inferred_facts", "unknown_facts"] as const) {
    const value = packet[arrayName];
    const ok = Array.isArray(value);
    pushCheck(checks, {
      check_id: `packet_${arrayName}`,
      passed: ok,
      severity: ok ? "pass" : "fail",
      message: ok ? `${arrayName} is an array` : `${arrayName} must be an array`,
    });
  }

  const approvedSet = new Set(approvedScope);
  const scopeExact =
    packetScope.length === approvedScope.length &&
    packetScope.every((slug) => approvedSet.has(slug)) &&
    approvedScope.every((slug) => packetScope.includes(slug));
  pushCheck(checks, {
    check_id: "approved_scope_slugs",
    passed: scopeExact,
    severity: scopeExact ? "pass" : "fail",
    message: scopeExact
      ? `packet scope matches approved scope: ${approvedScope.join(", ")}`
      : `packet scope [${packetScope.join(", ")}] must match approved scope [${approvedScope.join(", ")}]`,
  });

  for (const row of packet.candidate_rows) {
    const slug = row.filter_slug.trim();
    const slugPrefix = `row:${slug}`;

    const slugInCatalog = filterSlugs.has(slug);
    pushCheck(checks, {
      check_id: `${slugPrefix}:filter_slug_in_catalog`,
      passed: slugInCatalog,
      severity: slugInCatalog ? "pass" : "fail",
      message: slugInCatalog
        ? `${slug} exists in data/air-purifier/filters.csv`
        : `${slug} missing from data/air-purifier/filters.csv`,
    });

    const repoPrimary = primaryUrlBySlug.get(slug);
    const repoUrlMatches =
      !!repoPrimary && row.repo_csv_primary_url.trim() === repoPrimary.trim();
    pushCheck(checks, {
      check_id: `${slugPrefix}:repo_csv_primary_url`,
      passed: repoUrlMatches,
      severity: repoUrlMatches ? "pass" : "fail",
      message: repoUrlMatches
        ? `repo_csv_primary_url matches committed primary retailer_links row`
        : `repo_csv_primary_url must match retailer_links.csv primary (${repoPrimary ?? "missing"})`,
    });

    const recommendation = row.recommendation.trim() as ApAgentEvidenceDecisionV1;
    const recommendationOk = (AP_AGENT_EVIDENCE_DECISIONS_V1 as readonly string[]).includes(
      recommendation,
    );
    pushCheck(checks, {
      check_id: `${slugPrefix}:recommendation_enum`,
      passed: recommendationOk,
      severity: recommendationOk ? "pass" : "fail",
      message: recommendationOk
        ? `recommendation=${recommendation}`
        : `recommendation must be in AP_AGENT_EVIDENCE_DECISIONS_V1`,
    });

    const mutationNull = row.recommended_csv_mutation == null;
    pushCheck(checks, {
      check_id: `${slugPrefix}:recommended_csv_mutation_null`,
      passed: mutationNull,
      severity: mutationNull ? "pass" : "fail",
      message: mutationNull
        ? "recommended_csv_mutation === null"
        : "recommended_csv_mutation must be null for chat-only discovery",
    });

    if (recommendation === "PASS_DIRECT_BUYABLE") {
      const buyOk = row.buy_action_seen === true;
      pushCheck(checks, {
        check_id: `${slugPrefix}:pass_direct_buyable_buy_action`,
        passed: buyOk,
        severity: buyOk ? "pass" : "fail",
        message: buyOk
          ? "PASS_DIRECT_BUYABLE has buy_action_seen === true"
          : "PASS_DIRECT_BUYABLE requires buy_action_seen === true",
      });
      const tokenOk = row.exact_token_in_primary_slice === true;
      pushCheck(checks, {
        check_id: `${slugPrefix}:pass_direct_buyable_exact_token`,
        passed: tokenOk,
        severity: tokenOk ? "pass" : "fail",
        message: tokenOk
          ? "PASS_DIRECT_BUYABLE has exact_token_in_primary_slice === true"
          : "PASS_DIRECT_BUYABLE requires exact_token_in_primary_slice === true",
      });
    }

    if (recommendation === "PASS_REFERENCE") {
      const pdpOk = row.pdp_like_final_url === true;
      pushCheck(checks, {
        check_id: `${slugPrefix}:pass_reference_pdp_like`,
        passed: pdpOk,
        severity: pdpOk ? "pass" : "fail",
        message: pdpOk
          ? "PASS_REFERENCE has pdp_like_final_url === true"
          : "PASS_REFERENCE requires pdp_like_final_url === true",
      });
      const reasonOk = !!row.reference_only_reason?.trim();
      pushCheck(checks, {
        check_id: `${slugPrefix}:pass_reference_reason`,
        passed: reasonOk,
        severity: reasonOk ? "pass" : "fail",
        message: reasonOk
          ? "PASS_REFERENCE has reference_only_reason"
          : "PASS_REFERENCE requires reference_only_reason",
      });
      const finalNotSearchPlaceholder =
        row.final_url.trim() !== row.repo_csv_primary_url.trim() ||
        !isManufacturerSiteSearchUrl(row.final_url);
      pushCheck(checks, {
        check_id: `${slugPrefix}:pass_reference_final_url_not_search_placeholder`,
        passed: finalNotSearchPlaceholder,
        severity: finalNotSearchPlaceholder ? "pass" : "partial",
        message: finalNotSearchPlaceholder
          ? "PASS_REFERENCE final_url is the inspected PDP (not CSV search placeholder)"
          : "PASS_REFERENCE should set final_url to inspected PDP, not CSV search placeholder",
      });
    }

    const pdpOpenedButRejectSearch =
      row.pdp_like_final_url === true && recommendation === "REJECT_SEARCH_CATEGORY";
    pushCheck(checks, {
      check_id: `${slugPrefix}:reject_search_not_with_pdp_like_true`,
      passed: !pdpOpenedButRejectSearch,
      severity: pdpOpenedButRejectSearch ? "partial" : "pass",
      message: pdpOpenedButRejectSearch
        ? "REJECT_SEARCH_CATEGORY must not be used when pdp_like_final_url === true"
        : "recommendation is not REJECT_SEARCH_CATEGORY with pdp_like_final_url true",
    });

    const finalUrlLooksLikePdp = isPdpLikeFinalUrl(row.final_url);
    const rejectOnPdpUrl = recommendation === "REJECT_SEARCH_CATEGORY" && finalUrlLooksLikePdp;
    pushCheck(checks, {
      check_id: `${slugPrefix}:reject_search_not_on_pdp_final_url`,
      passed: !rejectOnPdpUrl,
      severity: rejectOnPdpUrl ? "partial" : "pass",
      message: rejectOnPdpUrl
        ? "REJECT_SEARCH_CATEGORY must not be used when final_url is PDP-like"
        : "REJECT_SEARCH_CATEGORY not paired with PDP-like final_url",
    });

    const searchFinalWithPdpClaim =
      row.pdp_like_final_url === true &&
      isManufacturerSiteSearchUrl(row.final_url) &&
      recommendation !== "NO_SAFE_PATH";
    pushCheck(checks, {
      check_id: `${slugPrefix}:pdp_like_not_on_search_final_url`,
      passed: !searchFinalWithPdpClaim,
      severity: searchFinalWithPdpClaim ? "partial" : "pass",
      message: searchFinalWithPdpClaim
        ? "pdp_like_final_url true conflicts with search/category final_url"
        : "pdp_like_final_url aligns with final_url shape",
    });
  }

  const validation_status = deriveApHyperagentChatDiscoveryValidationStatusV1(checks);
  const mechanical_checks_passed_count = checks.filter((c) => c.passed).length;
  const mechanical_checks_failed_count = checks.filter((c) => !c.passed).length;

  for (const check of checks.filter((c) => !c.passed)) {
    findings.push(`${check.severity.toUpperCase()}: ${check.check_id} — ${check.message}`);
  }
  if (validation_status === "VALIDATION_PASS") {
    findings.push("PROVEN: mechanical validation checks passed for approved scope.");
  }

  const evidenceIndex =
    args.evidence_index === undefined && args.include_judgment_required !== false
      ? loadApOwnerReviewEvidenceIndexV1({ rootDir })
      : (args.evidence_index ?? null);

  const judgment_required =
    args.include_judgment_required === false
      ? []
      : buildJudgmentRequired({ packet, evidenceIndex });

  return {
    contract: AP_HYPERAGENT_CHAT_DISCOVERY_VALIDATION_RESULT_CONTRACT_V1,
    validation_status,
    hyperagent_contract: AP_HYPERAGENT_CHAT_DISCOVERY_OUTPUT_CONTRACT_V1,
    approved_scope_slugs: approvedScope,
    packet_scope_slugs: packetScope,
    findings,
    mechanical_checks: checks,
    mechanical_checks_passed_count,
    mechanical_checks_failed_count,
    judgment_required,
    mutation_authority_changed: false,
    read_only: true,
    data_mutation: false,
    not_canonical_evidence: true,
    not_apply_eligible: true,
  };
}

export function parseApHyperagentChatDiscoveryValidationCliArgsV1(argv: string[]): {
  packetPath: string | null;
  approvedScopeSlugs: string[] | null;
} {
  const packetArg = argv.find((a) => a.startsWith("--packet="))?.slice("--packet=".length) ?? null;
  const scopeArg = argv.find((a) => a.startsWith("--scope="))?.slice("--scope=".length) ?? null;
  const approvedScopeSlugs = scopeArg
    ? scopeArg
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : null;
  return { packetPath: packetArg, approvedScopeSlugs };
}
