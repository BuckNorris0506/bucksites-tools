import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { buildBuckpartsCommandCenterReport } from "../report-buckparts-command-center";
import {
  affiliateTrackerPrimaryCommandPending,
  resolveCommandCenterNextBestActionV1,
} from "./buckparts-command-center-next-best-action-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));

describe("resolveCommandCenterNextBestActionV1", () => {
  it("does not emit stale non-Amazon approval NBA when Waterdrop live proof slice exists", () => {
    const result = resolveCommandCenterNextBestActionV1({
      preferAmazonFirstConversion: false,
      affiliateApprovalPending: true,
      nonAmazonApproved: false,
      waterdropLiveProofSlice: true,
      waterdropProductionRowId: "d4cbad0c-4bab-4854-89bf-59e6d6492c6b",
      pendingNetworkOrPrograms: ["IN_REVIEW:2", "SUBMITTED:1"],
      topMoneyQueue: [
        {
          exhausted: false,
          candidate_count: 4,
          recommended_action: "Start with retailer_links rows on domain www.repairclinic.com.",
        },
        { exhausted: true, candidate_count: 0, recommended_action: "Frigidaire done" },
        { exhausted: true, candidate_count: 0, recommended_action: "FlexOffers done" },
      ],
      amazonFirstTokenHint: "TOK1",
      amazonUnknownEvidenceDeferredCount: 0,
      amazonDeferredUnknownTopTokens: "",
    });

    assert.equal(
      /until at least one non-Amazon network lane reaches APPROVED/i.test(result.next_best_action),
      false,
    );
    assert.match(result.next_best_action, /Monitor Waterdrop DA29-00020B live proof slice only/i);
    assert.match(result.next_best_action, /repairclinic\.com/i);
    assert.match(result.why_this_action, /Waterdrop DA29-00020B proof slice is LIVE/i);
    assert.match(result.why_this_action, /no broad Waterdrop rollout/i);
    assert.match(result.why_this_action, /Other affiliate program approvals remain pending/i);
    assert.match(result.why_this_action, /NOT_CONNECTED/i);
  });

  it("does not emit stale NBA when tracker has non-Amazon APPROVED but other programs pending", () => {
    const result = resolveCommandCenterNextBestActionV1({
      preferAmazonFirstConversion: false,
      affiliateApprovalPending: true,
      nonAmazonApproved: true,
      waterdropLiveProofSlice: false,
      waterdropProductionRowId: null,
      pendingNetworkOrPrograms: ["IN_REVIEW:2"],
      topMoneyQueue: [
        {
          exhausted: false,
          candidate_count: 4,
          recommended_action: "Start with retailer_links rows on domain www.repairclinic.com.",
        },
        { exhausted: true, candidate_count: 0, recommended_action: "x" },
        { exhausted: true, candidate_count: 0, recommended_action: "y" },
      ],
      amazonFirstTokenHint: "",
      amazonUnknownEvidenceDeferredCount: 0,
      amazonDeferredUnknownTopTokens: "",
    });

    assert.equal(
      /until at least one non-Amazon network lane reaches APPROVED/i.test(result.next_best_action),
      false,
    );
    assert.match(result.next_best_action, /repairclinic\.com/i);
    assert.match(result.why_this_action, /Other affiliate program approvals remain pending/i);
  });

  it("still emits stale NBA when pending affiliates and no non-Amazon approval or live slice", () => {
    const result = resolveCommandCenterNextBestActionV1({
      preferAmazonFirstConversion: false,
      affiliateApprovalPending: true,
      nonAmazonApproved: false,
      waterdropLiveProofSlice: false,
      waterdropProductionRowId: null,
      pendingNetworkOrPrograms: ["DRAFTING:1"],
      topMoneyQueue: [
        { exhausted: false, candidate_count: 1, recommended_action: "OEM cohort action" },
        { exhausted: true, candidate_count: 0, recommended_action: "x" },
        { exhausted: true, candidate_count: 0, recommended_action: "y" },
      ],
      amazonFirstTokenHint: "",
      amazonUnknownEvidenceDeferredCount: 0,
      amazonDeferredUnknownTopTokens: "",
    });

    assert.match(result.next_best_action, /until at least one non-Amazon network lane reaches APPROVED/i);
  });
});

