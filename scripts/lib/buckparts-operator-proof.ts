/**
 * Read-only helpers for `scripts/buckparts-operator-proof.ts`.
 * Scorecard lanes use `score_contribution` / `max_contribution` (see `FoundationScorecardLaneV1`
 * in `scripts/lib/buckparts-command-center-v2-types.ts`) — not `score` / `max_score`.
 */

import type {
  FoundationScorecardLaneV1,
  TopOfGameFoundationScorecardV1,
} from "./buckparts-command-center-v2-types";

export function parseJsonStdout(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error("Expected non-empty JSON on stdout");
  }
  return JSON.parse(trimmed) as unknown;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/** Runtime shape check — matches `FoundationScorecardLaneV1` from repo types. */
export function isFoundationScorecardLaneV1(x: unknown): x is FoundationScorecardLaneV1 {
  if (!isRecord(x)) return false;
  const o = x;
  if (typeof o.lane_id !== "string") return false;
  if (typeof o.label !== "string") return false;
  if (typeof o.status !== "string") return false;
  if (typeof o.score_contribution !== "number") return false;
  if (typeof o.max_contribution !== "number") return false;
  if (!Array.isArray(o.proven_basis) || !o.proven_basis.every((p) => typeof p === "string")) return false;
  if (!Array.isArray(o.unknowns) || !o.unknowns.every((u) => typeof u === "string")) return false;
  if (typeof o.next_proof_required !== "string") return false;
  return true;
}

export function isTopOfGameFoundationScorecardV1(x: unknown): x is TopOfGameFoundationScorecardV1 {
  if (!isRecord(x)) return false;
  if (x.contract !== "top_of_game_foundation_scorecard_v1") return false;
  if (x.runtime_status !== "OK" && x.runtime_status !== "UNKNOWN_INPUT") return false;
  if (typeof x.foundation_maturity_score_100 !== "number") return false;
  if (typeof x.current_goal_score_100 !== "number") return false;
  if (typeof x.goal_reached !== "boolean") return false;
  if (!Array.isArray(x.lanes)) return false;
  if (!x.lanes.every(isFoundationScorecardLaneV1)) return false;
  if (!Array.isArray(x.blockers) || !x.blockers.every((b) => typeof b === "string")) return false;
  if (typeof x.next_best_foundation_move !== "string") return false;
  if (typeof x.owner_dashboard_ready !== "boolean") return false;
  if (typeof x.owner_dashboard_note !== "string") return false;
  if (x.read_only !== true) return false;
  if (x.data_mutation !== false) return false;
  if (!Array.isArray(x.proven_facts) || !x.proven_facts.every((p) => typeof p === "string")) return false;
  if (!Array.isArray(x.unknown_facts) || !x.unknown_facts.every((u) => typeof u === "string")) return false;
  return true;
}

/** Extract `command_center_v2` from a Command Center root report object. */
export function getCommandCenterV2FromReport(report: unknown): Record<string, unknown> | null {
  if (!isRecord(report)) return null;
  const v2 = report.command_center_v2;
  if (!isRecord(v2)) return null;
  return v2;
}

export function extractTopOfGameFoundationScorecardV1(
  report: unknown,
): { ok: true; scorecard: TopOfGameFoundationScorecardV1 } | { ok: false; error: string } {
  const v2 = getCommandCenterV2FromReport(report);
  if (!v2) {
    return { ok: false, error: "report.command_center_v2 missing or not an object" };
  }
  const raw = v2.top_of_game_foundation_scorecard_v1;
  if (!isTopOfGameFoundationScorecardV1(raw)) {
    if (isRecord(raw) && Array.isArray((raw as Record<string, unknown>).lanes)) {
      const lanes = (raw as { lanes: unknown[] }).lanes;
      const bad = lanes.find((l) => isRecord(l) && ("score" in l || "max_score" in l));
      if (bad) {
        return {
          ok: false,
          error:
            "top_of_game_foundation_scorecard_v1.lanes use legacy score/max_score fields; repo contract expects score_contribution/max_contribution",
        };
      }
    }
    return { ok: false, error: "top_of_game_foundation_scorecard_v1 missing or failed lane contract validation" };
  }
  return { ok: true, scorecard: raw };
}

/** One-line lane summary using proven field names only. */
export function formatScorecardLaneLine(lane: FoundationScorecardLaneV1): string {
  return `${lane.lane_id}\t${lane.status}\t${lane.score_contribution}/${lane.max_contribution}\t${lane.label}`;
}
