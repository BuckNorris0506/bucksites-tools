import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1 } from "../../src/lib/retailers/waterdrop-exact-proof-slice-v1";
import { parseLinkSynergyAffiliateUrl } from "../../src/lib/retailers/waterdrop-linksynergy-parse-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));

const UKF8001_SLICE = {
  slug: "ukf8001",
  evidenceRel: "data/evidence/waterdrop-ukf8001-owner-browser-proof.2026-05-18.json",
  rakutenEntryId: "rakuten-waterdrop-539504086758822420944441",
  variant: "32984277844050",
  token: "UKF8001",
} as const;

const PRODUCTSEARCH_REL = "data/waterdrop/operator-input/local/waterdrop-rakuten-productsearch.v1.json";

function loadEvidence(rel: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, rel), "utf8")) as Record<string, unknown>;
}

function assertPreInsertNoMutationAuthority(doc: Record<string, unknown>, slug: string): void {
  assert.equal(doc.read_only, true);
  assert.equal(doc.data_mutation, false);
  assert.equal(doc.mutation_ready, false);
  assert.equal(doc.no_live_cta_change, true);
  assert.equal(doc.waterdrop_live_cta_status, "NOT_LIVE");
  assert.equal(doc.owner_browser_proof_status, "PASS");
  assert.equal(doc.filter_slug, slug);
  assert.ok(!("production_insert_outcome" in doc));
  assert.ok(!("committed_live_row" in doc));

  const basis = doc.mutation_ready_basis as Record<string, unknown>;
  assert.equal(basis.insert_plan_status, "NOT_PREPARED");
  assert.equal(basis.automation_mutation_authority, false);
  assert.equal(basis.owner_manual_insert_approved, false);
  assert.ok(!(WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1 as readonly string[]).includes(slug));
}

describe("waterdrop owner-browser proof slices v1", () => {
  it("ukf8001 evidence remains pre-insert read-only proof without mutation authority", () => {
    const doc = loadEvidence(UKF8001_SLICE.evidenceRel);
    assertPreInsertNoMutationAuthority(doc, UKF8001_SLICE.slug);
    assert.match(String(doc.required_next_action), /OWNER_DECIDES_MANUAL_INSERT_PLAN/i);

    const affiliate = String(doc.affiliate_url_candidate);
    assert.ok(affiliate.includes("click.linksynergy.com"));
    const parsed = parseLinkSynergyAffiliateUrl(affiliate);
    assert.ok(parsed?.destination_pdp_url?.includes(UKF8001_SLICE.variant));

    const browser = doc.browser_evidence as Record<string, unknown>;
    assert.equal(browser.browser_verdict, "PASS_AS_AFTERMARKET_COMPATIBLE_DIRECT_BUYABLE");
  });

  it("affiliate URLs match Rakuten Product Search API local extract for ukf8001", () => {
    const catalog = JSON.parse(readFileSync(path.join(REPO_ROOT, PRODUCTSEARCH_REL), "utf8")) as {
      entries: { id: string; affiliate_url: string }[];
    };
    const doc = loadEvidence(UKF8001_SLICE.evidenceRel);
    const entry = catalog.entries.find((e) => e.id === UKF8001_SLICE.rakutenEntryId);
    assert.ok(entry);
    assert.equal(doc.affiliate_url_candidate, entry!.affiliate_url);
  });

  it("ukf8001 evidence file does not contain retailer_links insert SQL patterns", () => {
    const raw = readFileSync(path.join(REPO_ROOT, UKF8001_SLICE.evidenceRel), "utf8");
    assert.equal(/insert\s+into\s+public\.retailer_links/i.test(raw), false);
    assert.equal(/\bupdate\b\s+public\.retailer_links/i.test(raw), false);
    assert.equal(/\bdelete\b\s+from\s+public\.retailer_links/i.test(raw), false);
  });
});
