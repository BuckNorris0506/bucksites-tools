import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { buildCustomerLanguageAndWaterdropResearchLaneV1 } from "../../src/lib/owner-dashboard/customer-language-and-waterdrop-research-lane-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));
const EVIDENCE_REL = "data/evidence/waterdrop-da29-00020b-live-outcome.2026-05-20.json";
const INSERT_PLAN_REL = "docs/waterdrop-da29-00020b-retailer-link-insert-plan.sql";
const TRACKER_REL = "data/affiliate/affiliate-application-tracker.json";
const HQ_HANDOFF_REL = "docs/BuckParts-HQ-HANDOFF.md";

const FILTER_ID = "f58a2c03-0f51-4b61-953a-5daf0abf2874";
const ROW_ID = "d4cbad0c-4bab-4854-89bf-59e6d6492c6b";
const BROWSER_TRUTH_CHECKED_AT = "2026-05-20T20:00:00.000Z";

const OPERATOR_LINKSYNERGY =
  "https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539508551730292149506115&type=2&murl=https%3a%2f%2fwww.waterdropfilter.com%2fproducts%2fwaterdrop-replacement-for-samsung-da29-00020b-fridge-water-filter%3fvariant%3d33108474495058";

function countRegex(haystack: string, pattern: RegExp): number {
  return (haystack.match(pattern) ?? []).length;
}

describe("waterdrop DA29-00020B proof slice v1", () => {
  it("evidence records production insert and runtime proof with LIVE CTA status", () => {
    const doc = JSON.parse(readFileSync(path.join(REPO_ROOT, EVIDENCE_REL), "utf8")) as Record<
      string,
      unknown
    >;

    assert.equal(doc.read_only, true);
    assert.equal(doc.data_mutation, false);
    assert.equal(doc.mutation_ready, false);
    assert.equal(doc.waterdrop_live_cta_status, "LIVE");
    assert.equal(doc.insert_outcome, "COMMITTED_VERIFIED_READ_ONLY");
    assert.equal(doc.filter_id, FILTER_ID);

    const prod = doc.production_insert_outcome as Record<string, unknown>;
    const row = prod.inserted_row as Record<string, unknown>;
    assert.equal(row.id, ROW_ID);
    assert.equal(row.filter_id, FILTER_ID);
    assert.equal(row.retailer_key, "waterdrop");
    assert.equal(row.browser_truth_classification, "direct_buyable");
    assert.equal(row.browser_truth_buyable_subtype, "COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE");

    const committed = doc.committed_live_row as Record<string, unknown>;
    assert.equal(committed.link_id, ROW_ID);

    const runtime = doc.runtime_proof as Record<string, unknown>;
    const filterPage = runtime.filter_page as Record<string, unknown>;
    assert.equal(filterPage.http_status, 200);
    const rendered = filterPage.rendered_html_contains as string[];
    assert.ok(rendered.includes("Waterdrop"));
    assert.ok(rendered.includes(ROW_ID));
    assert.ok(rendered.some((s) => s.includes(`/go/${ROW_ID}`)));

    const go = runtime.go_redirect as Record<string, unknown>;
    assert.equal(go.http_status, 302);
    assert.equal(go.linksynergy_head_non_blocking, true);

    const basis = doc.mutation_ready_basis as Record<string, unknown>;
    assert.equal(basis.insert_plan_status, "EXECUTED_MANUAL");
    assert.equal(basis.automation_mutation_authority, false);
  });

  it("evidence retains owner-browser proof and pre-insert precheck snapshot", () => {
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

  it("insert plan marks executed row and warns against duplicate re-run", () => {
    const sql = readFileSync(path.join(REPO_ROOT, INSERT_PLAN_REL), "utf8");
    assert.match(sql, /EXECUTED MANUALLY/i);
    assert.match(sql, /DO NOT RE-RUN INSERT/i);
    assert.match(sql, new RegExp(ROW_ID));
    assert.match(sql, /Precheck D/i);
    assert.match(sql, /Precheck E/i);
    assert.equal(countRegex(sql, /insert into public\.retailer_links/gi), 1);
    assert.equal(countRegex(sql, /\bupdate\b/gi), 0);
    assert.equal(countRegex(sql, /\bdelete\b/gi), 0);
  });

  it("Command Center lane reports LIVE Waterdrop CTA with production row id", () => {
    const lane = buildCustomerLanguageAndWaterdropResearchLaneV1({
      rootDir: REPO_ROOT,
      fileExists: (p) => {
        try {
          readFileSync(p);
          return true;
        } catch {
          return false;
        }
      },
    });
    assert.equal(lane.waterdrop_live_cta_status, "LIVE");
    assert.equal(lane.waterdrop_production_row_id, ROW_ID);
    assert.equal(lane.waterdrop_evidence_path, EVIDENCE_REL);
    assert.equal(lane.mutation_authority, false);
    assert.ok(lane.first_verified_waterdrop_non_amazon_dtc_slice_note?.includes("proof slice"));
  });

  it("HQ handoff references Waterdrop production row id and LIVE status", () => {
    const hq = readFileSync(path.join(REPO_ROOT, HQ_HANDOFF_REL), "utf8");
    assert.match(hq, new RegExp(ROW_ID));
    assert.match(hq, /waterdrop_live_cta_status/);
    assert.match(hq, /Waterdrop live CTA.*`LIVE`/s);
    assert.match(hq, /DO NOT RE-RUN INSERT|do not re-run INSERT/i);
    assert.match(hq, /no broad Waterdrop rollout|NOT authorized/i);
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
