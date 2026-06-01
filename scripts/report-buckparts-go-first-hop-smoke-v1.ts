import {
  buildBuckPartsGoFirstHopSmokeReportV1,
} from "./lib/buckparts-go-first-hop-smoke-v1";

function argValue(name: string): string | null {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const idx = process.argv.indexOf(name);
  if (idx >= 0) return process.argv[idx + 1] ?? null;
  return null;
}

export async function main(): Promise<void> {
  const baseUrl = argValue("--base-url") ?? "http://127.0.0.1:3012";
  const allowProductionGoClickLogging = process.argv.includes("--allow-production-go-click-logging");
  const report = await buildBuckPartsGoFirstHopSmokeReportV1({
    rootDir: process.cwd(),
    baseUrl,
    allowProductionGoClickLogging,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.smoke_status !== "PASS") process.exitCode = 1;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error("[report-buckparts-go-first-hop-smoke-v1] failed", error);
    process.exit(1);
  });
}
