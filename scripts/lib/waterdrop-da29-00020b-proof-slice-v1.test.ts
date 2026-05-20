import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));
const EVIDENCE_REL = "data/evidence/waterdrop-da29-00020b-live-outcome.2026-05-20.json";
const INSERT_PLAN_REL = "docs/waterdrop-da29-00020b-retailer-link-insert-plan.sql";
const TRACKER_REL = "data/affiliate/affiliate-application-tracker.json";

const FILTER_ID = "f58a2c03-0f51-4b61-953a-5daf0abf2874";

const OPERATOR_LINKSYNERGY =
  "https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539508551730292149506115&type=2&murl=https%3a%2f%2fwww.waterdropfilter.com%2fproducts%2fwaterdrop-replacement-for-samsung-da29-00020b-fridge-water-filter%3fvariant%3d33108474495058";

const PDP_TITLE =
  "Waterdrop WDP-F27 Replacement for Samsung DA29-00020B Fridge Water Filter";

describe("waterdrop DA29-00020B proof slice v1", () => {
  it("evidence file is read-only, not mutation-ready, with owner-browser buy-path proof", () => {
    const raw = readFileSync(path.join(REPO_ROOT, EVIDENCE_REL), "utf8");
    const doc = JSON.parse(raw) as Record<string, unknown>;

    assert.equal(doc.read_only, true);
    assert.equal(doc.data_mutation, false);
    assert.equal(doc.mutation_ready, false);
    assert.equal(doc.verdict, "EXACT_PDP_PROVEN_FROM_OWNER_BROWSER_SCREENSHOT");
    assert.equal(doc.token, "DA29-00020B");
    assert.equal(doc.filter_slug, "da29-00020b");
    assert.equal(doc.filter_id, FILTER_ID);
    assert.equal(doc.affiliate_url_candidate, OPERATOR_LINKSYNERGY);

    const owner = doc.owner_browser_proof as Record<string, unknown>;
    assert.equal(owner.linksynergy_landed_on_expected_pdp, true);
    assert.equal(owner.seller_title_visible, PDP_TITLE);
    assert.equal(owner.add_to_cart_visible, true);
    assert.equal(owner.buy_now_visible, true);

    const browser = doc.browser_evidence as Record<string, unknown>;
    assert.equal(browser.waterdrop_pdp_browser_inspected_in_repo, true);
    assert.equal(browser.seller_title_visible, PDP_TITLE);
    assert.equal(browser.token_visible_in_pdp_title, true);
    assert.equal(browser.price_visible_usd, 41.99);
    assert.equal(browser.cart_availability_visible, true);
    assert.equal(
      browser.browser_verdict,
      "PASS_AS_AFTERMARKET_COMPATIBLE_DIRECT_BUYABLE",
    );
    assert.equal(
      browser.browser_truth_buyable_subtype_candidate,
      "COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE",
    );

    const basis = doc.mutation_ready_basis as Record<string, unknown>;
    assert.equal(basis.insert_plan_status, "BLOCKED");
    assert.equal(basis.insert_prechecks_status, "PASSED_READ_ONLY");
    assert.equal(basis.prechecks_passed_owner_insert_not_approved, true);
    assert.equal(basis.insert_plan_path, INSERT_PLAN_REL);
    assert.equal(basis.precheck_filter_id_proven, FILTER_ID);
    assert.equal(basis.precheck_waterdrop_approved_row_count_proven, 0);
    assert.equal(basis.precheck_waterdrop_row_count_proven, 0);

    const blocking = basis.blocking_reasons as string[];
    assert.ok(!blocking.some((r) => /owner-browser.*buy-path/i.test(r)));
    assert.ok(!blocking.some((r) => /filter_id not resolved/i.test(r)));
    assert.ok(blocking.some((r) => /owner explicitly unblocks/i.test(r)));

    const unknowns = doc.unknown_facts as string[];
    assert.ok(!unknowns.some((f) => /Add to Cart/i.test(f)));
    assert.ok(!unknowns.some((f) => /filter_id UUID/i.test(f)));
  });

  it("evidence records Supabase read-only precheck proof", () => {
    const doc = JSON.parse(readFileSync(path.join(REPO_ROOT, EVIDENCE_REL), "utf8")) as Record<
      string,
      unknown
    >;
    const pre = doc.supabase_read_only_precheck as Record<string, unknown>;
    assert.equal(pre.data_mutation, false);
    assert.equal((pre.filter as { filter_id: string }).filter_id, FILTER_ID);
    assert.equal(pre.waterdrop_row_count, 0);
    assert.equal(pre.approved_waterdrop_count, 0);

    const schema = pre.schema_defaults_proven as Record<string, unknown>;
    assert.equal(schema.id_default, "gen_random_uuid()");
    assert.equal(schema.created_at_default, "now()");
    assert.equal(schema.updated_at_column, false);

    const idx = pre.unique_index_proven as { name: string; columns: string[] };
    assert.equal(idx.name, "retailer_links_filter_retailer_key_unique");
    assert.deepEqual(idx.columns, ["filter_id", "retailer_key"]);

    const links = pre.existing_retailer_links_summary as {
      total_count_for_filter: number;
      rows: { retailer_key: string }[];
    };
    assert.equal(links.total_count_for_filter, 2);
    assert.deepEqual(
      links.rows.map((r) => r.retailer_key).sort(),
      ["amazon", "oem-parts-catalog"],
    );
  });

  it("insert plan exists, stays blocked, and references proven filter_id", () => {
    const sql = readFileSync(path.join(REPO_ROOT, INSERT_PLAN_REL), "utf8");
    assert.match(sql, /BLOCKED/i);
    assert.match(sql, /INSERT PLAN ONLY/i);
    assert.match(sql, /waterdrop-da29-00020b-live-outcome\.2026-05-20\.json/);
    assert.match(sql, new RegExp(FILTER_ID));
    assert.match(sql, /gen_random_uuid\(\)/);
    assert.match(sql, /created_at default now\(\)/);
    assert.match(sql, /retailer_links_filter_retailer_key_unique/);
    assert.match(sql, /insert into public\.retailer_links/s);
    assert.match(sql, /-- begin;/);
    assert.match(sql, /linksynergy\.com/);
    assert.doesNotMatch(sql, /^insert into public\.retailer_links/m);
    assert.doesNotMatch(sql, /^begin;/m);
  });

  it("rakuten-waterdrop-filter tracker records LinkSynergy click-test verification", () => {
    const raw = JSON.parse(readFileSync(path.join(REPO_ROOT, TRACKER_REL), "utf8")) as {
      id: string;
      tagVerified: boolean | null;
      tagValue: string | null;
      notes: string | null;
    }[];
    const waterdrop = raw.find((r) => r.id === "rakuten-waterdrop-filter");
    assert.ok(waterdrop);
    assert.equal(waterdrop!.tagVerified, true);
    assert.equal(waterdrop!.tagValue, "GTFBcFcCW48");
    assert.match(waterdrop!.notes ?? "", /LinkSynergy click URL tested/i);
    assert.match(waterdrop!.notes ?? "", /DA29-00020B/i);
  });
});
