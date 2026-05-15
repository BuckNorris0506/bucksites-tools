/**
 * Read-only filesystem scan for `data/owner-decisions/*.json`.
 * PROVEN: ignores non-`.json` entries (e.g. README.md, .gitkeep); no writes.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { FounderDecisionRegistryReadModelFileInputV1 } from "./founder-decision-registry-read-model-v1";

export function scanFounderDecisionRegistryJsonFilesV1(rootDir: string): FounderDecisionRegistryReadModelFileInputV1[] {
  const dir = path.join(rootDir, "data", "owner-decisions");
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  const out: FounderDecisionRegistryReadModelFileInputV1[] = [];
  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    const abs = path.join(dir, name);
    const rel = path.relative(rootDir, abs).split(path.sep).join("/");
    try {
      const raw = readFileSync(abs, "utf8");
      try {
        out.push({ source: rel, parsed: JSON.parse(raw) });
      } catch (e) {
        out.push({
          source: rel,
          parseError: e instanceof Error ? e.message : String(e),
        });
      }
    } catch (e) {
      out.push({
        source: rel,
        parseError: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return out;
}
