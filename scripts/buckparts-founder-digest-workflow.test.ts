import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const workflowPath = path.resolve(process.cwd(), ".github/workflows/buckparts-founder-digest.yml");

test("BuckParts Founder Digest workflow is weekly read-only with artifact", () => {
  const yaml = readFileSync(workflowPath, "utf8");
  assert.match(yaml, /^name:\s*BuckParts Founder Digest$/m);
  assert.doesNotMatch(yaml, /uses:\s*actions\/checkout@v4\b/);
  assert.doesNotMatch(yaml, /uses:\s*actions\/setup-node@v4\b/);
  assert.doesNotMatch(yaml, /uses:\s*actions\/upload-artifact@v4\b/);
  assert.match(yaml, /uses:\s*actions\/checkout@v6\b/);
  assert.match(yaml, /uses:\s*actions\/setup-node@v6\b/);
  assert.match(yaml, /uses:\s*actions\/upload-artifact@v7\b/);
  assert.doesNotMatch(yaml, /FORCE_JAVASCRIPT_ACTIONS_TO_NODE24/);
  assert.match(yaml, /^\s*workflow_dispatch:\s*$/m);
  assert.match(yaml, /^\s*schedule:\s*$/m);
  assert.match(yaml, /^\s*-\s*cron:\s*"0 16 \* \* 1"$/m);
  assert.match(yaml, /FOUNDER_DIGEST_SKIP_BUILD:\s*"1"/);
  assert.match(yaml, /buckparts-founder-digest\.ts/);
  assert.match(yaml, /\$GITHUB_STEP_SUMMARY/);
  assert.doesNotMatch(yaml, /slack/i);
  assert.doesNotMatch(yaml, /pagerduty/i);
  assert.doesNotMatch(yaml, /email|smtp|sendgrid|mailgun/i);
  assert.doesNotMatch(yaml, /\bgit\s+push\b/i);
});
