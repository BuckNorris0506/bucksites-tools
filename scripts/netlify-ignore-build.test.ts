/**
 * Contract tests for scripts/netlify-ignore-build.sh (--dry-run mode).
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const SCRIPT = path.join(ROOT, "scripts", "netlify-ignore-build.sh");

function runDryRun(files: string[]): { status: number | null; stderr: string } {
  const r = spawnSync("bash", [SCRIPT, "--dry-run", ...files], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return { status: r.status, stderr: r.stderr ?? "" };
}

test("docs-only change skips build (exit 0)", () => {
  const r = runDryRun(["docs/BuckParts-HQ-HANDOFF.md"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /SKIP/i);
});

test("mockup proof folder skips build (exit 0)", () => {
  const r = runDryRun([
    "docs/mockups/existing-site-animation-memory-proof-v1/README.md",
  ]);
  assert.equal(r.status, 0, r.stderr);
});

test("src change triggers build (exit 1)", () => {
  const r = runDryRun(["src/app/page.tsx"]);
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /BUILD/i);
});

test("data/evidence-only skips build (exit 0)", () => {
  const r = runDryRun(["data/evidence/amazon-lt800p-live-outcome.2026-05-03.json"]);
  assert.equal(r.status, 0, r.stderr);
});

test("data/retailer_links.csv triggers build (exit 1)", () => {
  const r = runDryRun(["data/retailer_links.csv"]);
  assert.equal(r.status, 1, r.stderr);
});

test("mixed docs + src triggers build (exit 1)", () => {
  const r = runDryRun(["docs/foo.md", "src/lib/data/filters.ts"]);
  assert.equal(r.status, 1, r.stderr);
});

test("scripts-only change skips build (exit 0)", () => {
  const r = runDryRun(["scripts/report-buckparts-command-center.ts"]);
  assert.equal(r.status, 0, r.stderr);
});
