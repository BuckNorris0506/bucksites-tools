/**
 * MISSION_FACTORY_QUEUE_GENERATOR_V1 — continuous QUEUED mission generation (V1.1 slice).
 * Reads evidence leverage, control graph rollup, and safe-link batch factory.
 * Writes only to mission-registry-v1.json when explicitly requested — no product data mutation.
 */

import {
  buildCommandCenterControlGraphRollupV1,
} from "./command-center-control-graph-rollup-v1";
import {
  buildFridgeSafeLinkBatchFactoryV1,
  FRIDGE_SAFE_LINK_BATCH_FACTORY_JSON_REL_V1,
} from "./fridge-safe-link-batch-factory-v1";
import {
  buildEvidenceLeveragePrioritizationV1,
  EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
} from "./evidence-leverage-prioritization-v1";
import {
  createMissionFactoryRegistryEntryV1,
  enforceMissionFactoryRegistryTtlV1,
  findActiveMissionByDedupKeyV1,
  loadMissionFactoryRegistryV1,
  missionFactoryDedupKeyV1,
  saveMissionFactoryRegistryV1,
  type MissionFactoryMissionTypeV1,
  type MissionFactoryRegistryDocumentV1,
  type MissionFactoryRegistryEntryV1,
  type MissionFactoryWedgeV1,
} from "./mission-factory-registry-v1";

export const MISSION_FACTORY_QUEUE_GENERATOR_CONTRACT_V1 =
  "mission_factory_queue_generator_v1" as const;

export const MISSION_FACTORY_QUEUE_GENERATOR_REPORT_CONTRACT_V1 =
  "mission_factory_queue_generator_report_v1" as const;

export const MISSION_FACTORY_QUEUE_GENERATOR_SOURCE_COMMAND_V1 =
  "npm run buckparts:mission-factory-queue" as const;

export const MISSION_FACTORY_QUEUE_MIN_DEPTH_V1 = 15 as const;
export const MISSION_FACTORY_QUEUE_MAX_DEPTH_V1 = 25 as const;

export const MISSION_FACTORY_QUEUE_PRIORITY_BY_TYPE_V1: Record<
  MissionFactoryMissionTypeV1,
  number
> = {
  WRONG_PART_RESEARCH: 1,
  FAMILY_RECONCILIATION: 2,
  EVIDENCE_SCALING: 3,
  SAFE_LINK_COVERAGE: 4,
  NEW_WEDGE_EXPANSION: 5,
};

export type MissionFactoryQueueGenerationModeV1 =
  | "paused_at_max_depth"
  | "filling_to_min_depth"
  | "satisfied_within_target_band"
  | "no_candidates";

export type MissionFactoryQueueCandidateV1 = {
  mission_type: MissionFactoryMissionTypeV1;
  wedge: MissionFactoryWedgeV1;
  priority: number;
  target_family: string;
  target_slugs: string[];
  source_reference: string;
  unlock_score: number;
  family_size: number;
  dedup_key: string;
  blocked_by_active_mission: boolean;
  blocked_mission_id: string | null;
};

