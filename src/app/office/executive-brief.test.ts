import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ExecutiveBrief } from "./ExecutiveBrief";

function render(value: Record<string, unknown>) {
  return renderToStaticMarkup(React.createElement(AppRouterContext.Provider, {
    value: { refresh() {}, push() {}, replace() {}, back() {}, forward() {}, prefetch: async () => {} },
  }, React.createElement(ExecutiveBrief, { value })));
}
const base = { state: "WAITING", founder_status: "Nothing needs you", headline: "Distribution remains held.",
  detail: "Compatibility evidence is insufficient.", stewardship: "J owns the hold.", handovers: [],
  owns: { commitment: "Check candidate classes.", trigger: "new evidence" },
  continuity: { continue: "Preserve the hold.", runtime: "This Mac must remain awake." },
  outcome_card: { earnings: .66, shipped_revenue: 21.84, shipped_items: 1, observed_at: "2026-10-03" },
  trace: [{ label: "REFUSED", title: "Kept the baseline unchanged." }], updated_at: "2026-10-06T13:00:00Z" };

test("quiet founder brief has continuity and real outcome, without empty handover", () => {
  const html = render(base);
  assert.match(html, /Nothing needs you/);
  assert.match(html, /\$0.66/);
  assert.match(html, /This Mac must remain awake/);
  assert.doesNotMatch(html, /Founder handover/);
  assert.match(html, /REFUSED/);
});
test("date-only outcome stays October 3 and stale situation is explicit", () => {
  const html = render({ ...base, situation_observed_at: "2026-10-01", situation_stale: true });
  assert.match(html, /Observed 2026-10-03/);
  assert.match(html, /evidence is stale/);
  assert.doesNotMatch(html, /Oct 2/);
});
test("real handover precedes normal developments; rendering records no decision", () => {
  const html = render({ ...base, founder_status: "You are needed", handovers: [{ cause: "APPROVAL", ask: "Approve bounded action", why: "Founder authority required", if_nothing: "Stays held", after: "Record decision only" }] });
  assert.ok(html.indexOf("Approve bounded action") < html.indexOf("LATEST VERIFIED BUSINESS OUTCOME"));
  assert.match(html, /Stays held/);
  assert.match(html, /Record decision only/);
});

test("four executive cards form the primary operating picture and do not fabricate absence", () => {
  const html = render(base);
  for (const heading of ["LATEST VERIFIED BUSINESS OUTCOME", "CURRENT BLOCKER", "J OWNS NEXT", "CURRENT AUTONOMY"]) assert.ok(html.includes(heading));
  assert.equal((html.match(/class="jo-executive-card /g) ?? []).length, 4);
  assert.doesNotMatch(html, /Recorded reviews|Reviews needing you|Recorded paid model calls|Cash spent/);
  assert.doesNotMatch(html, /SINCE YOU LEFT/);
});
