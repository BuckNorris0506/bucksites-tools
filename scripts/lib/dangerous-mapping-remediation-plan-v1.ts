/**
 * Read-only dangerous fridge mapping remediation plan v1.
 * Groups WRONG_PART_RISK + BLOCKED models from model_filter_correctness_audit_v1 by root cause.
 * Does not mutate compat CSV, Supabase, sitemap, robots, or public pages.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
  MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  type ModelFilterCorrectnessAuditV1,
  type ModelFilterCorrectnessRowV1,
} from "./model-filter-correctness-audit-v1";
import {
  HAF_CIN_CANONICAL_FILTER_SLUGS_V1,
  HAF_QIN_CANONICAL_FILTER_SLUG_V1,
  HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1,
  type CatalogSlugRowV1,
} from "./samsung-haf-qin-wildcard-expansion-review-v1";
import {
  SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1,
} from "./refrigerator-model-first-samsung-marketing-token-cross-reference-v1";

export const DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1 =
  "dangerous_mapping_remediation_plan_v1" as const;

export const DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1 =
  "data/fridge/batch-production/audits/dangerous-mapping-remediation-plan-v1.json" as const;

export const DANGEROUS_MAPPING_REMEDIATION_PLAN_MD_REL_V1 =
  "data/fridge/batch-production/drafts/dangerous-mapping-remediation-plan-v1.md" as const;

export const DANGEROUS_MAPPING_REMEDIATION_PLAN_ALLOWED_WRITE_REL_PATHS_V1 = [
  DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1,
  DANGEROUS_MAPPING_REMEDIATION_PLAN_MD_REL_V1,
] as const;

export const ROOT_CAUSE_GROUPS_V1 = [
  "samsung_haf_qin_da29_da97_conflicts",
  "samsung_haf_cin_canonical_blockers",
  "lg_lt_generation_co_maps",
  "ge_xwf_xwfe_rpwfe_legacy_mixes",
  "quarantined_models",
] as const;

export type RootCauseGroupV1 = (typeof ROOT_CAUSE_GROUPS_V1)[number];

export const SAFEST_REMEDIATION_ACTIONS_V1 = [
  "quarantine",
  "noindex",
  "remove_mapping",
  "split_mapping",
  "evidence_research",
] as const;

export type SafestRemediationActionV1 = (typeof SAFEST_REMEDIATION_ACTIONS_V1)[number];

export type DangerousModelRemediationRowV1 = {
  fridge_slug: string;
  model_number: string;
  classification: "WRONG_PART_RISK" | "BLOCKED";
  mapped_filter_slugs: string[];
  suspected_correct_filter_family: string;
  evidence_needed: string[];
  safest_action: SafestRemediationActionV1;
  hyperagent_can_help: boolean;
  blockers: string[];
};

export type RootCauseRemediationGroupV1 = {
  root_cause_group: RootCauseGroupV1;
  affected_slug_count: number;
  affected_slugs: string[];
  dominant_mapped_filter_patterns: string[];
  suspected_correct_filter_family: string;
  evidence_needed: string[];
  safest_action: SafestRemediationActionV1;
  hyperagent_can_help: boolean;
  models: DangerousModelRemediationRowV1[];
};

export type RemediationSequenceStepV1 = {
  step: number;
  action: SafestRemediationActionV1;
  root_cause_groups: RootCauseGroupV1[];
  affected_slug_count: number;
  risk_reduction_rationale: string;
  owner_approval_required: boolean;
  repo_mutation_required: boolean;
};

export type DangerousMappingRemediationPlanV1 = {
  contract: typeof DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_blocked_until_owner_approval: true;
  mutation_authorized: false;
  generated_at: string;
  source_audit_contract: typeof MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1;
  source_audit_path: string;
  dangerous_model_count: number;
  indexable_risk_page_count: number;
  root_cause_groups: RootCauseRemediationGroupV1[];
  smallest_safe_remediation_sequence: RemediationSequenceStepV1[];
  inspect_summary: {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary";
      root_cause_groups: ".root_cause_groups";
      smallest_safe_remediation_sequence: ".smallest_safe_remediation_sequence";
    };
    recommended_next_action: string;
  };
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

const DISCREPANCY_DOC_REL_V1 = "docs/fridge-model-filter-mapping-discrepancies.md";
const HAF_QIN_HYPERAGENT_CSV_REL_V1 =
  "data/fridge/batch-production/hyperagent/haf-qin-candidates-v1.csv";

const HAF_QIN_SLUGS_V1 = ["da97-17376a", "da97-17376b"] as const;

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

function assignRootCauseGroup(row: ModelFilterCorrectnessRowV1): RootCauseGroupV1 {
  const blockers = row.blockers;
  if (blockers.some((blocker) => blocker.startsWith("quarantine:"))) {
    return "quarantined_models";
  }
  if (
    blockers.some(
      (blocker) =>
        blocker.includes("wildcard:BLOCKED_HAF_CIN") ||
        blocker.includes("HAF-CIN (DA29)") ||
        blocker.includes("samsung:HAF-QIN_and_HAF-CIN"),
    )
  ) {
    return "samsung_haf_cin_canonical_blockers";
  }
  if (blockers.some((blocker) => blocker.includes("Multiple LG LT filter generations"))) {
    return "lg_lt_generation_co_maps";
  }
  if (
    blockers.some(
      (blocker) =>
        blocker.includes("XWF vs XWFE") || blocker.includes("GE RPWFE mixed"),
    )
  ) {
    return "ge_xwf_xwfe_rpwfe_legacy_mixes";
  }
  return "samsung_haf_qin_da29_da97_conflicts";
}

function onlySlugsFromSet(mapped: string[], allowed: readonly string[]): boolean {
  const allowedSet = new Set(allowed.map(normalizeSlug));
  return mapped.length > 0 && mapped.every((slug) => allowedSet.has(normalizeSlug(slug)));
}

function inferSamsungSuspectedFamily(mappedFilterSlugs: string[]): string {
  const slugs = mappedFilterSlugs.map(normalizeSlug);
  const hasHafQin = slugs.some((slug) =>
    HAF_QIN_SLUGS_V1.includes(slug as (typeof HAF_QIN_SLUGS_V1)[number]),
  );
  const hasHafCin = HAF_CIN_CANONICAL_FILTER_SLUGS_V1.some((slug) => slugs.includes(slug));

  if (onlySlugsFromSet(slugs, SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1.HAFQIN.allowed_filter_slugs)) {
    return "samsung::HAFQIN";
  }
  if (onlySlugsFromSet(slugs, SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1.HAFCIN.allowed_filter_slugs)) {
    return "samsung::HAFCIN";
  }
  if (hasHafQin && !hasHafCin && slugs.every((slug) => slug.startsWith("da97-"))) {
    return "samsung::HAFQIN";
  }
  if (hasHafCin && !hasHafQin && slugs.every((slug) => slug.startsWith("da29-"))) {
    return "samsung::HAFCIN";
  }
  return "UNKNOWN";
}

function inferSuspectedFamily(
  rootCause: RootCauseGroupV1,
  row: ModelFilterCorrectnessRowV1,
): string {
  if (rootCause === "quarantined_models" && row.fridge_slug === "lg-lrfxs3106s") {
    return "lg::LT1000P";
  }
  if (rootCause === "samsung_haf_cin_canonical_blockers") {
    return "samsung::HAFCIN";
  }
  if (rootCause === "samsung_haf_qin_da29_da97_conflicts") {
    return inferSamsungSuspectedFamily(row.mapped_filter_slugs);
  }
  return "UNKNOWN";
}

function evidenceNeededForGroup(rootCause: RootCauseGroupV1): string[] {
  switch (rootCause) {
    case "samsung_haf_qin_da29_da97_conflicts":
      return [
        "Official Samsung model/support page naming exact water filter marketing token (HAF-QIN vs HAF-CIN) and DA97/DA29 part family",
        "Per-model proof before any compat row removal — use haf-qin-wildcard-expansion-review-v1 bucket guidance",
        "Cross-check against refrigerator-model-first-samsung-marketing-token-cross-reference-v1 allowed slug families",
      ];
    case "samsung_haf_cin_canonical_blockers":
      return [
        "Official Samsung page confirming HAF-CIN / DA29-00020B as sole filter for model",
        "Proof that co-mapped da29-00012b (or other non-canonical DA29) is wrong-family for this slug",
      ];
    case "lg_lt_generation_co_maps":
      return [
        "Official LG product/spec page listing exactly one LT cartridge generation (LT1000P vs LT1000PC vs LT700P vs LT600P vs LT800P)",
        "Rating-plate or manual confirmation — do not infer from sibling models",
      ];
    case "ge_xwf_xwfe_rpwfe_legacy_mixes":
      return [
        "Official GE spec page identifying RFID (XWFE/RPWFE) vs legacy (XWF/MWF) shell for this exact model",
        "Model-specific filter cartridge OEM before split_mapping",
      ];
    case "quarantined_models":
      return [
        "Owner reconciliation of docs/fridge-model-filter-mapping-discrepancies.md official LT1000P claim vs repo lt1000p mapping",
        "Confirm no ADQ*/other LT generations apply to this slug",
      ];
  }
}