export type MissionFactoryQueueGeneratorReportV1 = {
  contract: typeof MISSION_FACTORY_QUEUE_GENERATOR_REPORT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  registry_write_performed: boolean;
  generated_at: string;
  source_command: typeof MISSION_FACTORY_QUEUE_GENERATOR_SOURCE_COMMAND_V1;
  queue_depth_before: number;
  queue_depth_after: number;
  queue_depth_target_min: typeof MISSION_FACTORY_QUEUE_MIN_DEPTH_V1;
  queue_depth_target_max: typeof MISSION_FACTORY_QUEUE_MAX_DEPTH_V1;
  generation_mode: MissionFactoryQueueGenerationModeV1;
  ttl_transitions_applied: number;
  candidates_generated: number;
  candidates_blocked_dedup: number;
  missions_added: number;
  missions_added_ids: string[];
  evidence_scaling_candidate_count: number;
  safe_link_coverage_candidate_count: number;
  ordered_candidate_preview: MissionFactoryQueueCandidateV1[];
  missions_by_priority: Record<string, number>;
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

function parseIso(value: string): number {
  return Date.parse(value);
}

function countQueueDepth(doc: MissionFactoryRegistryDocumentV1): number {
  return doc.missions.filter(
    (mission) => mission.state === "QUEUED" || mission.state === "DISPATCH_READY",
  ).length;
}

function leverageTargetByFamily(
  rootDir: string,
  now?: () => Date,
): Map<string, { unlock_score: number; target_slugs: string[]; family_size: number }> {
  const leverage = buildEvidenceLeveragePrioritizationV1({ rootDir, now });
  const byFamily = new Map<
    string,
    { unlock_score: number; target_slugs: string[]; family_size: number }
  >();
  for (const target of leverage.top_50_highest_leverage_evidence_targets) {
    byFamily.set(target.family_key, {
      unlock_score: target.estimated_factory_unlock_score,
      target_slugs: target.unlock_slugs.length > 0 ? target.unlock_slugs : target.representative_slugs,
      family_size: target.currently_unproven_count,
    });
  }
  return byFamily;
}

export function generateEvidenceScalingQueueCandidatesV1(args: {
  rootDir: string;
  now?: () => Date;
}): MissionFactoryQueueCandidateV1[] {
  const rollup = buildCommandCenterControlGraphRollupV1({ rootDir: args.rootDir, now: args.now });
  const leverageByFamily = leverageTargetByFamily(args.rootDir, args.now);
  const candidates: MissionFactoryQueueCandidateV1[] = [];

  for (const ranked of rollup.next_best_action_ranked) {
    if (
      ranked.safety_tier !== "SAFE_EVIDENCE" &&
      ranked.safety_tier !== "BOUNDED_EVIDENCE_RESEARCH"
    ) {
      continue;
    }
    if (!ranked.family_key) continue;

    const leverage = leverageByFamily.get(ranked.family_key);
    const target_slugs = leverage?.target_slugs ?? [];
    const unlock_score = leverage?.unlock_score ?? ranked.leverage_score;
    const family_size = leverage?.family_size ?? target_slugs.length;
    const input = {
      mission_type: "EVIDENCE_SCALING" as const,
      wedge: "refrigerator" as const,
      priority: MISSION_FACTORY_QUEUE_PRIORITY_BY_TYPE_V1.EVIDENCE_SCALING,
      target_family: ranked.family_key,
      target_slugs,
      source_reference: EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
      unlock_score,
      family_size,
    };

    candidates.push({
      ...input,
      dedup_key: missionFactoryDedupKeyV1(input),
      blocked_by_active_mission: false,
      blocked_mission_id: null,
    });
  }

  return candidates;
}

function filterFamilyKeyFromSafeLinkRow(args: {
  brand_slug: string | null;
  oem_part_token: string | null;
}): string | null {
  const brand = args.brand_slug?.trim().toLowerCase();
  const token = args.oem_part_token?.trim().toLowerCase();
  if (!brand || !token) return null;
  return `filter::${brand}::${token}`;
}

export function generateSafeLinkCoverageQueueCandidatesV1(args: {
  rootDir: string;
  now?: () => Date;
}): MissionFactoryQueueCandidateV1[] {
  const factory = buildFridgeSafeLinkBatchFactoryV1({ rootDir: args.rootDir, now: args.now });
  const grouped = new Map<string, { slugs: string[]; brand_slug: string | null; token: string }>();

  for (const row of factory.rows) {
    const familyKey = filterFamilyKeyFromSafeLinkRow({
      brand_slug: row.brand_slug,
      oem_part_token: row.oem_part_token,
    });
    if (!familyKey) continue;
    const existing = grouped.get(familyKey);
    if (existing) {
      if (!existing.slugs.includes(row.slug)) existing.slugs.push(row.slug);
      continue;
    }
    grouped.set(familyKey, {
      slugs: [row.slug],
      brand_slug: row.brand_slug,
      token: row.oem_part_token!.trim().toLowerCase(),
    });
  }

  const candidates: MissionFactoryQueueCandidateV1[] = [];
  for (const [target_family, group] of Array.from(grouped)) {
    const input = {
      mission_type: "SAFE_LINK_COVERAGE" as const,
      wedge: "refrigerator" as const,
      priority: MISSION_FACTORY_QUEUE_PRIORITY_BY_TYPE_V1.SAFE_LINK_COVERAGE,
      target_family,
      target_slugs: [...group.slugs].sort(),
      source_reference: FRIDGE_SAFE_LINK_BATCH_FACTORY_JSON_REL_V1,
      unlock_score: group.slugs.length,
      family_size: group.slugs.length,
    };
    candidates.push({
      ...input,
      dedup_key: missionFactoryDedupKeyV1(input),
      blocked_by_active_mission: false,
      blocked_mission_id: null,
    });
  }

  return candidates;
}

export function markQueueCandidatesAgainstRegistryV1(args: {
  candidates: MissionFactoryQueueCandidateV1[];
  doc: MissionFactoryRegistryDocumentV1;
}): MissionFactoryQueueCandidateV1[] {
  return args.candidates.map((candidate) => {
    const active = findActiveMissionByDedupKeyV1(args.doc, candidate.dedup_key);
    if (!active) return candidate;
    return {
      ...candidate,
      blocked_by_active_mission: true,
      blocked_mission_id: active.mission_id,
    };
  });
}

function existingQueuedAgeHours(
  doc: MissionFactoryRegistryDocumentV1,
  dedupKey: string,
  referenceIso: string,
): number {
  const mission = doc.missions.find(
    (row) =>
      (row.state === "QUEUED" || row.state === "DISPATCH_READY") &&
      missionFactoryDedupKeyV1(row) === dedupKey,
  );
  if (!mission) return 0;
  return (parseIso(referenceIso) - parseIso(mission.created_at)) / (1000 * 60 * 60);
}

export function compareMissionFactoryQueueCandidatesV1(
  a: MissionFactoryQueueCandidateV1,
  b: MissionFactoryQueueCandidateV1,
  doc: MissionFactoryRegistryDocumentV1,
  referenceIso: string,
): number {
  if (a.priority !== b.priority) return a.priority - b.priority;
  if (b.unlock_score !== a.unlock_score) return b.unlock_score - a.unlock_score;
  if (b.family_size !== a.family_size) return b.family_size - a.family_size;
  const ageA = existingQueuedAgeHours(doc, a.dedup_key, referenceIso);
  const ageB = existingQueuedAgeHours(doc, b.dedup_key, referenceIso);
  if (ageB !== ageA) return ageB - ageA;
  return a.target_family.localeCompare(b.target_family);
}

export function sortMissionFactoryQueueCandidatesV1(
  candidates: MissionFactoryQueueCandidateV1[],
  doc: MissionFactoryRegistryDocumentV1,
  referenceIso: string,
): MissionFactoryQueueCandidateV1[] {
  return [...candidates].sort((a, b) =>
    compareMissionFactoryQueueCandidatesV1(a, b, doc, referenceIso),
  );
}

export function runMissionFactoryQueueGeneratorV1(args: {
  rootDir: string;
  registryRootDir?: string;
  now?: () => Date;
  writeRegistry?: boolean;
}): {
  report: MissionFactoryQueueGeneratorReportV1;
  doc: MissionFactoryRegistryDocumentV1;
} {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const registryRoot = args.registryRootDir ?? args.rootDir;
  let doc = loadMissionFactoryRegistryV1(registryRoot);
  const queue_depth_before = countQueueDepth(doc);

  const ttl = enforceMissionFactoryRegistryTtlV1({ doc, now: args.now });
  doc = ttl.doc;

  const depthAfterTtl = countQueueDepth(doc);
  let generation_mode: MissionFactoryQueueGenerationModeV1;
  let missions_added_ids: string[] = [];

  const evidenceCandidates = generateEvidenceScalingQueueCandidatesV1({
    rootDir: args.rootDir,
    now: args.now,
  });
  const safeLinkCandidates = generateSafeLinkCoverageQueueCandidatesV1({
    rootDir: args.rootDir,
    now: args.now,
  });
  const allCandidates = markQueueCandidatesAgainstRegistryV1({
    candidates: [...evidenceCandidates, ...safeLinkCandidates],
    doc,
  });
  const ordered = sortMissionFactoryQueueCandidatesV1(allCandidates, doc, generatedAt);
  const candidates_blocked_dedup = ordered.filter((c) => c.blocked_by_active_mission).length;

  if (depthAfterTtl >= MISSION_FACTORY_QUEUE_MAX_DEPTH_V1) {
    generation_mode = "paused_at_max_depth";
  } else if (depthAfterTtl >= MISSION_FACTORY_QUEUE_MIN_DEPTH_V1) {
    generation_mode = "satisfied_within_target_band";
  } else if (ordered.filter((c) => !c.blocked_by_active_mission).length === 0) {
    generation_mode = "no_candidates";
  } else {
    generation_mode = "filling_to_min_depth";
    const slots = Math.min(
      MISSION_FACTORY_QUEUE_MIN_DEPTH_V1 - depthAfterTtl,
      MISSION_FACTORY_QUEUE_MAX_DEPTH_V1 - depthAfterTtl,
    );

    for (const candidate of ordered) {
      if (missions_added_ids.length >= slots) break;
      if (candidate.blocked_by_active_mission) continue;

      const created = createMissionFactoryRegistryEntryV1({
        doc,
        now: args.now,
        input: {
          mission_type: candidate.mission_type,
          wedge: candidate.wedge,
          priority: candidate.priority,
          target_family: candidate.target_family,
          target_slugs: candidate.target_slugs,
          source_reference: candidate.source_reference,
          actor: "queue_generator",
          reason: "queue_generator_v1_candidate",
        },
      });
      if (!created.ok) continue;
      doc = created.doc;
      missions_added_ids.push(created.entry.mission_id);
    }
  }

  const queue_depth_after = countQueueDepth(doc);
  const registry_write_performed = args.writeRegistry === true;
  if (registry_write_performed) {
    saveMissionFactoryRegistryV1(registryRoot, doc);
  }

  const missions_by_priority: Record<string, number> = {};
  for (const mission of doc.missions.filter(
    (row) => row.state === "QUEUED" || row.state === "DISPATCH_READY",
  )) {
    const key = String(mission.priority);
    missions_by_priority[key] = (missions_by_priority[key] ?? 0) + 1;
  }

  const pathsRead = new Set<string>([
    "data/mission-factory/mission-registry-v1.json",
    EVIDENCE_LEVERAGE_PRIORITIZATION_JSON_REL_V1,
    FRIDGE_SAFE_LINK_BATCH_FACTORY_JSON_REL_V1,
    "scripts/lib/command-center-control-graph-rollup-v1.ts",
    "scripts/lib/evidence-leverage-prioritization-v1.ts",
    "scripts/lib/fridge-safe-link-batch-factory-v1.ts",
  ]);

  const report: MissionFactoryQueueGeneratorReportV1 = {
    contract: MISSION_FACTORY_QUEUE_GENERATOR_REPORT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    registry_write_performed,
    generated_at: generatedAt,
    source_command: MISSION_FACTORY_QUEUE_GENERATOR_SOURCE_COMMAND_V1,
    queue_depth_before,
    queue_depth_after: registry_write_performed ? queue_depth_after : queue_depth_before + missions_added_ids.length,
    queue_depth_target_min: MISSION_FACTORY_QUEUE_MIN_DEPTH_V1,
    queue_depth_target_max: MISSION_FACTORY_QUEUE_MAX_DEPTH_V1,
    generation_mode,
    ttl_transitions_applied: ttl.transitions.length,
    candidates_generated: ordered.length,
    candidates_blocked_dedup,
    missions_added: missions_added_ids.length,
    missions_added_ids,
    evidence_scaling_candidate_count: evidenceCandidates.length,
    safe_link_coverage_candidate_count: safeLinkCandidates.length,
    ordered_candidate_preview: ordered.slice(0, 10),
    missions_by_priority,
    exact_repo_paths_read: Array.from(pathsRead).sort(),
    proven_facts: [
      `PROVEN: queue_depth_before=${String(queue_depth_before)} queue_depth_after=${String(registry_write_performed ? queue_depth_after : queue_depth_before + missions_added_ids.length)} target_band=${String(MISSION_FACTORY_QUEUE_MIN_DEPTH_V1)}-${String(MISSION_FACTORY_QUEUE_MAX_DEPTH_V1)}.`,
      `PROVEN: generation_mode=${generation_mode}; missions_added=${String(missions_added_ids.length)}; candidates_blocked_dedup=${String(candidates_blocked_dedup)}.`,
      `PROVEN: evidence_scaling_candidates=${String(evidenceCandidates.length)} safe_link_coverage_candidates=${String(safeLinkCandidates.length)}.`,
      `PROVEN: ttl_transitions_applied=${String(ttl.transitions.length)} (QUEUED staleness → EXPIRED per 72h architecture).`,
      registry_write_performed
        ? "PROVEN: registry_write_performed=true — new QUEUED missions persisted to mission-registry-v1.json only."
        : "PROVEN: registry_write_performed=false — dry-run preview; no registry file mutation.",
    ],
    unknown_facts: [
      "UNKNOWN: Whether live Supabase or unpublished drafts differ from committed safe-link / leverage inputs.",
    ],
  };

  return { report, doc: registry_write_performed ? doc : loadMissionFactoryRegistryV1(registryRoot) };
}

export function previewQueuedMissionsFromGeneratorV1(
  doc: MissionFactoryRegistryDocumentV1,
): MissionFactoryRegistryEntryV1[] {
  return doc.missions
    .filter((mission) => mission.state === "QUEUED" || mission.state === "DISPATCH_READY")
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.created_at.localeCompare(b.created_at);
    });
}
