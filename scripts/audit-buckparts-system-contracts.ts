import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type FailureSeverity = "CRITICAL" | "HIGH" | "MEDIUM";

type AuditFailure = {
  id: string;
  severity: FailureSeverity;
  system: string;
  message: string;
  evidence: string;
  recommended_fix: string;
};

export type BuckpartsSystemContractAudit = {
  audit_name: "buckparts_system_contract_audit_v1";
  status: "PASS" | "FAIL";
  blocking: boolean;
  summary: {
    critical: number;
    high: number;
    medium: number;
  };
  status_meaning: "PASS means no CRITICAL blockers; HIGH/MEDIUM findings may still require action.";
  failures: AuditFailure[];
};

type AuditDeps = {
  rootDir?: string;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
};

type AuditSources = {
  learningOutcomesMigration: string;
  learningOutcomesWriter: string;
  affiliateTrackerJson: string;
  goRedirectGate: string;
  packageJson: string;
  commandSurfaceReport: string;
  scriptManifest: string;
};

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function addFailure(failures: AuditFailure[], failure: AuditFailure): void {
  failures.push(failure);
}

function extractAmazonTag(goRedirectGate: string): string | null {
  const match = goRedirectGate.match(
    /export const AMAZON_AFFILIATE_TAG = ["']([^"']+)["'];/,
  );
  return match?.[1] ?? null;
}

function checkLearningOutcomesSchemaVsWriter(
  failures: AuditFailure[],
  sources: AuditSources,
): void {
  const schemaRequiresSlug = /slug\s+text\s+not\s+null/i.test(
    sources.learningOutcomesMigration,
  );
  const writerPayloadHasSlug = /slug:\s*input\.slug\b/.test(
    sources.learningOutcomesWriter,
  );
  if (!schemaRequiresSlug || !writerPayloadHasSlug) {
    addFailure(failures, {
      id: "learning_outcomes_schema_writer_slug_mismatch",
      severity: "CRITICAL",
      system: "learning_outcomes",
      message:
        "learning_outcomes schema slug requirement is not aligned with writer insert payload.",
      evidence: `schema_requires_slug=${schemaRequiresSlug}; writer_payload_has_slug=${writerPayloadHasSlug}`,
      recommended_fix:
        "Ensure migration keeps `slug text not null` and writer payload includes `slug: input.slug`.",
    });
  }
}

function checkAmazonAffiliateTruthAlignment(
  failures: AuditFailure[],
  sources: AuditSources,
): void {
  const tracker = parseJson<Array<{ id?: unknown; status?: unknown }>>(
    sources.affiliateTrackerJson,
  );
  const tag = extractAmazonTag(sources.goRedirectGate);
  if (tag == null || tracker == null) return;

  const amazonRecord = tracker.find((record) => record.id === "amazon-associates");
  if (!amazonRecord || typeof amazonRecord.status !== "string") return;

  if (amazonRecord.status !== "APPROVED") {
    addFailure(failures, {
      id: "amazon_affiliate_truth_mismatch",
      severity: "CRITICAL",
      system: "affiliate_tracker_vs_redirect_gate",
      message:
        "Amazon affiliate tag is configured in redirect code while tracker does not show APPROVED.",
      evidence: `AMAZON_AFFILIATE_TAG=${tag}; amazon-associates.status=${amazonRecord.status}`,
      recommended_fix:
        "Set tracker status to APPROVED when tag is active, or remove/disable tag until approval.",
    });
  }
}

function checkTestRunnerWired(failures: AuditFailure[], sources: AuditSources): void {
  const pkg = parseJson<{ scripts?: Record<string, string> }>(sources.packageJson);
  if (pkg == null) return;
  if (!pkg.scripts || typeof pkg.scripts.test !== "string" || pkg.scripts.test.trim() === "") {
    addFailure(failures, {
      id: "missing_test_runner_script",
      severity: "CRITICAL",
      system: "package_scripts",
      message: "package.json does not define a runnable test script.",
      evidence: "scripts.test is missing or empty.",
      recommended_fix:
        "Add a `test` script in package.json (for example node --import tsx --test ...).",
    });
  }
}

