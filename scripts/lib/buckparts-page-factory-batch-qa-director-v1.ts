/**
 * Read-only Page Factory batch QA Director v1 — aggregates Page Quality Gate v1 outputs
 * into owner-review batch buckets. Does not mutate pages, sitemap, robots, retailer links,
 * Supabase, or publication state.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildPageQualityGateBatchReportV1,
  buildPageQualityGateReportV1,
  PAGE_FACTORY_EVIDENCE_CLONE_BATCH_MANIFEST_DIR_REL_V1,
  PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1,
  resolveBatchManifestPathV1,
  type PageQualityGateBatchManifestV1,
  type PageQualityGateClassificationV1,
  type PageQualityGateReportV1,
} from "./buckparts-page-quality-gate-v1";

export const PAGE_FACTORY_BATCH_QA_DIRECTOR_CONTRACT_V1 =
  "page_factory_batch_qa_director_v1" as const;

export const PAGE_FACTORY_BATCH_QA_DIRECTOR_ARTIFACT_DIR_REL_V1 =
  "data/fridge/batch-production/page-factory/batch-qa-director-v1" as const;

export const BATCH_QA_CLASSIFICATIONS_V1 = [
  "VERIFIED",
  "NOINDEX_REVIEW",
  "BLOCKED",
  "WRONG_PART_RISK",
  "NEEDS_EVIDENCE",
] as const;

export type BatchQaClassificationV1 = (typeof BATCH_QA_CLASSIFICATIONS_V1)[number];

export type BatchQaBucketSummaryV1 = {
  classification: BatchQaClassificationV1;
  count: number;
  percentage: number;
  top_blockers: string[];
  affected_slugs: string[];
};

export type BatchQaBlockerFrequencyV1 = {
  blocker: string;
  count: number;
  affected_slugs: string[];
};

export type BatchQaSlugRowV1 = {
  fridge_slug: string;
  batch_qa_classification: BatchQaClassificationV1;
  quality_classification: PageQualityGateClassificationV1;
  publication_authorized: boolean;
  quality_gate_source: "artifact" | "live_build";
  quality_gate_artifact_path: string | null;
  top_blockers: string[];
};

export type PageFactoryBatchQaDirectorReportV1 = {
  contract: typeof PAGE_FACTORY_BATCH_QA_DIRECTOR_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_blocked_until_owner_approval: true;
  mutation_authorized: false;
  generated_at: string;
  batch_id: string;
  manifest_path: string;
  pair_count: number;
  quality_gate_input_mode: "artifacts_only" | "live_build" | "mixed";
  buckets: BatchQaBucketSummaryV1[];
  per_slug: BatchQaSlugRowV1[];
  batch_publication_readiness_score: number;
  batch_risk_score: number;
  top_20_blockers_by_frequency: BatchQaBlockerFrequencyV1[];
  inspect_summary: {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary";
      buckets: ".buckets";
      batch_publication_readiness_score: ".batch_publication_readiness_score";
      batch_risk_score: ".batch_risk_score";
    };
    batch_id: string;
    pair_count: number;
    bucket_counts: Record<BatchQaClassificationV1, number>;
    publication_authorized_count: number;
    recommended_next_action: string;
  };
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildPageFactoryBatchQaDirectorArgsV1 = {
  rootDir: string;
  batchId: string;
  manifestRelPath?: string;
  registryRelPath?: string;
  wildcardReviewJsonRelPath?: string;
  checkSupabase?: boolean;
  /** When true, run live quality-gate build for slugs missing on-disk artifacts. Default true. */
  buildMissingQualityGates?: boolean;
  now?: () => Date;
};

export const PAGE_FACTORY_BATCH_QA_DIRECTOR_ALLOWED_WRITE_REL_PATHS_V1 = [
  `${PAGE_FACTORY_BATCH_QA_DIRECTOR_ARTIFACT_DIR_REL_V1}/*`,
  "data/fridge/batch-production/drafts/page-factory-batch-qa-director-*-v1.md",
] as const;

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function readJsonFile<T>(rootDir: string, relPath: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, relPath), "utf8")) as T;
}

