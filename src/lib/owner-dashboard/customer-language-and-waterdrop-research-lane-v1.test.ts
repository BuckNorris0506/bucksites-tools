import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  CUSTOMER_LANGUAGE_DOCTRINE_REL_PATH,
  NO_OEM_COLD_RULE_V1,
  PURCHASE_OPTION_MONETIZATION_PRIORITY_V1,
  WATERDROP_DA29_00020B_EVIDENCE_REL_PATH,
  WATERDROP_DA29_00020B_RESEARCH_DRAFT_REL_PATH,
} from "@/lib/copy/customer-language-doctrine";

import { buildCustomerLanguageAndWaterdropResearchLaneV1 } from "./customer-language-and-waterdrop-research-lane-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.."));
const ROW_ID = "d4cbad0c-4bab-4854-89bf-59e6d6492c6b";

describe("customer_language_and_waterdrop_research_lane_v1", () => {
  it("exposes doctrine path, no-OEM-cold rule, LIVE CTA with production row id", () => {
    const lane = buildCustomerLanguageAndWaterdropResearchLaneV1({
      rootDir: REPO_ROOT,
      fileExists: existsSync,
    });

    assert.equal(lane.contract, "customer_language_and_waterdrop_research_lane_v1");
    assert.equal(lane.read_only, true);
    assert.equal(lane.data_mutation, false);
    assert.equal(lane.mutation_authority, false);
    assert.equal(lane.customer_language_doctrine_path, CUSTOMER_LANGUAGE_DOCTRINE_REL_PATH);
    assert.equal(lane.no_oem_cold_rule, NO_OEM_COLD_RULE_V1);
    assert.equal(lane.purchase_option_monetization_priority, PURCHASE_OPTION_MONETIZATION_PRIORITY_V1);
    assert.equal(lane.waterdrop_research_draft_path, WATERDROP_DA29_00020B_RESEARCH_DRAFT_REL_PATH);
    assert.equal(lane.waterdrop_evidence_path, WATERDROP_DA29_00020B_EVIDENCE_REL_PATH);
    assert.equal(lane.waterdrop_research_draft_published, false);
    assert.equal(lane.waterdrop_live_cta_status, "LIVE");
    assert.equal(lane.waterdrop_production_row_id, ROW_ID);
    assert.equal(lane.waterdrop_proof_commit_ref, "a343464");
    assert.ok(lane.first_verified_waterdrop_non_amazon_dtc_slice_note?.includes("proof slice"));
    assert.ok(lane.proven_facts.some((f) => /Waterdrop-first when exact proof slice/i.test(f)));
    assert.ok(lane.proven_facts.some((f) => /mutation_ready=false/i.test(f)));
    assert.ok(lane.proven_facts.some((f) => /not published customer copy/i.test(f)));
    assert.ok(lane.proven_facts.some((f) => new RegExp(ROW_ID).test(f)));
  });
});