function checkCommandSurfaceTruthFields(
  failures: AuditFailure[],
  sources: AuditSources,
): void {
  const content = sources.commandSurfaceReport;
  const allowedCleanup =
    /cleanup_progress:\s*\{[\s\S]*status:\s*"PINNED_MANUAL"[\s\S]*reason:\s*"Manual Phase 1 cleanup counter; not auto-computed\."[\s\S]*\}/m.test(
      content,
    );

  const functionStart = content.indexOf("export async function buildBuckpartsCommandSurfaceReport");
  if (functionStart < 0) return;
  const returnStart = content.indexOf("return {", functionStart);
  const returnEnd = content.indexOf("};", returnStart);
  if (returnStart < 0 || returnEnd < 0) return;
  const returnBlock = content.slice(returnStart, returnEnd);

  const numericLiteralLines = returnBlock
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[a-z_]+:\s*\d+,?$/.test(line))
    .filter((line) => !/^completed_steps:\s*20,?$/.test(line))
    .filter((line) => !/^total_steps:\s*20,?$/.test(line));

  if (numericLiteralLines.length > 0 || !allowedCleanup) {
    addFailure(failures, {
      id: "command_surface_hardcoded_numeric_truth",
      severity: "HIGH",
      system: "command_surface",
      message:
        "Command surface contains hardcoded numeric metric values without explicit explanation.",
      evidence:
        numericLiteralLines.length > 0
          ? `hardcoded_lines=${numericLiteralLines.join(" | ")}`
          : "cleanup_progress pinned-manual explanation is missing or malformed.",
      recommended_fix:
        "Replace hardcoded numeric metric literals with computed values or add explicit explanatory fields; keep cleanup_progress as PINNED_MANUAL with reason.",
    });
  }
}

