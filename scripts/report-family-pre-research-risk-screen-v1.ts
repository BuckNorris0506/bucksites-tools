import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFamilyPreResearchRiskScreenV1,
  familyPreResearchRiskScreenExitCodeV1,
} from "./lib/family-pre-research-risk-screen-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function argValue(name: string): string | null {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const idx = process.argv.indexOf(name);
  if (idx >= 0) return process.argv[idx + 1] ?? null;
  return null;
}

function main(): void {
  const familyKey = argValue("--family-key")?.trim() || undefined;
  const report = buildFamilyPreResearchRiskScreenV1({ rootDir, familyKey });

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = familyPreResearchRiskScreenExitCodeV1(report);
}

main();
