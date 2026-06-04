import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import {
  FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_PROOF_ALLOWED_WRITE_REL_PATHS_V1,
  FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_PROOF_JSON_REL_V1,
  FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_PROOF_MD_REL_V1,
  FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_TARGET_URL_V1,
  assessGswf2Conflation,
  buildOwnerBrowserChecklistOnlyProof,
  deriveGswfGeOfficialProofSignals,
  writeGswfGeOfficialOwnerBrowserProofDraftsV1,
} from "./fridge-safe-link-gswf-ge-official-browser-capture-v1";

describe("fridge-safe-link-gswf-ge-official-browser-capture-v1", () => {
  test("assessGswf2Conflation blocks GSWF2-only identity", () => {
    const r = assessGswf2Conflation({
      finalUrl: "https://www.geapplianceparts.com/store/parts/spec/GSWF2",
      title: "GE GSWF2 Refrigerator Water Filter",
      h1Text: "GSWF2 FILTER",
      textSample: "GSWF2",
    });
    assert.equal(r.blocked, true);
    assert.equal(r.exactToken, false);
  });

  test("deriveGswfGeOfficialProofSignals PASS for RPWFE-shaped GSWF capture", () => {
    const d = deriveGswfGeOfficialProofSignals({
      targetUrl: FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_TARGET_URL_V1,
      finalUrl: FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_TARGET_URL_V1,
      title: "GSWF | GE® GSWF REFRIGERATOR WATER FILTER",
      h1Text: "GE® GSWF REFRIGERATOR WATER FILTER",
      textSample: "GSWF Add to Cart GE Appliance Parts",
      purchaseActions: ["Add to Cart"],
      classification: "direct_buyable",
      captureSucceeded: true,
    });
    assert.equal(d.browser_truth_status, "PASS");
    assert.equal(d.exact_token_gswf_proven, true);
    assert.equal(d.current_direct_buyability_proven, true);
    assert.equal(d.gswf2_conflation_blocked, false);
    assert.equal(d.ge_pdp_proof_result, "PROVEN");
  });

  test("checklist-only proof is non-mutating with UNKNOWN live proof", () => {
    const proof = buildOwnerBrowserChecklistOnlyProof({});
    assert.equal(proof.read_only, true);
    assert.equal(proof.mutation_authorized, false);
    assert.equal(proof.ge_pdp_proof_result, "UNKNOWN");
    assert.equal(proof.apply_plan_proposal_justified, false);
    assert.equal(proof.exact_token_gswf_proven, "UNKNOWN");
  });

  test("writeGswfGeOfficialOwnerBrowserProofDraftsV1 writes only allowed draft paths", () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "gswf-ge-proof-"));
    try {
      const proof = buildOwnerBrowserChecklistOnlyProof({});
      const written = writeGswfGeOfficialOwnerBrowserProofDraftsV1({ rootDir: tempRoot, proof });
      assert.equal(written.json_rel_path, FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_PROOF_JSON_REL_V1);
      assert.equal(written.md_rel_path, FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_PROOF_MD_REL_V1);
      assert.deepEqual(
        [written.json_rel_path, written.md_rel_path],
        FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_PROOF_ALLOWED_WRITE_REL_PATHS_V1.filter((p) =>
          p.endsWith(".json") || p.endsWith(".md"),
        ),
      );
      const json = JSON.parse(
        readFileSync(path.join(tempRoot, written.json_rel_path), "utf8"),
      ) as { verified_link_authorized: boolean };
      assert.equal(json.verified_link_authorized, false);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
