import {
  buildPageFactoryEvidenceCloneReportV1,
  writePageFactoryEvidenceCloneArtifactsV1,
} from "./lib/buckparts-page-factory-evidence-clone-v1";

function argValue(name: string): string | null {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const idx = process.argv.indexOf(name);
  if (idx >= 0) return process.argv[idx + 1] ?? null;
  return null;
}

function requireArg(name: string): string {
  const value = argValue(name);
  if (!value?.trim()) {
    throw new Error(`Missing required ${name}`);
  }
  return value.trim();
}

export async function main(): Promise<void> {
  const rootDir = process.cwd();
  const report = buildPageFactoryEvidenceCloneReportV1({
    rootDir,
    sourceSlug: requireArg("--source-slug"),
    targetSlug: requireArg("--target-slug"),
    familyKey: requireArg("--family-key"),
    wildcardReviewJsonRelPath: argValue("--wildcard-review-json") ?? undefined,
    secondarySiblingSlug: argValue("--secondary-sibling-slug") ?? undefined,
  });

  if (process.argv.includes("--write-artifacts")) {
    writePageFactoryEvidenceCloneArtifactsV1({ rootDir, report });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.clone_status === "BLOCKED") process.exitCode = 1;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error("[report-buckparts-page-factory-evidence-clone-v1] failed", error);
    process.exit(1);
  });
}
