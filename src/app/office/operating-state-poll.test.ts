import assert from "node:assert/strict";
import test from "node:test";

import {
  OPERATING_STATE_POLL_INTERVAL_MS,
  reduceOperatingPoll,
  startOperatingPoll,
  type OperatingStatus,
} from "@/app/office/operating-state-poll";

const yellow: OperatingStatus = {
  mode: "YELLOW",
  changed_at: "2026-09-30T20:15:19+00:00",
  session_elapsed_seconds: null,
  heartbeat_active: false,
  session_runner_alive: false,
  activity: "paused",
  cadence_seconds: 60,
};

test("poll interval is 3000 ms", () => {
  assert.equal(OPERATING_STATE_POLL_INTERVAL_MS, 3000);
});

test("a failed poll keeps the last status", () => {
  const next = reduceOperatingPoll(
    { status: yellow, error: null },
    { ok: false, error: "operating state unavailable" },
  );
  assert.equal(next.status, yellow);
  assert.equal(next.error, "operating state unavailable");
});

test("a successful poll replaces status and clears the error", () => {
  const green = { ...yellow, mode: "GREEN", activity: "idle", session_elapsed_seconds: 3 };
  const next = reduceOperatingPoll(
    { status: yellow, error: "operating state unavailable" },
    { ok: true, status: green },
  );
  assert.equal(next.status?.mode, "GREEN");
  assert.equal(next.status?.session_elapsed_seconds, 3);
  assert.equal(next.error, null);
});

test("polling updates in place and cleanup stops later ticks", async () => {
  const modes: Array<string | undefined> = [];
  const jobs = new Map<number, { fn: () => void; cleared: boolean }>();
  let id = 0;
  let calls = 0;
  const stop = startOperatingPoll({
    intervalMs: OPERATING_STATE_POLL_INTERVAL_MS,
    load: async () => {
      calls += 1;
      if (calls === 2) throw new Error("operating state unavailable");
      return calls === 1 ? yellow : { ...yellow, mode: "GREEN", activity: "idle" };
    },
    onView: (view) => {
      modes.push(view.status?.mode);
      assert.equal(view.status?.cadence_seconds, 60);
    },
    setIntervalFn: ((fn: () => void, ms?: number) => {
      assert.equal(ms, 3000);
      id += 1;
      jobs.set(id, { fn, cleared: false });
      return id;
    }) as typeof setInterval,
    clearIntervalFn: ((timer: number) => {
      const job = jobs.get(timer);
      if (job) job.cleared = true;
    }) as typeof clearInterval,
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(modes, ["YELLOW"]);

  const job = jobs.get(1);
  assert.ok(job);
  job.fn();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(modes, ["YELLOW", "YELLOW"]);

  job.fn();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(modes, ["YELLOW", "YELLOW", "GREEN"]);

  stop();
  assert.equal(job.cleared, true);
  const callsAfterStop = calls;
  job.fn();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls, callsAfterStop);
  assert.deepEqual(modes, ["YELLOW", "YELLOW", "GREEN"]);
});