describe("affiliateTrackerPrimaryCommandPending", () => {
  it("is false when Waterdrop live proof slice is recorded", () => {
    assert.equal(
      affiliateTrackerPrimaryCommandPending({
        affiliateApprovalPending: true,
        nonAmazonApproved: false,
        waterdropLiveProofSlice: true,
      }),
      false,
    );
  });
});

function minimalCommandCenterProviders() {
  return {
    commandSurface: async () =>
      ({
        system_health: { status: "WARNING", reasons: ["warning"] },
        recommended_next_step: "Resolve warning-level command-surface issues before expanding.",
        trend: { overall_trend: "UNKNOWN" },
        known_unknowns: [],
      }) as never,
    affiliateTracker: () =>
      ({
        status_counts: {
          NOT_STARTED: 0,
          DRAFTING: 1,
          SUBMITTED: 1,
          IN_REVIEW: 2,
          APPROVED: 3,
          REJECTED: 0,
          REAPPLY_REQUIRED: 0,
          PAUSED_OR_INACTIVE: 0,
        },
        records_approved: ["amazon-associates", "rakuten-waterdrop-filter", "other"],
        known_unknowns: [],
      }) as never,
    blockedLinkQueue: async () =>
      ({
        report_name: "buckparts_blocked_link_money_queue_v1",
        total_blocked_links: 5,
        top_blocked_states: [{ state: "BLOCKED_SEARCH_OR_DISCOVERY", count: 5 }],
        top_blocked_retailer_keys: [{ retailer_key: "oem-catalog", blocked_count: 5, inferred_importance_count: 5 }],
        recommended_first_action: "Replace search/discovery URLs with direct PDP URLs for highest-volume retailer keys.",
        known_unknowns: [],
      }) as never,
    oemNextMoneyCohort: async () =>
      ({
        report_name: "buckparts_oem_catalog_next_money_cohort_v1",
        total_remaining_rows: 4,
        recommended_next_cohort: "Start with retailer_links rows on domain www.repairclinic.com.",
        known_unknowns: [],
      }) as never,
    frigidaireDeadOem: async () =>
      ({
        all_resolved: true,
        targets: [{ found: true }],
        recommended_next_action: "Use resolved link IDs.",
        known_unknowns: [],
      }) as never,
    frigidaireNextCandidates: async () =>
      ({
        report_name: "buckparts_frigidaire_next_monetizable_candidates_v1",
        runtime_status: "OK",
        candidates: [{ filter_slug: "foo" }],
        recommended_next_action: "Start with candidates already containing direct_buyable non-OEM links.",
        known_unknowns: [],
      }) as never,
    amazonFirstBlockedQueue: async () =>
      ({
        report_name: "buckparts_amazon_first_blocked_conversion_queue_v1",
        generated_at: "2026-05-01T00:00:00.000Z",
        read_only: true,
        data_mutation: false,
        selection_table: "retailer_links",
        total_pool_rows: 0,
        already_live_noop_count: 0,
        needs_amazon_search_count: 0,
        unknown_evidence_deferred_count: 0,
        unknown_evidence_deferred: [],
        top_candidates: [],
        known_unknowns: [],
      }) as never,
  };
}

describe("buildBuckpartsCommandCenterReport next_best_action with Waterdrop LIVE evidence", () => {
  it("skips stale non-Amazon approval NBA while affiliate_readiness stays pending", async () => {
    const tracker = readFileSync(
      path.join(REPO_ROOT, "data/affiliate/affiliate-application-tracker.json"),
      "utf8",
    );
    const report = await buildBuckpartsCommandCenterReport({
      rootDir: REPO_ROOT,
      providers: minimalCommandCenterProviders(),
      fileExists: existsSync,
      readDir: () => [],
      readTextFile: (abs) => {
        if (abs.endsWith("affiliate-application-tracker.json")) return tracker;
        return readFileSync(abs, "utf8");
      },
    });

    const lang = report.command_center_v2.customer_language_and_waterdrop_research_lane_v1;
    assert.equal(lang.waterdrop_live_cta_status, "LIVE");
    assert.equal(lang.mutation_authority, false);
    assert.equal(report.affiliate_readiness_summary.affiliate_approval_pending, true);
    assert.ok((report.affiliate_readiness_summary.pending_count ?? 0) > 0);
    assert.equal(
      /until at least one non-Amazon network lane reaches APPROVED/i.test(report.next_best_action),
      false,
    );
    assert.match(report.why_this_action, /Waterdrop DA29-00020B proof slice is LIVE/i);
  });
});
