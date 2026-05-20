import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { loadBuckpartsFridgeFilterIndexFromRepo } from "./buckparts-fridge-filter-index-v1";
import { parseWaterdropHtmlSnippet } from "./waterdrop-linksynergy-parse-v1";
import {
  buildWaterdropProofSliceCandidate,
  sortWaterdropProofSliceCandidates,
} from "./waterdrop-proof-slice-candidate-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.."));

const DA29_AFFILIATE =
  "https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539508551730292149506115&type=2&murl=https%3a%2f%2fwww.waterdropfilter.com%2fproducts%2fwaterdrop-replacement-for-samsung-da29-00020b-fridge-water-filter%3fvariant%3d33108474495058";

describe("waterdrop-proof-slice-candidate-v1", () => {
  it("matches DA29 fixture to da29-00020b and excludes live proof slice from recommendation", () => {
    const index = loadBuckpartsFridgeFilterIndexFromRepo(REPO_ROOT);
    const parsed = parseWaterdropHtmlSnippet(
      `<a href="${DA29_AFFILIATE}">Waterdrop WDP-F27 Replacement for Samsung DA29-00020B</a>`,
    )[0]!;
    const row = buildWaterdropProofSliceCandidate({
      entry_id: "da29-fixture",
      parsed,
      index,
      production_snapshot: {
        gated_buyable_count: 2,
        has_amazon_direct_buyable: true,
        has_waterdrop_row: true,
        has_repairclinic_search_only: true,
      },
    });
    assert.equal(row.matched_slug, "da29-00020b");
    assert.equal(row.match_confidence, "EXACT_OEM_PART_NUMBER");
    assert.equal(row.excluded_from_recommendation, true);
    assert.equal(row.exclusion_reason, "already_live_proof_slice");
    assert.equal(row.recommended_for_owner_browser_proof, false);
  });

  it("ranks exact OEM match above weaker rows in sort", () => {
    const index = loadBuckpartsFridgeFilterIndexFromRepo(REPO_ROOT);
    const good = buildWaterdropProofSliceCandidate({
      entry_id: "good",
      parsed: {
        affiliate_url: DA29_AFFILIATE.replace("da29-00020b", "da29-00003g"),
        destination_pdp_url:
          "https://www.waterdropfilter.com/products/waterdrop-replacement-for-samsung-da29-00003g-fridge-water-filter?variant=1",
        visible_title: "Waterdrop Replacement for Samsung DA29-00003G",
        image_url: null,
        image_alt: null,
        inferred_token_candidates: ["DA29-00003G"],
        parse_notes: [],
      },
      index,
      production_snapshot: {
        gated_buyable_count: 0,
        has_amazon_direct_buyable: true,
        has_waterdrop_row: false,
        has_repairclinic_search_only: true,
      },
    });
    const sorted = sortWaterdropProofSliceCandidates([good]);
    assert.equal(sorted[0]!.matched_slug, "da29-00003g");
    assert.equal(sorted[0]!.recommended_for_owner_browser_proof, true);
    assert.equal(sorted[0]!.pdp_specificity, "VARIANT_PDP");
  });
});
