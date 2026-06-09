/**
 * Read-only ANCHOR_INTEGRITY_AUDIT_V1.
 * Audits trustworthiness of proven anchor models before evidence cloning or Page Factory scaling.
 * Does not mutate compat, evidence, Supabase, sitemap, robots, pages, or HQ handoff.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  validateRefrigeratorManualEvidencePublicReady,
  type RefrigeratorManualEvidenceRecord,
  type RefrigeratorManualEvidenceSource,
} from "@/lib/manuals/refrigerator-manual-evidence";

import {
  EVIDENCE_LEVERAGE_PRIORITIZATION_CONTRACT_V1,
  EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
  type EvidenceLeverageFamilyRowV1,
  type EvidenceLeveragePrioritizationV1,
} from "./evidence-leverage-prioritization-v1";
import {
  evaluateAllLearnedFailureGuardsV1,
  type PerSlugLearnedFailureGuardsV1,
} from "./learned-failure-guards-v1";
import {
  MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
  MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  type ModelFilterCorrectnessAuditV1,
  type ModelFilterCorrectnessRowV1,
} from "./model-filter-correctness-audit-v1";
import {
  PROVEN_COHORT_PAGE_FACTORY_MANIFEST_CONTRACT_V1,
  PROVEN_COHORT_PAGE_FACTORY_MANIFEST_JSON_REL_V1,
  type ProvenCohortPageFactoryManifestV1,
} from "./proven-cohort-page-factory-manifest-v1";

export const ANCHOR_INTEGRITY_AUDIT_CONTRACT_V1 = "anchor_integrity_audit_v1" as const;

export const ANCHOR_INTEGRITY_AUDIT_JSON_REL_V1 =
  "data/fridge/batch-production/audits/anchor-integrity-audit-v1.json" as const;

export const ANCHOR_INTEGRITY_AUDIT_MD_REL_V1 =
  "data/fridge/batch-production/drafts/anchor-integrity-audit-v1.md" as const;

export const ANCHOR_INTEGRITY_AUDIT_ALLOWED_WRITE_REL_PATHS_V1 = [
  ANCHOR_INTEGRITY_AUDIT_JSON_REL_V1,
  ANCHOR_INTEGRITY_AUDIT_MD_REL_V1,
] as const;

export const ANCHOR_HEALTH_STATUSES_V1 = ["HEALTHY", "WATCHLIST", "DISPUTED"] as const;

export type AnchorHealthStatusV1 = (typeof ANCHOR_HEALTH_STATUSES_V1)[number];

export type AnchorIntegrityChecksV1 = {
  support_page_present: boolean;
  manual_evidence_present: boolean;
  model_specific_filter_proof_present: boolean;
  source_title_contains_exact_model_number: boolean;
  learned_failure_guards_status: "PASS" | "WARN" | "BLOCK";
  sibling_family_conflict_detected: boolean;
  evidence_clone_dependency_count: number;
  proven_models_depending_on_anchor: number;
  evidence_age_days: number | null;
  disputed_by_external_research_flag: boolean;
};

export type AnchorIntegrityRowV1 = {
  anchor_slug: string;
  anchor_family: string | null;
  anchor_health: AnchorHealthStatusV1;
  model_number: string;
  brand_slug: string;
  checks: AnchorIntegrityChecksV1;
  health_reasons: string[];
  clone_families: string[];
};

export type AnchorHealthSummaryV1 = {
  healthy_count: number;
  watchlist_count: number;
  disputed_count: number;
  sibling_conflict_disputed_count: number;
  total_anchor_count: number;
};

export type AnchorIntegrityAuditV1 = {
  contract: typeof ANCHOR_INTEGRITY_AUDIT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_blocked_until_owner_approval: true;
  mutation_authorized: false;
  generated_at: string;
  anchor_health_summary: AnchorHealthSummaryV1;
  highest_risk_anchors: AnchorIntegrityRowV1[];
  anchor_rows: AnchorIntegrityRowV1[];
  families_with_disputed_or_watchlist_primary_anchor: string[];
  inspect_summary: {
    recommended_jq_paths: {
      anchor_health_summary: ".anchor_health_summary";
      highest_risk_anchors: ".highest_risk_anchors";
      anchor_rows: ".anchor_rows";
    };
    recommended_next_action: string;
  };
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

const MANUAL_EVIDENCE_DIR_REL_V1 = "data/manual-evidence/refrigerator";
const LEARNED_FAILURE_GUARDS_JSON_REL_V1 =
  "data/fridge/batch-production/audits/learned-failure-guards-v1.json";
const COMPAT_MAPPINGS_REL_V1 = "data/compatibility_mappings.csv";
const EVIDENCE_AGE_WATCHLIST_DAYS_V1 = 90;

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function readJsonFile<T>(rootDir: string, relPath: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, relPath), "utf8")) as T;
}

function normalizedEvidenceSources(
  record: RefrigeratorManualEvidenceRecord,
): RefrigeratorManualEvidenceSource[] {
  if (Array.isArray(record.sources) && record.sources.length > 0) {
    return record.sources;
  }
  if (record.source_url && record.source_title && record.source_host && record.source_type) {
    return [
      {
        source_type: record.source_type,
        source_url: record.source_url,
        source_title: record.source_title,
        source_host: record.source_host,
        evidence_role: "replacement_process_guidance",
      },
    ];
  }
  return [];
}

function loadManualEvidenceBySlug(rootDir: string): Map<string, RefrigeratorManualEvidenceRecord> {
  const dir = path.join(rootDir, MANUAL_EVIDENCE_DIR_REL_V1);
  const out = new Map<string, RefrigeratorManualEvidenceRecord>();
  if (!existsSync(dir)) return out;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const record = JSON.parse(
        readFileSync(path.join(dir, file), "utf8"),
      ) as RefrigeratorManualEvidenceRecord;
      const slug = normalizeSlug(record.fridge_model_slug ?? file.replace(/\.json$/, ""));
      out.set(slug, record);
    } catch {
      // skip malformed fixtures
    }
  }
  return out;
}

export function filterSpecificationModelProofPresentV1(
  record: RefrigeratorManualEvidenceRecord | undefined,
  modelNumber: string,
): boolean {
  if (!record) return false;
  const needle = modelNumber.trim().toUpperCase();
  if (!needle) return false;
  return normalizedEvidenceSources(record).some(
    (source) =>
      source.evidence_role === "filter_specification" &&
      (source.source_title ?? "").toUpperCase().includes(needle),
  );
}

function sourceTitleContainsExactModelNumber(
  record: RefrigeratorManualEvidenceRecord | undefined,
  modelNumber: string,
): boolean {
  if (!record) return false;
  const needle = modelNumber.trim().toUpperCase();
  if (!needle) return false;
  return normalizedEvidenceSources(record).some((source) =>
    (source.source_title ?? "").toUpperCase().includes(needle),
  );
}

function supportPagePresent(
  record: RefrigeratorManualEvidenceRecord | undefined,
  modelNumber: string,
): boolean {
  if (!record) return false;
  const needle = modelNumber.trim().toUpperCase();
  const needleLower = needle.toLowerCase();
  const candidates = normalizedEvidenceSources(record);
  if (record.source_url) {
    candidates.push({
      source_type: record.source_type,
      source_url: record.source_url,
      source_title: record.source_title,
      source_host: record.source_host,
      evidence_role: "model_support_context",
    });
  }
  return candidates.some((source) => {
    const url = (source.source_url ?? "").toLowerCase();
    const host = (source.source_host ?? "").toLowerCase();
    const title = (source.source_title ?? "").toUpperCase();
    const modelInUrlOrTitle =
      url.includes(needleLower) || title.includes(needle);

    const frigidaireSupport =
      (host.includes("support.") ||
        url.includes("/product-support/") ||
        url.includes("/owner-center/")) &&
      modelInUrlOrTitle;

    const geSupport =
      host.includes("products.geappliances.com") &&
      url.includes("/support") &&
      modelInUrlOrTitle;

    const whirlpoolOwnersCenter =
      url.includes("owners-center-pdp.") && modelInUrlOrTitle;

    const samsungSupport =
      (url.includes("samsung.com/us/support/") ||
        (host.includes("samsung.com") && url.includes(".pdf"))) &&
      modelInUrlOrTitle;

    return frigidaireSupport || geSupport || whirlpoolOwnersCenter || samsungSupport;
  });
}

function evidenceAgeDays(
  record: RefrigeratorManualEvidenceRecord | undefined,
  now: Date,
): number | null {
  if (!record?.evidence_date) return null;
  const parsed = new Date(record.evidence_date);
  if (Number.isNaN(parsed.getTime())) return null;
  const ms = now.getTime() - parsed.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function siblingFamilyConflictDetected(guardRow: PerSlugLearnedFailureGuardsV1 | undefined): boolean {
  if (!guardRow) return false;
  const drift = guardRow.confusion_family_guards.find(
    (guard) => guard.guard_id === "frigidaire_proven_anchor_sibling_drift",
  );
  return drift?.verdict === "WARN" || drift?.verdict === "BLOCK";
}

function collectProvenAnchorSlugs(args: {
  leverage: EvidenceLeveragePrioritizationV1;
  cohort: ProvenCohortPageFactoryManifestV1;
}): string[] {
  const anchors = new Set<string>();
  for (const family of [...args.leverage.filter_families, ...args.leverage.model_families]) {
    for (const slug of family.proven_anchor_slugs) {
      anchors.add(normalizeSlug(slug));
    }
  }
  for (const row of args.cohort.cohort_rows) {
    if (row.audit_classification === "PROVEN_CORRECT") {
      anchors.add(normalizeSlug(row.fridge_slug));
    }
  }
  return Array.from(anchors).sort((a, b) => a.localeCompare(b));
}

function buildCloneFamilyIndex(
  families: EvidenceLeverageFamilyRowV1[],
): Map<string, { families: string[]; dependentUnprovenCount: number }> {
  const index = new Map<string, { families: Set<string>; dependentUnprovenCount: number }>();
  for (const family of families) {
    if (family.evidence_gap_type !== "EVIDENCE_CLONE_FROM_FAMILY_ANCHOR") continue;
    for (const anchorSlug of family.proven_anchor_slugs) {
      const slug = normalizeSlug(anchorSlug);
      const bucket = index.get(slug) ?? { families: new Set<string>(), dependentUnprovenCount: 0 };
      bucket.families.add(family.family_key);
      bucket.dependentUnprovenCount += family.currently_unproven_count;
      index.set(slug, bucket);
    }
  }
  return new Map(
    Array.from(index.entries()).map(([slug, bucket]) => [
      slug,
      {
        families: Array.from(bucket.families).sort((a, b) => a.localeCompare(b)),
        dependentUnprovenCount: bucket.dependentUnprovenCount,
      },
    ]),
  );
}

function primaryAnchorFamily(
  slug: string,
  families: EvidenceLeverageFamilyRowV1[],
): string | null {
  const matches = families.filter((family) =>
    family.proven_anchor_slugs.map(normalizeSlug).includes(slug),
  );
  if (matches.length === 0) return null;
  const sorted = [...matches].sort(
    (a, b) => b.estimated_factory_unlock_score - a.estimated_factory_unlock_score,
  );
  return sorted[0]?.family_key ?? null;
}

function deriveAnchorHealth(args: {
  checks: AnchorIntegrityChecksV1;
  manualEvidencePublicReady: boolean;
}): { health: AnchorHealthStatusV1; reasons: string[] } {
  const filterSpecModelProofPresent = args.checks.model_specific_filter_proof_present;

  const disputed =
    !filterSpecModelProofPresent &&
    (args.checks.sibling_family_conflict_detected ||
      !args.checks.source_title_contains_exact_model_number);

  if (disputed) {
    const reasons: string[] = [];
    if (args.checks.sibling_family_conflict_detected) {
      reasons.push("sibling_family_conflict_detected");
    }
    if (!filterSpecModelProofPresent) {
      reasons.push("filter_specification_model_proof_missing");
    }
    return { health: "DISPUTED", reasons };
  }

  const watchlistReasons: string[] = [];
  if (args.checks.sibling_family_conflict_detected) {
    watchlistReasons.push("sibling_family_conflict_detected");
  }
  if (!filterSpecModelProofPresent) {
    watchlistReasons.push("filter_specification_model_proof_missing");
  }
  if (!args.manualEvidencePublicReady) {
    watchlistReasons.push("manual_evidence_not_public_ready");
  }
  if (!args.checks.support_page_present) {
    watchlistReasons.push("support_page_missing");
  }
  if (args.checks.learned_failure_guards_status === "WARN") {
    watchlistReasons.push("learned_failure_guards_warn");
  }
  if (
    args.checks.evidence_age_days !== null &&
    args.checks.evidence_age_days > EVIDENCE_AGE_WATCHLIST_DAYS_V1
  ) {
    watchlistReasons.push(`evidence_age_days>${String(EVIDENCE_AGE_WATCHLIST_DAYS_V1)}`);
  }

  if (watchlistReasons.length > 0) {
    return { health: "WATCHLIST", reasons: watchlistReasons };
  }

  return { health: "HEALTHY", reasons: ["all_anchor_integrity_checks_pass"] };
}

/** Exit code helper for report CLI: fail only on sibling-conflict DISPUTED anchors. */
export function anchorIntegrityAuditExitCodeV1(report: AnchorIntegrityAuditV1): number {
  return report.anchor_health_summary.sibling_conflict_disputed_count > 0 ? 1 : 0;
}

