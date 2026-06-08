import {
  buildPageQualityGateBatchReportV1,
  buildPageQualityGateReportV1,
  writePageQualityGateArtifactsV1,
  writePageQualityGateBatchArtifactsV1,
} from "./lib/buckparts-page-quality-gate-v1";

function argValue(name: string): string | null {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const idx = process.argv.indexOf(name);
  if (idx >= 0) return process.argv[idx + 1] ?? null;
  return null;
}

export async function main(): Promise<void> {
  const rootDir = process.cwd();
  const batchId = argValue("--batch-id");

  if (batchId?.trim()) {
    const report = await buildPageQualityGateBatchReportV1({
      rootDir,
      batchId: batchId.trim(),
      manifestRelPath: argValue("--input-manifest-json") ?? undefined,
      registryRelPath: argValue("--registry-csv") ?? undefined,
      wildcardReviewJsonRelPath: argValue("--wildcard-review-json") ?? undefined,
      checkSupabase: process.argv.includes("--check-supabase"),
    });

    if (process.argv.includes("--write-artifacts")) {
      writePageQualityGateBatchArtifactsV1({ rootDir, report });
    }

    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

    const shouldFail =
      report.inspect_summary.quality_classification_counts.BLOCKED > 0 ||
      report.pair_reports.some((r) => !r.publication_authorized);
    if (shouldFail) process.exitCode = 1;
    return;
  }

  const fridgeSlug = argValue("--fridge-slug");
  if (!fridgeSlug?.trim()) {
    throw new Error("Missing required --fridge-slug (or --batch-id for batch mode)");
  }

  const report = await buildPageQualityGateReportV1({
    rootDir,
    fridgeSlug: fridgeSlug.trim(),
    registryRelPath: argValue("--registry-csv") ?? undefined,
    wildcardReviewJsonRelPath: argValue("--wildcard-review-json") ?? undefined,
    clonePacketJsonRelPath: argValue("--clone-packet-json") ?? undefined,
    cloneSourceSlug: argValue("--clone-source-slug") ?? undefined,
    cloneFamilyKey: argValue("--clone-family-key") ?? undefined,
    checkSupabase: process.argv.includes("--check-supabase"),
  });

  if (process.argv.includes("--write-artifacts")) {
    writePageQualityGateArtifactsV1({ rootDir, report });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (
    report.quality_classification === "BLOCKED" ||
    !report.publication_authorized
  ) {
    process.exitCode = 1;
  }
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error("[report-buckparts-page-quality-gate-v1] failed", error);
    process.exit(1);
  });
}
