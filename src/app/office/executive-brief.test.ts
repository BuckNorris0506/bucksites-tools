import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ExecutiveBrief } from "./ExecutiveBrief";

function render(
  value: Record<string, unknown>,
  extra?: { operatingProgress?: string; runtime?: { status: Record<string, unknown> | null; error: string | null } },
) {
  return renderToStaticMarkup(
    React.createElement(
      AppRouterContext.Provider,
      {
        value: {
          refresh() {},
          push() {},
          replace() {},
          back() {},
          forward() {},
          prefetch: async () => {},
        },
      },
      React.createElement(ExecutiveBrief, {
        value,
        operatingProgress: extra?.operatingProgress,
        runtime: extra?.runtime,
      }),
    ),
  );
}
const base = {
  state: "WAITING",
  founder_status: "Nothing needs you",
  headline: "Distribution remains held.",
  detail: "Compatibility evidence is insufficient.",
  handovers: [],
  owns: { commitment: "Check candidate classes.", trigger: "new evidence" },
  next_card: { title: "Monitor and reassess", detail: "Await qualifying evidence." },
  outcome_card: { earnings: 0.66, shipped_revenue: 21.84, shipped_items: 1, observed_at: "2026-10-03" },
  blocker_card: { title: "Held", detail: "Evidence gap.", verified_at: "2026-10-06" },
  autonomy_card: { founder_required: "No", runtime_status: "ELIGIBLE", verified_at: "2026-10-06" },
  trace: [{ label: "REFUSED", title: "Kept the baseline unchanged.", why: "Safety." }],
  updated_at: "2026-10-06T13:00:00Z",
  situation_observed_at: "2026-10-06T12:00:00Z",
};

