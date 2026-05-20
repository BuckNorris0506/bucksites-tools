import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compareDeployCommitToLocalHead,
  parseDeployCommitRefFromHtml,
} from "./buckparts-deploy-identity-v1";

describe("buckparts-deploy-identity-v1", () => {
  it("parseDeployCommitRefFromHtml reads meta tag", () => {
    const html = `<html><head><meta name="buckparts-deploy-commit" content="0673cfd87f3a" /></head></html>`;
    assert.equal(parseDeployCommitRefFromHtml(html), "0673cfd87f3a");
    assert.equal(parseDeployCommitRefFromHtml("<html></html>"), null);
  });

  it("compareDeployCommitToLocalHead matches short and full SHAs", () => {
    assert.deepEqual(
      compareDeployCommitToLocalHead({
        localHeadCommit: "0673cfd",
        liveDeployCommit: "0673cfd87f3ad0ba1d79ce1f9555eb8f90d5dc12",
      }),
      {
        local_head_commit: "0673cfd",
        live_deploy_commit: "0673cfd87f3ad0ba1d79ce1f9555eb8f90d5dc12",
        sync: "MATCHES_LOCAL_HEAD",
      },
    );
    assert.equal(
      compareDeployCommitToLocalHead({
        localHeadCommit: "0673cfd",
        liveDeployCommit: null,
      }).sync,
      "UNKNOWN_LIVE_DEPLOY_COMMIT",
    );
  });
});
