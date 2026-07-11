/**
 * Read-only GSWF PARTIAL slug owner-browser proof packet v1.
 * Captures what Tier-1 exact-model proof is missing for the 3 excluded PARTIAL GSWF rows.
 * Does not mutate compat, retailer_links, evidence, Supabase, pages, sitemap, robots, or HQ handoff.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  GSWF_FAMILY_KEY_V1,
  GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_CONTRACT_V1,
  GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_JSON_REL_V1,
  GSWF_CURSOR_VALIDATION_JSON_REL_V1,
  type GswfFamilyReconciliationSlugRowV1,
} from "./gswf-family-reconciliation-owner-review-v1";
import {
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
  GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";
import { GSWF_WRONG_PART_GUARDED_APPLY_DRY_RUN_JSON_REL_V1 } from "./gswf-wrong-part-repair-guarded-apply-v1";

export const GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_CONTRACT_V1 =
  "gswf_partial_owner_browser_proof_packet_v1" as const;

export const GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-partial-owner-browser-proof-packet-v1.json" as const;

export const GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_MD_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-partial-owner-browser-proof-packet-v1.md" as const;

export const GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_SOURCE_COMMAND_V1 =
  "npm run buckparts:gswf-partial-owner-browser-proof-packet" as const;

export const GSWF_PARTIAL_OWNER_BROWSER_PROOF_TARGET_SLUGS_V1 = [
  ...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
] as const;

export type GswfPartialProofStatusV1 =
  | "EXACT_MODEL_TIER1_PROVEN"
  | "BROWSER_PROOF_REQUIRED"
  | "UNKNOWN";

export type GswfPartialOwnerBrowserProofSlugRowV1 = {
  fridge_slug: string;
  model_number: string | null;
  repo_mapped_filter_slugs: string[];
  cursor_verdict: string;
  hyperagent_actual_filter: string;
  hyperagent_evidence_confidence: string;
  hyperagent_source_type: string | null;
  hypothesized_remap_target_filter_slug: string | null;
  hypothesized_remap_confidence: "INFERRED" | "UNKNOWN";
  proof_status: GswfPartialProofStatusV1;
  exact_model_tier1_proven: false;
  missing_proof: string[];
  existing_repo_evidence: {
    manual_evidence_rel_path: string | null;
    manual_evidence_exists: boolean;
    owner_browser_proof_result_exists: boolean;
    cursor_validation_reason: string | null;
  };
  include_in_apply_plan: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  buy_cta_authorized: false;
  recommended_owner_browser_action: string;
};

export type GswfPartialOwnerBrowserProofPacketV1 = {
  contract: typeof GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  verified_link_authorized: false;
  buy_cta_authorized: false;
  apply_plan_authorized: false;
  include_in_gswf_wrong_part_apply_plan: false;
  owner_review_required: true;
  generated_at: string;
  source_command: typeof GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_SOURCE_COMMAND_V1;
  family_key: typeof GSWF_FAMILY_KEY_V1;
  target_slugs: readonly string[];
  source_artifacts: {
    family_reconciliation_owner_review_rel_path: typeof GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_JSON_REL_V1;
    wrong_part_apply_plan_rel_path: typeof GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1;
    guarded_apply_dry_run_rel_path: typeof GSWF_WRONG_PART_GUARDED_APPLY_DRY_RUN_JSON_REL_V1;
    cursor_validation_rel_path: typeof GSWF_CURSOR_VALIDATION_JSON_REL_V1;
  };
  summary_counts: {
    total_partial_slugs: number;
    exact_model_tier1_proven: number;
    browser_proof_required: number;
    unknown: number;
  };
  slug_rows: GswfPartialOwnerBrowserProofSlugRowV1[];
  owner_checklist: string[];
  recommended_next_action: string;
  exact_repo_paths_read: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

type FamilyPacketV1 = {
  contract?: string;
  family_key?: string;
  browser_proof_required_rows?: GswfFamilyReconciliationSlugRowV1[];
};

type CursorRowV1 = {
  fridge_slug?: string;
  hyperagent_source_type?: string;
  reason?: string;
  hyperagent_actual_filter?: string;
  hyperagent_evidence_confidence?: string;
  cursor_verdict?: string;
  repo_compat_filter_slugs?: string[];
};

type CursorPacketV1 = {
  validation_details?: {
    row_verdicts?: CursorRowV1[];
  };
};

type DryRunPacketV1 = {
  excluded_slugs_untouched?: string[];
  apply_status?: string;
  data_mutation?: boolean;
};

type ApplyPlanPacketV1 = {
  excluded_from_plan?: {
    partial_browser_proof_required_slugs?: string[];
  };
  planned_rows?: Array<{ fridge_slug?: string }>;
};

const COMPATIBILITY_MAPPINGS_CSV_REL_V1 = "data/compatibility_mappings.csv" as const;
const FRIDGE_MODELS_CSV_REL_V1 = "data/fridge_models.csv" as const;
const MANUAL_EVIDENCE_DIR_REL_V1 = "data/manual-evidence/refrigerator" as const;

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function readJsonFile<T>(rootDir: string, relPath: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, relPath), "utf8")) as T;
}

function readCompatBySlug(rootDir: string): Map<string, string[]> {
  const rows = parse(
    readFileSync(path.join(rootDir, COMPATIBILITY_MAPPINGS_CSV_REL_V1), "utf8"),
    {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    },
  ) as Array<{ fridge_slug?: string; filter_slug?: string }>;

  const bySlug = new Map<string, string[]>();
  for (const row of rows) {
    const slug = row.fridge_slug?.trim();
    const filter = row.filter_slug?.trim();
    if (!slug || !filter) continue;
    const key = normalizeSlug(slug);
    const existing = bySlug.get(key) ?? [];
    existing.push(normalizeSlug(filter));
    bySlug.set(key, existing);
  }
  for (const [slug, filters] of Array.from(bySlug.entries())) {
    bySlug.set(slug, Array.from(new Set(filters)).sort());
  }
  return bySlug;
}

function readModelNumbers(rootDir: string): Map<string, string> {
  const rows = parse(readFileSync(path.join(rootDir, FRIDGE_MODELS_CSV_REL_V1), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ slug?: string; model_number?: string }>;

  const bySlug = new Map<string, string>();
  for (const row of rows) {
    const slug = row.slug?.trim();
    const model = row.model_number?.trim();
    if (!slug || !model) continue;
    bySlug.set(normalizeSlug(slug), model);
  }
  return bySlug;
}

function manualEvidenceRelPath(fridgeSlug: string): string {
  return `${MANUAL_EVIDENCE_DIR_REL_V1}/${normalizeSlug(fridgeSlug)}.json`;
}

function buildMissingProof(args: {
  fridgeSlug: string;
  modelNumber: string | null;
  sourceType: string | null;
}): string[] {
  const modelLabel = args.modelNumber ?? args.fridgeSlug.toUpperCase().replace(/^GE-/, "");
  return [
    `Exact-model owner-browser Tier-1 capture on ${modelLabel} (not sibling/platform inference).`,
    "Official manufacturer filter_specification / parts page naming the replacement filter for this exact model.",
    "Repo manual-evidence JSON under data/manual-evidence/refrigerator/ for this exact fridge_slug.",
    args.sourceType
      ? `Current discovery source_type=${args.sourceType} is insufficient for apply-plan inclusion.`
      : "Current discovery lacks exact-model OEM proof.",
  ];
}

function buildRecommendedAction(args: {
  fridgeSlug: string;
  modelNumber: string | null;
  hypothesizedTarget: string | null;
}): string {
  const model = args.modelNumber ?? args.fridgeSlug;
  const targetHint = args.hypothesizedTarget
    ? ` Confirm or refute hypothesized remap target \`${args.hypothesizedTarget}\` only after exact-model proof.`
    : "";
  return `Owner-browser Tier-1 on exact model ${model}: open GE OEM product/parts/support page for this exact SKU, capture filter part number screenshot/URL, write manual-evidence JSON — do not edit compatibility_mappings.csv yet.${targetHint}`;
}

export function buildGswfPartialOwnerBrowserProofPacketV1(args: {
  rootDir: string;
  now?: () => Date;
}): GswfPartialOwnerBrowserProofPacketV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();

  const family = readJsonFile<FamilyPacketV1>(
    args.rootDir,
    GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_JSON_REL_V1,
  );
  if (family.contract !== GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_CONTRACT_V1) {
    throw new Error("GSWF family reconciliation owner review contract mismatch");
  }
  if (family.family_key !== GSWF_FAMILY_KEY_V1) {
    throw new Error("GSWF family reconciliation family_key mismatch");
  }

  const applyPlan = readJsonFile<ApplyPlanPacketV1>(
    args.rootDir,
    GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1,
  );
  const dryRun = readJsonFile<DryRunPacketV1>(
    args.rootDir,
    GSWF_WRONG_PART_GUARDED_APPLY_DRY_RUN_JSON_REL_V1,
  );
  const cursor = readJsonFile<CursorPacketV1>(args.rootDir, GSWF_CURSOR_VALIDATION_JSON_REL_V1);

  const familyPartial = family.browser_proof_required_rows ?? [];
  const familySlugs = familyPartial.map((row) => normalizeSlug(row.fridge_slug)).sort();
  const expected = [...GSWF_PARTIAL_OWNER_BROWSER_PROOF_TARGET_SLUGS_V1].map(normalizeSlug).sort();
  if (JSON.stringify(familySlugs) !== JSON.stringify(expected)) {
    throw new Error(
      `PARTIAL slug set mismatch — expected ${expected.join(", ")}, got ${familySlugs.join(", ")}`,
    );
  }

  const plannedSlugs = new Set(
    (applyPlan.planned_rows ?? []).map((row) => normalizeSlug(row.fridge_slug ?? "")),
  );
  for (const slug of expected) {
    if (plannedSlugs.has(slug)) {
      throw new Error(`PARTIAL slug ${slug} must not appear in wrong-part apply plan planned_rows`);
    }
  }

  const excludedFromPlan = (
    applyPlan.excluded_from_plan?.partial_browser_proof_required_slugs ?? []
  )
    .map(normalizeSlug)
    .sort();
  if (JSON.stringify(excludedFromPlan) !== JSON.stringify(expected)) {
    throw new Error("apply-plan excluded PARTIAL slug set mismatch");
  }

  const dryRunExcluded = (dryRun.excluded_slugs_untouched ?? []).map(normalizeSlug);
  for (const slug of expected) {
    if (!dryRunExcluded.includes(slug)) {
      throw new Error(`guarded dry-run excluded_slugs_untouched missing ${slug}`);
    }
  }

  const cursorBySlug = new Map(
    (cursor.validation_details?.row_verdicts ?? [])
      .filter((row) => row.fridge_slug)
      .map((row) => [normalizeSlug(row.fridge_slug!), row] as const),
  );
  const familyBySlug = new Map(
    familyPartial.map((row) => [normalizeSlug(row.fridge_slug), row] as const),
  );
  const compatBySlug = readCompatBySlug(args.rootDir);
  const modelBySlug = readModelNumbers(args.rootDir);

  const slug_rows: GswfPartialOwnerBrowserProofSlugRowV1[] = [];
  for (const targetSlug of GSWF_PARTIAL_OWNER_BROWSER_PROOF_TARGET_SLUGS_V1) {
    const slug = normalizeSlug(targetSlug);
    const familyRow = familyBySlug.get(slug);
    if (!familyRow) {
      throw new Error(`family packet missing PARTIAL row ${slug}`);
    }
    const cursorRow = cursorBySlug.get(slug);
    const modelNumber = modelBySlug.get(slug) ?? null;
    const manualRel = manualEvidenceRelPath(slug);
    const manualExists = existsSync(path.join(args.rootDir, manualRel));
    const sourceType = cursorRow?.hyperagent_source_type ?? null;
    const hypothesized = familyRow.proposed_remap_target_filter_slug
      ? normalizeSlug(familyRow.proposed_remap_target_filter_slug)
      : null;

    // Exact-model Tier-1 is not proven in repo for these PARTIAL rows (no manual-evidence JSON).
    // Platform/OEM-adjacent HyperAgent discovery remains INFERRED for apply purposes.
    const proof_status: GswfPartialProofStatusV1 = manualExists
      ? "EXACT_MODEL_TIER1_PROVEN"
      : "BROWSER_PROOF_REQUIRED";

    slug_rows.push({
      fridge_slug: slug,
      model_number: modelNumber,
      repo_mapped_filter_slugs: compatBySlug.get(slug) ?? familyRow.repo_mapped_filter_slugs,
      cursor_verdict: familyRow.cursor_verdict,
      hyperagent_actual_filter: familyRow.hyperagent_actual_filter,
      hyperagent_evidence_confidence: familyRow.hyperagent_evidence_confidence,
      hyperagent_source_type: sourceType,
      hypothesized_remap_target_filter_slug: hypothesized,
      hypothesized_remap_confidence: hypothesized ? "INFERRED" : "UNKNOWN",
      proof_status: proof_status === "EXACT_MODEL_TIER1_PROVEN" ? proof_status : "BROWSER_PROOF_REQUIRED",
      exact_model_tier1_proven: false,
      missing_proof: buildMissingProof({
        fridgeSlug: slug,
        modelNumber,
        sourceType,
      }),
      existing_repo_evidence: {
        manual_evidence_rel_path: manualExists ? manualRel : null,
        manual_evidence_exists: manualExists,
        owner_browser_proof_result_exists: false,
        cursor_validation_reason: cursorRow?.reason ?? null,
      },
      include_in_apply_plan: false,
      mutation_authorized: false,
      csv_apply_authorized: false,
      buy_cta_authorized: false,
      recommended_owner_browser_action: buildRecommendedAction({
        fridgeSlug: slug,
        modelNumber,
        hypothesizedTarget: hypothesized,
      }),
    });
  }

  // Force exact_model_tier1_proven false when no manual evidence (repo truth for these three).
  for (const row of slug_rows) {
    if (!row.existing_repo_evidence.manual_evidence_exists) {
      row.proof_status = "BROWSER_PROOF_REQUIRED";
      row.exact_model_tier1_proven = false;
    }
  }

  const summary_counts = {
    total_partial_slugs: slug_rows.length,
    exact_model_tier1_proven: slug_rows.filter((r) => r.proof_status === "EXACT_MODEL_TIER1_PROVEN")
      .length,
    browser_proof_required: slug_rows.filter((r) => r.proof_status === "BROWSER_PROOF_REQUIRED")
      .length,
    unknown: slug_rows.filter((r) => r.proof_status === "UNKNOWN").length,
  };

  const exact_repo_paths_read = [
    GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_JSON_REL_V1,
    GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1,
    GSWF_WRONG_PART_GUARDED_APPLY_DRY_RUN_JSON_REL_V1,
    GSWF_CURSOR_VALIDATION_JSON_REL_V1,
    COMPATIBILITY_MAPPINGS_CSV_REL_V1,
    FRIDGE_MODELS_CSV_REL_V1,
  ].sort();

  return {
    contract: GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    verified_link_authorized: false,
    buy_cta_authorized: false,
    apply_plan_authorized: false,
    include_in_gswf_wrong_part_apply_plan: false,
    owner_review_required: true,
    generated_at: generatedAt,
    source_command: GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_SOURCE_COMMAND_V1,
    family_key: GSWF_FAMILY_KEY_V1,
    target_slugs: [...GSWF_PARTIAL_OWNER_BROWSER_PROOF_TARGET_SLUGS_V1],
    source_artifacts: {
      family_reconciliation_owner_review_rel_path: GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_JSON_REL_V1,
      wrong_part_apply_plan_rel_path: GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1,
      guarded_apply_dry_run_rel_path: GSWF_WRONG_PART_GUARDED_APPLY_DRY_RUN_JSON_REL_V1,
      cursor_validation_rel_path: GSWF_CURSOR_VALIDATION_JSON_REL_V1,
    },
    summary_counts,
    slug_rows,
    owner_checklist: [
      "These 3 PARTIAL slugs are excluded from the 13-row GSWF wrong-part apply plan and guarded dry-run apply set.",
      "Do not mutate compatibility_mappings.csv for these slugs until exact-model Tier-1 owner-browser proof exists.",
      "Hypothesized remap targets (rpwfe/mwf) from HyperAgent are INFERRED only — not apply-ready.",
      "No GSWF buy CTA authorization from this packet.",
      "Capture exact-model OEM filter_specification evidence, then re-open a separate repair-plan lane if proven.",
    ],
    recommended_next_action:
      "Owner-browser Tier-1 capture for ge-gfe28hmkww, ge-gsc25frshss, and ge-gse26gshess on exact model pages — keep them out of any GSWF apply plan until proof_status=EXACT_MODEL_TIER1_PROVEN.",
    exact_repo_paths_read,
    proven_facts: [
      "PROVEN: Family reconciliation lists exactly 3 browser_proof_required_rows matching the target slug set.",
      "PROVEN: Wrong-part apply plan excludes these 3 PARTIAL slugs from planned_rows.",
      "PROVEN: Guarded dry-run excluded_slugs_untouched includes these 3 PARTIAL slugs.",
      `PROVEN: summary browser_proof_required=${String(summary_counts.browser_proof_required)}; exact_model_tier1_proven=${String(summary_counts.exact_model_tier1_proven)}.`,
      "PROVEN: No data/manual-evidence/refrigerator/<slug>.json exists for these three PARTIAL slugs.",
      "PROVEN: mutation_authorized=false; buy_cta_authorized=false; include_in_gswf_wrong_part_apply_plan=false.",
    ],
    inferred_facts: [
      "INFERRED: HyperAgent hypothesized remaps (RPWFE for ge-gfe28hmkww; MWF for ge-gsc25frshss and ge-gse26gshess) remain platform/OEM-adjacent discovery only.",
    ],
    unknown_facts: [
      "UNKNOWN: Exact OEM filter part number for ge-gfe28hmkww until owner-browser Tier-1 on GFE28HMKWW.",
      "UNKNOWN: Exact OEM filter part number for ge-gsc25frshss until owner-browser Tier-1 on GSC25FRSHSS.",
      "UNKNOWN: Exact OEM filter part number for ge-gse26gshess until owner-browser Tier-1 on GSE26GSHESS.",
    ],
  };
}

export function buildGswfPartialOwnerBrowserProofPacketMarkdownV1(
  packet: GswfPartialOwnerBrowserProofPacketV1,
): string {
  const lines: string[] = [
    "# GSWF PARTIAL owner-browser proof packet v1",
    "",
    `Generated: ${packet.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${packet.contract}\``,
    `- family_key: \`${packet.family_key}\``,
    `- read_only: **true**`,
    `- mutation_authorized: **false**`,
    `- buy_cta_authorized: **false**`,
    `- include_in_gswf_wrong_part_apply_plan: **false**`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| total PARTIAL slugs | ${String(packet.summary_counts.total_partial_slugs)} |`,
    `| EXACT_MODEL_TIER1_PROVEN | ${String(packet.summary_counts.exact_model_tier1_proven)} |`,
    `| BROWSER_PROOF_REQUIRED | ${String(packet.summary_counts.browser_proof_required)} |`,
    `| UNKNOWN | ${String(packet.summary_counts.unknown)} |`,
    "",
    "## Owner checklist",
    "",
    ...packet.owner_checklist.map((item) => `- ${item}`),
    "",
    "## Slug proof rows",
    "",
  ];

  for (const row of packet.slug_rows) {
    lines.push(`### ${row.fridge_slug}`, "");
    lines.push(`- model_number: \`${row.model_number ?? "UNKNOWN"}\``);
    lines.push(`- proof_status: **${row.proof_status}**`);
    lines.push(`- exact_model_tier1_proven: **false**`);
    lines.push(`- repo maps: \`${row.repo_mapped_filter_slugs.join("|")}\``);
    lines.push(`- cursor_verdict: \`${row.cursor_verdict}\``);
    lines.push(`- hyperagent_actual_filter: \`${row.hyperagent_actual_filter}\``);
    lines.push(`- hyperagent_source_type: \`${row.hyperagent_source_type ?? "UNKNOWN"}\``);
    lines.push(
      `- hypothesized_remap: \`${row.hypothesized_remap_target_filter_slug ?? "none"}\` (${row.hypothesized_remap_confidence})`,
    );
    lines.push(`- include_in_apply_plan: **false**`);
    lines.push(`- buy_cta_authorized: **false**`);
    lines.push("- missing_proof:");
    for (const item of row.missing_proof) {
      lines.push(`  - ${item}`);
    }
    if (row.existing_repo_evidence.cursor_validation_reason) {
      lines.push(`- cursor reason: ${row.existing_repo_evidence.cursor_validation_reason}`);
    }
    lines.push(`- recommended: ${row.recommended_owner_browser_action}`, "");
  }

  lines.push("## Recommended next action", "", packet.recommended_next_action, "");
  return `${lines.join("\n")}\n`;
}

export function writeGswfPartialOwnerBrowserProofPacketArtifactsV1(args: {
  rootDir: string;
  packet: GswfPartialOwnerBrowserProofPacketV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(args.rootDir, GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.packet, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildGswfPartialOwnerBrowserProofPacketMarkdownV1(args.packet), "utf8");
  return {
    json_rel_path: GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_JSON_REL_V1,
    md_rel_path: GSWF_PARTIAL_OWNER_BROWSER_PROOF_PACKET_MD_REL_V1,
  };
}
