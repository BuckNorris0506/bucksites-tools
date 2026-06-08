/**
 * Read-only EDR4RXD1 owner review packet — classifies HyperAgent batch rows for owner action.
 * Does not mutate compat, manual evidence, Supabase, sitemap, robots, pages, retailer links, or HQ handoff.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { CURSOR_VALIDATION_PACKET_CONTRACT_V1 } from "./buckparts-ops-agent-workflow-v1";
import {
  FAMILY_RECONCILIATION_CONTRACT_V1,
  FAMILY_RECONCILIATION_JSON_REL_V1,
  type FamilyReconciliationV1,
  type ReconciliationSeverityV1,
} from "./family-reconciliation-v1";
import {
  LEARNED_FAILURE_GUARDS_CONTRACT_V1,
  LEARNED_FAILURE_GUARDS_JSON_REL_V1,
  type LearnedFailureGuardsReportV1,
} from "./learned-failure-guards-v1";
import {
  MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
  MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  type ModelFilterCorrectnessAuditV1,
} from "./model-filter-correctness-audit-v1";

export const EDR4RXD1_OWNER_REVIEW_PACKET_CONTRACT_V1 =
  "edr4rxd1_owner_review_packet_v1" as const;

export const EDR4RXD1_FAMILY_KEY_V1 = "filter::whirlpool::edr4rxd1" as const;

export const EDR4RXD1_CURSOR_VALIDATION_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/edr4rxd1-evidence-batch-cursor-validation-v1.json" as const;

export const EDR4RXD1_OWNER_REVIEW_PACKET_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/edr4rxd1-owner-review-packet-v1.json" as const;

export const EDR4RXD1_OWNER_REVIEW_PACKET_MD_REL_V1 =
  "data/fridge/batch-production/drafts/edr4rxd1-owner-review-packet-v1.md" as const;

export const EDR4RXD1_OWNER_REVIEW_PACKET_SOURCE_COMMAND_V1 =
  "npm run buckparts:edr4rxd1-owner-review-packet" as const;

const COMPATIBILITY_MAPPINGS_CSV_REL_V1 = "data/compatibility_mappings.csv" as const;
const MANUAL_EVIDENCE_DIR_REL_V1 = "data/manual-evidence/refrigerator" as const;

export type Edr4rxd1OwnerReviewSlugRowV1 = {
  fridge_slug: string;
  hyperagent_claim: string;
  cursor_row_state: string;
  cursor_verdict: string;
  repo_classification: string;
  repo_learned_failure_aggregate: string;
  repo_compat_maps_edr4rxd1: boolean;
  repo_manual_evidence_path: string | null;
  mapped_filter_slugs: string[];
  reason: string;
  recommended_owner_action: string;
  mutation_authorized: false;
};

export type Edr4rxd1OwnerReviewNoActionRowV1 = Edr4rxd1OwnerReviewSlugRowV1 & {
  rejection_kind:
    | "HYPERAGENT_PROVEN_REJECTED"
    | "HYPERAGENT_WRONG_PART_NOT_REPO_CLOSURE"
    | "HYPERAGENT_WRONG_PART_UNKNOWN_SUPPORT";
};

export type Edr4rxd1OwnerReviewPacketV1 = {
  contract: typeof EDR4RXD1_OWNER_REVIEW_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  source_command: typeof EDR4RXD1_OWNER_REVIEW_PACKET_SOURCE_COMMAND_V1;
  validation_status: string;
  family_key: typeof EDR4RXD1_FAMILY_KEY_V1;
  family_reconciliation_severity: ReconciliationSeverityV1;
  safe_for_scaling: false;
  safe_for_bounded_research: true;
  owner_review_required: true;
  command_center_action_scope: "BOUNDED_RESEARCH_ONLY";
  evidence_promotion_candidates: Edr4rxd1OwnerReviewSlugRowV1[];
  browser_proof_targets: Edr4rxd1OwnerReviewSlugRowV1[];
  compat_review_candidates: Edr4rxd1OwnerReviewSlugRowV1[];
  no_action_rows: Edr4rxd1OwnerReviewNoActionRowV1[];
  owner_checklist: string[];
  exact_repo_paths_read: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

type CursorValidationRowV1 = {
  fridge_slug: string;
  hyperagent_claim: string;
  repo_classification: string;
  repo_evidence_status?: string;
  repo_manual_evidence_path: string | null;
  repo_learned_failure_aggregate: string;
  repo_compat_maps_edr4rxd1: boolean;
  cursor_row_state: string;
  cursor_verdict: string;
  provenance: string;
  reason: string;
};

type CursorValidationPacketV1 = {
  contract: string;
  validation_status: string;
  validation_details: {
    family_key: string;
    row_verdicts: CursorValidationRowV1[];
  };
  proven_facts?: string[];
  inferred_facts?: string[];
  unknown_facts?: string[];
};

function readJsonFile<T>(rootDir: string, rel: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, rel), "utf8")) as T;
}

function readCompatMappings(rootDir: string): Map<string, string[]> {
  const abs = path.join(rootDir, COMPATIBILITY_MAPPINGS_CSV_REL_V1);
  const rows = parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ fridge_slug?: string; filter_slug?: string }>;

  const bySlug = new Map<string, string[]>();
  for (const row of rows) {
    const slug = row.fridge_slug?.trim();
    const filter = row.filter_slug?.trim();
    if (!slug || !filter) continue;
    const existing = bySlug.get(slug) ?? [];
    existing.push(filter);
    bySlug.set(slug, existing);
  }
  return bySlug;
}

function listManualEvidencePaths(rootDir: string): string[] {
  const abs = path.join(rootDir, MANUAL_EVIDENCE_DIR_REL_V1);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((name) => name.endsWith(".json"))
    .map((name) => `${MANUAL_EVIDENCE_DIR_REL_V1}/${name}`)
    .sort();
}

function rejectionKindForRow(row: CursorValidationRowV1): Edr4rxd1OwnerReviewNoActionRowV1["rejection_kind"] {
  if (row.cursor_verdict === "REJECTED_AS_PROVEN") {
    return "HYPERAGENT_PROVEN_REJECTED";
  }
  if (row.provenance === "UNKNOWN" && row.hyperagent_claim.includes("WRONG_PART_RISK")) {
    return "HYPERAGENT_WRONG_PART_UNKNOWN_SUPPORT";
  }
  return "HYPERAGENT_WRONG_PART_NOT_REPO_CLOSURE";
}

function buildSlugRow(
  row: CursorValidationRowV1,
  mappedFilterSlugs: string[],
  recommendedOwnerAction: string,
): Edr4rxd1OwnerReviewSlugRowV1 {
  return {
    fridge_slug: row.fridge_slug,
    hyperagent_claim: row.hyperagent_claim,
    cursor_row_state: row.cursor_row_state,
    cursor_verdict: row.cursor_verdict,
    repo_classification: row.repo_classification,
    repo_learned_failure_aggregate: row.repo_learned_failure_aggregate,
    repo_compat_maps_edr4rxd1: row.repo_compat_maps_edr4rxd1,
    repo_manual_evidence_path: row.repo_manual_evidence_path,
    mapped_filter_slugs: mappedFilterSlugs,
    reason: row.reason,
    recommended_owner_action: recommendedOwnerAction,
    mutation_authorized: false,
  };
}

function buildOwnerChecklist(args: {
  evidenceCount: number;
  browserCount: number;
  compatCount: number;
  noActionCount: number;
}): string[] {
  return [
    "Command Center ranks filter::whirlpool::edr4rxd1 as BOUNDED_EVIDENCE_RESEARCH only — safe_for_scaling=false; do not run full-family evidence scaling.",
    "Family reconciliation severity remains MEDIUM — resolve model-line conflicts before treating HyperAgent batch as closure.",
    `Review ${String(args.evidenceCount)} evidence promotion candidate(s) only where repo already has PROVEN_CORRECT manual evidence (whirlpool-wrf540cwhz).`,
    `Capture owner-browser Tier-1 filter_specification proof for ${String(args.browserCount)} slug(s) before any PROVEN_CORRECT promotion.`,
    `Run owner compat review for ${String(args.compatCount)} series-split slug(s) before removing edr4rxd1 from compatibility_mappings.csv.`,
    `Leave ${String(args.noActionCount)} HyperAgent closure claim(s) unchanged until owner review — repo rejected automatic truth closure.`,
    "Do not apply HyperAgent WRONG_PART_RISK removals while model-filter-correctness-audit wrong_part_risk_count=0 for this batch.",
    "Resolve edr4rxd1+ukf8001 learned-failure WARN on unlock slugs before evidence scaling beyond bounded research.",
    "No compat CSV edits, manual-evidence writes, Supabase mutations, sitemap/robots/page changes, or HQ handoff updates from this packet.",
  ];
}

export function buildEdr4rxd1OwnerReviewPacketV1(args: {
  rootDir: string;
  now?: () => Date;
}): Edr4rxd1OwnerReviewPacketV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const pathsRead = new Set<string>([
    EDR4RXD1_CURSOR_VALIDATION_JSON_REL_V1,
    FAMILY_RECONCILIATION_JSON_REL_V1,
    MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
    LEARNED_FAILURE_GUARDS_JSON_REL_V1,
    COMPATIBILITY_MAPPINGS_CSV_REL_V1,
  ]);

  const validation = readJsonFile<CursorValidationPacketV1>(
    args.rootDir,
    EDR4RXD1_CURSOR_VALIDATION_JSON_REL_V1,
  );
  if (validation.contract !== CURSOR_VALIDATION_PACKET_CONTRACT_V1) {
    throw new Error("EDR4RXD1 cursor validation packet contract mismatch");
  }
  if (validation.validation_details.family_key !== EDR4RXD1_FAMILY_KEY_V1) {
    throw new Error("EDR4RXD1 cursor validation family_key mismatch");
  }

  const reconciliation = readJsonFile<FamilyReconciliationV1>(
    args.rootDir,
    FAMILY_RECONCILIATION_JSON_REL_V1,
  );
  if (reconciliation.contract !== FAMILY_RECONCILIATION_CONTRACT_V1) {
    throw new Error("Family reconciliation audit contract mismatch");
  }

  const modelAudit = readJsonFile<ModelFilterCorrectnessAuditV1>(
    args.rootDir,
    MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  );
  if (modelAudit.contract !== MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1) {
    throw new Error("Model filter correctness audit contract mismatch");
  }

  const learnedGuards = readJsonFile<LearnedFailureGuardsReportV1>(
    args.rootDir,
    LEARNED_FAILURE_GUARDS_JSON_REL_V1,
  );
  if (learnedGuards.contract !== LEARNED_FAILURE_GUARDS_CONTRACT_V1) {
    throw new Error("Learned failure guards contract mismatch");
  }

  const manualEvidencePaths = listManualEvidencePaths(args.rootDir);
  for (const rel of manualEvidencePaths) {
    pathsRead.add(rel);
    readFileSync(path.join(args.rootDir, rel), "utf8");
  }

  const compatBySlug = readCompatMappings(args.rootDir);

  const familyRow = reconciliation.family_rows.find(
    (row) => row.family_key === EDR4RXD1_FAMILY_KEY_V1,
  );
  const familyReconciliationSeverity: ReconciliationSeverityV1 =
    familyRow?.severity ?? "MEDIUM";

  const evidence_promotion_candidates: Edr4rxd1OwnerReviewSlugRowV1[] = [];
  const browser_proof_targets: Edr4rxd1OwnerReviewSlugRowV1[] = [];
  const compat_review_candidates: Edr4rxd1OwnerReviewSlugRowV1[] = [];
  const no_action_rows: Edr4rxd1OwnerReviewNoActionRowV1[] = [];

  for (const row of validation.validation_details.row_verdicts) {
    const mappedFilterSlugs = [...(compatBySlug.get(row.fridge_slug) ?? [])].sort();

    if (row.cursor_row_state === "APPLY_ELIGIBLE_WITH_EXISTING_PROOF") {
      evidence_promotion_candidates.push(
        buildSlugRow(
          row,
          mappedFilterSlugs,
          "Confirm existing operator-reviewed manual evidence only — HyperAgent rediscovery adds no automatic repo promotion.",
        ),
      );
      continue;
    }

    if (row.cursor_row_state === "NEEDS_OWNER_BROWSER_PROOF") {
      browser_proof_targets.push(
        buildSlugRow(
          row,
          mappedFilterSlugs,
          "Capture Tier-1 filter_specification with operator_reviewed browser proof before PROVEN_CORRECT promotion.",
        ),
      );
      no_action_rows.push({
        ...buildSlugRow(
          row,
          mappedFilterSlugs,
          "Reject HyperAgent PROVEN closure — repo has no committed manual-evidence JSON for this slug.",
        ),
        rejection_kind: rejectionKindForRow(row),
      });
      continue;
    }

    if (row.cursor_row_state === "NEEDS_COMPAT_REVIEW") {
      compat_review_candidates.push(
        buildSlugRow(
          row,
          mappedFilterSlugs,
          "Owner compat review required before edr4rxd1 map removal or supersession relabel — HyperAgent WRONG_PART_RISK is not repo closure.",
        ),
      );
      no_action_rows.push({
        ...buildSlugRow(
          row,
          mappedFilterSlugs,
          "Do not auto-remove edr4rxd1 compat map from HyperAgent WRONG_PART_RISK claim alone.",
        ),
        rejection_kind: rejectionKindForRow(row),
      });
    }
  }

  const proven_facts = [
    ...(validation.proven_facts ?? []),
    `PROVEN: validation_status=${validation.validation_status} for ${EDR4RXD1_FAMILY_KEY_V1}.`,
    `PROVEN: family_reconciliation_severity=${familyReconciliationSeverity} from ${FAMILY_RECONCILIATION_JSON_REL_V1}.`,
    `PROVEN: evidence_promotion_candidates=${String(evidence_promotion_candidates.length)} browser_proof_targets=${String(browser_proof_targets.length)} compat_review_candidates=${String(compat_review_candidates.length)} no_action_rows=${String(no_action_rows.length)}.`,
    "PROVEN: Read-only packet build — no compat, manual-evidence, Supabase, sitemap, robots, page, retailer-link, or HQ handoff mutations.",
  ];

  const inferred_facts = [
    ...(validation.inferred_facts ?? []),
    "INFERRED: whirlpool-wrf535sibz is absent from HyperAgent validation batch — excluded from browser_proof_targets despite family-reconciliation context.",
    "INFERRED: Owner should treat this packet as the bounded-research action list — not a full-family scaling authorization.",
  ];

  const unknown_facts = [...(validation.unknown_facts ?? [])];

  return {
    contract: EDR4RXD1_OWNER_REVIEW_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: generatedAt,
    source_command: EDR4RXD1_OWNER_REVIEW_PACKET_SOURCE_COMMAND_V1,
    validation_status: validation.validation_status,
    family_key: EDR4RXD1_FAMILY_KEY_V1,
    family_reconciliation_severity: familyReconciliationSeverity,
    safe_for_scaling: false,
    safe_for_bounded_research: true,
    owner_review_required: true,
    command_center_action_scope: "BOUNDED_RESEARCH_ONLY",
    evidence_promotion_candidates,
    browser_proof_targets,
    compat_review_candidates,
    no_action_rows,
    owner_checklist: buildOwnerChecklist({
      evidenceCount: evidence_promotion_candidates.length,
      browserCount: browser_proof_targets.length,
      compatCount: compat_review_candidates.length,
      noActionCount: no_action_rows.length,
    }),
    exact_repo_paths_read: [...pathsRead].sort(),
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}

export function buildEdr4rxd1OwnerReviewPacketMarkdownV1(
  packet: Edr4rxd1OwnerReviewPacketV1,
): string {
  const lines: string[] = [
    "# EDR4RXD1 owner review packet v1",
    "",
    `Generated: ${packet.generated_at}`,
    "",
    "## Status",
    "",
    `- validation_status: **${packet.validation_status}**`,
    `- family_key: \`${packet.family_key}\``,
    `- family_reconciliation_severity: **${packet.family_reconciliation_severity}**`,
    `- safe_for_scaling: **false**`,
    `- safe_for_bounded_research: **true**`,
    `- owner_review_required: **true**`,
    `- command_center_action_scope: **${packet.command_center_action_scope}**`,
    "",
    "## Owner checklist",
    "",
    ...packet.owner_checklist.map((item) => `- ${item}`),
    "",
    "## Evidence promotion candidates",
    "",
  ];

  if (packet.evidence_promotion_candidates.length === 0) {
    lines.push("_None._", "");
  } else {
    for (const row of packet.evidence_promotion_candidates) {
      lines.push(
        `- \`${row.fridge_slug}\` — ${row.repo_classification}; ${row.recommended_owner_action}`,
      );
    }
    lines.push("");
  }

  lines.push("## Browser proof targets", "");
  if (packet.browser_proof_targets.length === 0) {
    lines.push("_None._", "");
  } else {
    for (const row of packet.browser_proof_targets) {
      lines.push(`- \`${row.fridge_slug}\` — ${row.recommended_owner_action}`);
    }
    lines.push("");
  }

  lines.push("## Compat review candidates", "");
  if (packet.compat_review_candidates.length === 0) {
    lines.push("_None._", "");
  } else {
    for (const row of packet.compat_review_candidates) {
      lines.push(`- \`${row.fridge_slug}\` — ${row.hyperagent_claim}`);
    }
    lines.push("");
  }

  lines.push("## No-action rows (HyperAgent closure rejected)", "");
  for (const row of packet.no_action_rows) {
    lines.push(`- \`${row.fridge_slug}\` — ${row.rejection_kind}: ${row.reason}`);
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}

export function writeEdr4rxd1OwnerReviewPacketArtifactsV1(args: {
  rootDir: string;
  packet: Edr4rxd1OwnerReviewPacketV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(args.rootDir, EDR4RXD1_OWNER_REVIEW_PACKET_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, EDR4RXD1_OWNER_REVIEW_PACKET_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.packet, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildEdr4rxd1OwnerReviewPacketMarkdownV1(args.packet), "utf8");
  return {
    json_rel_path: EDR4RXD1_OWNER_REVIEW_PACKET_JSON_REL_V1,
    md_rel_path: EDR4RXD1_OWNER_REVIEW_PACKET_MD_REL_V1,
  };
}
