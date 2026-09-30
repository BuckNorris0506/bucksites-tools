"use client";

import { useCallback, useEffect, useState } from "react";

type OperatingStatus = {
  mode?: string;
  changed_at?: string | null;
  session_elapsed_seconds?: number | null;
  heartbeat_active?: boolean;
  activity?: string;
  error?: string;
};

const MODES = ["GREEN", "YELLOW", "RED"] as const;

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

export function OperatingStateControl() {
  const [status, setStatus] = useState<OperatingStatus | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/office/api/operating-state", { cache: "no-store" });
    const body = (await response.json()) as OperatingStatus;
    if (!response.ok) {
      throw new Error(body.error || "operating state unavailable");
    }
    setStatus(body);
  }, []);

  useEffect(() => {
    let cancelled = false;
    refresh().catch((exc: unknown) => {
      if (!cancelled) setError(exc instanceof Error ? exc.message : "operating state unavailable");
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function setMode(mode: (typeof MODES)[number]) {
    setPending(mode);
    setError(null);
    try {
      const response = await fetch("/office/api/operating-state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const body = (await response.json()) as OperatingStatus;
      if (!response.ok) {
        throw new Error(body.error || "operating state rejected");
      }
      setStatus(body);
    } catch (exc: unknown) {
      setError(exc instanceof Error ? exc.message : "operating state rejected");
    } finally {
      setPending(null);
    }
  }

  const mode = status?.mode ?? "UNKNOWN";
  const modeClass =
    mode === "GREEN"
      ? "jo-operating-green"
      : mode === "YELLOW"
        ? "jo-operating-yellow"
        : mode === "RED"
          ? "jo-operating-red"
          : "";

  return (
    <section className="jo-operating" aria-label="J operating state">
      <h2>J OPERATING STATE</h2>
      <div className="jo-operating-actions">
        {MODES.map((item) => (
          <button
            key={item}
            type="button"
            className={item === "GREEN" ? "jo-operating-green" : item === "YELLOW" ? "jo-operating-yellow" : "jo-operating-red"}
            aria-pressed={mode === item}
            disabled={pending !== null}
            onClick={() => setMode(item)}
          >
            {pending === item ? "…" : item}
          </button>
        ))}
      </div>
      <dl>
        <dt>Current mode</dt>
        <dd className={modeClass}>{mode}</dd>
        <dt>Session elapsed</dt>
        <dd>{mode === "GREEN" ? formatElapsed(status?.session_elapsed_seconds) : "—"}</dd>
        <dt>Heartbeat</dt>
        <dd>{status?.heartbeat_active ? "active" : "not active"}</dd>
        <dt>Activity</dt>
        <dd>{status?.activity ?? "UNKNOWN"}</dd>
        <dt>Last transition</dt>
        <dd>{status?.changed_at ?? "not set"}</dd>
      </dl>
      {error ? <p className="jo-operating-red">{error}</p> : null}
    </section>
  );
}
