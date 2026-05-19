/**
 * Command Center v1 summary lane for next execution packet (read-only projection).
 */

import {
  buildFounderActionQueueV1,
  founderActionQueueInputFromCommandCenterJson,
} from "@/lib/owner-dashboard/founder-action-queue-v1";
import { buildFounderExecutionPacketsV1 } from "@/lib/owner-dashboard/founder-execution-packet-v1";

type RuntimeStatus = "OK" | "ATTENTION" | "UNKNOWN";

export type NextExecutionPacketSummaryV1 = {
  contract: "next_execution_packet_summary_v1";
  read_only: true;
  data_mutation: false;
  generated_at: string;
  runtime_status: RuntimeStatus;
  command_center_ok: boolean;
  queue_row_count: number;
  packet_count: number;
  next_packet_id: string | null;
  next_packet_title: string | null;
  first_needs_owner_title: string | null;
  source_command: "npm run buckparts:next-execution-packet";
  proven_facts: string[];
  unknown_facts: string[];
};

function runtimeStatusFromSnapshot(args: {
  command_center_ok: boolean;
  packet_count: number;
  first_needs_owner_title: string | null;
}): RuntimeStatus {
  if (!args.command_center_ok) return "UNKNOWN";
  if (args.packet_count > 0) return "OK";
  if (args.first_needs_owner_title) return "ATTENTION";
  return "ATTENTION";
}

export function buildNextExecutionPacketSummaryV1FromCommandCenterJson(args: {
  commandCenterJson: unknown;
  command_center_ok?: boolean;
  now?: () => Date;
}): NextExecutionPacketSummaryV1 {
  const now = args.now ?? (() => new Date());
  const generated_at = now().toISOString();
  const command_center_ok = args.command_center_ok ?? true;
  const queueInput = founderActionQueueInputFromCommandCenterJson(args.commandCenterJson);
  const queue = buildFounderActionQueueV1(queueInput);
  const execution = buildFounderExecutionPacketsV1(queue.rows, {
    generated_at,
    source: "buckparts-next-execution-packet",
  });
  const next_packet = execution.packets[0] ?? null;
  const first_needs_owner_title =
    queue.rows.find((row) => row.status === "needs_owner")?.title?.trim() || null;

  return {
    contract: "next_execution_packet_summary_v1",
    read_only: true,
    data_mutation: false,
    generated_at,
    runtime_status: runtimeStatusFromSnapshot({
      command_center_ok,
      packet_count: execution.packets.length,
      first_needs_owner_title,
    }),
    command_center_ok,
    queue_row_count: queue.rows.length,
    packet_count: execution.packets.length,
    next_packet_id: next_packet?.id ?? null,
    next_packet_title: next_packet?.title ?? null,
    first_needs_owner_title,
    source_command: "npm run buckparts:next-execution-packet",
    proven_facts: [
      `Founder action queue contract=${queue.contract}; rows=${queue.rows.length}.`,
      `Founder execution packets contract=${execution.contract}; packets=${execution.packets.length}.`,
      "next_execution_packet_summary_v1 is a read-only projection of buckparts-next-execution-packet for Command Center JSON.",
    ],
    unknown_facts: command_center_ok
      ? execution.skipped_rows.map((row) => `${row.source_queue_row_id}: ${row.reason}`)
      : ["Command Center JSON unavailable for next-execution-packet summary."],
  };
}
