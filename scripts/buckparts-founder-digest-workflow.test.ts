import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const workflowPath = path.resolve(process.cwd(), ".github/workflows/buckparts-founder-digest.yml");

test("BuckParts Founder Digest workflow is weekly read-only with artifact", () => {
  const yaml = readFileSync(workflowPath, "utf8");
  assert.match(yaml, /^name:\s*BuckParts Founder Digest$/m);
  assert.match(yaml, /^\s*workflow_dispatch:\s*$/m);
  assert.match(yaml, /^\s*schedule:\s*$/m);
  assert.match(yaml, /^\s*-\s*cron:\s*"0 16 \* \* 1"$/m);
  assert.match(yaml, /uses:\s*actions\/checkout@v4/);
  assert.match(yaml, /uses:\s*actions\/setup-node@v4/);
  assert.match(yaml, /FOUNDER_DIGEST_SKIP_BUILD:\s*"1"/);
  assert.match(yaml, /buckparts-founder-digest\.ts/);
  assert.match(yaml, /actions\/upload-artifact@v4/);
  assert.match(yaml, /\$GITHUB_STEP_SUMMARY/);
  assert.doesNotMatch(yaml, /slack/i);
  assert.doesNotMatch(yaml, /pagerduty/i);
  assert.doesNotMatch(yaml, /email|smtp|sendgrid|mailgun/i);
  assert.doesNotMatch(yaml, /\bgit\s+push\b/i);
});
