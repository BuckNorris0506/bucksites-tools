import { buildPageFactoryPreflightReportV1 } from "./lib/buckparts-page-factory-preflight-v1";

function argValue(name: string): string | null {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const idx = process.argv.indexOf(name);
  if (idx >= 0) return process.argv[idx + 1] ?? null;
  return null;
}

function requireFridgeSlug(): string {
  const slug = argValue("--fridge-slug");
  if (!slug?.trim()) {
    throw new Error("Missing required --fridge-slug");
  }
  return slug.trim();
}

export async function main(): Promise<void> {
  const report = await buildPageFactoryPreflightReportV1({
    rootDir: process.cwd(),
    fridgeSlug: requireFridgeSlug(),
    checkSupabase: process.argv.includes("--check-supabase"),
    baseUrl: argValue("--base-url"),
    liveBaseUrl: argValue("--live-base-url"),
  });

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.preflight_status === "BLOCKED") process.exitCode = 1;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error("[report-buckparts-page-factory-preflight-v1] failed", error);
    process.exit(1);
  });
}
