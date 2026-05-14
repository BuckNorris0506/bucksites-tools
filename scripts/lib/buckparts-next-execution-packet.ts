/**
 * Read-only snapshot: Command Center → Founder Action Queue → Founder Execution Packets.
 * No file writes, no mutating scripts, no nested npm for JSON producers.
 */

import { buildBuckpartsCommandCenterReport, stripEvidenceUncappedCandidatesForStdout } from "../report-buckparts-command-center";
import { buildFounderActionQueueV1, founderActionQueueInputFromCommandCenterJson } from "../../src/lib/owner-dashboard/founder-action-queue-v1";
import {
  buildFounderExecutionPacketsV1,
  type FounderExecutionPacketV1,
  type FounderExecutionPacketsResultV1,
} from "../../src/lib/owner-dashboard/founder-execution-packet-v1";
import type { FounderActionQueueRowV1 } from "../../src/lib/owner-dashboard/founder-action-queue-v1";

/** Same minimal fallback shape as `scripts/buckparts-founder-digest.ts` when CC build throws. */
export const FALLBACK_COMMAND_CENTER_JSON_FOR_NEXT_PACKET = {
  report_name: "UNKNOWN",
  generated_at: "UNKNOWN",
  system_health_summary: { status: "UNKNOWN" },
  next_best_action: "UNKNOWN (Command Center build threw — see stderr / CI log)",
  known_unknowns: [] as string[],
  execution_guidance: { next_move_mode: "UNKNOWN", mutating_blocked: false, mutating_block_reasons: [] as string[] },
  command_center_v2: {
    next_owner_action: "UNKNOWN",
    deploy_live_site_status: { status: "UNKNOWN", live_site_monitor: null },
    amazon_rescue: {
      next_agent_action: "",
      next_owner_action: "",
      human_browser_required_tokens: [] as string[],
      status: "UNKNOWN",
    },
    affiliate_readiness: { status: "UNKNOWN", next_owner_action: "", next_agent_action: "" },
    unknown_or_human_review: { status: "UNKNOWN", next_owner_action: "", blocker: null },
  },
} as const;

export type NextExecutionPacketSnapshotV1 = {
  command_center_ok: boolean;
  generated_at: string;
  source: "buckparts-next-execution-packet";
  queue: ReturnType<typeof buildFounderActionQueueV1>;
  execution: FounderExecutionPacketsResultV1;
  /** First eligible packet (same order as Founder Action Queue rows). */
  next_packet: FounderExecutionPacketV1 | null;
  /** First `needs_owner` row title in queue order, for no-packet UX. */
  first_needs_owner_title: string | null;
};

export function pickFirstNeedsOwnerTitle(rows: FounderActionQueueRowV1[]): string | null {
  const row = rows.find((r) => r.status === "needs_owner");
  return row?.title?.trim() ? row.title.trim() : null;
}

export async function buildNextExecutionPacketSnapshotV1(rootDir: string): Promise<NextExecutionPacketSnapshotV1> {
  const generated_at = new Date().toISOString();
  let command_center_ok = true;
  let cc: unknown = FALLBACK_COMMAND_CENTER_JSON_FOR_NEXT_PACKET;
  try {
    const rawCc = await buildBuckpartsCommandCenterReport({ rootDir });
    cc = stripEvidenceUncappedCandidatesForStdout(rawCc);
  } catch {
    command_center_ok = false;
    cc = FALLBACK_COMMAND_CENTER_JSON_FOR_NEXT_PACKET;
  }
  const queueInput = founderActionQueueInputFromCommandCenterJson(cc);
  const queue = buildFounderActionQueueV1(queueInput);
  const execution = buildFounderExecutionPacketsV1(queue.rows, {
    generated_at,
    source: "buckparts-next-execution-packet",
  });
  const next_packet = execution.packets[0] ?? null;
  const first_needs_owner_title = pickFirstNeedsOwnerTitle(queue.rows);
  return {
    command_center_ok,
    generated_at,
    source: "buckparts-next-execution-packet",
    queue,
    execution,
    next_packet,
    first_needs_owner_title,
  };
}

export function formatNextExecutionPacketListText(s: NextExecutionPacketSnapshotV1): string {
  const lines: string[] = [
    `PROVEN: command_center_ok=${String(s.command_center_ok)} · queue_contract=${s.queue.contract} · execution_contract=${s.execution.contract}`,
    `Packets: ${s.execution.packets.length} · Skipped queue rows: ${s.execution.skipped_rows.length}`,
    "",
  ];
  if (s.execution.packets.length === 0) {
    lines.push("(no agent-safe read-only packets)");
  } else {
    s.execution.packets.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.title} (${p.source_queue_row_id})`);
    });
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function formatNextExecutionPacketNoPacketText(s: NextExecutionPacketSnapshotV1): string {
  const ownerHint = s.first_needs_owner_title
    ? ` Top owner-needed queue row (title): ${s.first_needs_owner_title}`
    : "";
  return `PROVEN: No agent-safe read-only Founder Execution Packet exists (no queue row with status agent_safe + recommended_actor agent + mutation_authority read_only).${ownerHint}\n`;
}
