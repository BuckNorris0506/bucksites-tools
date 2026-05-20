import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));
const EVIDENCE_REL = "data/evidence/waterdrop-da29-00020b-live-outcome.2026-05-20.json";
const INSERT_PLAN_REL = "docs/waterdrop-da29-00020b-retailer-link-insert-plan.sql";

const OPERATOR_LINKSYNERGY =
  "https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539508551730292149506115&type=2&murl=https%3a%2f%2fwww.waterdropfilter.com%2fproducts%2fwaterdrop-replacement-for-samsung-da29-00020b-fridge-water-filter%3fvariant%3d33108474495058";

describe("waterdrop DA29-00020B proof slice v1", () => {
  it("evidence file is read-only, not mutation-ready, and blocks on UNKNOWN buy path", () => {
    const raw = readFileSync(path.join(REPO_ROOT, EVIDENCE_REL), "utf8");
    const doc = JSON.parse(raw) as Record<string, unknown>;

    assert.equal(doc.read_only, true);
    assert.equal(doc.data_mutation, false);
    assert.equal(doc.mutation_ready, false);
    assert.equal(doc.verdict, "UNKNOWN");
    assert.equal(doc.token, "DA29-00020B");
    assert.equal(doc.filter_slug, "da29-00020b");
    assert.equal(doc.affiliate_url_candidate, OPERATOR_LINKSYNERGY);

    const browser = doc.browser_evidence as Record<string, unknown>;
    assert.equal(browser.buy_path_visible, "UNKNOWN");
    assert.equal(browser.browser_verdict, "UNKNOWN");

    const basis = doc.mutation_ready_basis as Record<string, unknown>;
    assert.equal(basis.insert_plan_status, "BLOCKED");
    assert.equal(basis.insert_plan_path, INSERT_PLAN_REL);

    const unknowns = doc.unknown_facts as string[];
    assert.ok(unknowns.some((f) => /Add to Cart/i.test(f)));
    assert.ok(unknowns.some((f) => /filter_id/i.test(f)));
  });

  it("insert plan exists, stays blocked, and references evidence", () => {
    const sql = readFileSync(path.join(REPO_ROOT, INSERT_PLAN_REL), "utf8");
    assert.match(sql, /BLOCKED/i);
    assert.match(sql, /INSERT PLAN ONLY/i);
    assert.match(sql, /waterdrop-da29-00020b-live-outcome\.2026-05-20\.json/);
    assert.match(sql, /insert into public\.retailer_links/s);
    assert.match(sql, /-- begin;/);
    assert.match(sql, /linksynergy\.com/);
    assert.doesNotMatch(sql, /^insert into public\.retailer_links/m);
  });
});
