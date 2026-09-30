"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  IgnoredOperatingPoll,
  OPERATING_STATE_POLL_INTERVAL_MS,
  reduceOperatingPoll,
  startOperatingPoll,
  type OperatingPollView,
  type OperatingStatus,
} from "@/app/office/operating-state-poll";

const MODES = ["GREEN", "YELLOW", "RED"] as const;

function flagLabel(value: boolean | undefined): string {
  if (value == null) return "UNKNOWN";
  return value ? "active" : "not active";
}

function formatElapsed(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = whole % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${rest}s`;
  return `${rest}s`;
}

async function readOperatingStatus(response: Response): Promise<OperatingStatus> {
  const body = (await response.json()) as OperatingStatus;
  if (!response.ok) {
    throw new Error(body.error || "operating state unavailable");
  }
  return body;
}

export function OperatingStateControl() {
  const [view, setView] = useState<OperatingPollView>({ status: null, error: null });
  const [pending, setPending] = useState<string | null>(null);
  const viewRef = useRef(view);
  const requestGen = useRef(0);
  viewRef.current = view;

  const apply = useCallback((next: OperatingPollView) => {
    viewRef.current = next;
    setView(next);
  }, []);

  useEffect(() => {
    const stop = startOperatingPoll({
      intervalMs: OPERATING_STATE_POLL_INTERVAL_MS,
      load: async () => {
        const mine = ++requestGen.current;
        const response = await fetch("/office/api/operating-state", { cache: "no-store" });
        const status = await readOperatingStatus(response);
        if (mine !== requestGen.current) throw new IgnoredOperatingPoll();
        return status;
      },
      onView: apply,
    });
    return stop;
  }, [apply]);

  async function setMode(mode: (typeof MODES)[number]) {
    const mine = ++requestGen.current;
    setPending(mode);
    try {
      const response = await fetch("/office/api/operating-state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const status = await readOperatingStatus(response);
      if (mine !== requestGen.current) return;
      apply({ status, error: null });
    } catch (exc: unknown) {
      if (mine !== requestGen.current) return;
      apply(
        reduceOperatingPoll(viewRef.current, {
          ok: false,
          error: exc instanceof Error ? exc.message : "operating state rejected",
        }),
      );
    } finally {
      if (mine === requestGen.current) setPending(null);
    }
  }

  const status = view.status;
  const error = view.error;
  const mode = status?.mode ?? "UNKNOWN";
  const tone =
    mode === "GREEN" || mode === "YELLOW" || mode === "RED" ? mode.toLowerCase() : "unknown";

  return (
    <section className="jo-operating" aria-label="J operating state">
      <h2>J OPERATING STATE</h2>
      <div className="jo-operating-actions" role="group" aria-label="Set operating mode">
        {MODES.map((item) => (
          <button
            key={item}
            type="button"
            className={`jo-stoplight jo-stoplight-${item.toLowerCase()}`}
            aria-pressed={mode === item}
            disabled={pending !== null}
            onClick={() => setMode(item)}
          >
            <span className="jo-stoplight-lamp" aria-hidden="true" />
            <span>{pending === item ? "…" : item}</span>
          </button>
        ))}
      </div>
      <dl>
        <dt>Current mode</dt>
        <dd>
          <span className={`jo-operating-pill jo-operating-pill-${tone}`}>
            <span className="jo-operating-lamp" aria-hidden="true" />
            <span>{mode}</span>
          </span>
        </dd>
        <dt>Session elapsed</dt>
        <dd>{mode === "GREEN" ? formatElapsed(status?.session_elapsed_seconds) : "—"}</dd>
        <dt>Session runner</dt>
        <dd>{flagLabel(status?.session_runner_alive)}</dd>
        <dt>Heartbeat</dt>
        <dd>{flagLabel(status?.heartbeat_active)}</dd>
        <dt>Activity</dt>
        <dd>{status?.activity ?? "UNKNOWN"}</dd>
        <dt>Cadence</dt>
        <dd>{typeof status?.cadence_seconds === "number" ? `${status.cadence_seconds}s` : "UNKNOWN"}</dd>
        <dt>Last transition</dt>
        <dd>{status?.changed_at ?? "not set"}</dd>
      </dl>
      {error ? (
        <p className="jo-operating-error" role="status">
          {status ? "Status stale. " : ""}
          {error}
        </p>
      ) : null}
    </section>
  );
}