function evidenceNeededForModel(
  rootCause: RootCauseGroupV1,
  row: ModelFilterCorrectnessRowV1,
  wildcard: CatalogSlugRowV1 | undefined,
): string[] {
  const base = [...evidenceNeededForGroup(rootCause)];
  if (rootCause === "samsung_haf_qin_da29_da97_conflicts" && wildcard) {
    base.push(
      `Wildcard bucket ${wildcard.bucket} for ${row.fridge_slug} — compat=${wildcard.compat_filter_slugs.join("|")}`,
    );
  }
  if (row.blockers.some((blocker) => blocker.startsWith("confusion:Samsung DA29"))) {
    base.push("Resolve DA29+DA97 co-map: retain only repo-proven single family after official proof");
  }
  return Array.from(new Set(base));
}

function safestActionForGroup(rootCause: RootCauseGroupV1): SafestRemediationActionV1 {
  switch (rootCause) {
    case "quarantined_models":
      return "quarantine";
    case "samsung_haf_cin_canonical_blockers":
      return "remove_mapping";
    case "lg_lt_generation_co_maps":
      return "split_mapping";
    case "ge_xwf_xwfe_rpwfe_legacy_mixes":
      return "split_mapping";
    case "samsung_haf_qin_da29_da97_conflicts":
      return "evidence_research";
  }
}