export function buildAnchorIntegrityAuditV1(args: {
  rootDir: string;
  now?: () => Date;
}): AnchorIntegrityAuditV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();

  const leverage = readJsonFile<EvidenceLeveragePrioritizationV1>(
    args.rootDir,
    EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
  );
  const cohort = readJsonFile<ProvenCohortPageFactoryManifestV1>(
    args.rootDir,
    PROVEN_COHORT_PAGE_FACTORY_MANIFEST_JSON_REL_V1,
  );
  const audit = readJsonFile<ModelFilterCorrectnessAuditV1>(
    args.rootDir,
    MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  );

  if (leverage.contract !== EVIDENCE_LEVERAGE_PRIORITIZATION_CONTRACT_V1) {
    throw new Error("Evidence leverage contract mismatch");
  }
  if (cohort.contract !== PROVEN_COHORT_PAGE_FACTORY_MANIFEST_CONTRACT_V1) {
    throw new Error("Proven cohort manifest contract mismatch");
  }
  if (audit.contract !== MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1) {
    throw new Error("Model filter correctness audit contract mismatch");
  }

  readFileSync(path.join(args.rootDir, COMPAT_MAPPINGS_REL_V1), "utf8");
  if (existsSync(path.join(args.rootDir, LEARNED_FAILURE_GUARDS_JSON_REL_V1))) {
    readFileSync(path.join(args.rootDir, LEARNED_FAILURE_GUARDS_JSON_REL_V1), "utf8");
  }

  const manualEvidenceBySlug = loadManualEvidenceBySlug(args.rootDir);
  const guardReport = evaluateAllLearnedFailureGuardsV1({ rootDir: args.rootDir, now: args.now });
  const guardBySlug = new Map(
    guardReport.per_slug_guards.map((row) => [row.fridge_slug, row]),
  );
  const auditBySlug = new Map(
    audit.model_rows.map((row) => [normalizeSlug(row.fridge_slug), row]),
  );
  const cohortBySlug = new Map(
    cohort.cohort_rows.map((row) => [normalizeSlug(row.fridge_slug), row]),
  );

  const allFamilies = [...leverage.filter_families, ...leverage.model_families];
  const cloneIndex = buildCloneFamilyIndex(allFamilies);
  const anchorSlugs = collectProvenAnchorSlugs({ leverage, cohort });

  const anchor_rows: AnchorIntegrityRowV1[] = anchorSlugs.map((anchorSlug) => {
    const auditRow = auditBySlug.get(anchorSlug);
    const cohortRow = cohortBySlug.get(anchorSlug);
    const guardRow = guardBySlug.get(anchorSlug);
    const modelNumber = (auditRow?.model_number ?? cohortRow?.model_number ?? "").trim();
    const brandSlug = normalizeSlug(auditRow?.brand_slug ?? cohortRow?.brand_slug ?? "");
    const manualRecord = manualEvidenceBySlug.get(anchorSlug);
    const manualEvidencePresent = Boolean(manualRecord);
    const manualEvidencePublicReady = manualRecord
      ? validateRefrigeratorManualEvidencePublicReady(manualRecord).ok
      : false;
    const titleHasModel = sourceTitleContainsExactModelNumber(manualRecord, modelNumber);
    const filterSpecModelProof = filterSpecificationModelProofPresentV1(
      manualRecord,
      modelNumber,
    );
    const cloneMeta = cloneIndex.get(anchorSlug) ?? { families: [], dependentUnprovenCount: 0 };

    const checks: AnchorIntegrityChecksV1 = {
      support_page_present: supportPagePresent(manualRecord, modelNumber),
      manual_evidence_present: manualEvidencePresent,
      model_specific_filter_proof_present: filterSpecModelProof,
      source_title_contains_exact_model_number: titleHasModel,
      learned_failure_guards_status: guardRow?.aggregate_verdict ?? "PASS",
      sibling_family_conflict_detected: siblingFamilyConflictDetected(guardRow),
      evidence_clone_dependency_count: cloneMeta.dependentUnprovenCount,
      proven_models_depending_on_anchor: cloneMeta.dependentUnprovenCount,
      evidence_age_days: evidenceAgeDays(manualRecord, now()),
      disputed_by_external_research_flag: false,
    };

    const { health, reasons } = deriveAnchorHealth({
      checks,
      manualEvidencePublicReady,
    });

    return {
      anchor_slug: anchorSlug,
      anchor_family: primaryAnchorFamily(anchorSlug, allFamilies),
      anchor_health: health,
      model_number: modelNumber,
      brand_slug: brandSlug,
      checks,
      health_reasons: reasons,
      clone_families: cloneMeta.families,
    };
  });

  const sibling_conflict_disputed_count = anchor_rows.filter(
    (row) =>
      row.anchor_health === "DISPUTED" && row.checks.sibling_family_conflict_detected,
  ).length;

  const anchor_health_summary: AnchorHealthSummaryV1 = {
    healthy_count: anchor_rows.filter((row) => row.anchor_health === "HEALTHY").length,
    watchlist_count: anchor_rows.filter((row) => row.anchor_health === "WATCHLIST").length,
    disputed_count: anchor_rows.filter((row) => row.anchor_health === "DISPUTED").length,
    sibling_conflict_disputed_count,
    total_anchor_count: anchor_rows.length,
  };

  const highest_risk_anchors = [...anchor_rows].sort((a, b) => {
    if (b.checks.evidence_clone_dependency_count !== a.checks.evidence_clone_dependency_count) {
      return b.checks.evidence_clone_dependency_count - a.checks.evidence_clone_dependency_count;
    }
    const healthRank: Record<AnchorHealthStatusV1, number> = {
      DISPUTED: 2,
      WATCHLIST: 1,
      HEALTHY: 0,
    };
    if (healthRank[b.anchor_health] !== healthRank[a.anchor_health]) {
      return healthRank[b.anchor_health] - healthRank[a.anchor_health];
    }
    return a.anchor_slug.localeCompare(b.anchor_slug);
  });

  const families_with_disputed_or_watchlist_primary_anchor = Array.from(
    new Set(
      anchor_rows
        .filter(
          (row) =>
            row.checks.sibling_family_conflict_detected && row.anchor_family,
        )
        .map((row) => row.anchor_family as string),
    ),
  ).sort();

  const siblingConflictDisputedAnchors = anchor_rows.filter(
    (row) =>
      row.anchor_health === "DISPUTED" && row.checks.sibling_family_conflict_detected,
  );
  const recommended_next_action =
    siblingConflictDisputedAnchors.length > 0
      ? `Freeze evidence-clone families with sibling-conflict DISPUTED primary anchors (${siblingConflictDisputedAnchors.map((row) => row.anchor_slug).join(", ")}) until owner browser proof closes anchor integrity gaps.`
      : "All proven anchors pass anchor-integrity checks — evidence clone families may proceed subject to page quality gates.";

  return {
    contract: ANCHOR_INTEGRITY_AUDIT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: generatedAt,
    anchor_health_summary,
    highest_risk_anchors,
    anchor_rows,
    families_with_disputed_or_watchlist_primary_anchor,
    inspect_summary: {
      recommended_jq_paths: {
        anchor_health_summary: ".anchor_health_summary",
        highest_risk_anchors: ".highest_risk_anchors",
        anchor_rows: ".anchor_rows",
      },
      recommended_next_action,
    },
    exact_repo_paths_read: [
      COMPAT_MAPPINGS_REL_V1,
      EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
      LEARNED_FAILURE_GUARDS_JSON_REL_V1,
      MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
      PROVEN_COHORT_PAGE_FACTORY_MANIFEST_JSON_REL_V1,
      `${MANUAL_EVIDENCE_DIR_REL_V1}/*.json`,
    ].sort(),
    proven_facts: [
      `PROVEN: total_anchor_count=${String(anchor_rows.length)} from evidence-leverage proven_anchor_slugs ∪ proven-cohort PROVEN_CORRECT.`,
      `PROVEN: healthy=${String(anchor_health_summary.healthy_count)} watchlist=${String(anchor_health_summary.watchlist_count)} disputed=${String(anchor_health_summary.disputed_count)} sibling_conflict_disputed=${String(anchor_health_summary.sibling_conflict_disputed_count)}.`,
      "PROVEN: Read-only anchor trust audit — no compat, evidence, Supabase, sitemap, robots, or page mutations.",
    ],
    unknown_facts: [
      "UNKNOWN: disputed_by_external_research_flag requires committed external-research ingest artifacts (not in repo inputs).",
      "UNKNOWN: Live manufacturer support pages vs committed manual-evidence URLs at audit time.",
    ],
  };
}

