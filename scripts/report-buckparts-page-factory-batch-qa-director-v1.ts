import {
  buildPageFactoryBatchQaDirectorFromQualityGateBatchV1,
  buildPageFactoryBatchQaDirectorReportV1,
  writePageFactoryBatchQaDirectorArtifactsV1,
} from "./lib/buckparts-page-factory-batch-qa-director-v1";

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
  const batchId = requireArg("--batch-id");
  const qualityGateBatchJson = argValue("--from-quality-gate-batch-json");

  const report = qualityGateBatchJson?.trim()
    ? await buildPageFactoryBatchQaDirectorFromQualityGateBatchV1({
        rootDir,
        batchId,
        qualityGateBatchJsonRelPath: qualityGateBatchJson.trim(),
      })
    : await buildPageFactoryBatchQaDirectorReportV1({
        rootDir,
        batchId,
        manifestRelPath: argValue("--input-manifest-json") ?? undefined,
        registryRelPath: argValue("--registry-csv") ?? undefined,
        wildcardReviewJsonRelPath: argValue("--wildcard-review-json") ?? undefined,
        checkSupabase: process.argv.includes("--check-supabase"),
        buildMissingQualityGates: !process.argv.includes("--artifacts-only"),
      });

  if (process.argv.includes("--write-artifacts")) {
    writePageFactoryBatchQaDirectorArtifactsV1({ rootDir, report });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  const hasRisk =
    report.buckets.some(
      (b) =>
        (b.classification === "WRONG_PART_RISK" || b.classification === "BLOCKED") &&
        b.count > 0,
    ) || report.batch_publication_readiness_score < 100;

  if (hasRisk) process.exitCode = 1;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error("[report-buckparts-page-factory-batch-qa-director-v1] failed", error);
    process.exit(1);
  });
}