function safestActionForModel(
  rootCause: RootCauseGroupV1,
  row: ModelFilterCorrectnessRowV1,
): SafestRemediationActionV1 {
  if (rootCause === "quarantined_models") return "quarantine";
  if (rootCause === "samsung_haf_cin_canonical_blockers") return "remove_mapping";
  if (row.classification === "BLOCKED") return "quarantine";
  if (rootCause === "samsung_haf_qin_da29_da97_conflicts") {
    return inferSamsungSuspectedFamily(row.mapped_filter_slugs) === "UNKNOWN"
      ? "evidence_research"
      : "split_mapping";
  }
  return "evidence_research";
}

function hyperagentCanHelp(rootCause: RootCauseGroupV1): boolean {
  return (
    rootCause === "samsung_haf_qin_da29_da97_conflicts" ||
    rootCause === "lg_lt_generation_co_maps" ||
    rootCause === "ge_xwf_xwfe_rpwfe_legacy_mixes"
  );
}

function dominantMappedPatterns(rows: DangerousModelRemediationRowV1[]): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const pattern = [...row.mapped_filter_slugs].sort().join("|");
    counts.set(pattern, (counts.get(pattern) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([pattern, count]) => `${pattern} (${String(count)})`);
}

function groupSuspectedFamily(rows: DangerousModelRemediationRowV1[]): string {
  const families = new Set(rows.map((row) => row.suspected_correct_filter_family));
  if (families.size === 1) return Array.from(families)[0]!;
  if (families.has("UNKNOWN")) return "UNKNOWN";
  return "MIXED";
}

function buildModelRow(
  row: ModelFilterCorrectnessRowV1,
  rootCause: RootCauseGroupV1,
  wildcardBySlug: Map<string, CatalogSlugRowV1>,
): DangerousModelRemediationRowV1 {
  const wildcard = wildcardBySlug.get(row.fridge_slug);
  return {
    fridge_slug: row.fridge_slug,
    model_number: row.model_number,
    classification: row.classification as "WRONG_PART_RISK" | "BLOCKED",
    mapped_filter_slugs: [...row.mapped_filter_slugs].sort(),
    suspected_correct_filter_family: inferSuspectedFamily(rootCause, row),
    evidence_needed: evidenceNeededForModel(rootCause, row, wildcard),
    safest_action: safestActionForModel(rootCause, row),
    hyperagent_can_help: hyperagentCanHelp(rootCause),
    blockers: [...row.blockers],
  };
}

