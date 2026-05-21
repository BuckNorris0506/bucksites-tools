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
const ROW_ID = "8fb8189c-6c29-46c9-ae95-d3e26be05add";
const AFFILIATE_URL =
  "https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539507420827021633352815&type=15&murl=https%3A%2F%2Fwww.waterdropfilter.com%2Fproducts%2Flg-lt800p-water-filter-replacement-by-waterdrop%3Fvariant%3D39389060792402";
const DESTINATION_URL =
  "https://www.waterdropfilter.com/products/lg-lt800p-water-filter-replacement-by-waterdrop?variant=39389060792402";

function countRegex(haystack: string, pattern: RegExp): number {
  return (haystack.match(pattern) ?? []).length;
}

describe("waterdrop LT800P insert plan v1", () => {
  it("insert plan marks executed row and warns against duplicate re-run", () => {
    const sql = readFileSync(path.join(REPO_ROOT, LT800P_INSERT_PLAN_REL), "utf8");
    assert.match(sql, /MANUAL ONLY/i);
    assert.match(sql, /DO NOT RUN FROM AUTOMATION/i);
    assert.match(sql, /EXECUTED MANUALLY/i);
    assert.match(sql, /DO NOT RE-RUN INSERT/i);
    assert.match(sql, new RegExp(ROW_ID));
    assert.match(sql, /Precheck D/i);
    assert.match(sql, /Precheck E/i);
    assert.match(sql, new RegExp(FILTER_ID));
    assert.match(sql, /slug = 'lt800p'/i);
    assert.equal(countRegex(sql, /insert into public\.retailer_links/gi), 1);
    assert.equal(countRegex(sql, /\bupdate\b/gi), 0);
    assert.equal(countRegex(sql, /\bdelete\b/gi), 0);
    assert.doesNotMatch(sql, /NOT EXECUTED/i);
  });

  it("LT800P evidence records production insert and BuckParts runtime proof with LIVE CTA status", () => {
    const doc = JSON.parse(readFileSync(path.join(REPO_ROOT, LT800P_EVIDENCE_REL), "utf8")) as Record<
      string,
      unknown
    >;

    assert.equal(doc.read_only, true);
    assert.equal(doc.data_mutation, false);
    assert.equal(doc.mutation_ready, false);
    assert.equal(doc.waterdrop_live_cta_status, "LIVE");
    assert.equal(doc.insert_outcome, "COMMITTED_VERIFIED_READ_ONLY");
    assert.equal(doc.filter_id, FILTER_ID);
    assert.equal(doc.owner_manual_insert_approved, true);

    const prod = doc.production_insert_outcome as Record<string, unknown>;
    const row = prod.inserted_row as Record<string, unknown>;
    assert.equal(row.id, ROW_ID);
    assert.equal(row.filter_id, FILTER_ID);
    assert.equal(row.retailer_key, "waterdrop");
    assert.equal(row.affiliate_url, AFFILIATE_URL);
    assert.equal(row.destination_url, DESTINATION_URL);

    const committed = doc.committed_live_row as Record<string, unknown>;
    assert.equal(committed.link_id, ROW_ID);

    const runtime = doc.runtime_proof as Record<string, unknown>;
    assert.equal(runtime.scope, "buckparts_only");
    const filterPage = runtime.filter_page as Record<string, unknown>;
    assert.equal(filterPage.http_status, 200);
    assert.equal(filterPage.http_version, "HTTP/2");
    const rendered = filterPage.rendered_html_contains as string[];
    assert.ok(rendered.includes("Waterdrop"));
    assert.ok(rendered.includes("Amazon"));
    assert.ok(rendered.includes(ROW_ID));
    assert.ok(rendered.some((s) => s.includes(`/go/${ROW_ID}`)));

    const go = runtime.go_redirect as Record<string, unknown>;
    assert.equal(go.http_status, 302);
    assert.equal(go.http_version, "HTTP/2");
    assert.equal(go.location, AFFILIATE_URL);

    const basis = doc.mutation_ready_basis as Record<string, unknown>;
    assert.equal(basis.insert_plan_status, "EXECUTED_MANUAL");
    assert.equal(basis.automation_mutation_authority, false);
    assert.equal(basis.repo_pass_no_ranking_or_allowlist_change, true);
    assert.ok((WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1 as readonly string[]).includes("lt800p"));
    assert.ok((WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1 as readonly string[]).includes("da29-00020b"));
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
    assert.doesNotMatch(da29Sql, /8fb8189c-6c29-46c9-ae95-d3e26be05add/);
  });
});