function qualityGateArtifactRelPath(slug: string): string {
  return `${PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1}/${normalizeSlug(slug)}-quality-gate-v1.json`;
}

function tryLoadQualityGateArtifact(
  rootDir: string,
  slug: string,
): PageQualityGateReportV1 | null {
  const rel = qualityGateArtifactRelPath(slug);
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) return null;
  const parsed = readJsonFile<PageQualityGateReportV1>(rootDir, rel);
  if (parsed.contract !== "buckparts_page_quality_gate_v1") return null;
  return parsed;
}

function gateById(report: PageQualityGateReportV1, gateId: string) {
  return report.gates.find((g) => g.gate_id === gateId) ?? null;
}

function collectBlockers(report: PageQualityGateReportV1): string[] {
  const blockers: string[] = [];
  for (const gate of report.gates) {
    for (const blocker of gate.blockers) {
      blockers.push(`${gate.gate_id}: ${blocker}`);
    }
  }
  if (report.clone_packet?.clone_status === "NEEDS_TARGET_EVIDENCE") {
    blockers.push("clone_status: NEEDS_TARGET_EVIDENCE");
  }
  if (report.clone_packet?.clone_status === "BLOCKED") {
    blockers.push("clone_status: BLOCKED");
  }
  return blockers;
}

function isWrongPartRisk(report: PageQualityGateReportV1): boolean {
  const wrongPart = gateById(report, "wrong_part_risk");
  const forbidden = gateById(report, "compat_proof_forbidden_absent");
  const token = gateById(report, "compat_proof_token_alignment");

  if (wrongPart?.status === "BLOCKED") return true;
  if (forbidden?.status === "BLOCKED") {
    return forbidden.blockers.some(
      (b) =>
        b.includes("forbidden filter") ||
        b.includes("HAF-CIN") ||
        b.includes("wrong-family"),
    );
  }
  if (token?.status === "BLOCKED") {
    return token.blockers.some((b) => b.includes("official_marketing_token"));
  }

  const wildcardBucket = wrongPart?.observed?.wildcard_bucket;
  return wildcardBucket === "BLOCKED_HAF_CIN_CANONICAL";
}

function isNeedsEvidence(report: PageQualityGateReportV1): boolean {
  if (report.clone_packet?.clone_status === "NEEDS_TARGET_EVIDENCE") return true;

  const modelEvidence = gateById(report, "model_specific_evidence");
  if (modelEvidence?.status === "WARN") return true;

  const modelExistence = gateById(report, "model_existence_confirmed");
  if (modelExistence?.status === "WARN") return true;

  const duplicateThin = gateById(report, "duplicate_thin_content");
  if (duplicateThin?.status === "WARN") {
    return duplicateThin.blockers.some(
      (b) =>
        b.includes("model-specific") ||
        b.includes("thin") ||
        b.includes("family-level"),
    );
  }

  return false;
}

/** Map Page Quality Gate v1 report into batch QA Director bucket without changing gate logic. */
export function classifyBatchQaFromQualityGateV1(
  report: PageQualityGateReportV1,
): BatchQaClassificationV1 {
  if (isWrongPartRisk(report)) {
    return "WRONG_PART_RISK";
  }

  if (report.quality_classification === "BLOCKED") {
    return "BLOCKED";
  }

  if (isNeedsEvidence(report)) {
    return "NEEDS_EVIDENCE";
  }

  if (report.quality_classification === "NOINDEX_REVIEW") {
    return "NOINDEX_REVIEW";
  }

  if (
    report.quality_classification === "INDEXABLE_VERIFIED" ||
    report.quality_classification === "INDEXABLE_NO_BUY_LINK"
  ) {
    return "VERIFIED";
  }

  return "BLOCKED";
}

