import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1 } from "../../src/lib/retailers/waterdrop-exact-proof-slice-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));

const LT800P_EVIDENCE_REL = "data/evidence/waterdrop-lt800p-owner-browser-proof.2026-05-18.json";
const LT800P_INSERT_PLAN_REL = "docs/waterdrop-lt800p-retailer-link-insert-plan.sql";
const DA29_EVIDENCE_REL = "data/evidence/waterdrop-da29-00020b-live-outcome.2026-05-20.json";
const DA29_INSERT_PLAN_REL = "docs/waterdrop-da29-00020b-retailer-link-insert-plan.sql";

const FILTER_ID = "0b0c1bb2-ac28-4d8e-ac91-01b5a6be2539";
const AFFILIATE_URL =
  "https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539507420827021633352815&type=15&murl=https%3A%2F%2Fwww.waterdropfilter.com%2Fproducts%2Flg-lt800p-water-filter-replacement-by-waterdrop%3Fvariant%3D39389060792402";
const DESTINATION_URL =
  "https://www.waterdropfilter.com/products/lg-lt800p-water-filter-replacement-by-waterdrop?variant=39389060792402";

function countRegex(haystack: string, pattern: RegExp): number {
  return (haystack.match(pattern) ?? []).length;
}

describe("waterdrop LT800P insert plan v1", () => {
  it("insert plan exists and is owner-manual-ready (not executed, not automation)", () => {
    const sql = readFileSync(path.join(REPO_ROOT, LT800P_INSERT_PLAN_REL), "utf8");
    assert.match(sql, /MANUAL ONLY/i);
    assert.match(sql, /DO NOT RUN FROM AUTOMATION/i);
    assert.match(sql, /NOT EXECUTED/i);
    assert.match(sql, /READY FOR OWNER MANUAL/i);
    assert.doesNotMatch(sql, /EXECUTED MANUALLY/i);
    assert.match(sql, /Precheck D/i);
    assert.match(sql, /Precheck E/i);
    assert.match(sql, /waterdrop_row_count = 0|waterdrop_row_count > 0/i);
    assert.match(sql, /approved_waterdrop_count/i);
    assert.match(sql, new RegExp(FILTER_ID));
    assert.match(sql, /slug = 'lt800p'/i);
    assert.equal(countRegex(sql, /insert into public\.retailer_links/gi), 1);
    assert.equal(countRegex(sql, /\bupdate\b/gi), 0);
    assert.equal(countRegex(sql, /\bdelete\b/gi), 0);
    assert.match(sql, new RegExp(AFFILIATE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(sql, new RegExp(DESTINATION_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(sql, /COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE/);
    assert.match(sql, /WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1/);
  });

  it("LT800P evidence references insert plan with mutation_ready false and no live CTA", () => {
    const doc = JSON.parse(readFileSync(path.join(REPO_ROOT, LT800P_EVIDENCE_REL), "utf8")) as Record<
      string,
      unknown
    >;

    assert.equal(doc.read_only, true);
    assert.equal(doc.data_mutation, false);
    assert.equal(doc.mutation_ready, false);
    assert.equal(doc.no_live_cta_change, true);
    assert.equal(doc.waterdrop_live_cta_status, "NOT_LIVE");
    assert.ok(!("production_insert_outcome" in doc));
    assert.ok(!("committed_live_row" in doc));

    const basis = doc.mutation_ready_basis as Record<string, unknown>;
    assert.equal(basis.insert_plan_path, LT800P_INSERT_PLAN_REL);
    assert.equal(basis.insert_plan_status, "READY_FOR_OWNER_MANUAL_EXECUTION");
    assert.equal(basis.insert_plan_executed, false);
    assert.equal(basis.automation_mutation_authority, false);
    assert.equal(basis.owner_manual_insert_approved, false);
    assert.ok(!(WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1 as readonly string[]).includes("lt800p"));
    assert.equal(doc.affiliate_url_candidate, AFFILIATE_URL);
    assert.equal(doc.destination_pdp_url, DESTINATION_URL);
  });

  it("DA29 live proof and executed insert plan remain unchanged", () => {
    const doc = JSON.parse(readFileSync(path.join(REPO_ROOT, DA29_EVIDENCE_REL), "utf8")) as Record<
      string,
      unknown
    >;
    assert.equal(doc.waterdrop_live_cta_status, "LIVE");
    assert.equal(doc.filter_slug, "da29-00020b");

    const da29Sql = readFileSync(path.join(REPO_ROOT, DA29_INSERT_PLAN_REL), "utf8");
    assert.match(da29Sql, /EXECUTED MANUALLY/i);
    assert.doesNotMatch(da29Sql, /lt800p/i);
  });
});