function buildRemediationSequence(args: {
  groups: RootCauseRemediationGroupV1[];
  indexableRiskCount: number;
  dangerousCount: number;
}): RemediationSequenceStepV1[] {
  const byKey = new Map(args.groups.map((group) => [group.root_cause_group, group]));

  const steps: RemediationSequenceStepV1[] = [
    {
      step: 1,
      action: "noindex",
      root_cause_groups: [...ROOT_CAUSE_GROUPS_V1],
      affected_slug_count: args.dangerousCount,
      risk_reduction_rationale:
        "Defensive publication gate: zero indexable_risk_pages in committed audit, but block factory/index promotion for all 76 dangerous slugs until mappings are split or removed.",
      owner_approval_required: false,
      repo_mutation_required: false,
    },
    {
      step: 2,
      action: "quarantine",
      root_cause_groups: ["quarantined_models"],
      affected_slug_count: byKey.get("quarantined_models")?.affected_slug_count ?? 0,
      risk_reduction_rationale:
        "Maintain existing owner-review quarantine on lg-lrfxs3106s — official LT1000P vs repo co-map conflict is already documented.",
      owner_approval_required: false,
      repo_mutation_required: false,
    },
    {
      step: 3,
      action: "remove_mapping",
      root_cause_groups: ["samsung_haf_cin_canonical_blockers"],
      affected_slug_count:
        byKey.get("samsung_haf_cin_canonical_blockers")?.affected_slug_count ?? 0,
      risk_reduction_rationale:
        "Single-slug surgical fix: samsung-rf27t5501sr maps non-canonical da29-00012b alongside canonical HAF-CIN da29-00020b — remove wrong-family row first.",
      owner_approval_required: true,
      repo_mutation_required: true,
    },
    {
      step: 4,
      action: "evidence_research",
      root_cause_groups: ["samsung_haf_qin_da29_da97_conflicts"],
      affected_slug_count:
        byKey.get("samsung_haf_qin_da29_da97_conflicts")?.affected_slug_count ?? 0,
      risk_reduction_rationale:
        "Largest Samsung wrong-family bucket (33 slugs, 26 wildcard REVIEW_DA29_CONFLICT) — HyperAgent haf-qin pipeline + per-model official token proof before any compat edits.",
      owner_approval_required: true,
      repo_mutation_required: false,
    },
    {
      step: 5,
      action: "split_mapping",
      root_cause_groups: ["samsung_haf_qin_da29_da97_conflicts"],
      affected_slug_count:
        byKey.get("samsung_haf_qin_da29_da97_conflicts")?.affected_slug_count ?? 0,
      risk_reduction_rationale:
        "After proof, retain only repo-proven samsung::HAFQIN or samsung::HAFCIN slug per model — drop co-mapped DA29+DA97 rows.",
      owner_approval_required: true,
      repo_mutation_required: true,
    },
    {
      step: 6,
      action: "evidence_research",
      root_cause_groups: ["lg_lt_generation_co_maps"],
      affected_slug_count: byKey.get("lg_lt_generation_co_maps")?.affected_slug_count ?? 0,
      risk_reduction_rationale:
        "34 LG models co-map multiple LT generations (lt1000p+lt1000pc dominant) — capture official single LT token per model before compat split.",
      owner_approval_required: true,
      repo_mutation_required: false,
    },
    {
      step: 7,
      action: "split_mapping",
      root_cause_groups: ["lg_lt_generation_co_maps"],
      affected_slug_count: byKey.get("lg_lt_generation_co_maps")?.affected_slug_count ?? 0,
      risk_reduction_rationale:
        "Reduce 34 wrong-part surfaces to one LT slug per model after official proof.",
      owner_approval_required: true,
      repo_mutation_required: true,
    },
    {
      step: 8,
      action: "evidence_research",
      root_cause_groups: ["ge_xwf_xwfe_rpwfe_legacy_mixes"],
      affected_slug_count:
        byKey.get("ge_xwf_xwfe_rpwfe_legacy_mixes")?.affected_slug_count ?? 0,
      risk_reduction_rationale:
        "7 GE models mix RFID (XWFE/RPWFE) and legacy (XWF) shells — model-specific GE spec required.",
      owner_approval_required: true,
      repo_mutation_required: false,
    },
    {
      step: 9,
      action: "split_mapping",
      root_cause_groups: ["ge_xwf_xwfe_rpwfe_legacy_mixes"],
      affected_slug_count:
        byKey.get("ge_xwf_xwfe_rpwfe_legacy_mixes")?.affected_slug_count ?? 0,
      risk_reduction_rationale:
        "Retain single RFID or legacy slug per proven GE model.",
      owner_approval_required: true,
      repo_mutation_required: true,
    },
    {
      step: 10,
      action: "split_mapping",
      root_cause_groups: ["quarantined_models"],
      affected_slug_count: byKey.get("quarantined_models")?.affected_slug_count ?? 0,
      risk_reduction_rationale:
        "After owner reconciliation, map lg-lrfxs3106s to lt1000p only (official LT1000P documented) and lift quarantine.",
      owner_approval_required: true,
      repo_mutation_required: true,
    },
  ];

  if (args.indexableRiskCount > 0) {
    steps[0]!.risk_reduction_rationale += ` URGENT: ${String(args.indexableRiskCount)} indexable_risk_pages require immediate noindex.`;
  }

  return steps;
}