function emptyBucketCounts(): Record<BatchQaClassificationV1, number> {
  return {
    VERIFIED: 0,
    NOINDEX_REVIEW: 0,
    BLOCKED: 0,
    WRONG_PART_RISK: 0,
    NEEDS_EVIDENCE: 0,
  };
}

function buildBucketSummaries(args: {
  perSlug: BatchQaSlugRowV1[];
  pairCount: number;
}): BatchQaBucketSummaryV1[] {
  const counts = emptyBucketCounts();
  const blockersByBucket = new Map<BatchQaClassificationV1, Map<string, number>>();
  const slugsByBucket = new Map<BatchQaClassificationV1, string[]>();

  for (const classification of BATCH_QA_CLASSIFICATIONS_V1) {
    blockersByBucket.set(classification, new Map());
    slugsByBucket.set(classification, []);
  }

  for (const row of args.perSlug) {
    counts[row.batch_qa_classification] += 1;
    slugsByBucket.get(row.batch_qa_classification)!.push(row.fridge_slug);
    const blockerMap = blockersByBucket.get(row.batch_qa_classification)!;
    for (const blocker of row.top_blockers) {
      blockerMap.set(blocker, (blockerMap.get(blocker) ?? 0) + 1);
    }
  }

  return BATCH_QA_CLASSIFICATIONS_V1.map((classification) => {
    const count = counts[classification];
    const percentage =
      args.pairCount > 0 ? Math.round((count / args.pairCount) * 1000) / 10 : 0;
    const top_blockers = [...(blockersByBucket.get(classification) ?? new Map()).entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([blocker]) => blocker);

    return {
      classification,
      count,
      percentage,
      top_blockers,
      affected_slugs: slugsByBucket.get(classification) ?? [],
    };
  });
}

