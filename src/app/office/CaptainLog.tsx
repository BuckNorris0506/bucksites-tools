"use client";

import { useEffect, useState } from "react";

import {
  CAPTAIN_LOG_POLL_INTERVAL_MS,
  CAPTAIN_LOG_WINDOWS,
  DEFAULT_CAPTAIN_WINDOW,
  founderDecisionBody,
  startCaptainLogPoll,
  type CaptainLogPayload,
  type CaptainNeeded,
  type CaptainWindow,
} from "@/app/office/captain-log";

const WINDOW_LABELS: Record<CaptainWindow, string> = {
  last_hour: "Last hour",
  last_5_hours: "Last 5 hours",
  today: "Today",
};

export function CaptainLog() {
  const [windowId, setWindowId] = useState<CaptainWindow>(DEFAULT_CAPTAIN_WINDOW);
  const [log, setLog] = useState<CaptainLogPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return startCaptainLogPoll({
      intervalMs: CAPTAIN_LOG_POLL_INTERVAL_MS,
      load: async () => {
        const response = await fetch(`/office/api/captain-log?window=${windowId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("captain log unavailable");
        }
        return (await response.json()) as CaptainLogPayload;
      },
      onView: (view) => {
        setLog(view.log);
        setError(view.error);
      },
    });
  }, [windowId]);

  const needed = log?.founder_needed ?? [];

  async function recordDecision(item: CaptainNeeded, choice: "APPROVE" | "DECLINE") {
    const body = founderDecisionBody(item, choice);
    if (!body) return;
    const response = await fetch("/office/api/captain-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) return;
    const refresh = await fetch(`/office/api/captain-log?window=${windowId}`, {
      cache: "no-store",
    });
    if (!refresh.ok) return;
    setLog((await refresh.json()) as CaptainLogPayload);
    setError(null);
  }

  return (
    <section className="jo-captain" aria-label="Captain's log">
      <h2>CAPTAIN&apos;S LOG</h2>
      <nav className="jo-scopes jo-captain-windows" aria-label="Captain's log window">
        {CAPTAIN_LOG_WINDOWS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={item === windowId}
            onClick={() => setWindowId(item)}
          >
            {WINDOW_LABELS[item]}
          </button>
        ))}
      </nav>

      <h3 className={needed.length > 0 ? "jo-captain-hot" : undefined}>Founder needed</h3>
      <ul>
        {needed.length === 0 ? (
          <li>None.</li>
        ) : (
          needed.map((item) => (
            <li key={`${item.business}:${item.text}`} className="jo-captain-hot">
              <strong>{item.business}:</strong> {item.text}
              {item.post_text ? (
                <div>
                  <p>
                    {item.channel ? `${item.channel} ` : ""}
                    {item.account ?? ""}
                  </p>
                  <p>Post: {item.post_text}</p>
                  <p>
                    State: {item.approval_state ?? "UNKNOWN"} / publication{" "}
                    {item.publication_state ?? "UNKNOWN"}
                  </p>
                  <p>What needs you: {item.choices ?? "Approve or decline"}.</p>
                  {founderDecisionBody(item, "APPROVE") ? (
                    <div className="jo-decisions">
                      <button
                        type="button"
                        className="jo-decision jo-decision-approve"
                        onClick={() => void recordDecision(item, "APPROVE")}
                      >
                        APPROVE
                      </button>
                      <button
                        type="button"
                        className="jo-decision jo-decision-decline"
                        onClick={() => void recordDecision(item, "DECLINE")}
                      >
                        DECLINE
                      </button>
                    </div>
                  ) : null}
                  <p>Why: {item.why}</p>
                  <p>If approved: {item.if_approved}</p>
                  <p>If declined: {item.if_declined}</p>
                  <p>{item.handler_note}</p>
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>

      <h3>Not waiting on you</h3>
      <ul>
        {(log?.deferred ?? []).length === 0 ? (
          <li>None.</li>
        ) : (
          (log?.deferred ?? []).map((item) => (
            <li key={`deferred:${item.business}:${item.text}`}>
              <strong>{item.business}:</strong> {item.text} No immediate founder action.
              The workflow is not blocked on you.
            </li>
          ))
        )}
      </ul>

      <h3>Summary</h3>
      {log ? (
        log.summary.map((block) => (
          <div key={block.business || "none"}>
            {block.business ? (
              <p className="jo-captain-business">
                <strong>{block.business}</strong>
              </p>
            ) : null}
            <ul>
              {block.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ))
      ) : (
        <ul>
          <li>{error ? "Log unavailable." : "Loading."}</li>
        </ul>
      )}

      <h3>Timeline</h3>
      {log && log.entries.length > 0 ? (
        <ul className="jo-captain-timeline">
          {log.entries.map((entry) => (
            <li key={`${entry.display_time}:${entry.business}:${entry.bullets.map((bullet) => bullet.text).join("|")}`}>
              <span className="jo-captain-time">
                {entry.display_time} — {entry.business}
              </span>
              <ul>
                {entry.bullets.map((bullet) => (
                  <li key={`${bullet.label}:${bullet.text}`}>
                    <strong>{bullet.label}:</strong> {bullet.text}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <ul>
          <li>{log ? "No recorded work in this window." : error ? "Log unavailable." : "Loading."}</li>
        </ul>
      )}
      {error && log ? <p className="jo-captain-error">Log stale.</p> : null}
    </section>
  );
}
