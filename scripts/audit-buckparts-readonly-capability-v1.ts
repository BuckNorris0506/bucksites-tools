#!/usr/bin/env node
/**
 * Static audits: read-only capability + mutation authorization gate coverage.
 *
 *   npx tsx scripts/audit-buckparts-readonly-capability-v1.ts
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

const READONLY_REPORT_GLOBS = [
  "scripts/report-buckparts-command-center.ts",
  "scripts/report-buckparts-execution-ledger-v1.ts",
  "scripts/report-all-product-safe-buyer-path-census-v1.ts",
  "scripts/report-universal-batch-lifecycle-mutation-authorization-review-v1.ts",
];

const MUTATION_AUTHORIZATION_SOURCE_FILES = [
  "scripts/lib/samsung-pass-repair-guarded-apply-v1.ts",
  "scripts/lib/samsung-pass-repair-apply-closeout-v1.ts",
  "scripts/lib/universal-batch-lifecycle-mutation-authorization-review-v1.ts",
  "scripts/lib/supabase-csv-parity-guarded-apply-v1.ts",
  "scripts/lib/manufacturer-rescue-guarded-apply-bridge-v1.ts",
  "scripts/lib/air-purifier-supabase-apply-parity-mutation-gate-v1.ts",
  "scripts/lib/rpwfe-official-ge-supabase-parity-mutation-gate-v1.ts",
  "scripts/lib/promote-staged-refrigerator-mutation-gate-v1.ts",
  "scripts/lib/ingest-hqii-retailer-links-mutation-gate-v1.ts",
  "scripts/lib/hqii-candidate-queue-upsert-mutation-gate-v1.ts",
  "scripts/lib/import-seed-mutation-gate-v1.ts",
  "scripts/lib/vertical-seed-mutation-gate-v1.ts",
  "scripts/lib/learning-outcomes-mutation-gate-v1.ts",
  "scripts/lib/remove-demo-wedge-brands-mutation-gate-v1.ts",
  "scripts/lib/verify-oem-retailer-links-mutation-gate-v1.ts",
  "src/lib/owner-dashboard/owner-decision-queue-v1.ts",
];

const ACTIVE_MUTATION_APPROVAL_ALLOWLIST = new Set([
  "src/lib/owner-dashboard/founder-decision-registry-v1.ts",
  "src/lib/owner-dashboard/founder-mutation-approval-gate-v1.ts",
  "src/lib/owner-dashboard/founder-decision-registry-read-model-v1.ts",
]);

const FORBIDDEN_IMPORT_PATTERNS = [
  /executeGuardedCsvWriteModeV1/,
  /from ["'].*guarded-csv-apply-executor-write-v1/,
  /from ["'].*apply-samsung-pass-repair-guarded/,
];

const PROTECTED_WRITE_PATTERNS = [
  /writeFileSync\([^)]*retailer_links\.csv/,
  /writeFileSync\([^)]*data\/evidence\//,
  /writeFileSync\([^)]*data\/owner-decisions\//,
  /writeFileSync\([^)]*data\/compatibility_mappings\.csv/,
  /writeFileSync\([^)]*src\//,
  /writeFileSync\([^)]*supabase/i,
];

const REPORT_MUTATION_NAME_PATTERN = /guarded-apply|apply-executor|write-csv|-apply-v1\.ts$/i;

function auditReadonlyReportFile(relPath: string): string[] {
  const abs = path.join(REPO_ROOT, relPath);
  // Explicit priority list may lag renames/removals; dynamic discovery covers live reports.
  if (!existsSync(abs)) return [];
  const text = readFileSync(abs, "utf8");
  const violations: string[] = [];
  for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
    if (pattern.test(text)) {
      violations.push(`${relPath}: forbidden import pattern ${pattern}`);
    }
  }
  if (relPath.startsWith("scripts/report-") && !REPORT_MUTATION_NAME_PATTERN.test(relPath)) {
    for (const pattern of PROTECTED_WRITE_PATTERNS) {
      if (pattern.test(text)) {
        violations.push(`${relPath}: protected-path write pattern ${pattern}`);
      }
    }
  }
  return violations;
}

function auditMutationAuthorizationGate(relPath: string): string[] {
  if (ACTIVE_MUTATION_APPROVAL_ALLOWLIST.has(relPath)) return [];
  const abs = path.join(REPO_ROOT, relPath);
  if (!existsSync(abs)) {
    return [`${relPath}: mutation authorization source file missing`];
  }
  const text = readFileSync(abs, "utf8");
  if (!text.includes("isFounderRegistryRowActiveMutationApproval")) {
    return [];
  }
  const violations: string[] = [];
  if (MUTATION_AUTHORIZATION_SOURCE_FILES.includes(relPath)) {
    violations.push(
      `${relPath}: mutation path uses isFounderRegistryRowActiveMutationApproval — must use founderRegistryRowPassesMutationApprovalGateV1`,
    );
    return violations;
  }
  if (relPath.endsWith(".test.ts")) return [];
  violations.push(
    `${relPath}: unexpected isFounderRegistryRowActiveMutationApproval outside allowlist`,
  );
  return violations;
}

function listReadonlyReports(): string[] {
  const dir = path.join(REPO_ROOT, "scripts");
  return readdirSync(dir)
    .filter((name) => name.startsWith("report-") && name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .filter((name) => !REPORT_MUTATION_NAME_PATTERN.test(name))
    .map((name) => `scripts/${name}`);
}

function main(): void {
  const violations: string[] = [];
  const filesAudited = new Set<string>();

  for (const rel of READONLY_REPORT_GLOBS) {
    filesAudited.add(rel);
    violations.push(...auditReadonlyReportFile(rel));
  }
  for (const rel of listReadonlyReports()) {
    if (filesAudited.has(rel)) continue;
    filesAudited.add(rel);
    violations.push(...auditReadonlyReportFile(rel));
  }
  for (const entry of readdirSync(path.join(REPO_ROOT, "scripts/lib"))) {
    if (!entry.endsWith("-command-center-v1.ts")) continue;
    const rel = path.join("scripts/lib", entry);
    filesAudited.add(rel);
    violations.push(...auditReadonlyReportFile(rel));
  }
  for (const rel of MUTATION_AUTHORIZATION_SOURCE_FILES) {
    filesAudited.add(rel);
    const abs = path.join(REPO_ROOT, rel);
    if (!existsSync(abs)) {
      violations.push(`${rel}: mutation authorization source file missing`);
      continue;
    }
    violations.push(...auditMutationAuthorizationGate(rel));
    const text = readFileSync(abs, "utf8");
    if (!text.includes("founderRegistryRowPassesMutationApprovalGateV1")) {
      violations.push(
        `${rel}: mutation authorization file missing founderRegistryRowPassesMutationApprovalGateV1`,
      );
    }
  }

  if (violations.length > 0) {
    process.stderr.write(`BUCKPARTS_SECURITY_AUDIT_FAILED\n${violations.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(
    JSON.stringify(
      {
        contract: "buckparts_security_audit_v1",
        status: "PASS",
        files_audited: filesAudited.size,
        mutation_authorization_files: MUTATION_AUTHORIZATION_SOURCE_FILES.length,
        violations: [],
      },
      null,
      2,
    ),
  );
  process.stdout.write("\n");
}

main();