function buildBlockerFrequency(args: {
  perSlug: BatchQaSlugRowV1[];
  limit: number;
}): BatchQaBlockerFrequencyV1[] {
  const freq = new Map<string, { count: number; slugs: Set<string> }>();
  for (const row of args.perSlug) {
    for (const blocker of row.top_blockers) {
      const entry = freq.get(blocker) ?? { count: 0, slugs: new Set<string>() };
      entry.count += 1;
      entry.slugs.add(row.fridge_slug);
      freq.set(blocker, entry);
    }
  }

  return [...freq.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .slice(0, args.limit)
    .map(([blocker, { count, slugs }]) => ({
      blocker,
      count,
      affected_slugs: [...slugs].sort(),
    }));
}

function computePublicationReadinessScore(perSlug: BatchQaSlugRowV1[]): number {
  if (perSlug.length === 0) return 0;
  const verifiedAuthorized = perSlug.filter(
    (r) => r.batch_qa_classification === "VERIFIED" && r.publication_authorized,
  ).length;
  return Math.round((verifiedAuthorized / perSlug.length) * 1000) / 10;
}

function computeRiskScore(perSlug: BatchQaSlugRowV1[]): number {
  if (perSlug.length === 0) return 0;
  const risky = perSlug.filter((r) =>
    ["WRONG_PART_RISK", "BLOCKED"].includes(r.batch_qa_classification),
  ).length;
  return Math.round((risky / perSlug.length) * 1000) / 10;
}

function recommendedNextAction(args: {
  buckets: BatchQaBucketSummaryV1[];
  publicationReadinessScore: number;
  riskScore: number;
}): string {
  const wrongPart = args.buckets.find((b) => b.classification === "WRONG_PART_RISK");
  if (wrongPart && wrongPart.count > 0) {
    return `Resolve ${String(wrongPart.count)} WRONG_PART_RISK slug(s) before any batch publication (${wrongPart.affected_slugs.slice(0, 3).join(", ")}${wrongPart.count > 3 ? "…" : ""}).`;
  }

  const blocked = args.buckets.find((b) => b.classification === "BLOCKED");
  if (blocked && blocked.count > 0) {
    return `Clear ${String(blocked.count)} BLOCKED slug(s) before indexable publication.`;
  }

  const needsEvidence = args.buckets.find((b) => b.classification === "NEEDS_EVIDENCE");
  if (needsEvidence && needsEvidence.count > 0) {
    return `${String(needsEvidence.count)} slug(s) need model-specific evidence — hold noindex until Tier-1 proof exists.`;
  }

  if (args.publicationReadinessScore >= 100) {
    return "Batch publication readiness is 100% for VERIFIED authorized pairs — proceed only with explicit owner approval.";
  }

  return `Batch readiness ${String(args.publicationReadinessScore)}%; risk ${String(args.riskScore)}% — review NOINDEX_REVIEW bucket before scaling.`;
}

export async function buildPageFactoryBatchQaDirectorReportV1(
  args: BuildPageFactoryBatchQaDirectorArgsV1,
): Promise<PageFactoryBatchQaDirectorReportV1> {
  const now = args.now ?? (() => new Date());
  const buildMissing = args.buildMissingQualityGates !== false;
  const manifestRel =
    args.manifestRelPath ?? resolveBatchManifestPathV1(args.batchId, args.rootDir);
  const manifest = readJsonFile<PageQualityGateBatchManifestV1>(args.rootDir, manifestRel);

  const per_slug: BatchQaSlugRowV1[] = [];
  let artifactCount = 0;
  let liveBuildCount = 0;
  const exactPaths = new Set<string>([manifestRel, PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1]);

  for (const pair of manifest.pairs) {
    const slug = normalizeSlug(pair.target_slug);
    let report = tryLoadQualityGateArtifact(args.rootDir, slug);
    let source: "artifact" | "live_build" = "artifact";
    let artifactPath: string | null = qualityGateArtifactRelPath(slug);

    if (!report) {
      if (!buildMissing) {
        throw new Error(
          `missing quality gate artifact for ${slug}: ${artifactPath} (pass buildMissingQualityGates or generate artifacts first)`,
        );
      }
      report = await buildPageQualityGateReportV1({
        rootDir: args.rootDir,
        fridgeSlug: slug,
        registryRelPath: args.registryRelPath,
        wildcardReviewJsonRelPath: args.wildcardReviewJsonRelPath,
        cloneSourceSlug: pair.source_slug,
        cloneFamilyKey: pair.family_key,
        checkSupabase: args.checkSupabase === true,
        now,
      });
      source = "live_build";
      artifactPath = null;
      liveBuildCount += 1;
    } else {
      artifactCount += 1;
      exactPaths.add(artifactPath!);
    }

    for (const p of report.exact_repo_paths_read) exactPaths.add(p);

    const top_blockers = collectBlockers(report).slice(0, 10);
    per_slug.push({
      fridge_slug: slug,
      batch_qa_classification: classifyBatchQaFromQualityGateV1(report),
      quality_classification: report.quality_classification,
      publication_authorized: report.publication_authorized,
      quality_gate_source: source,
      quality_gate_artifact_path: artifactPath,
      top_blockers,
    });
  }

  const pair_count = per_slug.length;
  const buckets = buildBucketSummaries({ perSlug: per_slug, pairCount: pair_count });
  const batch_publication_readiness_score = computePublicationReadinessScore(per_slug);
  const batch_risk_score = computeRiskScore(per_slug);
  const top_20_blockers_by_frequency = buildBlockerFrequency({ perSlug: per_slug, limit: 20 });

  const quality_gate_input_mode: PageFactoryBatchQaDirectorReportV1["quality_gate_input_mode"] =
    artifactCount === pair_count
      ? "artifacts_only"
      : liveBuildCount === pair_count
        ? "live_build"
        : "mixed";

  const bucket_counts = emptyBucketCounts();
  for (const row of per_slug) {
    bucket_counts[row.batch_qa_classification] += 1;
  }

  const publication_authorized_count = per_slug.filter((r) => r.publication_authorized).length;

  return {
    contract: PAGE_FACTORY_BATCH_QA_DIRECTOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    batch_id: args.batchId.trim(),
    manifest_path: manifestRel,
    pair_count,
    quality_gate_input_mode,
    buckets,
    per_slug,
    batch_publication_readiness_score,
    batch_risk_score,
    top_20_blockers_by_frequency,
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        buckets: ".buckets",
        batch_publication_readiness_score: ".batch_publication_readiness_score",
        batch_risk_score: ".batch_risk_score",
      },
      batch_id: args.batchId.trim(),
      pair_count,
      bucket_counts,
      publication_authorized_count,
      recommended_next_action: recommendedNextAction({
        buckets,
        publicationReadinessScore: batch_publication_readiness_score,
        riskScore: batch_risk_score,
      }),
    },
    exact_repo_paths_read: [...exactPaths].sort(),
    proven_facts: [
      `PROVEN: read-only batch QA director for ${String(pair_count)} slug(s) from ${manifestRel}.`,
      `PROVEN: quality_gate_input_mode=${quality_gate_input_mode} (${String(artifactCount)} artifact, ${String(liveBuildCount)} live_build).`,
      `PROVEN: batch_publication_readiness_score=${String(batch_publication_readiness_score)}; batch_risk_score=${String(batch_risk_score)}.`,
      "PROVEN: Does not mutate pages, sitemap, robots, retailer links, Supabase, or publication state.",
    ],
    unknown_facts: [],
  };
}

