/**
 * Founder CSV pack artifact binding verification for seed import gates.
 */

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  extractBoundArtifactsFromFounderRowV1,
  verifyArtifactSha256V1,
} from "../../src/lib/owner-dashboard/truth-ledger-v1";

function normalizeRelV1(rel: string): string {
  return rel.trim().replace(/\\/g, "/").toLowerCase();
}

export function founderRowBindsAllCsvArtifactsV1(args: {
  row: FounderDecisionRegistryRowV1;
  csvRelPaths: readonly string[];
  rootDir: string;
  readText?: (abs: string) => string;
}): { ok: true } | { ok: false; blockers: string[] } {
  const bindings = extractBoundArtifactsFromFounderRowV1(args.row);
  const boundNorm = new Set(bindings.map((b) => normalizeRelV1(b.artifact_rel_path)));
  const blockers: string[] = [];

  for (const rel of args.csvRelPaths) {
    const norm = normalizeRelV1(rel);
    if (!boundNorm.has(norm)) {
      blockers.push(`founder_csv_artifact_unbound:${rel}`);
    }
  }

  if (blockers.length > 0) {
    return { ok: false, blockers };
  }

  for (const rel of args.csvRelPaths) {
    const norm = normalizeRelV1(rel);
    const match = bindings.find((b) => normalizeRelV1(b.artifact_rel_path) === norm);
    if (!match) continue;
    const verify = verifyArtifactSha256V1({
      rootDir: args.rootDir,
      artifact_rel_path: match.artifact_rel_path,
      expected_sha256: match.sha256_at_binding,
      readText: args.readText,
    });
    if (!verify.ok) {
      blockers.push(`${verify.reason}:csv_artifact:${rel}`);
    }
  }

  if (blockers.length > 0) return { ok: false, blockers };
  return { ok: true };
}
