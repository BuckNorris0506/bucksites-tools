/**
 * HYPERAGENT_ORCHESTRATOR_V0 — single-iteration BuckParts loop.
 * read queue → select item → build mission packet → record dispatch → stop
 *
 * Loop doctrine:
 * - The loop, not Jared, prompts HyperAgent.
 * - HyperAgent creates evidence, not truth.
 * - The queue chooses eligible work.
 * - The dispatch registry prevents duplicate/no-progress loops.
 * - Cursor validation and owner review remain downstream feedback.
 * - Phase 0 runs exactly one iteration and stops.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { HYPERAGENT_INGEST_PACKET_CONTRACT_V1 } from "./buckparts-ops-agent-workflow-v1";
import {
  buildHyperAgentDispatchRegistryV1,
  hyperAgentDedupKeyV1,
  hyperAgentSlugBatchFingerprintV1,
  HYPERAGENT_DISPATCH_EVENTS_CONTRACT_V1,
  HYPERAGENT_DISPATCH_EVENTS_REL_V1,
  isHyperAgentRedispatchBlockedV1,
  type HyperAgentDispatchEventV1,
  type HyperAgentDispatchEventsFileV1,
} from "./hyperagent-dispatch-registry-v1";
import {
  buildHyperAgentWorkQueueV1,
  type HyperAgentWorkQueueItemV1,
  type HyperAgentWorkQueueMissionTypeV1,
} from "./hyperagent-work-queue-v1";
import { FAMILY_RECONCILIATION_JSON_REL_V1 } from "./family-reconciliation-v1";
import { MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1 } from "./model-filter-correctness-audit-v1";
import { BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1 } from "./bad-mapping-correction-batch-runner-v1";

export const HYPERAGENT_MISSION_PACKET_CONTRACT_V0 = "hyperagent_mission_packet_v0" as const;
export const HYPERAGENT_ORCHESTRATOR_RESULT_CONTRACT_V0 =
  "hyperagent_orchestrator_result_v0" as const;
export const HYPERAGENT_ORCHESTRATOR_VERSION_V0 = "v0" as const;
export const HYPERAGENT_ORCHESTRATOR_LOOP_ITERATION_V0 = 1 as const;

export const HYPERAGENT_ORCHESTRATOR_OUTBOX_REL_V0 =
  "data/fridge/batch-production/hyperagent/outbox" as const;

export const HYPERAGENT_ORCHESTRATOR_HALT_CONDITIONS_V0 = [
  "NO_ELIGIBLE_ITEM",
  "ALREADY_DISPATCHED",
  "BLOCKED_BY_REGISTRY",
  "BLOCKED_BY_QUEUE",
  "DISPATCH_RECORDED",
  "DRY_RUN_PREVIEW",
] as const;

export type HyperAgentOrchestratorHaltConditionV0 =
  (typeof HYPERAGENT_ORCHESTRATOR_HALT_CONDITIONS_V0)[number];

export const HYPERAGENT_MISSION_NOT_AUTHORIZED_V0 = [
  "supabase_mutation",
  "retailer_links_csv_mutation",
  "compatibility_mappings_csv_mutation",
  "filters_csv_mutation",
  "fridge_models_csv_mutation",
  "evidence_mutation",
  "deploy",
  "go_click",
  "verified_link_authorization",
  "truth_closure",
  "commit",
] as const;

export const HYPERAGENT_ORCHESTRATOR_BASE_NAMED_SKILLS_V0 = [
  "buildHyperAgentWorkQueueV1",
  "buildHyperAgentDispatchRegistryV1",
  "isHyperAgentRedispatchBlockedV1",
  "hyperAgentDedupKeyV1",
  "hyperAgentSlugBatchFingerprintV1",
] as const;

export type HyperAgentMissionPacketV0 = {
  contract: typeof HYPERAGENT_MISSION_PACKET_CONTRACT_V0;
  orchestrator_version: typeof HYPERAGENT_ORCHESTRATOR_VERSION_V0;
  loop_iteration: typeof HYPERAGENT_ORCHESTRATOR_LOOP_ITERATION_V0;
  loop_halt_after_dispatch: true;
  halt_condition: HyperAgentOrchestratorHaltConditionV0;
  mission_id: string;
  queue_item_id: string;
  dedup_key: string;
  slug_batch_fingerprint: string | null;
  mission_type: HyperAgentWorkQueueMissionTypeV1;
  family_key: string | null;
  scope_key: string;
  slug_batch: string[];
  discovery_status: "DISCOVERY_OPEN";
  truth_closure_claimed: false;
  mutation_authorized: false;
  read_only: true;
  data_mutation: false;
  not_authorized: readonly string[];
  named_skill_used: string[];
  copy_paste_prompt: string;
  deliverable_contract: typeof HYPERAGENT_INGEST_PACKET_CONTRACT_V1;
  deliverable_rel_path_hint: string;
  repo_context_paths: string[];
  generated_at: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export type HyperAgentOrchestratorResultV0 = {
  contract: typeof HYPERAGENT_ORCHESTRATOR_RESULT_CONTRACT_V0;
  halt_condition: HyperAgentOrchestratorHaltConditionV0;
  exit_code: number;
  read_only: true;
  data_mutation: boolean;
  mutation_authorized: false;
  generated_at: string;
  queue_item_id: string | null;
  mission_id: string | null;
  mission_packet: HyperAgentMissionPacketV0 | null;
  mission_packet_json_rel_path: string | null;
  mission_packet_md_rel_path: string | null;
  copy_paste_prompt: string | null;
  dispatch_event_appended: boolean;
  blocked_reasons: string[];
};

export type HyperAgentOrchestratorPathOverridesV0 = {
  dispatchEventsAbsPath?: string;
  outboxAbsPath?: string;
};

function stableMissionIdSuffix(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 8);
}

export function buildMissionIdV0(item: HyperAgentWorkQueueItemV1): string {
  const familySlug =
    item.family_key?.split("::").pop() ??
    item.scope_key.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 32);
  const typeSlug = item.mission_type.toLowerCase().replace(/_/g, "-");
  const suffix = stableMissionIdSuffix(`${item.queue_item_id}|${item.scope_key}`);
  return `${familySlug}-${typeSlug}-${suffix}`;
}

export function namedSkillsUsedForMissionV0(
  item: HyperAgentWorkQueueItemV1,
): string[] {
  const promptSkill =
    item.mission_type === "BOUNDED_EVIDENCE_SLICE"
      ? "buildBoundedEvidenceSlicePromptV0"
      : item.mission_type === "BAD_MAPPING_RESEARCH"
        ? "buildBadMappingResearchPromptV0"
        : "buildEvidenceCapturePromptV0";
  return [...HYPERAGENT_ORCHESTRATOR_BASE_NAMED_SKILLS_V0, promptSkill, "buildCopyPastePromptV0"];
}

export function repoContextPathsForMissionV0(
  missionType: HyperAgentWorkQueueMissionTypeV1,
): string[] {
  const shared = [
    HYPERAGENT_DISPATCH_EVENTS_REL_V1,
    MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
    FAMILY_RECONCILIATION_JSON_REL_V1,
    "data/fridge/batch-production/audits/evidence-leverage-prioritization-v1.json",
    "scripts/lib/family-pre-research-risk-screen-v1.ts",
    "docs/BuckParts-OPS-AGENT-WORKFLOW-V1.md",
  ];
  if (missionType === "BAD_MAPPING_RESEARCH") {
    return [
      BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1,
      "data/fridge/batch-production/audits/dangerous-mapping-remediation-plan-v1.json",
      ...shared,
    ].sort();
  }
  return shared.sort();
}

export function buildBoundedEvidenceSlicePromptV0(
  item: HyperAgentWorkQueueItemV1,
): string {
  const slugLines = item.slug_batch.map((slug) => `- ${slug}`).join("\n");
  return [
    "BuckParts HYPERAGENT_ORCHESTRATOR_V0 — BOUNDED_EVIDENCE_SLICE",
    "",
    `family_key: ${item.family_key ?? "null"}`,
    `mission_type: ${item.mission_type}`,
    `scope_key: ${item.scope_key}`,
    `queue_item_id: ${item.queue_item_id}`,
    "",
    "IMPORTANT: Full-family HyperAgent scaling is BLOCKED for this family.",
    "Run BOUNDED RESEARCH ONLY on the exact slug batch below.",
    "",
    `Slug batch (${String(item.slug_batch.length)}):`,
    slugLines,
    "",
    "Requirements:",
    "- Find official manufacturer filter_specification evidence for each exact model slug",
    "- Output deliverable contract buckparts_hyperagent_ingest_packet_v1 with candidate_rows per slug",
    "- Set discovery_status=DISCOVERY_COMPLETE on the ingest packet when research is done",
    "- truth_closure_claimed=false on the ingest packet",
    "- mutation_authorized=false — no compatibility_mappings.csv, filters.csv, fridge_models.csv, manual-evidence JSON, Supabase, pages, sitemap, robots, or retailer link edits",
    "- Terminal state per row required (DISCOVERY_COMPLETE | DISCOVERY_BLOCKED | NEEDS_OWNER_REVIEW)",
    "- Official manufacturer pages are highest-confidence; third-party sources are discovery input only",
    "- INFERRED or color-variant extrapolation must not be presented as repo truth",
    "",
    item.why ? `Repo context: ${item.why}` : "",
    item.title ? `Queue title: ${item.title}` : "",
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

function buildBadMappingResearchPromptV0(item: HyperAgentWorkQueueItemV1): string {
  const body = item.exact_hyperagent_prompt?.trim();
  if (!body) {
    throw new Error(
      `hyperagent_orchestrator_v0: BAD_MAPPING_RESEARCH item ${item.queue_item_id} missing exact_hyperagent_prompt`,
    );
  }
  return [
    "BuckParts HYPERAGENT_ORCHESTRATOR_V0 — BAD_MAPPING_RESEARCH",
    "",
    `scope_key: ${item.scope_key}`,
    `queue_item_id: ${item.queue_item_id}`,
    `slug_batch_count: ${String(item.slug_batch.length)}`,
    "",
    "Requirements:",
    "- Output deliverable contract buckparts_hyperagent_ingest_packet_v1",
    "- truth_closure_claimed=false; mutation_authorized=false",
    "- Official manufacturer evidence first; third-party discovery only",
    "",
    body,
  ].join("\n");
}

function buildEvidenceCapturePromptV0(item: HyperAgentWorkQueueItemV1): string {
  const slugLines =
    item.slug_batch.length > 0
      ? item.slug_batch.map((slug) => `- ${slug}`).join("\n")
      : "- (full family — verify pre-research screen allowed full-family dispatch)";
  return [
    "BuckParts HYPERAGENT_ORCHESTRATOR_V0 — EVIDENCE_CAPTURE",
    "",
    `family_key: ${item.family_key ?? "null"}`,
    `scope_key: ${item.scope_key}`,
    `queue_item_id: ${item.queue_item_id}`,
    "",
    "Slug batch:",
    slugLines,
    "",
    "Requirements:",
    "- Official manufacturer filter_specification evidence per slug",
    "- Output buckparts_hyperagent_ingest_packet_v1; truth_closure_claimed=false",
    "- No repo mutations from HyperAgent",
    "",
    item.title ? `Queue title: ${item.title}` : "",
    item.why ? `Repo context: ${item.why}` : "",
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

export function buildCopyPastePromptV0(item: HyperAgentWorkQueueItemV1): string {
  switch (item.mission_type) {
    case "BOUNDED_EVIDENCE_SLICE":
      return buildBoundedEvidenceSlicePromptV0(item);
    case "BAD_MAPPING_RESEARCH":
      return buildBadMappingResearchPromptV0(item);
    case "EVIDENCE_CAPTURE":
      return buildEvidenceCapturePromptV0(item);
    default:
      throw new Error(`hyperagent_orchestrator_v0: unsupported mission_type ${item.mission_type}`);
  }
}

export function buildHyperAgentMissionPacketV0(args: {
  item: HyperAgentWorkQueueItemV1;
  generatedAt: string;
  halt_condition: HyperAgentOrchestratorHaltConditionV0;
}): HyperAgentMissionPacketV0 {
  const dedupKey = hyperAgentDedupKeyV1(args.item.mission_type, args.item.scope_key);
  const fingerprint = hyperAgentSlugBatchFingerprintV1(args.item.slug_batch);
  const missionId = buildMissionIdV0(args.item);

  return {
    contract: HYPERAGENT_MISSION_PACKET_CONTRACT_V0,
    orchestrator_version: HYPERAGENT_ORCHESTRATOR_VERSION_V0,
    loop_iteration: HYPERAGENT_ORCHESTRATOR_LOOP_ITERATION_V0,
    loop_halt_after_dispatch: true,
    halt_condition: args.halt_condition,
    mission_id: missionId,
    queue_item_id: args.item.queue_item_id,
    dedup_key: dedupKey,
    slug_batch_fingerprint: fingerprint,
    mission_type: args.item.mission_type,
    family_key: args.item.family_key,
    scope_key: args.item.scope_key,
    slug_batch: [...args.item.slug_batch],
    discovery_status: "DISCOVERY_OPEN",
    truth_closure_claimed: false,
    mutation_authorized: false,
    read_only: true,
    data_mutation: false,
    not_authorized: [...HYPERAGENT_MISSION_NOT_AUTHORIZED_V0],
    named_skill_used: namedSkillsUsedForMissionV0(args.item),
    copy_paste_prompt: buildCopyPastePromptV0(args.item),
    deliverable_contract: HYPERAGENT_INGEST_PACKET_CONTRACT_V1,
    deliverable_rel_path_hint: `data/fridge/batch-production/drafts/${missionId}-hyperagent-ingest-packet-v1.json`,
    repo_context_paths: repoContextPathsForMissionV0(args.item.mission_type),
    generated_at: args.generatedAt,
    proven_facts: [
      `PROVEN: loop_iteration=${String(HYPERAGENT_ORCHESTRATOR_LOOP_ITERATION_V0)} — single iteration, no scheduler.`,
      `PROVEN: mission derived from hyperagent_work_queue_v1 queue_item_id=${args.item.queue_item_id}.`,
      `PROVEN: dedup_key=${dedupKey}.`,
      fingerprint ? `PROVEN: slug_batch_fingerprint=${fingerprint}.` : "PROVEN: slug_batch_fingerprint=null.",
      `PROVEN: halt_condition=${args.halt_condition}.`,
      "PROVEN: Orchestrator v0 emits discovery mission only — no truth closure.",
    ],
    unknown_facts: [
      "UNKNOWN: HyperAgent in-flight status until operator records DISPATCHED event.",
      "UNKNOWN: Live Supabase vs committed CSV at dispatch time.",
    ],
  };
}

export function formatMissionPacketMarkdownV0(packet: HyperAgentMissionPacketV0): string {
  return [
    `# HyperAgent mission packet v0 — ${packet.mission_id}`,
    "",
    `- contract: \`${packet.contract}\``,
    `- loop_iteration: **${String(packet.loop_iteration)}**`,
    `- loop_halt_after_dispatch: **true**`,
    `- halt_condition: \`${packet.halt_condition}\``,
    `- mission_type: \`${packet.mission_type}\``,
    `- family_key: \`${packet.family_key ?? "null"}\``,
    `- queue_item_id: \`${packet.queue_item_id}\``,
    `- dedup_key: \`${packet.dedup_key}\``,
    `- deliverable: \`${packet.deliverable_rel_path_hint}\``,
    `- truth_closure_claimed: **false**`,
    `- mutation_authorized: **false**`,
    "",
    "## Named skills used",
    "",
    ...packet.named_skill_used.map((skill) => `- \`${skill}\``),
    "",
    "## Copy-paste prompt",
    "",
    "```",
    packet.copy_paste_prompt,
    "```",
    "",
  ].join("\n");
}

function resolveDispatchEventsAbsPath(
  rootDir: string,
  overrides?: HyperAgentOrchestratorPathOverridesV0,
): string {
  return (
    overrides?.dispatchEventsAbsPath ??
    path.join(rootDir, HYPERAGENT_DISPATCH_EVENTS_REL_V1)
  );
}

function resolveOutboxAbsPath(
  rootDir: string,
  overrides?: HyperAgentOrchestratorPathOverridesV0,
): string {
  return overrides?.outboxAbsPath ?? path.join(rootDir, HYPERAGENT_ORCHESTRATOR_OUTBOX_REL_V0);
}

export function loadOperatorDispatchEventsV0(absPath: string): HyperAgentDispatchEventV1[] {
  if (!existsSync(absPath)) return [];
  try {
    const parsed = JSON.parse(readFileSync(absPath, "utf8")) as HyperAgentDispatchEventsFileV1;
    if (parsed.contract !== HYPERAGENT_DISPATCH_EVENTS_CONTRACT_V1) return [];
    return parsed.events ?? [];
  } catch {
    return [];
  }
}

export function appendDispatchEventV0(args: {
  absPath: string;
  event: HyperAgentDispatchEventV1;
}): void {
  const existing = loadOperatorDispatchEventsV0(args.absPath);
  if (existing.some((row) => row.dedup_key === args.event.dedup_key)) {
    throw new Error(
      `hyperagent_orchestrator_v0: dispatch event already exists for dedup_key=${args.event.dedup_key}`,
    );
  }
  const next: HyperAgentDispatchEventsFileV1 = {
    contract: HYPERAGENT_DISPATCH_EVENTS_CONTRACT_V1,
    events: [...existing, args.event],
  };
  mkdirSync(path.dirname(args.absPath), { recursive: true });
  writeFileSync(args.absPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

export function writeMissionOutboxV0(args: {
  outboxAbsPath: string;
  packet: HyperAgentMissionPacketV0;
}): { jsonRelPath: string; mdRelPath: string; jsonAbsPath: string; mdAbsPath: string } {
  const baseName = `${args.packet.mission_id}-hyperagent-mission-packet-v0`;
  const jsonName = `${baseName}.json`;
  const mdName = `${baseName}.md`;
  mkdirSync(args.outboxAbsPath, { recursive: true });
  const jsonAbsPath = path.join(args.outboxAbsPath, jsonName);
  const mdAbsPath = path.join(args.outboxAbsPath, mdName);
  writeFileSync(jsonAbsPath, `${JSON.stringify(args.packet, null, 2)}\n`, "utf8");
  writeFileSync(mdAbsPath, formatMissionPacketMarkdownV0(args.packet), "utf8");
  return {
    jsonAbsPath,
    mdAbsPath,
    jsonRelPath: path.posix.join(HYPERAGENT_ORCHESTRATOR_OUTBOX_REL_V0, jsonName),
    mdRelPath: path.posix.join(HYPERAGENT_ORCHESTRATOR_OUTBOX_REL_V0, mdName),
  };
}

function collectBlockedReasons(
  item: HyperAgentWorkQueueItemV1,
  registryBlock: { blocked: boolean; reasons: string[] },
): string[] {
  const reasons: string[] = [];
  if (!item.eligible_now) reasons.push("queue_item_not_eligible_now");
  if (!item.hyperagent_dispatch_authorized) {
    reasons.push("hyperagent_dispatch_not_authorized");
  }
  if (item.blocked_reasons.length > 0) reasons.push(...item.blocked_reasons);
  if (registryBlock.blocked) reasons.push(...registryBlock.reasons);
  return [...new Set(reasons)];
}

function haltExitCode(halt_condition: HyperAgentOrchestratorHaltConditionV0): number {
  switch (halt_condition) {
    case "NO_ELIGIBLE_ITEM":
    case "DRY_RUN_PREVIEW":
    case "DISPATCH_RECORDED":
      return 0;
    case "ALREADY_DISPATCHED":
    case "BLOCKED_BY_REGISTRY":
    case "BLOCKED_BY_QUEUE":
      return 1;
    default: {
      const _exhaustive: never = halt_condition;
      return _exhaustive;
    }
  }
}

function buildOrchestratorResult(args: {
  halt_condition: HyperAgentOrchestratorHaltConditionV0;
  generatedAt: string;
  queue_item_id?: string | null;
  mission_id?: string | null;
  mission_packet?: HyperAgentMissionPacketV0 | null;
  mission_packet_json_rel_path?: string | null;
  mission_packet_md_rel_path?: string | null;
  copy_paste_prompt?: string | null;
  dispatch_event_appended?: boolean;
  blocked_reasons?: string[];
  data_mutation?: boolean;
}): HyperAgentOrchestratorResultV0 {
  const halt_condition = args.halt_condition;
  return {
    contract: HYPERAGENT_ORCHESTRATOR_RESULT_CONTRACT_V0,
    halt_condition,
    exit_code: haltExitCode(halt_condition),
    read_only: true,
    data_mutation: args.data_mutation ?? false,
    mutation_authorized: false,
    generated_at: args.generatedAt,
    queue_item_id: args.queue_item_id ?? null,
    mission_id: args.mission_id ?? null,
    mission_packet: args.mission_packet ?? null,
    mission_packet_json_rel_path: args.mission_packet_json_rel_path ?? null,
    mission_packet_md_rel_path: args.mission_packet_md_rel_path ?? null,
    copy_paste_prompt: args.copy_paste_prompt ?? null,
    dispatch_event_appended: args.dispatch_event_appended ?? false,
    blocked_reasons: args.blocked_reasons ?? [],
  };
}

export function runHyperAgentOrchestratorV0(args: {
  rootDir: string;
  confirmDispatch: boolean;
  now?: () => Date;
  operatorEvents?: HyperAgentDispatchEventV1[] | null;
  pathOverrides?: HyperAgentOrchestratorPathOverridesV0;
}): HyperAgentOrchestratorResultV0 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const dispatchAbsPath = resolveDispatchEventsAbsPath(args.rootDir, args.pathOverrides);
  const outboxAbsPath = resolveOutboxAbsPath(args.rootDir, args.pathOverrides);

  const operatorEvents =
    args.operatorEvents ?? loadOperatorDispatchEventsV0(dispatchAbsPath);

  const queue = buildHyperAgentWorkQueueV1({
    rootDir: args.rootDir,
    now: args.now,
    operatorEvents,
  });

  const item = queue.next_eligible_item;
  if (!item) {
    return buildOrchestratorResult({
      halt_condition: "NO_ELIGIBLE_ITEM",
      generatedAt,
    });
  }

  const dedupKey = hyperAgentDedupKeyV1(item.mission_type, item.scope_key);
  const fingerprint = hyperAgentSlugBatchFingerprintV1(item.slug_batch);
  const registry = buildHyperAgentDispatchRegistryV1({
    rootDir: args.rootDir,
    now: args.now,
    operatorEvents,
  });
  const registryBlock = isHyperAgentRedispatchBlockedV1({
    registry,
    dedup_key: dedupKey,
    slug_batch_fingerprint: fingerprint,
    family_key: item.family_key,
    mission_type: item.mission_type,
  });

  const blockedReasons = collectBlockedReasons(item, registryBlock);
  const queueBlocked =
    !item.eligible_now || !item.hyperagent_dispatch_authorized || item.blocked_reasons.length > 0;

  if (registryBlock.blocked) {
    return buildOrchestratorResult({
      halt_condition: "BLOCKED_BY_REGISTRY",
      generatedAt,
      queue_item_id: item.queue_item_id,
      blocked_reasons: blockedReasons,
    });
  }

  if (queueBlocked) {
    return buildOrchestratorResult({
      halt_condition: "BLOCKED_BY_QUEUE",
      generatedAt,
      queue_item_id: item.queue_item_id,
      blocked_reasons: blockedReasons,
    });
  }

  const persistedDispatchEvents = loadOperatorDispatchEventsV0(dispatchAbsPath);
  const persistedDedupCollision = persistedDispatchEvents.some(
    (row) => row.dedup_key === dedupKey,
  );

  if (persistedDedupCollision) {
    const packet = buildHyperAgentMissionPacketV0({
      item,
      generatedAt,
      halt_condition: "ALREADY_DISPATCHED",
    });
    return buildOrchestratorResult({
      halt_condition: "ALREADY_DISPATCHED",
      generatedAt,
      queue_item_id: item.queue_item_id,
      mission_id: packet.mission_id,
      mission_packet: packet,
      copy_paste_prompt: packet.copy_paste_prompt,
      blocked_reasons: [`already_dispatched_dedup_key:${dedupKey}`],
    });
  }

  if (!args.confirmDispatch) {
    const packet = buildHyperAgentMissionPacketV0({
      item,
      generatedAt,
      halt_condition: "DRY_RUN_PREVIEW",
    });
    return buildOrchestratorResult({
      halt_condition: "DRY_RUN_PREVIEW",
      generatedAt,
      queue_item_id: item.queue_item_id,
      mission_id: packet.mission_id,
      mission_packet: packet,
      copy_paste_prompt: packet.copy_paste_prompt,
    });
  }

  const packet = buildHyperAgentMissionPacketV0({
    item,
    generatedAt,
    halt_condition: "DISPATCH_RECORDED",
  });
  const outbox = writeMissionOutboxV0({ outboxAbsPath, packet });
  const dispatchEvent: HyperAgentDispatchEventV1 = {
    event_id: packet.mission_id,
    dedup_key: packet.dedup_key,
    queue_item_id: packet.queue_item_id,
    mission_type: packet.mission_type,
    scope_key: packet.scope_key,
    slug_batch_fingerprint: packet.slug_batch_fingerprint,
    dispatched_at: generatedAt,
    task_id: null,
    operator_note:
      "Orchestrator v0 loop iteration 1 — discovery only, not validated, not truth closure.",
  };
  appendDispatchEventV0({ absPath: dispatchAbsPath, event: dispatchEvent });

  return buildOrchestratorResult({
    halt_condition: "DISPATCH_RECORDED",
    generatedAt,
    queue_item_id: item.queue_item_id,
    mission_id: packet.mission_id,
    mission_packet: packet,
    mission_packet_json_rel_path: outbox.jsonRelPath,
    mission_packet_md_rel_path: outbox.mdRelPath,
    copy_paste_prompt: packet.copy_paste_prompt,
    dispatch_event_appended: true,
    data_mutation: true,
  });
}