test("quiet cockpit is a big-idea panel, factory score, and three cards", () => {
  const html = render(base);
  assert.match(html, /Current big idea/);
  assert.match(html, /Distribution remains held/);
  assert.match(html, /Last move/);
  assert.match(html, /Refrigerator factory/);
  assert.match(html, /\$0\.66/);
  for (const heading of ["Latest verified business outcome", "Current blocker", "Autonomy / system"]) {
    assert.ok(html.includes(heading));
  }
  assert.equal((html.match(/class="jo-executive-card /g) ?? []).length, 3);
  assert.doesNotMatch(html, /SYSTEM \/ RECENT RESULT/);
  assert.doesNotMatch(html, /IF YOU LEAVE NOW/);
  assert.doesNotMatch(html, /J OWNS NEXT/);
  assert.match(html, /Kept the baseline unchanged/);
});

test("founder alert strip appears only with a handover", () => {
  const html = render({
    ...base,
    handovers: [
      {
        cause: "APPROVAL",
        ask: "Approve bounded action",
        why: "Founder authority required",
        if_nothing: "Stays held",
        after: "Record decision only",
      },
    ],
  });
  assert.match(html, /NEEDS JARED · 1/);
  assert.match(html, /WAITING ON YOU/);
  assert.doesNotMatch(html, />BLOCKED</);
  assert.match(html, /Approve bounded action/);
  assert.match(html, /View exact action/);
  assert.match(html, /Cause APPROVAL/);
  assert.doesNotMatch(html, /jo-handoff-hero/);
});

test("unresolved founder approval is BLOCKED with Founder Yes", () => {
  const html = render({
    ...base,
    founder_approval_unresolved: true,
    headline: "BuckParts recurring distribution",
    autonomy_card: { founder_required: "Yes", runtime_status: "ELIGIBLE" },
    handovers: [{ cause: "APPROVAL", ask: "Approve one prepared day at 10:30.", why: "No receipt", if_nothing: "Stays unscheduled", after: "New receipt" }],
    next_card: { title: "Approve the one-day distribution batch", detail: "Approve one prepared day at 10:30." },
  }, { operatingProgress: "BLOCKED" });
  assert.match(html, />BLOCKED</);
  assert.match(html, /Founder Yes/);
  assert.match(html, /Approve one prepared day at 10:30/);
  assert.doesNotMatch(html, /WAITING ON YOU/);
});

test("no unresolved approval cannot show BLOCKED with Founder No", () => {
  const html = render({
    ...base,
    autonomy_card: { founder_required: "No", runtime_status: "ELIGIBLE" },
    handovers: [],
  }, { operatingProgress: "BLOCKED", runtime: { status: { mode: "GREEN", heartbeat_active: false, activity: "idle" }, error: null } });
  assert.doesNotMatch(html, />BLOCKED</);
  assert.match(html, /Founder No/);
  assert.match(html, /WAITING FOR NEXT WAKE/);
});

test("discovery wave stage replaces the universe mismatch problem", () => {
  const html = render({
    ...base,
    factory_card: {
      valid: true,
      stage: "CONTINUE_ZERO_COST_SOURCE_LEAD_DISCOVERY",
      continuation: "Continue bounded official index/catalog discovery; no founder task",
      score: { TERMINAL_CLASSIFIED: 0, TOTAL_UNIVERSE: 4294, PERCENT_COMPLETE: 0, ACTIVE_RESEARCH: 0, HELD: 8 },
    },
  });
  assert.match(html, /CONTINUE ZERO COST SOURCE LEAD DISCOVERY/);
  assert.match(html, /no founder task/);
  assert.doesNotMatch(html, /does not match the authoritative universe/);
});

test("working now requires runtime heartbeat evidence", () => {
  const idle = render(base, {
    operatingProgress: "ACTIVE",
    runtime: { status: { mode: "GREEN", heartbeat_active: false, activity: "idle" }, error: null },
  });
  assert.doesNotMatch(idle, /WORKING NOW/);
  const working = render(base, {
    operatingProgress: "ACTIVE",
    runtime: { status: { mode: "GREEN", heartbeat_active: true, activity: "active" }, error: null },
  });
  assert.match(working, /WORKING NOW/);
});

test("factory render uses projected counts; unknown debit stays in collapsed detail", () => {
  const html = render({
    ...base,
    factory_card: {
      valid: true,
      objective: "Refrigerator Coverage Factory",
      continuation: "Reconcile the current source receipts.",
      stage: "BATCH_COMPLETE",
      verified_at: "2026-10-07T04:00:00Z",
      freshness: "FRESH",
      score: { TERMINAL_CLASSIFIED: 2, TOTAL_UNIVERSE: 7, PERCENT_COMPLETE: 28.5714, ACTIVE_RESEARCH: 1, HELD: 4 },
    },
    latest_event: {
      title: "Research independently validated",
      why: "Results remain held.",
      metered_usage: 1.17,
      promotional_debit: "UNKNOWN",
      freshness: "FRESH",
      state: "HELD",
      observed_at: "2026-10-07T04:00:00Z",
    },
    authority_card: { remaining_creates: 0, publication_allowed: false, paid_create_allowed: false },
  });
  assert.match(html, /2 <span>\/ 7<\/span>/);
  assert.match(html, /28\.57% complete/);
  assert.match(html, /Reconcile the current source receipts/);
  assert.doesNotMatch(html, /IF YOU LEAVE NOW/);
});

test("social rail keeps parent identity, projection order, and unknown metrics", () => {
  const html = render({
    ...base,
    headline: "Distribution remains held.",
    social_activity: {
      limited: true,
      reason: "No published or scheduled social posts are in local receipts.",
      engagement_authority: "NOT_GRANTED",
      rows: [
        {
          row_id: "ig",
          network: "Instagram",
          snippet: "Match the cartridge number before you buy.",
          lifecycle: "WITHHELD_NOT_SCHEDULED",
          scheduled_at: null,
          published_at: null,
          latest_event_at: "2026-10-08T14:39:59+00:00",
          latest_engagement: "UNKNOWN",
          metrics: { impressions: "UNKNOWN", likes: 0, comments: "UNKNOWN" },
          j_action: "NO_ACTION",
          j_status: "Withheld — not scheduled",
          freshness: "FRESH",
          evidence: "data/distribution_campaigns/first-proof/founder-schedule-approval-receipt.json",
        },
        {
          row_id: "x-1",
          network: "X",
          snippet: "Check the part number before you buy.",
          latest_event_at: "2026-10-05T13:07:21+00:00",
          latest_engagement: "UNKNOWN",
          metrics: { impressions: "UNKNOWN", likes: "UNKNOWN", comments: "UNKNOWN" },
          j_action: "AWAITING_AUTHORITY",
          j_status: "Approved — not published",
          freshness: "STALE",
          evidence: "data/distribution_receipts/x.json",
        },
      ],
    },
  });
  assert.match(html, /jo-social-rail/);
  assert.match(html, /Social activity/);
  assert.match(html, /data-row-id="ig"/);
  assert.match(html, /data-row-id="x-1"/);
  assert.ok(html.indexOf('data-row-id="ig"') < html.indexOf('data-row-id="x-1"'));
  assert.equal((html.match(/data-row-id="ig"/g) ?? []).length, 1);
  assert.match(html, /NO ACTION/);
  assert.match(html, /AWAITING AUTHORITY/);
  assert.match(html, /0 likes/);
  assert.match(html, /UNKNOWN impressions/);
  assert.match(html, /Current big idea/);
  assert.match(html, /Refrigerator factory/);
  assert.match(html, /Not scheduled/);
  assert.match(html, /Withheld — not scheduled/);
  assert.equal((html.match(/class="jo-executive-card /g) ?? []).length, 3);
  assert.doesNotMatch(html, /WORKING NOW/);
});

test("unknown factory fields are not rendered as fabricated zeros", () => {
  const html = render({ ...base, factory_card: { valid: false, problem: "Batch identity mismatch" } });
  assert.match(html, /UNKNOWN/);
  assert.match(html, /Batch identity mismatch/);
});