function parseFrozenScriptPathsFromManifest(manifest: string): string[] {
  const frozenSectionStart = manifest.indexOf("## 2) FROZEN / TACTICAL SYSTEMS");
  const frozenSectionEnd = manifest.indexOf("## 3) CANDIDATES TO CUT LATER");
  if (frozenSectionStart < 0 || frozenSectionEnd < 0 || frozenSectionEnd <= frozenSectionStart) {
    return [];
  }
  const frozenSection = manifest.slice(frozenSectionStart, frozenSectionEnd);
  const matches = frozenSection.match(/`scripts\/[^`]+\.ts`/g) ?? [];
  return matches.map((m) => m.slice(1, -1));
}

function commandHasGuard(command: string): boolean {
  return /--(dry-run|read-only|readonly|no-write|confirm|force-with-ack|guard)/.test(
    command,
  );
}

function checkFrozenScriptsExposure(
  failures: AuditFailure[],
  sources: AuditSources,
): void {
  const frozenScriptPaths = parseFrozenScriptPathsFromManifest(sources.scriptManifest);
  const pkg = parseJson<{ scripts?: Record<string, string> }>(sources.packageJson);
  if (pkg == null || !pkg.scripts || frozenScriptPaths.length === 0) return;

  const exposedWithoutGuard: string[] = [];
  for (const [scriptName, command] of Object.entries(pkg.scripts)) {
    for (const frozenPath of frozenScriptPaths) {
      if (command.includes(frozenPath) && !commandHasGuard(command)) {
        exposedWithoutGuard.push(`${scriptName} -> ${frozenPath}`);
      }
    }
  }

  if (exposedWithoutGuard.length > 0) {
    addFailure(failures, {
      id: "frozen_scripts_exposed_without_guard",
      severity: "HIGH",
      system: "frozen_script_policy",
      message: "Frozen scripts are package-runnable without an explicit execution guard.",
      evidence: exposedWithoutGuard.join("; "),
      recommended_fix:
        "Remove package exposure for frozen scripts or require explicit guard flags for execution.",
    });
  }
}

function checkAmazonTagFormat(failures: AuditFailure[], sources: AuditSources): void {
  const tag = extractAmazonTag(sources.goRedirectGate);
  if (tag == null) return;
  if (!/^[a-z0-9-]+-20$/.test(tag)) {
    addFailure(failures, {
      id: "amazon_tag_format_invalid",
      severity: "MEDIUM",
      system: "affiliate_redirect_tag",
      message: "AMAZON_AFFILIATE_TAG does not match expected format.",
      evidence: `AMAZON_AFFILIATE_TAG=${tag}`,
      recommended_fix: "Use tag format /^[a-z0-9\\-]+-20$/ (for example buckparts20-20).",
    });
  }
}

export function evaluateBuckpartsSystemContractAudit(
  sources: AuditSources,
): BuckpartsSystemContractAudit {
  const failures: AuditFailure[] = [];

  checkLearningOutcomesSchemaVsWriter(failures, sources);
  checkAmazonAffiliateTruthAlignment(failures, sources);
  checkTestRunnerWired(failures, sources);
  checkCommandSurfaceTruthFields(failures, sources);
  checkFrozenScriptsExposure(failures, sources);
  checkAmazonTagFormat(failures, sources);

  const critical = failures.filter((failure) => failure.severity === "CRITICAL").length;
  const high = failures.filter((failure) => failure.severity === "HIGH").length;
  const medium = failures.filter((failure) => failure.severity === "MEDIUM").length;
  const blocking = critical > 0;
  return {
    audit_name: "buckparts_system_contract_audit_v1",
    status: blocking ? "FAIL" : "PASS",
    blocking,
    summary: {
      critical,
      high,
      medium,
    },
    status_meaning:
      "PASS means no CRITICAL blockers; HIGH/MEDIUM findings may still require action.",
    failures,
  };
}

export function runBuckpartsSystemContractAudit(
  deps: AuditDeps = {},
): BuckpartsSystemContractAudit {
  const rootDir = deps.rootDir ?? process.cwd();
  const fileExists = deps.fileExists ?? existsSync;
  const readTextFile =
    deps.readTextFile ??
    ((absolutePath: string) => readFileSync(absolutePath, "utf8"));

  const files = {
    learningOutcomesMigration: "supabase/migrations/20260428200500_learning_outcomes.sql",
    learningOutcomesWriter: "scripts/lib/learning-outcomes-writer.ts",
    affiliateTrackerJson: "data/affiliate/affiliate-application-tracker.json",
    goRedirectGate: "src/lib/retailers/go-redirect-gate.ts",
    packageJson: "package.json",
    commandSurfaceReport: "scripts/report-buckparts-command-surface.ts",
    scriptManifest: "docs/buckparts-script-classification-manifest.md",
  } as const;

  const resolved = Object.fromEntries(
    Object.entries(files).map(([k, v]) => [k, path.resolve(rootDir, v)]),
  ) as Record<keyof typeof files, string>;

  const missing = Object.entries(resolved)
    .filter(([, absPath]) => !fileExists(absPath))
    .map(([key]) => key);
  if (missing.length > 0) {
    return {
      audit_name: "buckparts_system_contract_audit_v1",
      status: "FAIL",
      blocking: true,
      summary: {
        critical: 1,
        high: 0,
        medium: 0,
      },
      status_meaning:
        "PASS means no CRITICAL blockers; HIGH/MEDIUM findings may still require action.",
      failures: [
        {
          id: "audit_required_sources_missing",
          severity: "CRITICAL",
          system: "audit_runtime",
          message: "Required source files for audit are missing.",
          evidence: missing.join(", "),
          recommended_fix: "Restore required source files before running buckparts system contract audit.",
        },
      ],
    };
  }

  const sources: AuditSources = {
    learningOutcomesMigration: readTextFile(resolved.learningOutcomesMigration),
    learningOutcomesWriter: readTextFile(resolved.learningOutcomesWriter),
    affiliateTrackerJson: readTextFile(resolved.affiliateTrackerJson),
    goRedirectGate: readTextFile(resolved.goRedirectGate),
    packageJson: readTextFile(resolved.packageJson),
    commandSurfaceReport: readTextFile(resolved.commandSurfaceReport),
    scriptManifest: readTextFile(resolved.scriptManifest),
  };

  return evaluateBuckpartsSystemContractAudit(sources);
}

export function main(): void {
  const report = runBuckpartsSystemContractAudit();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main();
}
