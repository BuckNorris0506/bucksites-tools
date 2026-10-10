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

/** Merge commit abd67ee vs PR head 56e116c: same tree, zero file diff (production false-skip case). */
const MERGE_COMMIT = "abd67ee1f0ddd2f07926edb35f5de53818fffd52";
const PR_HEAD_COMMIT = "56e116c82c71edd9c3ba3fd4e498e5ab390be6cc";

function runDryRun(files: string[]): { status: number | null; stderr: string } {
  const r = spawnSync("bash", [SCRIPT, "--dry-run", ...files], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return { status: r.status, stderr: r.stderr ?? "" };
}

function runGitMode(env: Record<string, string>): { status: number | null; stderr: string } {
  const r = spawnSync("bash", [SCRIPT], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ...env },
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

test("fridge batch-production manifest skips build (exit 0)", () => {
  const r = runDryRun([
    "data/fridge/batch-production/model-first-input-v1/fridge-models-batch-v1.json",
  ]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /SKIP/i);
});

test("data/compatibility_mappings.csv triggers build (exit 1)", () => {
  const r = runDryRun(["data/compatibility_mappings.csv"]);
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /BUILD/i);
});

test("src/app/page.tsx triggers build (exit 1)", () => {
  const r = runDryRun(["src/app/page.tsx"]);
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /BUILD/i);
});

test("production context always builds even when cached tree equals commit (exit 1)", () => {
  const r = runGitMode({
    CONTEXT: "production",
    CACHED_COMMIT_REF: PR_HEAD_COMMIT,
    COMMIT_REF: MERGE_COMMIT,
  });
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /production context/i);
  assert.match(r.stderr, /BUILD/i);
});

test("deploy-preview with zero file diff skips build (exit 0)", () => {
  const r = runGitMode({
    CONTEXT: "deploy-preview",
    CACHED_COMMIT_REF: PR_HEAD_COMMIT,
    COMMIT_REF: MERGE_COMMIT,
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /SKIP/i);
});

test("deploy-preview with runtime diff builds (exit 1)", () => {
  const parent = spawnSync("git", ["rev-parse", `${MERGE_COMMIT}^`], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(parent.status, 0, parent.stderr);
  const r = runGitMode({
    CONTEXT: "deploy-preview",
    CACHED_COMMIT_REF: parent.stdout.trim(),
    COMMIT_REF: MERGE_COMMIT,
  });
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /BUILD/i);
});

test("missing commit refs fail-open to build (exit 1)", () => {
  const r = runGitMode({
    CONTEXT: "deploy-preview",
    CACHED_COMMIT_REF: "",
    COMMIT_REF: MERGE_COMMIT,
  });
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /missing CACHED_COMMIT_REF or COMMIT_REF/i);
});
