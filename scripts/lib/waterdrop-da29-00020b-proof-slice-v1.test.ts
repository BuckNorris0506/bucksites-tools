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
const BROWSER_TRUTH_CHECKED_AT = "2026-05-20T20:00:00.000Z";

const OPERATOR_LINKSYNERGY =
  "https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539508551730292149506115&type=2&murl=https%3a%2f%2fwww.waterdropfilter.com%2fproducts%2fwaterdrop-replacement-for-samsung-da29-00020b-fridge-water-filter%3fvariant%3d33108474495058";

const PDP_TITLE =
  "Waterdrop WDP-F27 Replacement for Samsung DA29-00020B Fridge Water Filter";

function countRegex(haystack: string, pattern: RegExp): number {
  return (haystack.match(pattern) ?? []).length;
}

describe("waterdrop DA29-00020B proof slice v1", () => {
  it("evidence records owner manual insert approval without autonomous mutation_ready", () => {
    const raw = readFileSync(path.join(REPO_ROOT, EVIDENCE_REL), "utf8");
    const doc = JSON.parse(raw) as Record<string, unknown>;

    assert.equal(doc.read_only, true);
    assert.equal(doc.data_mutation, false);
    assert.equal(doc.mutation_ready, false);
    assert.equal(doc.owner_manual_insert_approved, true);
    assert.equal(doc.verdict, "EXACT_PDP_PROVEN_FROM_OWNER_BROWSER_SCREENSHOT");
    assert.equal(doc.token, "DA29-00020B");
    assert.equal(doc.filter_slug, "da29-00020b");
    assert.equal(doc.filter_id, FILTER_ID);
    assert.equal(doc.affiliate_url_candidate, OPERATOR_LINKSYNERGY);

    const basis = doc.mutation_ready_basis as Record<string, unknown>;
    assert.equal(basis.insert_plan_status, "READY_FOR_OWNER_MANUAL_EXECUTION");
    assert.equal(basis.insert_prechecks_status, "PASSED_READ_ONLY");
    assert.equal(basis.automation_mutation_authority, false);
    assert.equal(basis.insert_plan_path, INSERT_PLAN_REL);

    const blocking = basis.blocking_reasons as string[];
    assert.ok(!blocking.some((r) => /insert_plan_status remains BLOCKED/i.test(r)));
    assert.ok(blocking.some((r) => /NOT_LIVE/i.test(r)));
    assert.ok(blocking.some((r) => /Precheck D and Precheck E/i.test(r)));

    const finalPrecheck = basis.final_precheck_required_before_insert as string[];
    assert.equal(finalPrecheck.length, 2);
    assert.ok(finalPrecheck.some((r) => /Precheck D/i.test(r)));
    assert.ok(finalPrecheck.some((r) => /Precheck E/i.test(r)));
  });

  it("evidence retains owner-browser and Supabase precheck proof", () => {
    const doc = JSON.parse(readFileSync(path.join(REPO_ROOT, EVIDENCE_REL), "utf8")) as Record<
      string,
      unknown
    >;

    const browser = doc.browser_evidence as Record<string, unknown>;
    assert.equal(browser.browser_truth_checked_at, BROWSER_TRUTH_CHECKED_AT);
    assert.equal(browser.browser_verdict, "PASS_AS_AFTERMARKET_COMPATIBLE_DIRECT_BUYABLE");

    const pre = doc.supabase_read_only_precheck as Record<string, unknown>;
    assert.equal(pre.waterdrop_row_count, 0);
    assert.equal(pre.approved_waterdrop_count, 0);
  });

  it("insert plan is ready for manual execution with one INSERT and no UPDATE/DELETE", () => {
    const sql = readFileSync(path.join(REPO_ROOT, INSERT_PLAN_REL), "utf8");
    assert.match(sql, /MANUAL ONLY/i);
    assert.match(sql, /DO NOT RUN FROM AUTOMATION/i);
    assert.match(sql, new RegExp(FILTER_ID));
    assert.match(sql, /Precheck D/i);
    assert.match(sql, /Precheck E/i);
    assert.match(sql, /2026-05-20T20:00:00\.000Z/);
    assert.match(sql, /is_primary,\s*\n\s*status/s);
    assert.match(sql, /false,\s*\n\s*'approved'/s);
    assert.match(sql, /COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE/);
    assert.match(sql, /linksynergy\.com/);

    assert.equal(countRegex(sql, /insert into public\.retailer_links/gi), 1);
    assert.equal(countRegex(sql, /\bupdate\b/gi), 0);
    assert.equal(countRegex(sql, /\bdelete\b/gi), 0);

    assert.match(sql, /^begin;/m);
    assert.match(sql, /^commit;/m);
    assert.match(sql, /^insert into public\.retailer_links/m);
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
