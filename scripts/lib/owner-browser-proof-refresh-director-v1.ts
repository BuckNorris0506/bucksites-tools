/**
 * Owner browser proof refresh director v1 — repo-wide read-only scan, classification,
 * ranked refresh queue, and owner session batching. BuckParts Truth Contract only.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  buildAllProductSafeBuyerPathCensusV1Report,
} from "./all-product-safe-buyer-path-census-v1";
import { buildFridgeSafeLinkBatchFactoryV1 } from "./fridge-safe-link-batch-factory-v1";
import { FRIDGE_OWNER_BROWSER_PROOF_EXPECTED_SLUGS_V1 } from "./fridge-safe-link-owner-browser-proof-batch-validation-v1";
import {
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
  type OwnerBrowserProofResultV1,
} from "./fridge-safe-link-owner-browser-proof-result-v1";
import { loadManufacturerRescueOrchestratorInputV1 } from "./manufacturer-safe-link-rescue-director-v1";
import {
  assessManufacturerRescueBrowserProofFreshnessV1,
  MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1,
} from "./manufacturer-safe-link-rescue-owner-browser-proof-evidence-v1";
import type { ManufacturerRescueOrchestratorQueueRowV1 } from "./manufacturer-safe-link-rescue-orchestrator-v1";

export const OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_CONTRACT_V1 =
  "owner_browser_proof_refresh_director_v1" as const;

export const OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/owner-browser-proof-refresh-director-v1.json" as const;

export const OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_MD_REL_V1 =
  "data/fridge/batch-production/drafts/owner-browser-proof-refresh-director-v1.md" as const;

export const OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_SOURCE_COMMAND_V1 =
  "npm run buckparts:owner-browser-proof-refresh-director" as const;

/** Days before max_age when proof is EXPIRING_SOON (repo policy: 14d max, 3d warning window). */
export const OWNER_BROWSER_PROOF_EXPIRING_SOON_WINDOW_DAYS_V1 = 3 as const;

export const OWNER_BROWSER_PROOF_MAX_SESSION_SLUGS_V1 = 4 as const;

export type OwnerBrowserProofFreshnessClassV1 =
  | "FRESH"
  | "EXPIRING_SOON"
  | "STALE"
  | "MISSING";

export type OwnerBrowserProofArtifactKindV1 =
  | "fridge_safe_link_owner_browser_proof_result"
  | "committed_evidence_owner_browser"
  | "ge_official_owner_browser_proof"
  | "other_owner_browser_proof";

export type DiscoveredOwnerBrowserProofArtifactV1 = {
  artifact_rel_path: string;
  artifact_kind: OwnerBrowserProofArtifactKindV1;
  slug: string | null;
  oem_part_token: string | null;
  checked_at: string | null;
  checked_at_source: "checked_at" | "generated_at" | "unknown";
  verdict: string | null;
  contract: string | null;
};

export type OwnerBrowserProofInventoryRowV1 = {
  slug: string;
  artifact_rel_paths: string[];
  primary_artifact_rel_path: string | null;
  freshness_class: OwnerBrowserProofFreshnessClassV1;
  checked_at: string | null;
  age_days: number | "UNKNOWN";
  max_age_days: number;
  owner_proof_verdict: string | null;
  census_page_classification: string;
  wedge: string;
  manufacturer_key: string | null;
  hyperagent_cohort_member: boolean;
  model_compatibility_mapping_count: number;
  production_blocked: boolean;
  production_blocker_summary: string | null;
};

export type OwnerBrowserProofRefreshQueueRowV1 = {
  rank: number;
  slug: string;
  freshness_class: OwnerBrowserProofFreshnessClassV1;
  refresh_priority_score: number;
  expected_safe_buyer_path_proven_delta: 0 | 1;
  evidence_gap_count: number;
  production_priority_score: number;
  wedge: string;
  manufacturer_key: string | null;
  model_compatibility_mapping_count: number;
  census_page_classification: string;
  hyperagent_cohort_member: boolean;
  primary_artifact_rel_path: string | null;
  refresh_rationale: string;
  recommended_session_command: string;
};