function renderMarkdown(report: AnchorIntegrityAuditV1): string {
  const lines = [
    "# Anchor integrity audit v1",
    "",
    `## ANCHOR_HEALTH_SUMMARY`,
    "",
    `- generated_at: **${report.generated_at}**`,
    `- healthy_count: **${String(report.anchor_health_summary.healthy_count)}**`,
    `- watchlist_count: **${String(report.anchor_health_summary.watchlist_count)}**`,
    `- disputed_count: **${String(report.anchor_health_summary.disputed_count)}**`,
    `- sibling_conflict_disputed_count: **${String(report.anchor_health_summary.sibling_conflict_disputed_count)}**`,
    `- total_anchor_count: **${String(report.anchor_health_summary.total_anchor_count)}**`,
    "",
    "## highest_risk_anchors",
    "",
  ];

  for (const row of report.highest_risk_anchors.slice(0, 20)) {
    lines.push(
      `### ${row.anchor_slug}`,
      "",
      `- anchor_health: **${row.anchor_health}**`,
      `- anchor_family: \`${row.anchor_family ?? "none"}\``,
      `- evidence_clone_dependency_count: **${String(row.checks.evidence_clone_dependency_count)}**`,
      `- sibling_family_conflict_detected: **${String(row.checks.sibling_family_conflict_detected)}**`,
      `- model_specific_filter_proof_present: **${String(row.checks.model_specific_filter_proof_present)}**`,
      `- source_title_contains_exact_model_number: **${String(row.checks.source_title_contains_exact_model_number)}**`,
      `- health_reasons: ${row.health_reasons.join(", ")}`,
      "",
    );
  }

  if (report.families_with_disputed_or_watchlist_primary_anchor.length > 0) {
    lines.push("## families_with_disputed_or_watchlist_primary_anchor", "");
    for (const family of report.families_with_disputed_or_watchlist_primary_anchor) {
      lines.push(`- \`${family}\``);
    }
    lines.push("");
  }

  lines.push("## Recommended next action", "", report.inspect_summary.recommended_next_action);
  return `${lines.join("\n")}\n`;
}

export function writeAnchorIntegrityAuditArtifactsV1(args: {
  rootDir: string;
  report: AnchorIntegrityAuditV1;
}): { jsonRelPath: string; mdRelPath: string } {
  const jsonAbs = path.join(args.rootDir, ANCHOR_INTEGRITY_AUDIT_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, ANCHOR_INTEGRITY_AUDIT_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, renderMarkdown(args.report), "utf8");
  return {
    jsonRelPath: ANCHOR_INTEGRITY_AUDIT_JSON_REL_V1,
    mdRelPath: ANCHOR_INTEGRITY_AUDIT_MD_REL_V1,
  };
}
