/**
 * Command Center lane for fridge guarded batch closeout learning packets (read-only).
 */

import path from "node:path";

export const FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_LANE_CONTRACT_V1 =
  "fridge_guarded_batch_closeout_learning_command_center_v1" as const;
export const FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_CC_JQ_PATH_V1 =
  ".command_center_v2.fridge_guarded_batch_closeout_learning_v1" as const;
export const FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_DIR_REL_V1 =
  "data/fridge/batch-production/closeout" as const;

export type FridgeGuardedBatchCloseoutLearningLaneV1 = {
  contract: typeof FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_CC_JQ_PATH_V1;
  source_directory: typeof FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_DIR_REL_V1;
  lane_status: "OK" | "EMPTY" | "UNKNOWN";
  packet_count: number;
  latest_packet_path: string | null;
  latest_batch_digest: string | null;
  latest_post_apply_status: string | null;
  latest_lifecycle_state: string | null;
  latest_repeat_write_lockout_status: string | null;
  latest_learning_lane_candidate: boolean | null;
  latest_recommended_next_lifecycle_state: string | null;
  captured_lessons: string[];
  blockers: string[];
  next_agent_action: string;
  next_owner_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildFridgeGuardedBatchCloseoutLearningLaneDepsV1 = {
  rootDir: string;
  fileExists?: (absolutePath: string) => boolean;
  readDir?: (absolutePath: string) => string[];
  readTextFile?: (absolutePath: string) => string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function pushLesson(lessons: string[], value: unknown): void {
  const lesson = asString(value);
  if (lesson && !lessons.includes(lesson)) lessons.push(lesson);
}

function buildEmptyLane(
  status: FridgeGuardedBatchCloseoutLearningLaneV1["lane_status"],
  reason: string,
): FridgeGuardedBatchCloseoutLearningLaneV1 {
  return {
    contract: FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_CC_JQ_PATH_V1,
    source_directory: FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_DIR_REL_V1,
    lane_status: status,
    packet_count: 0,
    latest_packet_path: null,
    latest_batch_digest: null,
    latest_post_apply_status: null,
    latest_lifecycle_state: null,
    latest_repeat_write_lockout_status: null,
    latest_learning_lane_candidate: null,
    latest_recommended_next_lifecycle_state: null,
    captured_lessons: [],
    blockers: status === "UNKNOWN" ? [reason] : [],
    next_agent_action:
      "Inspect fridge guarded batch closeout packets read-only; do not create learning_outcomes rows or mutate CSV/Supabase/evidence.",
    next_owner_action:
      status === "EMPTY"
        ? "No fridge guarded batch closeout learning packets are present yet."
        : "Closeout packet lane could not load; inspect local packet directory before trusting closeout learning summary.",
    proven_facts: [
      `PROVEN: Command Center lane ${FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_CC_JQ_PATH_V1} is read-only and does not write learning_outcomes.`,
    ],
    unknown_facts: [reason],
  };
}

export function buildFridgeGuardedBatchCloseoutLearningCommandCenterLaneV1(
  deps: BuildFridgeGuardedBatchCloseoutLearningLaneDepsV1,
): FridgeGuardedBatchCloseoutLearningLaneV1 {
  const fileExists = deps.fileExists ?? (() => false);
  const readDir = deps.readDir ?? (() => []);
  const readTextFile = deps.readTextFile ?? (() => "");
  const dirAbs = path.join(deps.rootDir, ...FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_DIR_REL_V1.split("/"));

  if (!fileExists(dirAbs)) {
    return buildEmptyLane("EMPTY", "closeout_packet_directory_missing");
  }

  let filenames: string[];
  try {
    filenames = readDir(dirAbs)
      .filter((name) => name.endsWith(".json"))
      .sort((a, b) => a.localeCompare(b));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return buildEmptyLane("UNKNOWN", `closeout_packet_directory_unreadable: ${message}`);
  }

  if (filenames.length === 0) {
    return buildEmptyLane("EMPTY", "closeout_packet_directory_empty");
  }

  const packets: Array<{ relPath: string; generatedAt: string; packet: Record<string, unknown> }> = [];
  const blockers: string[] = [];

  for (const filename of filenames) {
    const relPath = `${FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_DIR_REL_V1}/${filename}`;
    const abs = path.join(deps.rootDir, ...relPath.split("/"));
    try {
      const packet = asRecord(JSON.parse(readTextFile(abs)));
      if (!packet) {
        blockers.push(`packet_not_object: ${relPath}`);
        continue;
      }
      if (packet.contract !== "fridge_buyer_path_batch_closeout_learning_packet_v1") {
        blockers.push(`unexpected_packet_contract: ${relPath}`);
        continue;
      }
      if (packet.read_only !== true || packet.data_mutation !== false) {
        blockers.push(`packet_not_read_only: ${relPath}`);
        continue;
      }
      packets.push({
        relPath,
        generatedAt: asString(packet.generated_at) ?? "",
        packet,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      blockers.push(`packet_unreadable: ${relPath}: ${message}`);
    }
  }

  if (packets.length === 0) {
    const lane = buildEmptyLane("UNKNOWN", "no_valid_closeout_learning_packets");
    return {
      ...lane,
      blockers: [...lane.blockers, ...blockers],
      unknown_facts: [...lane.unknown_facts, ...blockers],
    };
  }

  packets.sort((a, b) => {
    const byGeneratedAt = a.generatedAt.localeCompare(b.generatedAt);
    if (byGeneratedAt !== 0) return byGeneratedAt;
    return a.relPath.localeCompare(b.relPath);
  });
  const latest = packets[packets.length - 1]!;
  const packet = latest.packet;
  const postApply = asRecord(packet.post_apply_parity) ?? {};
  const repeatWrite = asRecord(packet.repeat_write_lockout) ?? {};
  const learningFeed = asRecord(packet.learning_feed_recommendation) ?? {};
  const nextLifecycle = asRecord(packet.next_recommended_lifecycle) ?? {};
  const goLesson = asRecord(packet.go_first_hop_smoke_lesson) ?? {};

  const lessons: string[] = [];
  pushLesson(lessons, goLesson.learning_note);
  pushLesson(lessons, goLesson.false_failure_root_cause);
  pushLesson(lessons, learningFeed.reason);

  return {
    contract: FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_CC_JQ_PATH_V1,
    source_directory: FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_DIR_REL_V1,
    lane_status: blockers.length > 0 ? "UNKNOWN" : "OK",
    packet_count: packets.length,
    latest_packet_path: latest.relPath,
    latest_batch_digest: asString(packet.batch_digest),
    latest_post_apply_status: asString(postApply.status),
    latest_lifecycle_state: asString(postApply.lifecycle_state),
    latest_repeat_write_lockout_status: asString(repeatWrite.status),
    latest_learning_lane_candidate: asBoolean(learningFeed.command_center_learning_lane_candidate),
    latest_recommended_next_lifecycle_state: asString(nextLifecycle.recommended_next_lifecycle_state),
    captured_lessons: lessons,
    blockers,
    next_agent_action:
      "Use this lane as read-only closeout learning context only; do not create learning_outcomes rows or rerun --write-csv.",
    next_owner_action:
      "Review captured closeout lessons and, if desired, authorize a separate learning_outcomes or Command Center learning-lane write path.",
    proven_facts: [
      `PROVEN: Loaded ${String(packets.length)} fridge guarded batch closeout learning packet(s) from ${FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_DIR_REL_V1}.`,
      `PROVEN: Command Center lane ${FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_CC_JQ_PATH_V1} is read_only=true and data_mutation=false.`,
    ],
    unknown_facts: blockers,
  };
}