export type OwnerBrowserProofRefreshSessionV1 = {
  session_id: string;
  session_order: number;
  session_label: string;
  slug_count: number;
  target_slugs: string[];
  manufacturer_keys: string[];
  bundle_rationale: string;
  expected_safe_buyer_path_proven_delta: number;
  freshness_breakdown: Record<OwnerBrowserProofFreshnessClassV1, number>;
  recommended_owner_action: string;
  recommended_commands: string[];
};

export type OwnerBrowserProofRefreshDirectorReportV1 = {
  contract: typeof OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  evidence_write_authorized: false;
  evidence_regeneration_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  founder_approval_activation_authorized: false;
  browser_automation_authorized: false;
  auto_pass_forbidden: true;
  source_command: typeof OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_SOURCE_COMMAND_V1;
  generated_at: string;
  browser_proof_max_age_days: number;
  expiring_soon_window_days: number;
  artifacts_discovered_count: number;
  inventory_slug_count: number;
  refresh_queue_slug_count: number;
  owner_session_count: number;
  freshness_summary: Record<OwnerBrowserProofFreshnessClassV1, number>;
  discovered_artifacts: DiscoveredOwnerBrowserProofArtifactV1[];
  inventory: OwnerBrowserProofInventoryRowV1[];
  ranked_refresh_queue: OwnerBrowserProofRefreshQueueRowV1[];
  owner_refresh_sessions: OwnerBrowserProofRefreshSessionV1[];
  total_expected_delta_all_sessions: number;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  recommended_commands: string[];
};

/** Preferred multi-slug owner sessions from HyperAgent evidence + Frigidaire PASS cluster (repo truth). */
export const OWNER_BROWSER_PROOF_PREFERRED_SESSION_BUNDLES_V1 = [
  {
    session_id: "session_1_hyperagent_evidence_pair",
    slugs: ["edr3rxd1", "ultrawf"],
    session_label: "HyperAgent evidence pair refresh",
    bundle_rationale:
      "HyperAgent evidence production director smallest executable batch — PASS proof exists but stale; refresh unlocks committed-evidence lane.",
  },
  {
    session_id: "session_2_frigidaire_pass_proof_cluster",
    slugs: ["wfcb", "wf3cb", "eptwfu01"],
    session_label: "Frigidaire PASS-proof refresh cluster",
    bundle_rationale:
      "Three Frigidaire slugs with PASS owner-browser-proof result artifacts on disk — batch refresh before evidence commit.",
  },
] as const;

const SCAN_ROOT_REL_DIRS_V1 = [
  "data/fridge/batch-production/drafts",
  "data/evidence",
] as const;

const ARTIFACT_FILENAME_PATTERNS_V1 = [
  /owner-browser-proof-result/i,
  /owner-browser-proof/i,
  /owner-review/i,
  /owner_browser/i,
] as const;

function loadJson<T>(rootDir: string, rel: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, rel), "utf8")) as T;
}

function relPath(rootDir: string, abs: string): string {
  return path.relative(rootDir, abs).split(path.sep).join("/");
}

function walkJsonFiles(rootDir: string, dirRel: string): string[] {
  const absDir = path.join(rootDir, dirRel);
  if (!existsSync(absDir)) return [];
  const out: string[] = [];

  function walk(current: string): void {
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const name of entries) {
      const abs = path.join(current, name);
      let st;
      try {
        st = statSync(abs);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!name.endsWith(".json")) continue;
      if (!ARTIFACT_FILENAME_PATTERNS_V1.some((re) => re.test(name))) continue;
      out.push(relPath(rootDir, abs));
    }
  }

  walk(absDir);
  return out.sort();
}

function slugFromArtifactPath(rel: string): string | null {
  const resultMatch = rel.match(/owner-browser-proof-result-([a-z0-9-]+)-v1\.json$/i);
  if (resultMatch?.[1]) return resultMatch[1].toLowerCase();
  const geMatch = rel.match(/fridge-safe-link-([a-z0-9-]+)-ge-official-owner-browser-proof/i);
  if (geMatch?.[1]) return geMatch[1].toLowerCase();
  return null;
}

function classifyArtifactKind(rel: string, doc: Record<string, unknown>): OwnerBrowserProofArtifactKindV1 {
  if (doc.contract === FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1) {
    return "fridge_safe_link_owner_browser_proof_result";
  }
  if (rel.includes("ge-official-owner-browser-proof")) {
    return "ge_official_owner_browser_proof";
  }
  const scope = String(doc.scope ?? "");
  if (scope.includes("owner_browser") || rel.includes("owner-review") || rel.includes("owner-browser")) {
    return "committed_evidence_owner_browser";
  }
  return "other_owner_browser_proof";
}

