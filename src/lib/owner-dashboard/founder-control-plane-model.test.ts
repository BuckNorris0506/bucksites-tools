import assert from "node:assert/strict";
import test from "node:test";

import { buildFounderControlPlaneModel } from "./founder-control-plane-model";

const minimalReport = {
  next_best_action: "Ship the next safe operator step.",
  known_unknowns: ["deploy commit sync UNKNOWN unless live monitor proves it."],
  execution_guidance: {
    next_move_mode: "READ_ONLY",
    mutating_blocked: false,
    mutating_block_reasons: [] as string[],
  },
  command_center_v2: {
    next_owner_action: "Jared: review affiliate programs.",
    amazon_rescue: {
      next_agent_action: "Agent: run read-only queue review.",
      human_browser_required_tokens: ["ABC123"],
      status: "ATTENTION",
    },
    unknown_or_human_review: { status: "OK", blocker: null },
    deploy_live_site_status: {
      status: "OK",
      live_site_monitor: { runtime_status: "OK", routes: [{ ok: true }, { ok: true }, { ok: false }] },
    },
  },
};

test("buildFounderControlPlaneModel includes goal line and six category cards", () => {
  const m = buildFounderControlPlaneModel(process.cwd(), minimalReport);
  assert.match(m.goal_line, /Command Center data visible here/);
  assert.equal(m.cards.length, 6);
  const cats = m.cards.map((c) => c.category);
  assert.ok(cats.includes("AUTOMATIC"));
  assert.ok(cats.includes("HUMAN_BROWSER_REQUIRED"));
  assert.ok(m.next_best_action.includes("Ship the next"));
  assert.ok(m.simplification_target.includes("operator-proof"));
});

test("human browser card reflects token list", () => {
  const m = buildFounderControlPlaneModel(process.cwd(), minimalReport);
  const h = m.cards.find((c) => c.category === "HUMAN_BROWSER_REQUIRED");
  assert.ok(h);
  assert.ok(h!.lines.some((l) => l.includes("ABC123")));
});
