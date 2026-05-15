import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const workflowPath = path.resolve(process.cwd(), ".github/workflows/buckparts-runner-step.yml");

test("BuckParts Runner Step workflow is manual dispatch only with JSON artifact", () => {
  const yaml = readFileSync(workflowPath, "utf8");
  assert.match(yaml, /^name:\s*BuckParts Runner Step$/m);
  assert.match(yaml, /^\s*workflow_dispatch:\s*$/m);
  assert.doesNotMatch(yaml, /^\s*schedule:/m);
  assert.doesNotMatch(yaml, /uses:\s*actions\/checkout@v4\b/);
  assert.doesNotMatch(yaml, /uses:\s*actions\/setup-node@v4\b/);
  assert.doesNotMatch(yaml, /uses:\s*actions\/upload-artifact@v4\b/);
  assert.match(yaml, /uses:\s*actions\/checkout@v6\b/);
  assert.match(yaml, /uses:\s*actions\/setup-node@v6\b/);
  assert.match(yaml, /uses:\s*actions\/upload-artifact@v7\b/);
  assert.match(yaml, /node-version:\s*"24"/);
  assert.match(yaml, /run:\s*npm ci/);
  assert.match(yaml, /node --import tsx scripts\/buckparts-runner-step\.ts > buckparts-runner-step\.json/);
  assert.match(yaml, /GITHUB_STEP_SUMMARY/);
  assert.match(yaml, /name:\s*buckparts-runner-step/);
  assert.match(yaml, /path:\s*buckparts-runner-step\.json/);
  assert.match(yaml, /permissions:\s*\n\s*contents:\s*read/m);
  assert.doesNotMatch(yaml, /FORCE_JAVASCRIPT_ACTIONS_TO_NODE24/);
  assert.doesNotMatch(yaml, /slack/i);
  assert.doesNotMatch(yaml, /\bgit\s+push\b/i);
});