export function extractCheckedAtFromArtifactDocV1(
  doc: Record<string, unknown>,
): { checked_at: string | null; source: "checked_at" | "generated_at" | "unknown" } {
  const checked = doc.checked_at;
  if (typeof checked === "string" && checked.trim()) {
    return { checked_at: checked.trim(), source: "checked_at" };
  }
  const generated = doc.generated_at;
  if (typeof generated === "string" && generated.trim()) {
    return { checked_at: generated.trim(), source: "generated_at" };
  }
  return { checked_at: null, source: "unknown" };
}

export function classifyOwnerBrowserProofFreshnessClassV1(args: {
  has_artifact: boolean;
  checked_at: string | null;
  age_days: number | "UNKNOWN";
  max_age_days: number;
  expiring_soon_window_days?: number;
}): OwnerBrowserProofFreshnessClassV1 {
  if (!args.has_artifact) return "MISSING";
  if (args.checked_at === null || args.age_days === "UNKNOWN") return "STALE";
  const window = args.expiring_soon_window_days ?? OWNER_BROWSER_PROOF_EXPIRING_SOON_WINDOW_DAYS_V1;
  if (args.age_days > args.max_age_days) return "STALE";
  if (args.age_days > args.max_age_days - window) return "EXPIRING_SOON";
  return "FRESH";
}

export function discoverOwnerBrowserProofArtifactsV1(rootDir: string): DiscoveredOwnerBrowserProofArtifactV1[] {
  const rels = SCAN_ROOT_REL_DIRS_V1.flatMap((dir) => walkJsonFiles(rootDir, dir));
  const discovered: DiscoveredOwnerBrowserProofArtifactV1[] = [];

  for (const rel of rels) {
    const abs = path.join(rootDir, rel);
    let doc: Record<string, unknown>;
    try {
      doc = JSON.parse(readFileSync(abs, "utf8")) as Record<string, unknown>;
    } catch {
      continue;
    }

    const slugFromDoc =
      typeof doc.slug === "string"
        ? doc.slug.toLowerCase()
        : typeof doc.filter_slug === "string"
          ? doc.filter_slug.toLowerCase()
          : slugFromArtifactPath(rel);

    const { checked_at, source } = extractCheckedAtFromArtifactDocV1(doc);
    const token =
      typeof doc.oem_part_token === "string"
        ? doc.oem_part_token
        : typeof doc.token === "string"
          ? doc.token
          : null;

    discovered.push({
      artifact_rel_path: rel,
      artifact_kind: classifyArtifactKind(rel, doc),
      slug: slugFromDoc,
      oem_part_token: token,
      checked_at,
      checked_at_source: source,
      verdict: typeof doc.verdict === "string" ? doc.verdict : null,
      contract: typeof doc.contract === "string" ? doc.contract : null,
    });
  }

  return discovered;
}