/** Build from an existing Page Quality Gate batch rollup JSON (pair_reports embedded). */
export async function buildPageFactoryBatchQaDirectorFromQualityGateBatchV1(args: {
  rootDir: string;
  batchId: string;
  qualityGateBatchJsonRelPath: string;
  now?: () => Date;
}): Promise<PageFactoryBatchQaDirectorReportV1> {
  const now = args.now ?? (() => new Date());
  const batch = readJsonFile<{
    batch_id: string;
    manifest_path: string;
    pair_reports: PageQualityGateReportV1[];
  }>(args.rootDir, args.qualityGateBatchJsonRelPath);

  const per_slug: BatchQaSlugRowV1[] = batch.pair_reports.map((report) => ({
    fridge_slug: report.fridge_slug,
    batch_qa_classification: classifyBatchQaFromQualityGateV1(report),
    quality_classification: report.quality_classification,
    publication_authorized: report.publication_authorized,
    quality_gate_source: "artifact" as const,
    quality_gate_artifact_path: qualityGateArtifactRelPath(report.fridge_slug),
    top_blockers: collectBlockers(report).slice(0, 10),
  }));

  const pair_count = per_slug.length;
  const buckets = buildBucketSummaries({ perSlug: per_slug, pairCount: pair_count });
  const batch_publication_readiness_score = computePublicationReadinessScore(per_slug);
  const batch_risk_score = computeRiskScore(per_slug);

  const bucket_counts = emptyBucketCounts();
  for (const row of per_slug) {
    bucket_counts[row.batch_qa_classification] += 1;
  }

  return {
    contract: PAGE_FACTORY_BATCH_QA_DIRECTOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    batch_id: args.batchId.trim(),
    manifest_path: batch.manifest_path,
    pair_count,
    quality_gate_input_mode: "artifacts_only",
    buckets,
    per_slug,
    batch_publication_readiness_score,
    batch_risk_score,
    top_20_blockers_by_frequency: buildBlockerFrequency({ perSlug: per_slug, limit: 20 }),
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        buckets: ".buckets",
        batch_publication_readiness_score: ".batch_publication_readiness_score",
        batch_risk_score: ".batch_risk_score",
      },
      batch_id: args.batchId.trim(),
      pair_count,
      bucket_counts,
      publication_authorized_count: per_slug.filter((r) => r.publication_authorized).length,
      recommended_next_action: recommendedNextAction({
        buckets,
        publicationReadinessScore: batch_publication_readiness_score,
        riskScore: batch_risk_score,
      }),
    },
    exact_repo_paths_read: [args.qualityGateBatchJsonRelPath, batch.manifest_path].sort(),
    proven_facts: [
      `PROVEN: batch QA director derived from quality gate batch JSON ${args.qualityGateBatchJsonRelPath}.`,
      `PROVEN: batch_publication_readiness_score=${String(batch_publication_readiness_score)}; batch_risk_score=${String(batch_risk_score)}.`,
    ],
    unknown_facts: [],
  };
}

