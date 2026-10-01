export const CAPTAIN_LOG_POLL_INTERVAL_MS = 20000;

export const CAPTAIN_LOG_WINDOWS = ["last_hour", "last_5_hours", "today"] as const;

export type CaptainWindow = (typeof CAPTAIN_LOG_WINDOWS)[number];

export const DEFAULT_CAPTAIN_WINDOW: CaptainWindow = "last_5_hours";

export type CaptainBullet = {
  label: string;
  text: string;
};

export type CaptainEntry = {
  display_time: string;
  business: string;
  bullets: CaptainBullet[];
};

export type CaptainSummary = {
  business: string;
  lines: string[];
};

export type CaptainNeeded = {
  business: string;
  text: string;
};

export type CaptainLogPayload = {
  window: CaptainWindow;
  title: string;
  founder_needed: CaptainNeeded[];
  summary: CaptainSummary[];
  entries: CaptainEntry[];
};

export type CaptainLogView = {
  log: CaptainLogPayload | null;
  error: string | null;
};

export class IgnoredCaptainLogPoll extends Error {
  constructor() {
    super("captain log poll ignored");
    this.name = "IgnoredCaptainLogPoll";
  }
}

export function reduceCaptainLogPoll(
  previous: CaptainLogView,
  next: { ok: true; log: CaptainLogPayload } | { ok: false; error: string },
): CaptainLogView {
  if (next.ok) {
    return { log: next.log, error: null };
  }
  return { log: previous.log, error: next.error };
}

export function startCaptainLogPoll(options: {
  intervalMs: number;
  load: () => Promise<CaptainLogPayload>;
  onView: (view: CaptainLogView) => void;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
}): () => void {
  let view: CaptainLogView = { log: null, error: null };
  let stopped = false;
  let inFlight = false;

  async function tick() {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      const log = await options.load();
      if (stopped) return;
      view = reduceCaptainLogPoll(view, { ok: true, log });
      options.onView(view);
    } catch (exc) {
      if (stopped || exc instanceof IgnoredCaptainLogPoll) return;
      const error = exc instanceof Error ? exc.message : "captain log unavailable";
      view = reduceCaptainLogPoll(view, { ok: false, error });
      options.onView(view);
    } finally {
      inFlight = false;
    }
  }

  void tick();
  const schedule = options.setIntervalFn ?? setInterval;
  const cancel = options.clearIntervalFn ?? clearInterval;
  const timer = schedule(() => {
    void tick();
  }, options.intervalMs);

  return () => {
    stopped = true;
    cancel(timer);
  };
}

export function captainVisibleLines(log: CaptainLogPayload): string[] {
  const lines = [log.title, "FOUNDER NEEDED"];
  if (log.founder_needed.length === 0) {
    lines.push("None.");
  } else {
    for (const item of log.founder_needed) {
      lines.push(`${item.business}: ${item.text}`);
    }
  }
  lines.push("SUMMARY");
  for (const block of log.summary) {
    if (block.business) lines.push(block.business);
    lines.push(...block.lines);
  }
  lines.push("TIMELINE");
  for (const entry of log.entries) {
    lines.push(`${entry.display_time} — ${entry.business}`);
    for (const bullet of entry.bullets) {
      lines.push(`${bullet.label}: ${bullet.text}`);
    }
  }
  return lines;
}
