/**
 * Command Center v1 summary lane for operating map (read-only projection).
 */

import type { AutonomyReadiness, BuckpartsOperatingMapV1, OperatingSystemV1 } from "./buckparts-operating-map-v1";

const MAX_SYSTEMS = 5;

type RuntimeStatus = "OK" | "ATTENTION" | "UNKNOWN";

export type OperatingMapSummarySystemV1 = {
  id: string;
  category: OperatingSystemV1["category"];
  autonomy_readiness: AutonomyReadiness;
  founder_burden: OperatingSystemV1["founder_burden"];
};

export type OperatingMapSummaryV1 = {
  contract: "operating_map_summary_v1";
  read_only: true;
  data_mutation: false;
  generated_at: string;
  runtime_status: RuntimeStatus;
  system_count: number;
  high_founder_burden_count: number;
  blocked_autonomy_count: number;
  top_systems: OperatingMapSummarySystemV1[];
  recommended_next_move: string;
  source_command: "npm run buckparts:operating-map";
  proven_facts: string[];
  unknown_facts: string[];
};

function runtimeStatusFromMap(map: BuckpartsOperatingMapV1): RuntimeStatus {
  if (map.systems.length === 0) return "UNKNOWN";
  if (map.founder_burden_summary.high_burden_systems.length > 0 || map.owner_only_decisions.length > 0) {
    return "ATTENTION";
  }
  return "OK";
}

export function buildOperatingMapSummaryV1FromReport(map: BuckpartsOperatingMapV1): OperatingMapSummaryV1 {
  const high_founder_burden_count = map.systems.filter((s) => s.founder_burden === "high").length;
  const blocked_autonomy_count = map.systems.filter((s) => s.autonomy_readiness === "blocked").length;
  const top_systems = map.systems.slice(0, MAX_SYSTEMS).map((system) => ({
    id: system.id,
    category: system.category,
    autonomy_readiness: system.autonomy_readiness,
    founder_burden: system.founder_burden,
  }));
  return {
    contract: "operating_map_summary_v1",
    read_only: true,
    data_mutation: false,
    generated_at: map.generated_at,
    runtime_status: runtimeStatusFromMap(map),
    system_count: map.systems.length,
    high_founder_burden_count,
    blocked_autonomy_count,
    top_systems,
    recommended_next_move: map.recommended_next_move,
    source_command: "npm run buckparts:operating-map",
    proven_facts: [
      `Operating map systems=${map.systems.length}; buckparts_npm_script_count=${String(map.buckparts_npm_script_count)}.`,
      "operating_map_summary_v1 is a read-only projection of buckparts_operating_map_v1 for Command Center JSON.",
    ],
    unknown_facts: map.unknowns,
  };
}