export function buildDangerousMappingRemediationPlanV1(args: {
  rootDir: string;
  now?: () => Date;
}): DangerousMappingRemediationPlanV1 {
  const now = args.now ?? (() => new Date());
  const audit = loadAuditReport(args.rootDir);
  readCsv(args.rootDir, "data/fridge_models.csv");
  readCsv(args.rootDir, "data/compatibility_mappings.csv");

  const wildcardBySlug = loadWildcardRows(args.rootDir);
  if (existsSync(path.join(args.rootDir, HAF_QIN_HYPERAGENT_CSV_REL_V1))) {
    readFileSync(path.join(args.rootDir, HAF_QIN_HYPERAGENT_CSV_REL_V1), "utf8");
  }

  const dangerousRows = audit.model_rows.filter(
    (row) => row.classification === "WRONG_PART_RISK" || row.classification === "BLOCKED",
  );

  if (dangerousRows.length !== audit.factory_scaling.dangerous) {
    throw new Error(
      `Dangerous row count mismatch: filtered=${String(dangerousRows.length)} summary=${String(audit.factory_scaling.dangerous)}`,
    );
  }

  const grouped = new Map<RootCauseGroupV1, DangerousModelRemediationRowV1[]>();
  for (const group of ROOT_CAUSE_GROUPS_V1) {
    grouped.set(group, []);
  }

  for (const row of dangerousRows) {
    const rootCause = assignRootCauseGroup(row);
    grouped.get(rootCause)!.push(buildModelRow(row, rootCause, wildcardBySlug));
  }

  const root_cause_groups: RootCauseRemediationGroupV1[] = ROOT_CAUSE_GROUPS_V1.map(
    (rootCause) => {
      const models = (grouped.get(rootCause) ?? []).sort((a, b) =>
        a.fridge_slug.localeCompare(b.fridge_slug),
      );
      return {
        root_cause_group: rootCause,
        affected_slug_count: models.length,
        affected_slugs: models.map((model) => model.fridge_slug),
        dominant_mapped_filter_patterns: dominantMappedPatterns(models),
        suspected_correct_filter_family: groupSuspectedFamily(models),
        evidence_needed: evidenceNeededForGroup(rootCause),
        safest_action: safestActionForGroup(rootCause),
        hyperagent_can_help: hyperagentCanHelp(rootCause),
        models,
      };
    },
  );

  const smallest_safe_remediation_sequence = buildRemediationSequence({
    groups: root_cause_groups,
    indexableRiskCount: audit.indexable_risk_pages.length,
    dangerousCount: dangerousRows.length,
  });

  return {
    contract: DANGEROUS_MAPPING_REMEDIATION_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    source_audit_contract: MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
    source_audit_path: MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
    dangerous_model_count: dangerousRows.length,
    indexable_risk_page_count: audit.indexable_risk_pages.length,
    root_cause_groups,
    smallest_safe_remediation_sequence,
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        root_cause_groups: ".root_cause_groups",
        smallest_safe_remediation_sequence: ".smallest_safe_remediation_sequence",
      },
      recommended_next_action:
        "Execute remediation sequence steps 1–4 read-only (noindex + HyperAgent Samsung evidence research), then owner-approved remove_mapping/split_mapping for HAF-CIN blocker and proven families.",
    },
    exact_repo_paths_read: [
      "data/compatibility_mappings.csv",
      "data/fridge_models.csv",
      HAF_QIN_HYPERAGENT_CSV_REL_V1,
      HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1,
      MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
      DISCREPANCY_DOC_REL_V1,
      "scripts/lib/refrigerator-model-first-samsung-marketing-token-cross-reference-v1.ts",
      "src/lib/fridge/fridge-model-review-overrides.ts",
    ].sort(),
    proven_facts: [
      `PROVEN: dangerous_model_count=${String(dangerousRows.length)} from ${MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1}.`,
      `PROVEN: indexable_risk_page_count=${String(audit.indexable_risk_pages.length)}.`,
      "PROVEN: samsung::HAFQIN and samsung::HAFCIN families repo-proven via refrigerator-model-first-samsung-marketing-token-cross-reference-v1.",
      "PROVEN: lg-lrfxs3106s official LT1000P documented in docs/fridge-model-filter-mapping-discrepancies.md.",
      "PROVEN: Read-only remediation plan — no compat, Supabase, sitemap, robots, or page mutations.",
    ],
    unknown_facts: [
      "UNKNOWN: Per-model correct LT generation for 34 LG co-map slugs without official capture.",
      "UNKNOWN: Per-model DA29 vs DA97 family for Samsung co-map slugs without model-specific official pages.",
      "UNKNOWN: Per-model GE RFID vs legacy shell for 7 GE mix slugs without official spec pages.",
    ],
  };
}

