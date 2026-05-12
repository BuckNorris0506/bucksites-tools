import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const workflowPath = path.resolve(
  process.cwd(),
  ".github/workflows/buckparts-daily-operator.yml",
);

test("BuckParts Daily Operator workflow is scheduled and read-only", () => {
  const yaml = readFileSync(workflowPath, "utf8");

  assert.match(yaml, /^name:\s*BuckParts Daily Operator$/m);
  assert.match(yaml, /^\s*workflow_dispatch:\s*$/m);
  assert.match(yaml, /^\s*schedule:\s*$/m);
  assert.match(yaml, /^\s*-\s*cron:\s*"17 13 \* \* \*"$/m);
  assert.match(yaml, /uses:\s*actions\/checkout@v4/);
  assert.match(yaml, /uses:\s*actions\/setup-node@v4/);
  assert.match(yaml, /node-version:\s*"24"/);
  assert.match(yaml, /\bnpm ci\b/);
  assert.match(yaml, /\bnpm run buckparts:daily\b/);
  assert.match(yaml, /\$GITHUB_STEP_SUMMARY/);

  assert.doesNotMatch(yaml, /\bgit\s+push\b/i);
  assert.doesNotMatch(yaml, /\bdeploy\b/i);
  assert.doesNotMatch(yaml, /\bnetlify\b/i);
  assert.doesNotMatch(yaml, /\bsupabase\b.*\b(upsert|insert|update|delete)\b/i);
  assert.doesNotMatch(yaml, /\bnpm\s+test\b/);
  assert.doesNotMatch(yaml, /\bnpm\s+run\s+build\b/);
  assert.doesNotMatch(yaml, /\bnpm\s+run\s+buckparts:audit\b/);
});
