import type { EvidenceRollup } from "./buckparts-command-center-v2-types";

export type { EvidenceRollup } from "./buckparts-command-center-v2-types";

export function rollupEvidenceDirectory(args: {
  evidenceDirAbs: string;
  fileExists: (p: string) => boolean;
  readDir: (p: string) => string[];
}): EvidenceRollup {
  const empty: EvidenceRollup = {
    live_outcome_count: 0,
    unknown_outcome_count: 0,
    fail_hold_outcome_count: 0,
    unclassified_json_count: 0,
    recent_evidence_filenames: [],
  };
  if (!args.fileExists(args.evidenceDirAbs)) return empty;
  let names: string[];
  try {
    names = args.readDir(args.evidenceDirAbs).filter((n) => n.endsWith(".json"));
  } catch {
    return empty;
  }
  let live = 0;
  let unknown = 0;
  let failHold = 0;
  let unclassified = 0;
  for (const name of names) {
    const lower = name.toLowerCase();
    if (lower.includes("live-outcome")) {
      live += 1;
    } else if (lower.includes("unknown-outcome")) {
      unknown += 1;
    } else if (lower.includes("outcome") && (lower.includes("fail") || lower.includes("hold"))) {
      failHold += 1;
    } else if (lower.endsWith(".json")) {
      unclassified += 1;
    }
  }
  const recent = [...names].sort((a, b) => b.localeCompare(a)).slice(0, 15);
  return {
    live_outcome_count: live,
    unknown_outcome_count: unknown,
    fail_hold_outcome_count: failHold,
    unclassified_json_count: unclassified,
    recent_evidence_filenames: recent,
  };
}