function renderMarkdown(report: DangerousMappingRemediationPlanV1): string {
  const lines = [
    "# Dangerous mapping remediation plan v1",
    "",
    `- generated_at: **${report.generated_at}**`,
    `- dangerous_model_count: **${String(report.dangerous_model_count)}**`,
    `- indexable_risk_page_count: **${String(report.indexable_risk_page_count)}**`,
    "",
    "## Smallest safe remediation sequence",
    "",
  ];

  for (const step of report.smallest_safe_remediation_sequence) {
    lines.push(
      `### Step ${String(step.step)}: ${step.action}`,
      "",
      `- root_cause_groups: ${step.root_cause_groups.join(", ")}`,
      `- affected_slug_count: **${String(step.affected_slug_count)}**`,
      `- owner_approval_required: **${String(step.owner_approval_required)}**`,
      `- repo_mutation_required: **${String(step.repo_mutation_required)}**`,
      `- rationale: ${step.risk_reduction_rationale}`,
      "",
    );
  }

  for (const group of report.root_cause_groups) {
    lines.push(`## ${group.root_cause_group}`, "");
    lines.push(
      `- affected_slug_count: **${String(group.affected_slug_count)}**`,
      `- suspected_correct_filter_family: **${group.suspected_correct_filter_family}**`,
      `- safest_action: **${group.safest_action}**`,
      `- hyperagent_can_help: **${String(group.hyperagent_can_help)}**`,
      `- dominant_mapped_filter_patterns: ${group.dominant_mapped_filter_patterns.join("; ")}`,
      "",
      "### Affected slugs",
      "",
      group.affected_slugs.map((slug) => `- \`${slug}\``).join("\n"),
      "",
    );
  }

  lines.push("## Recommended next action", "", report.inspect_summary.recommended_next_action);
  return `${lines.join("\n")}\n`;
}

export function writeDangerousMappingRemediationPlanArtifactsV1(args: {
  rootDir: string;
  report: DangerousMappingRemediationPlanV1;
}): {
  jsonRelPath: string;
  mdRelPath: string;
} {
  const jsonAbs = path.join(args.rootDir, DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, DANGEROUS_MAPPING_REMEDIATION_PLAN_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, renderMarkdown(args.report), "utf8");
  return {
    jsonRelPath: DANGEROUS_MAPPING_REMEDIATION_PLAN_JSON_REL_V1,
    mdRelPath: DANGEROUS_MAPPING_REMEDIATION_PLAN_MD_REL_V1,
  };
}
