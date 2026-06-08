import {
  HAF_QIN_CANDIDATES_CSV_REL_V1,
  buildSamsungHafQinWildcardExpansionReviewV1,
  writeSamsungHafQinWildcardExpansionReviewArtifactsV1,
} from "./lib/samsung-haf-qin-wildcard-expansion-review-v1";

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
  const report = buildSamsungHafQinWildcardExpansionReviewV1({
    rootDir,
    candidatesCsvRelPath: argValue("--candidates-csv") ?? HAF_QIN_CANDIDATES_CSV_REL_V1,
  });

  if (process.argv.includes("--write-artifacts")) {
    writeSamsungHafQinWildcardExpansionReviewArtifactsV1({ rootDir, report });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.review_status === "BLOCKED_INPUT") process.exitCode = 1;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error("[report-samsung-haf-qin-wildcard-expansion-review-v1] failed", error);
    process.exit(1);
  });
}
