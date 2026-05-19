/**
 * Command Center v1 summary lane for demand-to-work queue (read-only projection).
 */

import type {
  BuckpartsDemandWorkQueueReport,
  DemandWorkQueueBlockedInput,
  DemandWorkQueueItem,
} from "../report-buckparts-demand-work-queue";

const MAX_TOP_ITEMS = 5;
const MAX_BLOCKED_INPUTS = 3;

type RuntimeStatus = BuckpartsDemandWorkQueueReport["runtime_status"];

export type DemandWorkQueueSummaryItemV1 = Pick<
  DemandWorkQueueItem,
  "id" | "type" | "priority_rank" | "authority_level" | "owner_or_agent" | "recommended_action" | "scope"
>;

export type DemandWorkQueueSummaryV1 = {
  contract: "demand_work_queue_summary_v1";
  read_only: true;
  data_mutation: false;
  generated_at: string;
  runtime_status: RuntimeStatus;
  source_command: "npm run buckparts:demand-work-queue";
  item_count: number;
  blocked_input_count: number;
  top_item: DemandWorkQueueSummaryItemV1 | null;
  top_items: DemandWorkQueueSummaryItemV1[];
  blocked_or_unknown_inputs: Array<Pick<DemandWorkQueueBlockedInput, "input" | "status" | "reason">>;
  excluded_signal_count: number;
  proven_facts: string[];
  unknown_facts: string[];
};

function compactItem(item: DemandWorkQueueItem): DemandWorkQueueSummaryItemV1 {
  return {
    id: item.id,
    type: item.type,
    priority_rank: item.priority_rank,
    authority_level: item.authority_level,
    owner_or_agent: item.owner_or_agent,
    recommended_action: item.recommended_action,
    scope: item.scope,
  };
}

export function buildDemandWorkQueueSummaryV1FromReport(
  report: BuckpartsDemandWorkQueueReport,
): DemandWorkQueueSummaryV1 {
  const top_items = report.items.slice(0, MAX_TOP_ITEMS).map(compactItem);
  return {
    contract: "demand_work_queue_summary_v1",
    read_only: true,
    data_mutation: false,
    generated_at: report.generated_at,
    runtime_status: report.runtime_status,
    source_command: "npm run buckparts:demand-work-queue",
    item_count: report.items.length,
    blocked_input_count: report.blocked_or_unknown_inputs.length,
    top_item: top_items[0] ?? null,
    top_items,
    blocked_or_unknown_inputs: report.blocked_or_unknown_inputs
      .slice(0, MAX_BLOCKED_INPUTS)
      .map((input) => ({ input: input.input, status: input.status, reason: input.reason })),
    excluded_signal_count: report.excluded_signals.length,
    proven_facts: [
      ...report.proven_facts,
      "demand_work_queue_summary_v1 is a read-only projection of buckparts_demand_work_queue_v1 for Command Center JSON.",
    ],
    unknown_facts: report.unknown_facts,
  };
}
