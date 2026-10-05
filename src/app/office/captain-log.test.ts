import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CAPTAIN_LOG_POLL_INTERVAL_MS,
  DEFAULT_CAPTAIN_WINDOW,
  captainVisibleLines,
  founderDecisionBody,
  reduceCaptainLogPoll,
  startCaptainLogPoll,
  type CaptainLogPayload,
} from "./captain-log";

const sample: CaptainLogPayload = {
  window: "last_5_hours",
  title: "CAPTAIN'S LOG — LAST 5 HOURS",
  founder_needed: [],
  summary: [
    {
      business: "BuckParts",
      lines: ["Collected 1 fresh Search Console observation."],
    },
  ],
  entries: [
    {
      display_time: "8:03 PM",
      business: "BuckParts",
      bullets: [
        {
          label: "Result",
          text: "Search Console measurement collected: 427 impressions, 0 clicks.",
        },
      ],
    },
  ],
};

test("captain log defaults to the last five hours", () => {
  assert.equal(DEFAULT_CAPTAIN_WINDOW, "last_5_hours");
  assert.equal(CAPTAIN_LOG_POLL_INTERVAL_MS, 20000);
  assert.equal(CAPTAIN_LOG_POLL_INTERVAL_MS === 3000, false);
});

test("visible lines show the selected window and hide technical ids", () => {
  const lines = captainVisibleLines(sample).join("\n");
  assert.match(lines, /LAST 5 HOURS/);
  assert.match(lines, /8:03 PM — BuckParts/);
  assert.match(lines, /None\./);
  assert.equal(lines.includes("dec_det_"), false);
  assert.equal(lines.includes("gsl_"), false);
  assert.equal(lines.includes("/Users/"), false);
});

test("a failed refresh keeps the last log", () => {
  const next = reduceCaptainLogPoll(
    { log: sample, error: null },
    { ok: false, error: "captain log unavailable" },
  );
  assert.equal(next.log, sample);
  assert.equal(next.error, "captain log unavailable");
});

test("the poll updates on an interval without a full page reload", async () => {
  const source = readFileSync(new URL("./CaptainLog.tsx", import.meta.url), "utf8");
  const pollSource = readFileSync(new URL("./captain-log.ts", import.meta.url), "utf8");
  assert.equal(source.includes("location.reload"), false);
  assert.equal(source.includes("window.location"), false);
  assert.match(source, /captain-log\?window=/);
  assert.equal(pollSource.includes("location.reload"), false);

  const delays: number[] = [];
  let loads = 0;
  let scheduled: (() => void) | null = null;
  const stop = startCaptainLogPoll({
    intervalMs: CAPTAIN_LOG_POLL_INTERVAL_MS,
    load: async () => {
      loads += 1;
      return sample;
    },
    onView: () => undefined,
    setIntervalFn: ((fn: () => void, delay: number) => {
      delays.push(delay);
      scheduled = fn;
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval,
    clearIntervalFn: (() => undefined) as typeof clearInterval,
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(loads, 1);
  scheduled?.();
  await new Promise((resolve) => setTimeout(resolve, 0));
  stop();
  assert.equal(delays[0], 20000);
  assert.equal(loads, 2);
});

test("operating state still polls every three seconds", () => {
  const source = readFileSync(new URL("./operating-state-poll.ts", import.meta.url), "utf8");
  assert.match(source, /OPERATING_STATE_POLL_INTERVAL_MS = 3000/);
});

test("founder decision body is absent unless the card is still awaiting", () => {
  assert.equal(founderDecisionBody({ business: "BuckParts", text: "x" }, "APPROVE"), null);
  const body = founderDecisionBody(
    {
      business: "BuckParts",
      text: "Approve or decline",
      execution_state: "AWAITING_FOUNDER_APPROVAL",
      approval_state: "REQUIRED",
      duplicate_key: "c289ea15d616bc96",
      post_text: "Exact post",
      post_digest: "ab".repeat(32),
    },
    "DECLINE",
  );
  assert.deepEqual(body, {
    choice: "DECLINE",
    duplicate_key: "c289ea15d616bc96",
    post_digest: "ab".repeat(32),
  });
});

test("captain log render does not post a founder decision", () => {
  const source = readFileSync(new URL("./CaptainLog.tsx", import.meta.url), "utf8");
  assert.match(source, /onClick=\{\(\) => void recordDecision\(item, "APPROVE"\)\}/);
  assert.match(source, /onClick=\{\(\) => void recordDecision\(item, "DECLINE"\)\}/);
  assert.match(source, /className="jo-decision jo-decision-approve"/);
  assert.match(source, /className="jo-decision jo-decision-decline"/);
  assert.match(source, />\s*APPROVE\s*</);
  assert.match(source, />\s*DECLINE\s*</);
  assert.equal(source.includes("useEffect(() => {\n    void recordDecision"), false);
  const route = readFileSync(new URL("./api/captain-log/route.ts", import.meta.url), "utf8");
  const getFn = route.split("export async function POST")[0];
  assert.equal(getFn.includes("decide"), false);
});