function loadCompatibilityMappingCountsV1(rootDir: string): Map<string, number> {
  const csvPath = path.join(rootDir, "data/compatibility_mappings.csv");
  if (!existsSync(csvPath)) return new Map();
  const rows = parse(readFileSync(csvPath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as Array<{ filter_slug?: string }>;
  const counts = new Map<string, number>();
  for (const row of rows) {
    const slug = (row.filter_slug ?? "").trim().toLowerCase();
    if (!slug) continue;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return counts;
}

function computeEvidenceGapCount(args: {
  hasPassProof: boolean;
  factoryState: string | null;
  freshness: OwnerBrowserProofFreshnessClassV1;
}): number {
  if (args.factoryState === "CONFLICT_REQUIRES_RECONCILIATION") return 99;
  if (args.factoryState === "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL") return 99;
  let gap = 0;
  if (args.freshness === "MISSING") gap += 1;
  if (args.freshness === "STALE" || args.freshness === "EXPIRING_SOON") gap += 1;
  if (!args.hasPassProof) gap += 2;
  gap += 3; // committed evidence + cursor + founder baseline
  return gap;
}

function computeRefreshPriorityScore(args: {
  freshness: OwnerBrowserProofFreshnessClassV1;
  productionPriority: number;
  evidenceGap: number;
  expectedDelta: 0 | 1;
  hyperagentMember: boolean;
  modelMappingCount: number;
  rescueRank: number | null;
}): number {
  let score = 0;
  switch (args.freshness) {
    case "MISSING":
      score += 120;
      break;
    case "STALE":
      score += 100;
      break;
    case "EXPIRING_SOON":
      score += 75;
      break;
    default:
      score += 0;
  }
  score += Math.round(args.productionPriority / 10);
  score += args.expectedDelta * 40;
  score += Math.max(0, 12 - args.evidenceGap) * 3;
  if (args.hyperagentMember) score += 25;
  score += Math.min(args.modelMappingCount, 30);
  if (args.rescueRank !== null) score += Math.max(0, 30 - args.rescueRank);
  return score;
}

function needsRefresh(freshness: OwnerBrowserProofFreshnessClassV1): boolean {
  return freshness === "MISSING" || freshness === "STALE" || freshness === "EXPIRING_SOON";
}

function pickPrimaryArtifact(
  artifacts: DiscoveredOwnerBrowserProofArtifactV1[],
): DiscoveredOwnerBrowserProofArtifactV1 | null {
  const ranked = [...artifacts].sort((a, b) => {
    const kindScore = (k: OwnerBrowserProofArtifactKindV1) =>
      k === "fridge_safe_link_owner_browser_proof_result"
        ? 3
        : k === "ge_official_owner_browser_proof"
          ? 2
          : 1;
    return kindScore(b.artifact_kind) - kindScore(a.artifact_kind);
  });
  return ranked[0] ?? null;
}

export function groupOwnerBrowserProofRefreshSessionsV1(args: {
  queue: readonly OwnerBrowserProofRefreshQueueRowV1[];
  preferredBundles?: readonly (typeof OWNER_BROWSER_PROOF_PREFERRED_SESSION_BUNDLES_V1)[number][];
  maxSessionSlugs?: number;
}): OwnerBrowserProofRefreshSessionV1[] {
  const bundles = args.preferredBundles ?? OWNER_BROWSER_PROOF_PREFERRED_SESSION_BUNDLES_V1;
  const maxSessionSlugs = args.maxSessionSlugs ?? OWNER_BROWSER_PROOF_MAX_SESSION_SLUGS_V1;
  const queueBySlug = new Map(args.queue.map((row) => [row.slug, row]));
  const assigned = new Set<string>();
  const sessions: OwnerBrowserProofRefreshSessionV1[] = [];
  let sessionOrder = 1;

  for (const bundle of bundles) {
    const targetSlugs = bundle.slugs.filter((slug) => queueBySlug.has(slug) && !assigned.has(slug));
    if (targetSlugs.length === 0) continue;
    const rows = targetSlugs.map((slug) => queueBySlug.get(slug)!);
    for (const slug of targetSlugs) assigned.add(slug);

    sessions.push({
      session_id: bundle.session_id,
      session_order: sessionOrder,
      session_label: bundle.session_label,
      slug_count: targetSlugs.length,
      target_slugs: targetSlugs,
      manufacturer_keys: Array.from(new Set(rows.map((r) => r.manufacturer_key).filter(Boolean))) as string[],
      bundle_rationale: bundle.bundle_rationale,
      expected_safe_buyer_path_proven_delta: rows.reduce(
        (sum, r) => sum + r.expected_safe_buyer_path_proven_delta,
        0,
      ),
      freshness_breakdown: countFreshness(rows),
      recommended_owner_action:
        "Owner browser visual inspection — reconfirm PASS_BROWSER_PROOF URLs; record new checked_at in result artifact intake (no auto-pass).",
      recommended_commands: [
        "node --import tsx scripts/report-fridge-safe-link-owner-browser-proof-session-v1.ts",
      ],
    });
    sessionOrder += 1;
  }

  const remaining = args.queue.filter((row) => !assigned.has(row.slug));
  const byManufacturer = new Map<string, OwnerBrowserProofRefreshQueueRowV1[]>();
  for (const row of remaining) {
    const key = row.manufacturer_key ?? "unknown";
    const list = byManufacturer.get(key) ?? [];
    list.push(row);
    byManufacturer.set(key, list);
  }

  const manufacturerKeys = Array.from(byManufacturer.keys()).sort();
  for (const manufacturerKey of manufacturerKeys) {
    const rows = (byManufacturer.get(manufacturerKey) ?? []).sort(
      (a, b) => a.rank - b.rank || a.slug.localeCompare(b.slug),
    );
    for (let i = 0; i < rows.length; i += maxSessionSlugs) {
      const chunk = rows.slice(i, i + maxSessionSlugs);
      const targetSlugs = chunk.map((r) => r.slug);
      for (const slug of targetSlugs) assigned.add(slug);
      sessions.push({
        session_id: `session_${String(sessionOrder)}_${manufacturerKey.replace(/[^a-z0-9]+/g, "-")}`,
        session_order: sessionOrder,
        session_label: `${manufacturerKey} refresh batch ${String(Math.floor(i / maxSessionSlugs) + 1)}`,
        slug_count: targetSlugs.length,
        target_slugs: targetSlugs,
        manufacturer_keys: [manufacturerKey],
        bundle_rationale: `Remaining ${manufacturerKey} slugs grouped to minimize owner session count (max ${String(maxSessionSlugs)} slugs).`,
        expected_safe_buyer_path_proven_delta: chunk.reduce(
          (sum, r) => sum + r.expected_safe_buyer_path_proven_delta,
          0,
        ),
        freshness_breakdown: countFreshness(chunk),
        recommended_owner_action:
          "Owner browser proof session — refresh stale/missing proof before evidence commit or apply-plan work.",
        recommended_commands: [
          "node --import tsx scripts/report-fridge-safe-link-owner-browser-proof-session-v1.ts",
        ],
      });
      sessionOrder += 1;
    }
  }

  return sessions;
}

function countFreshness(
  rows: Array<{ freshness_class: OwnerBrowserProofFreshnessClassV1 }>,
): Record<OwnerBrowserProofFreshnessClassV1, number> {
  const counts: Record<OwnerBrowserProofFreshnessClassV1, number> = {
    FRESH: 0,
    EXPIRING_SOON: 0,
    STALE: 0,
    MISSING: 0,
  };
  for (const row of rows) {
    counts[row.freshness_class] += 1;
  }
  return counts;
}

export function buildOwnerBrowserProofRefreshDirectorMarkdownV1(
  report: OwnerBrowserProofRefreshDirectorReportV1,
): string {
  const lines: string[] = [
    "# Owner browser proof refresh director v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Summary",
    "",
    `- Artifacts discovered: **${String(report.artifacts_discovered_count)}**`,
    `- Inventory slugs: **${String(report.inventory_slug_count)}**`,
    `- Refresh queue: **${String(report.refresh_queue_slug_count)}** slugs`,
    `- Owner sessions: **${String(report.owner_session_count)}**`,
    `- Total expected SAFE_BUYER_PATH_PROVEN delta (all sessions): **+${String(report.total_expected_delta_all_sessions)}**`,
    `- Freshness policy: **${String(report.browser_proof_max_age_days)}** days (expiring-soon window: **${String(report.expiring_soon_window_days)}** days)`,
    "",
    "### Freshness summary",
    "",
    `| FRESH | EXPIRING_SOON | STALE | MISSING |`,
    `| ---: | ---: | ---: | ---: |`,
    `| ${String(report.freshness_summary.FRESH)} | ${String(report.freshness_summary.EXPIRING_SOON)} | ${String(report.freshness_summary.STALE)} | ${String(report.freshness_summary.MISSING)} |`,
    "",
    "## Owner refresh sessions",
    "",
  ];

  for (const session of report.owner_refresh_sessions) {
    lines.push(
      `### ${session.session_label} (\`${session.session_id}\`)`,
      "",
      `- Slugs: **${session.target_slugs.join(", ")}**`,
      `- Expected delta: **+${String(session.expected_safe_buyer_path_proven_delta)}**`,
      `- ${session.bundle_rationale}`,
      `- Owner action: ${session.recommended_owner_action}`,
      "",
    );
  }

  lines.push(
    "## Ranked refresh queue (top 20)",
    "",
    "| Rank | Slug | Freshness | Δ | Gap | Priority | Wedge |",
    "| ---: | --- | --- | ---: | ---: | ---: | --- |",
  );

  for (const row of report.ranked_refresh_queue.slice(0, 20)) {
    lines.push(
      `| ${String(row.rank)} | ${row.slug} | ${row.freshness_class} | ${String(row.expected_safe_buyer_path_proven_delta)} | ${String(row.evidence_gap_count)} | ${String(row.refresh_priority_score)} | ${row.wedge} |`,
    );
  }

  lines.push(
    "",
    "## Recommended commands",
    "",
    ...report.recommended_commands.map((c) => `- \`${c}\``),
    "",
  );

  return `${lines.join("\n")}\n`;
}

export async function buildOwnerBrowserProofRefreshDirectorReportV1(args: {
  rootDir: string;
  now?: () => Date;
}): Promise<OwnerBrowserProofRefreshDirectorReportV1> {
  const now = args.now ?? (() => new Date());
  const rootDir = args.rootDir;
  const maxAgeDays = MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1;
  const expiringWindow = OWNER_BROWSER_PROOF_EXPIRING_SOON_WINDOW_DAYS_V1;

  const discovered = discoverOwnerBrowserProofArtifactsV1(rootDir);
  const census = await buildAllProductSafeBuyerPathCensusV1Report({ rootDir });
  const { orchestrator } = loadManufacturerRescueOrchestratorInputV1({ rootDir });
  const factory = buildFridgeSafeLinkBatchFactoryV1({ rootDir });
  const mappingCounts = loadCompatibilityMappingCountsV1(rootDir);
  const hyperagentSet = new Set<string>(FRIDGE_OWNER_BROWSER_PROOF_EXPECTED_SLUGS_V1);

  const orchestratorBySlug = new Map<string, ManufacturerRescueOrchestratorQueueRowV1>(
    orchestrator.unified_rescue_queue.map((r) => [r.filter_slug.toLowerCase(), r]),
  );

  const factoryBySlug = new Map(factory.rows.map((r) => [r.slug.toLowerCase(), r]));

  let rescueRankBySlug = new Map<string, number>();
  try {
    const rescue = loadJson<{ missing_safe_link_slugs?: Array<{ slug: string; rank: number }> }>(
      rootDir,
      "data/fridge/batch-production/drafts/fridge-safe-link-rescue-owner-review-v1.json",
    );
    for (const row of rescue.missing_safe_link_slugs ?? []) {
      rescueRankBySlug.set(row.slug.toLowerCase(), row.rank);
    }
  } catch {
    rescueRankBySlug = new Map();
  }

  const slugUniverse = new Set<string>();
  for (const art of discovered) {
    if (art.slug) slugUniverse.add(art.slug);
  }
  for (const slug of orchestrator.unified_rescue_queue.map((r) => r.filter_slug.toLowerCase())) {
    slugUniverse.add(slug);
  }
  for (const slug of FRIDGE_OWNER_BROWSER_PROOF_EXPECTED_SLUGS_V1) {
    slugUniverse.add(slug);
  }

  const artifactsBySlug = new Map<string, DiscoveredOwnerBrowserProofArtifactV1[]>();
  for (const art of discovered) {
    if (!art.slug) continue;
    const list = artifactsBySlug.get(art.slug) ?? [];
    list.push(art);
    artifactsBySlug.set(art.slug, list);
  }

  const inventory: OwnerBrowserProofInventoryRowV1[] = [];
  const freshnessSummary: Record<OwnerBrowserProofFreshnessClassV1, number> = {
    FRESH: 0,
    EXPIRING_SOON: 0,
    STALE: 0,
    MISSING: 0,
  };

  for (const slug of Array.from(slugUniverse).sort()) {
    const slugArtifacts = artifactsBySlug.get(slug) ?? [];
    const primary = pickPrimaryArtifact(slugArtifacts);
    const orchestratorRow = orchestratorBySlug.get(slug) ?? null;
    const factoryRow = factoryBySlug.get(slug) ?? null;
    const censusRow = census.products.find((p) => p.slug === slug);

    let ageDays: number | "UNKNOWN" = "UNKNOWN";
    let checkedAt: string | null = null;

    if (primary?.artifact_rel_path && primary.checked_at) {
      checkedAt = primary.checked_at;
      const parsed = Date.parse(checkedAt);
      if (Number.isFinite(parsed)) {
        ageDays = (now().getTime() - parsed) / 86_400_000;
      }
    } else if (primary) {
      const abs = path.join(rootDir, primary.artifact_rel_path);
      if (existsSync(abs)) {
        try {
          const doc = JSON.parse(readFileSync(abs, "utf8")) as OwnerBrowserProofResultV1;
          const freshness = assessManufacturerRescueBrowserProofFreshnessV1({
            artifact: doc.contract === FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1 ? doc : null,
            now: args.now,
            max_age_days: maxAgeDays,
          });
          checkedAt = freshness.checked_at;
          ageDays = freshness.age_days;
        } catch {
          // keep UNKNOWN
        }
      }
    }

    const freshnessClass = classifyOwnerBrowserProofFreshnessClassV1({
      has_artifact: slugArtifacts.length > 0,
      checked_at: checkedAt,
      age_days: ageDays,
      max_age_days: maxAgeDays,
      expiring_soon_window_days: expiringWindow,
    });

    freshnessSummary[freshnessClass] += 1;

    const blockedStates = new Set([
      "CONFLICT_REQUIRES_RECONCILIATION",
      "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL",
      "DO_NOT_USE_WRONG_PART_RISK",
    ]);
    const productionBlocked = blockedStates.has(factoryRow?.batch_factory_state ?? "");

    inventory.push({
      slug,
      artifact_rel_paths: slugArtifacts.map((a) => a.artifact_rel_path),
      primary_artifact_rel_path: primary?.artifact_rel_path ?? null,
      freshness_class: freshnessClass,
      checked_at: checkedAt,
      age_days: ageDays,
      max_age_days: maxAgeDays,
      owner_proof_verdict: primary?.verdict ?? null,
      census_page_classification: censusRow?.page_classification ?? "UNKNOWN",
      wedge: censusRow?.wedge ?? "UNKNOWN",
      manufacturer_key: orchestratorRow?.manufacturer_key ?? null,
      hyperagent_cohort_member: hyperagentSet.has(slug),
      model_compatibility_mapping_count: mappingCounts.get(slug) ?? 0,
      production_blocked: productionBlocked,
      production_blocker_summary: productionBlocked ? (factoryRow?.batch_factory_state ?? null) : null,
    });
  }

  const queueCandidates: OwnerBrowserProofRefreshQueueRowV1[] = [];

  for (const inv of inventory) {
    if (!needsRefresh(inv.freshness_class)) continue;
    if (inv.census_page_classification === "SAFE_BUYER_PATH_PROVEN") continue;

    const orchestratorRow = orchestratorBySlug.get(inv.slug);
    const factoryRow = factoryBySlug.get(inv.slug);
    const expectedDelta: 0 | 1 = inv.production_blocked ? 0 : 1;
    const hasPassProof = inv.owner_proof_verdict === "PASS_BROWSER_PROOF";
    const evidenceGap = computeEvidenceGapCount({
      hasPassProof,
      factoryState: factoryRow?.batch_factory_state ?? null,
      freshness: inv.freshness_class,
    });

    const productionPriority = orchestratorRow?.orchestrator_priority_score ?? 0;
    const refreshPriority = computeRefreshPriorityScore({
      freshness: inv.freshness_class,
      productionPriority,
      evidenceGap,
      expectedDelta,
      hyperagentMember: inv.hyperagent_cohort_member,
      modelMappingCount: inv.model_compatibility_mapping_count,
      rescueRank: rescueRankBySlug.get(inv.slug) ?? null,
    });

    const refreshRationale =
      inv.freshness_class === "MISSING"
        ? "No owner-browser-proof result artifact — capture required before evidence lane."
        : inv.freshness_class === "STALE"
          ? `PASS proof stale (age ${typeof inv.age_days === "number" ? inv.age_days.toFixed(1) : "UNKNOWN"}d > ${String(maxAgeDays)}d policy).`
          : "Proof expiring soon — refresh before apply-plan/readiness gate blocks.";

    queueCandidates.push({
      rank: 0,
      slug: inv.slug,
      freshness_class: inv.freshness_class,
      refresh_priority_score: refreshPriority,
      expected_safe_buyer_path_proven_delta: expectedDelta,
      evidence_gap_count: evidenceGap,
      production_priority_score: productionPriority,
      wedge: inv.wedge,
      manufacturer_key: inv.manufacturer_key,
      model_compatibility_mapping_count: inv.model_compatibility_mapping_count,
      census_page_classification: inv.census_page_classification,
      hyperagent_cohort_member: inv.hyperagent_cohort_member,
      primary_artifact_rel_path: inv.primary_artifact_rel_path,
      refresh_rationale: refreshRationale,
      recommended_session_command:
        "node --import tsx scripts/report-fridge-safe-link-owner-browser-proof-session-v1.ts",
    });
  }

  queueCandidates.sort(
    (a, b) =>
      b.refresh_priority_score - a.refresh_priority_score ||
      a.evidence_gap_count - b.evidence_gap_count ||
      b.expected_safe_buyer_path_proven_delta - a.expected_safe_buyer_path_proven_delta ||
      a.slug.localeCompare(b.slug),
  );

  const rankedRefreshQueue = queueCandidates.map((row, index) => ({ ...row, rank: index + 1 }));
  const ownerSessions = groupOwnerBrowserProofRefreshSessionsV1({ queue: rankedRefreshQueue });
  const totalExpectedDelta = ownerSessions.reduce(
    (sum, s) => sum + s.expected_safe_buyer_path_proven_delta,
    0,
  );

  return {
    contract: OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    evidence_write_authorized: false,
    evidence_regeneration_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    founder_approval_activation_authorized: false,
    browser_automation_authorized: false,
    auto_pass_forbidden: true,
    source_command: OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    browser_proof_max_age_days: maxAgeDays,
    expiring_soon_window_days: expiringWindow,
    artifacts_discovered_count: discovered.length,
    inventory_slug_count: inventory.length,
    refresh_queue_slug_count: rankedRefreshQueue.length,
    owner_session_count: ownerSessions.length,
    freshness_summary: freshnessSummary,
    discovered_artifacts: discovered,
    inventory,
    ranked_refresh_queue: rankedRefreshQueue,
    owner_refresh_sessions: ownerSessions,
    total_expected_delta_all_sessions: totalExpectedDelta,
    proven_facts: [
      `PROVEN: scanned ${String(discovered.length)} owner-browser-proof-related JSON artifact(s) under data/fridge/batch-production/drafts and data/evidence.`,
      `PROVEN: freshness policy max_age_days=${String(maxAgeDays)} from manufacturer_rescue_owner_browser_proof_evidence_v1.`,
      `PROVEN: refresh queue excludes census SAFE_BUYER_PATH_PROVEN slugs.`,
      "PROVEN: auto_pass_forbidden=true — director schedules refresh only; never grants PASS_BROWSER_PROOF.",
    ],
    inferred_facts: [
      `INFERRED: ${String(ownerSessions.length)} owner session(s) batch ${String(rankedRefreshQueue.length)} refresh slug(s).`,
      `INFERRED: total expected delta +${String(totalExpectedDelta)} if all queued slugs complete evidence lane.`,
      "INFERRED: preferred session bundles align with HyperAgent evidence pair and Frigidaire PASS cluster.",
    ],
    unknown_facts: [
      "UNKNOWN: exact owner calendar time per session.",
      "UNKNOWN: post-refresh readiness gate outcome until owner PASS proof re-recorded.",
    ],
    recommended_commands: [
      OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_SOURCE_COMMAND_V1,
      "node --import tsx scripts/report-fridge-safe-link-owner-browser-proof-session-v1.ts",
      "npm run buckparts:fridge-safe-link-batch-factory",
      "npm run buckparts:manufacturer-safe-link-rescue-readiness-gate",
    ],
  };
}

export async function writeOwnerBrowserProofRefreshDirectorDraftsV1(args: {
  rootDir: string;
  now?: () => Date;
}): Promise<OwnerBrowserProofRefreshDirectorReportV1> {
  const report = await buildOwnerBrowserProofRefreshDirectorReportV1(args);
  const jsonAbs = path.join(args.rootDir, OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, OWNER_BROWSER_PROOF_REFRESH_DIRECTOR_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildOwnerBrowserProofRefreshDirectorMarkdownV1(report), "utf8");
  return report;
}
