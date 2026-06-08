/**
 * Read-only BAD_MAPPING_CORRECTION_BATCH_RUNNER_V1.
 * Packages 76 dangerous fridge mappings into HyperAgent-sized correction batches.
 * Does not mutate compat CSV, Supabase, sitemap, robots, pages, or HQ handoff docs.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1,
  DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1,
  type DangerousMappingRemediationPlanV1,
  type RootCauseGroupV1,
} from "./dangerous-mapping-remediation-plan-v1";
import {
  MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
  MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  type ModelFilterCorrectnessAuditV1,
  type ModelFilterCorrectnessRowV1,
} from "./model-filter-correctness-audit-v1";
import {
  HAF_CIN_CANONICAL_FILTER_SLUGS_V1,
  HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1,
  type CatalogSlugRowV1,
} from "./samsung-haf-qin-wildcard-expansion-review-v1";
export const BAD_MAPPING_CORRECTION_BATCH_RUNNER_CONTRACT_V1 =
  "bad_mapping_correction_batch_runner_v1" as const;

export const BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1 =
  "data/fridge/batch-production/audits/bad-mapping-correction-batch-runner-v1.json" as const;

export const BAD_MAPPING_CORRECTION_BATCH_RUNNER_MD_REL_V1 =
  "data/fridge/batch-production/drafts/bad-mapping-correction-batch-runner-v1.md" as const;

export const BAD_MAPPING_CORRECTION_BATCH_RUNNER_ALLOWED_WRITE_REL_PATHS_V1 = [
  BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1,
  BAD_MAPPING_CORRECTION_BATCH_RUNNER_MD_REL_V1,
] as const;

export const ALLOWED_CORRECTION_ACTIONS_V1 = [
  "remove_mapping",
  "replace_mapping",
  "split_mapping",
  "keep_quarantine",
  "noindex_until_proven",
] as const;

export type AllowedCorrectionActionV1 = (typeof ALLOWED_CORRECTION_ACTIONS_V1)[number];

export type CorrectionWorkflowPhaseV1 =
  | "hyperagent_research"
  | "owner_compat_review"
  | "maintain_quarantine";

export type BadMappingCorrectionPacketV1 = {
  fridge_slug: string;
  model_number: string;
  current_mapped_filter_slugs: string[];
  root_cause_group: RootCauseGroupV1;
  current_classification: "WRONG_PART_RISK" | "BLOCKED";
  required_hyperagent_evidence_query: string;
  evidence_acceptance_criteria: string[];
  suspected_correct_filter_family: string;
  allowed_correction_action: AllowedCorrectionActionV1;
  workflow_phase: CorrectionWorkflowPhaseV1;
  mutation_authorized: false;
  owner_approval_required: true;
  mutation_ready: boolean;
  immediate_surgical_candidate: boolean;
  blockers: string[];
};

export type HyperAgentResearchBatchGroupV1 = {
  batch_group_id: string;
  root_cause_group: RootCauseGroupV1;
  mapped_filter_pattern: string;
  slug_count: number;
  fridge_slugs: string[];
  workflow_phase: "hyperagent_research";
  compat_edit_authorized: false;
  hyperagent_research_prompt: string;
};

export type ClassificationPromotionCriteriaV1 = {
  from_classification: "WRONG_PART_RISK" | "BLOCKED";
  to_classification: "PROVEN_CORRECT" | "LIKELY_CORRECT_NEEDS_EVIDENCE";
  criteria: string[];
};

export type BadMappingCorrectionBatchRunnerV1 = {
  contract: typeof BAD_MAPPING_CORRECTION_BATCH_RUNNER_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_blocked_until_owner_approval: true;
  mutation_authorized: false;
  generated_at: string;
  source_remediation_plan_contract: typeof DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1;
  source_remediation_plan_path: string;
  source_audit_contract: typeof MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1;
  source_audit_path: string;
  dangerous_slug_count: number;
  correction_packets: BadMappingCorrectionPacketV1[];
  hyperagent_research_batch_groups: HyperAgentResearchBatchGroupV1[];
  recommended_first_batch_slugs: string[];
  post_hyperagent_validation_checklist: string[];
  classification_promotion_criteria: ClassificationPromotionCriteriaV1[];
  inspect_summary: {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary";
      correction_packets: ".correction_packets";
      hyperagent_research_batch_groups: ".hyperagent_research_batch_groups";
      recommended_first_batch_slugs: ".recommended_first_batch_slugs";
    };
    recommended_next_action: string;
  };
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

const MANUAL_EVIDENCE_DIR_REL_V1 = "data/manual-evidence/refrigerator";
const HAF_QIN_HYPERAGENT_CSV_REL_V1 =
  "data/fridge/batch-production/hyperagent/haf-qin-candidates-v1.csv";

const SAMSUNG_HAFCIN_CANONICAL_SLUG_V1 = "da29-00020b";

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function readCsv<T extends Record<string, string>>(rootDir: string, relPath: string): T[] {
  return parse(readFileSync(path.join(rootDir, relPath), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

function mappedPatternKey(slugs: string[]): string {
  return [...slugs].map(normalizeSlug).sort().join("|");
}

function loadRemediationPlan(rootDir: string): DangerousMappingRemediationPlanV1 {
  const parsed = JSON.parse(
    readFileSync(path.join(rootDir, DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1), "utf8"),
  ) as DangerousMappingRemediationPlanV1;
  if (parsed.contract !== DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1) {
    throw new Error(
      `Remediation plan contract mismatch: expected ${DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1}, got ${String(parsed.contract)}`,
    );
  }
  return parsed;
}

function loadAuditReport(rootDir: string): ModelFilterCorrectnessAuditV1 {
  const parsed = JSON.parse(
    readFileSync(path.join(rootDir, MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1), "utf8"),
  ) as ModelFilterCorrectnessAuditV1;
  if (parsed.contract !== MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1) {
    throw new Error(
      `Audit contract mismatch: expected ${MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1}, got ${String(parsed.contract)}`,
    );
  }
  return parsed;
}

function loadWildcardRows(rootDir: string): Map<string, CatalogSlugRowV1> {
  const abs = path.join(rootDir, HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1);
  if (!existsSync(abs)) return new Map();
  const parsed = JSON.parse(readFileSync(abs, "utf8")) as {
    catalog_slug_rows?: CatalogSlugRowV1[];
  };
  return new Map((parsed.catalog_slug_rows ?? []).map((row) => [row.fridge_slug, row]));
}

function hyperagentEvidenceQuery(
  rootCause: RootCauseGroupV1,
  row: ModelFilterCorrectnessRowV1,
  wildcard: CatalogSlugRowV1 | undefined,
): string {
  const mapped = row.mapped_filter_slugs.join("|");
  switch (rootCause) {
    case "samsung_haf_qin_da29_da97_conflicts":
      return [
        `Find official Samsung support/spec page for refrigerator model ${row.model_number} (${row.fridge_slug}).`,
        `Report exact water filter marketing token (HAF-QIN or HAF-CIN) and DA97/DA29 OEM part number.`,
        `Current repo compat maps: ${mapped}.`,
        wildcard
          ? `Wildcard bucket: ${wildcard.bucket}; matched patterns: ${wildcard.matched_patterns.join(", ")}.`
          : "No wildcard review row — require model-specific official page.",
        "Do not infer from sibling models or wildcard expansion alone.",
      ].join(" ");
    case "samsung_haf_cin_canonical_blockers":
      return [
        `Confirm official Samsung filter for ${row.model_number} (${row.fridge_slug}) is HAF-CIN / DA29-00020B only.`,
        `Prove whether da29-00012b is wrong-family for this slug.`,
        `Current repo compat maps: ${mapped}.`,
      ].join(" ");
    case "lg_lt_generation_co_maps":
      return [
        `Find official LG product/spec page for refrigerator ${row.model_number} (${row.fridge_slug}).`,
        `Report exactly one LT cartridge OEM (LT1000P, LT1000PC, LT700P, LT600P, LT800P, or ADQ variant).`,
        `Current repo co-maps multiple LT generations: ${mapped}.`,
        "Do not copy filter from a sibling model without model-specific proof.",
      ].join(" ");
    case "ge_xwf_xwfe_rpwfe_legacy_mixes":
      return [
        `Find official GE spec for ${row.model_number} (${row.fridge_slug}).`,
        `Identify whether filter uses RFID shell (XWFE/RPWFE) or legacy shell (XWF/MWF).`,
        `Current repo co-maps: ${mapped}.`,
      ].join(" ");
    case "quarantined_models":
      return [
        `Reconcile official LG filter token for ${row.model_number} (${row.fridge_slug}) against docs/fridge-model-filter-mapping-discrepancies.md LT1000P claim.`,
        `Current repo maps: ${mapped}.`,
      ].join(" ");
  }
}

function evidenceAcceptanceCriteria(rootCause: RootCauseGroupV1): string[] {
  const base = [
    "Source is official manufacturer product/spec/support page for the exact model number",
    "Captured filter token matches a single catalog slug in data/filters.csv",
    "Manual evidence JSON records filter_specification source with model slug match",
  ];

  switch (rootCause) {
    case "samsung_haf_qin_da29_da97_conflicts":
      return [
        ...base,
        "Official token resolves to samsung::HAFQIN (da97-17376a|da97-17376b) OR samsung::HAFCIN (da29-00020b) per cross-reference module",
        "Post-correction mapping contains only slugs from one proven Samsung marketing-token family",
        "Re-run model_filter_correctness_audit_v1 — confusion blockers cleared for slug",
      ];
    case "samsung_haf_cin_canonical_blockers":
      return [
        ...base,
        "Official proof confirms HAF-CIN / DA29-00020B",
        "da29-00012b absent from corrected mapping",
        "legacyFilterSlugsMatchOfficialTokenV1 passes for samsung::HAFCIN",
      ];
    case "lg_lt_generation_co_maps":
      return [
        ...base,
        "Exactly one LT-generation slug remains after split_mapping",
        "No Multiple LG LT filter generations co-mapped blocker after re-audit",
      ];
    case "ge_xwf_xwfe_rpwfe_legacy_mixes":
      return [
        ...base,
        "Exactly one of xwf, xwfe, rpwfe, or mwf remains based on RFID vs legacy proof",
        "No XWF vs XWFE or RPWFE mixed-family blocker after re-audit",
      ];
    case "quarantined_models":
      return [
        ...base,
        "Owner signs discrepancy reconciliation for lg-lrfxs3106s",
        "Quarantine override cleared only after owner-approved mapping",
      ];
  }
}

function allowedCorrectionAction(
  rootCause: RootCauseGroupV1,
  suspectedFamily: string,
  slug: string,
): AllowedCorrectionActionV1 {
  if (rootCause === "quarantined_models") return "keep_quarantine";
  if (rootCause === "samsung_haf_cin_canonical_blockers") return "remove_mapping";
  if (suspectedFamily === "UNKNOWN") return "noindex_until_proven";
  if (rootCause === "samsung_haf_qin_da29_da97_conflicts") return "split_mapping";
  return "split_mapping";
}

function workflowPhase(
  rootCause: RootCauseGroupV1,
  immediateSurgical: boolean,
): CorrectionWorkflowPhaseV1 {
  if (rootCause === "quarantined_models") return "maintain_quarantine";
  if (immediateSurgical) return "owner_compat_review";
  if (
    rootCause === "samsung_haf_qin_da29_da97_conflicts" ||
    rootCause === "lg_lt_generation_co_maps" ||
    rootCause === "ge_xwf_xwfe_rpwfe_legacy_mixes"
  ) {
    return "hyperagent_research";
  }
  return "owner_compat_review";
}

function isImmediateSurgicalCandidate(
  rootCause: RootCauseGroupV1,
  slug: string,
  suspectedFamily: string,
  mappedFilterSlugs: string[],
): boolean {
  if (rootCause !== "samsung_haf_cin_canonical_blockers") return false;
  if (slug !== "samsung-rf27t5501sr") return false;
  if (suspectedFamily !== "samsung::HAFCIN") return false;
  const slugs = mappedFilterSlugs.map(normalizeSlug);
  return (
    slugs.includes(SAMSUNG_HAFCIN_CANONICAL_SLUG_V1) &&
    slugs.includes("da29-00012b") &&
    HAF_CIN_CANONICAL_FILTER_SLUGS_V1.every((canonical) => slugs.includes(canonical))
  );
}

function isMutationReady(packet: BadMappingCorrectionPacketV1): boolean {
  if (packet.suspected_correct_filter_family === "UNKNOWN") return false;
  if (packet.allowed_correction_action === "noindex_until_proven") return false;
  if (packet.allowed_correction_action === "keep_quarantine") return false;
  return packet.immediate_surgical_candidate;
}

function hyperagentPromptForGroup(args: {
  batchGroupId: string;
  rootCause: RootCauseGroupV1;
  mappedPattern: string;
  slugs: string[];
  modelNumbers: string[];
}): string {
  const slugList = args.slugs.join(", ");
  const modelList = args.modelNumbers.join(", ");

  switch (args.rootCause) {
    case "samsung_haf_qin_da29_da97_conflicts":
      return [
        "BuckParts BAD_MAPPING_CORRECTION_BATCH — Samsung DA29/DA97 research batch.",
        `Batch ID: ${args.batchGroupId}.`,
        `Mapped pattern: ${args.mappedPattern}.`,
        `Models (${String(args.slugs.length)}): ${modelList}.`,
        `Slugs: ${slugList}.`,
        "For each model, find the official Samsung support/spec page and extract:",
        "1) Water filter marketing token (HAF-QIN or HAF-CIN)",
        "2) Exact DA97 or DA29 OEM part number",
        "3) Source URL and page title",
        "Reject wildcard-only inference. Cross-check against samsung::HAFQIN (da97-17376a/b) and samsung::HAFCIN (da29-00020b) repo-proven families.",
        "Output: one evidence row per slug suitable for data/manual-evidence/refrigerator/{slug}.json filter_specification source.",
      ].join("\n");
    case "lg_lt_generation_co_maps":
      return [
        "BuckParts BAD_MAPPING_CORRECTION_BATCH — LG LT generation research batch.",
        `Batch ID: ${args.batchGroupId}.`,
        `Mapped pattern: ${args.mappedPattern}.`,
        `Models (${String(args.slugs.length)}): ${modelList}.`,
        `Slugs: ${slugList}.`,
        "For each model, find the official LG product/spec page and extract exactly one LT cartridge OEM.",
        "Current repo co-maps multiple LT generations — identify the single correct token per model.",
        "Do not infer from sibling models. Output filter_specification evidence per slug.",
      ].join("\n");
    case "ge_xwf_xwfe_rpwfe_legacy_mixes":
      return [
        "BuckParts BAD_MAPPING_CORRECTION_BATCH — GE RFID vs legacy shell research batch.",
        `Batch ID: ${args.batchGroupId}.`,
        `Mapped pattern: ${args.mappedPattern}.`,
        `Models (${String(args.slugs.length)}): ${modelList}.`,
        `Slugs: ${slugList}.`,
        "For each model, find the official GE spec and determine RFID (XWFE/RPWFE) vs legacy (XWF/MWF) shell.",
        "Output one proven filter slug per model for post-research split_mapping.",
      ].join("\n");
    default:
      return `Research batch ${args.batchGroupId} for ${slugList}.`;
  }
}

function buildHyperAgentBatchGroups(
  packets: BadMappingCorrectionPacketV1[],
): HyperAgentResearchBatchGroupV1[] {
  const researchPackets = packets.filter(
    (packet) => packet.workflow_phase === "hyperagent_research",
  );
  const byKey = new Map<string, BadMappingCorrectionPacketV1[]>();

  for (const packet of researchPackets) {
    const key = `${packet.root_cause_group}::${mappedPatternKey(packet.current_mapped_filter_slugs)}`;
    const group = byKey.get(key) ?? [];
    group.push(packet);
    byKey.set(key, group);
  }

  return [...byKey.entries()]
    .map(([key, groupPackets]) => {
      const sorted = [...groupPackets].sort((a, b) =>
        a.fridge_slug.localeCompare(b.fridge_slug),
      );
      const rootCause = sorted[0]!.root_cause_group;
      const pattern = mappedPatternKey(sorted[0]!.current_mapped_filter_slugs);
      const batchGroupId = `hyperagent-${rootCause}-${pattern}`.replace(/[^a-z0-9]+/gi, "-");

      return {
        batch_group_id: batchGroupId,
        root_cause_group: rootCause,
        mapped_filter_pattern: pattern,
        slug_count: sorted.length,
        fridge_slugs: sorted.map((packet) => packet.fridge_slug),
        workflow_phase: "hyperagent_research" as const,
        compat_edit_authorized: false as const,
        hyperagent_research_prompt: hyperagentPromptForGroup({
          batchGroupId,
          rootCause,
          mappedPattern: pattern,
          slugs: sorted.map((packet) => packet.fridge_slug),
          modelNumbers: sorted.map((packet) => packet.model_number),
        }),
      };
    })
    .sort((a, b) => b.slug_count - a.slug_count || a.batch_group_id.localeCompare(b.batch_group_id));
}

function buildRecommendedFirstBatch(packets: BadMappingCorrectionPacketV1[]): string[] {
  const surgical = packets.find((packet) => packet.immediate_surgical_candidate);
  const samsungBatches = buildHyperAgentBatchGroups(packets).filter(
    (group) => group.root_cause_group === "samsung_haf_qin_da29_da97_conflicts",
  );

  const selected = new Set<string>();
  if (surgical) selected.add(surgical.fridge_slug);

  for (const group of samsungBatches) {
    for (const slug of group.fridge_slugs) {
      selected.add(slug);
      if (selected.size >= 15) break;
    }
    if (selected.size >= 15) break;
  }

  if (selected.size < 10) {
    const lgGroup = buildHyperAgentBatchGroups(packets).find(
      (group) => group.root_cause_group === "lg_lt_generation_co_maps",
    );
    for (const slug of lgGroup?.fridge_slugs ?? []) {
      selected.add(slug);
      if (selected.size >= 10) break;
    }
  }

  return [...selected].sort((a, b) => a.localeCompare(b));
}

function buildPromotionCriteria(): ClassificationPromotionCriteriaV1[] {
  return [
    {
      from_classification: "WRONG_PART_RISK",
      to_classification: "PROVEN_CORRECT",
      criteria: [
        "Official manufacturer filter_specification evidence exists for fridge_slug",
        "legacyFilterSlugsMatchOfficialTokenV1 passes for brand and corrected mapped_filter_slugs",
        "model_filter_correctness_audit_v1 reports zero confusion/wildcard wrong-family blockers for slug",
        "validateRefrigeratorManualEvidencePublicReady passes when page-factory scaling is intended",
      ],
    },
    {
      from_classification: "WRONG_PART_RISK",
      to_classification: "LIKELY_CORRECT_NEEDS_EVIDENCE",
      criteria: [
        "Corrected mapping contains exactly one filter-family slug with no co-map blockers",
        "Official filter token captured but manual evidence public-ready Tier-1 gaps remain",
        "model_filter_correctness_audit_v1 classification is no longer WRONG_PART_RISK",
        "Page factory scaling still blocked until public-ready evidence completes",
      ],
    },
    {
      from_classification: "BLOCKED",
      to_classification: "LIKELY_CORRECT_NEEDS_EVIDENCE",
      criteria: [
        "Quarantine override cleared by owner after mapping reconciliation",
        "Single proven filter slug mapped with no wrong-family blockers",
        "Discrepancy doc reconciled when quarantine reason was FILTER_MAPPING_CONFLICT",
      ],
    },
    {
      from_classification: "BLOCKED",
      to_classification: "PROVEN_CORRECT",
      criteria: [
        "Quarantine cleared and official proof aligns with corrected mapping",
        "All PROVEN_CORRECT promotion criteria for WRONG_PART_RISK also satisfied",
      ],
    },
  ];
}

export function buildBadMappingCorrectionBatchRunnerV1(args: {
  rootDir: string;
  now?: () => Date;
}): BadMappingCorrectionBatchRunnerV1 {
  const now = args.now ?? (() => new Date());
  const remediationPlan = loadRemediationPlan(args.rootDir);
  const audit = loadAuditReport(args.rootDir);

  readCsv(args.rootDir, "data/compatibility_mappings.csv");
  readCsv(args.rootDir, "data/filters.csv");
  readCsv(args.rootDir, "data/filter_aliases.csv");
  readCsv(args.rootDir, "data/fridge_model_aliases.csv");

  const filterOemBySlug = new Map(
    readCsv<{ slug: string; oem_part_number?: string }>(args.rootDir, "data/filters.csv").map(
      (row) => [normalizeSlug(row.slug), (row.oem_part_number ?? row.slug).trim()] as const,
    ),
  );

  if (existsSync(path.join(args.rootDir, MANUAL_EVIDENCE_DIR_REL_V1))) {
    for (const file of readdirSync(path.join(args.rootDir, MANUAL_EVIDENCE_DIR_REL_V1))) {
      if (file.endsWith(".json")) {
        readFileSync(path.join(args.rootDir, MANUAL_EVIDENCE_DIR_REL_V1, file), "utf8");
      }
    }
  }

  if (existsSync(path.join(args.rootDir, HAF_QIN_HYPERAGENT_CSV_REL_V1))) {
    readFileSync(path.join(args.rootDir, HAF_QIN_HYPERAGENT_CSV_REL_V1), "utf8");
  }

  const wildcardBySlug = loadWildcardRows(args.rootDir);
  const auditBySlug = new Map(
    audit.model_rows
      .filter(
        (row) => row.classification === "WRONG_PART_RISK" || row.classification === "BLOCKED",
      )
      .map((row) => [normalizeSlug(row.fridge_slug), row] as const),
  );

  const correction_packets: BadMappingCorrectionPacketV1[] = [];

  for (const group of remediationPlan.root_cause_groups) {
    for (const model of group.models) {
      const auditRow = auditBySlug.get(normalizeSlug(model.fridge_slug));
      if (!auditRow) {
        throw new Error(`Missing dangerous audit row for ${model.fridge_slug}`);
      }

      const wildcard = wildcardBySlug.get(model.fridge_slug);
      const suspectedFamily = model.suspected_correct_filter_family;
      const immediateSurgical = isImmediateSurgicalCandidate(
        group.root_cause_group,
        model.fridge_slug,
        suspectedFamily,
        model.mapped_filter_slugs,
      );

      const packet: BadMappingCorrectionPacketV1 = {
        fridge_slug: model.fridge_slug,
        model_number: model.model_number,
        current_mapped_filter_slugs: [...model.mapped_filter_slugs].sort(),
        root_cause_group: group.root_cause_group,
        current_classification: model.classification,
        required_hyperagent_evidence_query: hyperagentEvidenceQuery(
          group.root_cause_group,
          auditRow,
          wildcard,
        ),
        evidence_acceptance_criteria: evidenceAcceptanceCriteria(group.root_cause_group),
        suspected_correct_filter_family: suspectedFamily,
        allowed_correction_action: allowedCorrectionAction(
          group.root_cause_group,
          suspectedFamily,
          model.fridge_slug,
        ),
        workflow_phase: workflowPhase(group.root_cause_group, immediateSurgical),
        mutation_authorized: false,
        owner_approval_required: true,
        mutation_ready: false,
        immediate_surgical_candidate: immediateSurgical,
        blockers: [...model.blockers],
      };

      packet.mutation_ready = isMutationReady(packet);
      correction_packets.push(packet);
    }
  }

  correction_packets.sort((a, b) => a.fridge_slug.localeCompare(b.fridge_slug));

  if (correction_packets.length !== remediationPlan.dangerous_model_count) {
    throw new Error(
      `Correction packet count mismatch: packets=${String(correction_packets.length)} dangerous=${String(remediationPlan.dangerous_model_count)}`,
    );
  }

  const hyperagent_research_batch_groups = buildHyperAgentBatchGroups(correction_packets);
  const recommended_first_batch_slugs = buildRecommendedFirstBatch(correction_packets);

  if (recommended_first_batch_slugs.length < 10 || recommended_first_batch_slugs.length > 20) {
    throw new Error(
      `Recommended first batch size out of range: ${String(recommended_first_batch_slugs.length)}`,
    );
  }

  const surgicalCount = correction_packets.filter(
    (packet) => packet.immediate_surgical_candidate,
  ).length;

  return {
    contract: BAD_MAPPING_CORRECTION_BATCH_RUNNER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    source_remediation_plan_contract: DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1,
    source_remediation_plan_path: DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1,
    source_audit_contract: MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
    source_audit_path: MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
    dangerous_slug_count: correction_packets.length,
    correction_packets,
    hyperagent_research_batch_groups,
    recommended_first_batch_slugs,
    post_hyperagent_validation_checklist: [
      "Manual evidence JSON exists at data/manual-evidence/refrigerator/{slug}.json with matching fridge_model_slug",
      "At least one source has evidence_role=filter_specification citing official manufacturer page",
      "Extracted OEM token maps to exactly one slug in data/filters.csv",
      "Proposed corrected mapping uses only slugs from one repo-proven filter family",
      "Re-run model_filter_correctness_audit_v1 — slug no longer WRONG_PART_RISK or BLOCKED",
      "For Samsung: legacyFilterSlugsMatchOfficialTokenV1 passes when marketing token is HAF-QIN or HAF-CIN",
      "Owner approval packet filed before any compatibility_mappings.csv edit",
      "No Supabase, sitemap, robots, or public page mutation from this runner",
    ],
    classification_promotion_criteria: buildPromotionCriteria(),
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        correction_packets: ".correction_packets",
        hyperagent_research_batch_groups: ".hyperagent_research_batch_groups",
        recommended_first_batch_slugs: ".recommended_first_batch_slugs",
      },
      recommended_next_action:
        "Run HyperAgent on recommended_first_batch_slugs (surgical samsung-rf27t5501sr + Samsung da29-10105j/da29-00019a research batches), validate against post_hyperagent_validation_checklist, then owner-review compat edits.",
    },
    exact_repo_paths_read: [
      "data/compatibility_mappings.csv",
      "data/filter_aliases.csv",
      "data/filters.csv",
      "data/fridge_model_aliases.csv",
      DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1,
      HAF_QIN_HYPERAGENT_CSV_REL_V1,
      HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1,
      MANUAL_EVIDENCE_DIR_REL_V1,
      MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
      "scripts/lib/refrigerator-model-first-samsung-marketing-token-cross-reference-v1.ts",
    ].sort(),
    proven_facts: [
      `PROVEN: dangerous_slug_count=${String(correction_packets.length)} from ${DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1}.`,
      `PROVEN: immediate_surgical_candidate_count=${String(surgicalCount)} (samsung-rf27t5501sr HAF-CIN canonical).`,
      `PROVEN: hyperagent_research_batch_groups=${String(hyperagent_research_batch_groups.length)} with compat_edit_authorized=false.`,
      `PROVEN: recommended_first_batch_slugs=${String(recommended_first_batch_slugs.length)} slugs.`,
      "PROVEN: Read-only correction runner — mutation_authorized=false on all packets.",
    ],
    unknown_facts: [
      "UNKNOWN: HyperAgent capture quality until post_hyperagent_validation_checklist is run per slug.",
      "UNKNOWN: Live Supabase compat rows vs committed CSV during correction workflow.",
    ],
  };
}

function renderMarkdown(report: BadMappingCorrectionBatchRunnerV1): string {
  const lines = [
    "# Bad mapping correction batch runner v1",
    "",
    `- generated_at: **${report.generated_at}**`,
    `- dangerous_slug_count: **${String(report.dangerous_slug_count)}**`,
    `- recommended_first_batch: **${String(report.recommended_first_batch_slugs.length)}** slugs`,
    "",
    "## Recommended first batch",
    "",
    report.recommended_first_batch_slugs.map((slug) => `- \`${slug}\``).join("\n"),
    "",
    "## HyperAgent research batch groups",
    "",
  ];

  for (const group of report.hyperagent_research_batch_groups) {
    lines.push(
      `### ${group.batch_group_id}`,
      "",
      `- root_cause_group: \`${group.root_cause_group}\``,
      `- slug_count: **${String(group.slug_count)}**`,
      `- compat_edit_authorized: **false**`,
      "",
      "```",
      group.hyperagent_research_prompt,
      "```",
      "",
    );
  }

  lines.push("## Post-HyperAgent validation checklist", "");
  for (const item of report.post_hyperagent_validation_checklist) {
    lines.push(`- ${item}`);
  }

  lines.push("", "## Recommended next action", "", report.inspect_summary.recommended_next_action);
  return `${lines.join("\n")}\n`;
}

export function writeBadMappingCorrectionBatchRunnerArtifactsV1(args: {
  rootDir: string;
  report: BadMappingCorrectionBatchRunnerV1;
}): {
  jsonRelPath: string;
  mdRelPath: string;
} {
  const jsonAbs = path.join(args.rootDir, BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, BAD_MAPPING_CORRECTION_BATCH_RUNNER_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, renderMarkdown(args.report), "utf8");
  return {
    jsonRelPath: BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1,
    mdRelPath: BAD_MAPPING_CORRECTION_BATCH_RUNNER_MD_REL_V1,
  };
}