export function pageFactoryBatchQaDirectorArtifactRelPathsV1(batchId: string): {
  jsonRelPath: string;
  mdRelPath: string;
} {
  const id = batchId.trim();
  return {
    jsonRelPath: `${PAGE_FACTORY_BATCH_QA_DIRECTOR_ARTIFACT_DIR_REL_V1}/${id}-batch-qa-v1.json`,
    mdRelPath: `data/fridge/batch-production/drafts/page-factory-batch-qa-director-${id}-v1.md`,
  };
}

export function buildPageFactoryBatchQaDirectorMarkdownV1(
  report: PageFactoryBatchQaDirectorReportV1,
): string {
  const lines = [
    "# Page Factory batch QA Director owner review v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Stop condition",
    "",
    "Read-only batch QA aggregation only. Does **not** publish pages, mutate sitemap/robots, compat, retailer links, Supabase, or evidence.",
    "",
    "## Batch summary",
    "",
    `- batch_id: \`${report.batch_id}\``,
    `- manifest_path: \`${report.manifest_path}\``,
    `- pair_count: **${String(report.pair_count)}**`,
    `- quality_gate_input_mode: \`${report.quality_gate_input_mode}\``,
    `- batch_publication_readiness_score: **${String(report.batch_publication_readiness_score)}%**`,
    `- batch_risk_score: **${String(report.batch_risk_score)}%**`,
    "",
    `**Recommended next action:** ${report.inspect_summary.recommended_next_action}`,
    "",
    "## Buckets",
    "",
    "| classification | count | % | top blockers | affected slugs |",
    "|---|---:|---:|---|---|",
  ];

  for (const bucket of report.buckets) {
    const blockers =
      bucket.top_blockers.length > 0 ? bucket.top_blockers.join("; ") : "—";
    const slugs =
      bucket.affected_slugs.length > 0
        ? bucket.affected_slugs.map((s) => `\`${s}\``).join(", ")
        : "—";
    lines.push(
      `| ${bucket.classification} | ${String(bucket.count)} | ${String(bucket.percentage)}% | ${blockers} | ${slugs} |`,
    );
  }

  lines.push("", "## Top 20 blockers by frequency", "", "| blocker | count | slugs |", "|---|---:|---|");
  for (const row of report.top_20_blockers_by_frequency) {
    lines.push(
      `| ${row.blocker} | ${String(row.count)} | ${row.affected_slugs.map((s) => `\`${s}\``).join(", ")} |`,
    );
  }

  lines.push("", "## Per-slug", "", "| slug | batch QA | quality gate | publication_authorized | source |", "|---|---|---|---|---|");
  for (const row of report.per_slug) {
    lines.push(
      `| \`${row.fridge_slug}\` | ${row.batch_qa_classification} | ${row.quality_classification} | ${String(row.publication_authorized)} | ${row.quality_gate_source} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

export function writePageFactoryBatchQaDirectorArtifactsV1(args: {
  rootDir: string;
  report: PageFactoryBatchQaDirectorReportV1;
}): { jsonRelPath: string; mdRelPath: string } {
  const paths = pageFactoryBatchQaDirectorArtifactRelPathsV1(args.report.batch_id);
  const jsonAbs = path.join(args.rootDir, paths.jsonRelPath);
  const mdAbs = path.join(args.rootDir, paths.mdRelPath);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildPageFactoryBatchQaDirectorMarkdownV1(args.report), "utf8");
  return paths;
}

export { PAGE_FACTORY_EVIDENCE_CLONE_BATCH_MANIFEST_DIR_REL_V1 };
