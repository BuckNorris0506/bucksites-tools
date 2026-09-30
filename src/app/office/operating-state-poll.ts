export const OPERATING_STATE_POLL_INTERVAL_MS = 3000;

export type OperatingStatus = {
  mode?: string;
  changed_at?: string | null;
  session_elapsed_seconds?: number | null;
  heartbeat_active?: boolean;
  session_runner_alive?: boolean;
  activity?: string;
  cadence_seconds?: number;
  error?: string;
};

export type OperatingPollView = {
  status: OperatingStatus | null;
  error: string | null;
};

export class IgnoredOperatingPoll extends Error {
  constructor() {
    super("operating poll ignored");
    this.name = "IgnoredOperatingPoll";
  }
}

export function reduceOperatingPoll(
  previous: OperatingPollView,
  next: { ok: true; status: OperatingStatus } | { ok: false; error: string },
): OperatingPollView {
  if (next.ok) {
    return { status: next.status, error: null };
  }
  return { status: previous.status, error: next.error };
}

export function startOperatingPoll(options: {
  intervalMs: number;
  load: () => Promise<OperatingStatus>;
  onView: (view: OperatingPollView) => void;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
}): () => void {
  let view: OperatingPollView = { status: null, error: null };
  let stopped = false;
  let inFlight = false;

  async function tick() {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      const status = await options.load();
      if (stopped) return;
      view = reduceOperatingPoll(view, { ok: true, status });
      options.onView(view);
    } catch (exc) {
      if (stopped || exc instanceof IgnoredOperatingPoll) return;
      const error = exc instanceof Error ? exc.message : "operating state unavailable";
      view = reduceOperatingPoll(view, { ok: false, error });
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
