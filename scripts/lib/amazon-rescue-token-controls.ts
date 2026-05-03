import type { AmazonRescueTokenControlEntry, AmazonRescueTokenControlsFile } from "./buckparts-command-center-v2-types";

export type { AmazonRescueTokenControlEntry, AmazonRescueTokenControlsFile } from "./buckparts-command-center-v2-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function loadAmazonRescueTokenControls(args: {
  absolutePath: string;
  fileExists: (p: string) => boolean;
  readTextFile: (p: string) => string;
}): { entries: AmazonRescueTokenControlEntry[]; load_error: string | null } {
  if (!args.fileExists(args.absolutePath)) {
    return { entries: [], load_error: `missing_token_controls_file:${args.absolutePath}` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(args.readTextFile(args.absolutePath));
  } catch {
    return { entries: [], load_error: "token_controls_json_parse_failed" };
  }
  if (!isRecord(parsed)) return { entries: [], load_error: "token_controls_not_object" };
  const rawEntries = parsed.entries;
  if (!Array.isArray(rawEntries)) return { entries: [], load_error: "token_controls_entries_not_array" };
  const entries: AmazonRescueTokenControlEntry[] = [];
  for (const item of rawEntries) {
    if (!isRecord(item)) continue;
    const token = typeof item.token === "string" ? item.token.trim().toUpperCase() : "";
    const status = item.status;
    const reason = typeof item.reason === "string" ? item.reason : "";
    const next_action = typeof item.next_action === "string" ? item.next_action : "";
    const can_agent = item.can_agent_advance === true;
    if (!token || typeof status !== "string") continue;
    const row: AmazonRescueTokenControlEntry = {
      token,
      status: status as AmazonRescueTokenControlEntry["status"],
      reason,
      next_action,
      can_agent_advance: can_agent,
    };
    if (typeof item.evidence_file === "string" && item.evidence_file.trim()) {
      row.evidence_file = item.evidence_file.trim();
    }
    if (typeof item.updated_at === "string" && item.updated_at.trim()) {
      row.updated_at = item.updated_at.trim();
    }
    if (typeof item.notes === "string" && item.notes.trim()) {
      row.notes = item.notes.trim();
    }
    entries.push(row);
  }
  return { entries, load_error: null };
}
