"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { founderDecisionBody, type CaptainNeeded } from "./captain-log";
import type { OperatingPollView } from "@/app/office/operating-state-poll";
import type { OperatingStatus } from "@/app/office/operating-state-poll";

type Row = Record<string, unknown>;
const row = (value: unknown): Row => (value && typeof value === "object" ? (value as Row) : {});
const rows = (value: unknown): Row[] => (Array.isArray(value) ? value.map(row) : []);
const copy = (value: unknown) => (typeof value === "string" && value ? value : "UNKNOWN");
function date(value: unknown) {
  const raw = copy(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? raw
    : parsed.toLocaleString("en-US", {
        timeZone: "America/Chicago",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }) + " CT";
}

const permission = (value: unknown) => (value === true ? "Yes" : value === false ? "No" : "UNKNOWN");

function metricText(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "UNKNOWN";
}

function postTime(item: Row): string {
  if (item.published_at) return `Published ${date(item.published_at)}`;
  if (item.scheduled_at) return `Scheduled ${date(item.scheduled_at)}`;
  return "Not scheduled";
}

const ACTION_LABELS: Record<string, string> = {
  REPLY: "REPLIED",
  REPLIED: "REPLIED",
  LIKE: "LIKED",
  LIKED: "LIKED",
  NO_ACTION: "NO ACTION",
  ESCALATE: "ESCALATED",
  ESCALATED: "ESCALATED",
  AWAITING_AUTHORITY: "AWAITING AUTHORITY",
};

function actionLabel(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "UNKNOWN";
  const key = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return ACTION_LABELS[key] ?? "UNKNOWN";
}

function SocialRail({ value }: { value: unknown }) {
  const rail = row(value);
  const items = rows(rail.rows);
  return (
    <section className="jo-social-rail" aria-label="Social activity">
      <h2>Social activity</h2>
      {items.length === 0 ? (
        <p>{copy(rail.reason || "No published or scheduled social posts are in local receipts.")}</p>
      ) : (
        <ul className="jo-social-feed">
          {items.map((item) => {
            const metrics = row(item.metrics);
            const identity = typeof item.row_id === "string" && item.row_id ? item.row_id : copy(item.evidence);
            return (
              <li key={identity} data-row-id={identity}>
                <details>
                  <summary>
                    <span className="jo-social-top">
                      <span className="jo-social-network">{copy(item.network)}</span>
                      <time>{item.latest_event_at ? date(item.latest_event_at) : postTime(item)}</time>
                    </span>
                    <span className="jo-social-snippet">{truncate(copy(item.snippet), 110)}</span>
                    <span className="jo-social-engagement">{copy(item.latest_engagement)}</span>
                    <span className="jo-social-meta">
                      {postTime(item)} · {metricText(metrics.impressions)} impressions · {metricText(metrics.likes)} likes ·{" "}
                      {metricText(metrics.comments)} comments
                    </span>
                    <span className="jo-social-meta">
                      <span className={`jo-social-action jo-social-action-${actionLabel(item.j_action).toLowerCase().replace(/\s+/g, "-")}`}>
                        {actionLabel(item.j_action)}
                      </span>
                      {" · "}
                      {copy(item.j_status)} · {copy(item.freshness)}
                    </span>
                  </summary>
                  <p className="jo-social-detail">{copy(item.snippet)}</p>
                  <p className="jo-social-detail">{copy(item.lifecycle)} · {copy(item.evidence)}</p>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      {rail.limited === true && items.length > 0 ? <p className="jo-social-limit">{copy(rail.reason)}</p> : null}
    </section>
  );
}

function deriveJActivity(
  brief: Row,
  handovers: Row[],
  operatingProgress: string | undefined,
  runtime: OperatingStatus | null | undefined,
): string {
  const founderRequired = copy(row(brief.autonomy_card).founder_required) === "Yes";
  if (brief.founder_approval_unresolved === true && founderRequired) return "BLOCKED";
  if (handovers.length > 0 || String(brief.state) === "NEEDS YOU") return "WAITING ON YOU";
  const mode = String(runtime?.mode ?? "").toUpperCase();
  const heartbeatWorking =
    runtime?.heartbeat_active === true && runtime?.activity === "active" && operatingProgress === "ACTIVE";
  if (heartbeatWorking) return "WORKING NOW";
  if (operatingProgress === "BLOCKED") return founderRequired ? "BLOCKED" : "WAITING FOR NEXT WAKE";
  if (mode === "RED") return "BLOCKED";
  if (operatingProgress === "DEGRADED") return "UNKNOWN";
  if (operatingProgress === "IDLE_NO_WORK") return "IDLE — NO LAWFUL WORK";
  if (operatingProgress === "WAITING_VALIDLY") return "WAITING FOR NEXT WAKE";
  if (runtime?.activity === "idle" && mode === "GREEN") return "WAITING FOR NEXT WAKE";
  if (runtime == null) return "UNKNOWN";
  return "UNKNOWN";
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function ExecutiveBrief({
  value,
  operatingProgress,
  runtime,
}: {
  value: unknown;
  operatingProgress?: string | null;
  runtime?: OperatingPollView;
}) {
  const brief = row(value);
  const owns = row(brief.owns);
  const handovers = rows(brief.handovers);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const runtimeStatus = runtime?.status ?? null;

  async function decide(packet: Row, choice: "APPROVE" | "DECLINE") {
    const body = founderDecisionBody(packet as CaptainNeeded, choice);
    if (!body) return;
    setPending(true);
    try {
      const response = await fetch("/office/api/captain-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Decision was not recorded. Refresh and review the current packet.");
      setMessage("Decision recorded. This does not publish externally.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Decision not recorded.");
    } finally {
      setPending(false);
    }
  }

  const outcome = row(brief.outcome_card);
  const blocker = row(brief.blocker_card);
  const next = row(brief.next_card);
  const autonomy = row(brief.autonomy_card);
  const factory = row(brief.factory_card);
  const score = row(factory.score);
  const decisions = rows(brief.decisions ?? brief.trace).slice(0, 5);
  const changes = rows(brief.changes).slice(0, 1);
  const firstNeed = handovers[0];
  const progress = operatingProgress ? String(operatingProgress) : undefined;
  const jActivity = deriveJActivity(brief, handovers, progress, runtimeStatus);
  const bigIdea = copy(brief.headline);
  const rightNow = firstNeed
    ? copy(firstNeed.ask)
    : copy(next.detail ?? brief.handoff_support ?? brief.detail);
  const tryingToProve = copy(next.title);
  const lastMaterial = copy(
    (decisions[0]?.title as string | undefined) ??
      (changes[0]?.title as string | undefined) ??
      (changes[0]?.happened as string | undefined),
  );
  const nextLawful = copy(next.detail ?? owns.commitment);
  const freshnessAt = brief.situation_observed_at ?? brief.updated_at;
  const hostRelevant =
    autonomy.runtime_status === "STALE" ||
    autonomy.runtime_status === "UNCONFIRMED" ||
    copy(autonomy.founder_required) === "Yes";

  const money = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? `$${value.toFixed(2)}` : "UNKNOWN";
  const count = (value: unknown) => (typeof value === "number" ? String(value) : "UNKNOWN");
  const tally = (value: unknown) =>
    typeof value === "number" ? value.toLocaleString("en-US") : "UNKNOWN";
  const percent =
    typeof score.PERCENT_COMPLETE === "number" ? `${Number(score.PERCENT_COMPLETE).toFixed(2)}%` : "UNKNOWN";
  const stageLabel = copy(factory.stage ?? factory.problem).replaceAll("_", " ");
  const activityClass = `jo-activity jo-activity-${jActivity
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()}`;
  const firstDecision = row(firstNeed?.decision_packet);

  return (
    <main className="jo-executive jo-dashboard jo-cockpit">
      {firstNeed ? (
        <section className="jo-founder-alert" aria-label="Founder needed">
          <p className="jo-founder-alert-kicker">NEEDS JARED · {handovers.length}</p>
          <p className="jo-founder-alert-action">{truncate(copy(firstNeed.ask), 160)}</p>
          <details className="jo-founder-alert-detail">
            <summary>View exact action</summary>
            <p>{copy(firstNeed.ask)}</p>
            <p>Cause {copy(firstNeed.cause)} · Resumes {copy(firstNeed.after)} · {date(brief.situation_observed_at)}</p>
            {founderDecisionBody(firstDecision as CaptainNeeded, "APPROVE") ? (
              <div className="jo-handoff-actions">
                <button disabled={pending} onClick={() => void decide(firstDecision, "APPROVE")}>
                  Record approval
                </button>
                <button disabled={pending} onClick={() => void decide(firstDecision, "DECLINE")}>
                  Record decline
                </button>
              </div>
            ) : null}
          </details>
        </section>
      ) : null}

      {message ? (
        <p className="jo-founder-message" role="status">
          {message}
        </p>
      ) : null}

      <div className="jo-cockpit-body">
      <SocialRail value={brief.social_activity} />
      <div className="jo-cockpit-main">
      <section className="jo-cockpit-row" aria-label="Executive cockpit">
        <article className="jo-live-j" aria-labelledby="live-j-idea">
          <p className={activityClass}>{jActivity}</p>
          {brief.situation_stale ? <p className="jo-stale">Situation evidence is stale.</p> : null}
          <p className="jo-idea-label">Current big idea</p>
          <h1 id="live-j-idea">{bigIdea}</h1>
          <div className="jo-story">
            <p>
              <span>Right now</span>
              {truncate(rightNow, 220)}
            </p>
            <p>
              <span>Trying to prove</span>
              {tryingToProve}
            </p>
            <p>
              <span>Last move</span>
              {truncate(lastMaterial, 180)}
            </p>
            <p>
              <span>Next</span>
              {truncate(nextLawful, 180)}
            </p>
            <p className="jo-freshness">
              <span>Freshness</span>
              {date(freshnessAt)}
            </p>
          </div>
        </article>

        <aside className="jo-factory-compact" aria-label="Refrigerator factory">
          <h2>Refrigerator factory</h2>
          <p className="jo-factory-number">
            {tally(score.TERMINAL_CLASSIFIED)} <span>/ {tally(score.TOTAL_UNIVERSE)}</span>
          </p>
          <p className="jo-factory-percent">{percent === "UNKNOWN" ? "UNKNOWN" : `${percent} complete`}</p>
          <ul className="jo-factory-rows">
            <li>
              <span>Held</span>
              <strong>{count(score.HELD)}</strong>
            </li>
            <li>
              <span>Active</span>
              <strong>{count(score.ACTIVE_RESEARCH)}</strong>
            </li>
            <li>
              <span>Stage</span>
              <strong>{stageLabel}</strong>
            </li>
            <li>
              <span>Next</span>
              <strong>{truncate(copy(factory.continuation ?? factory.problem), 72)}</strong>
            </li>
          </ul>
        </aside>
      </section>

      <section className="jo-executive-cards jo-cockpit-cards" aria-label="Operating cards">
        <article className="jo-executive-card jo-outcome-card" aria-labelledby="outcome-title">
          <h2 id="outcome-title">Latest verified business outcome</h2>
          <p className="jo-outcome-number">{money(outcome.earnings)}</p>
          <p className="jo-card-line">
            {money(outcome.shipped_revenue)} shipped · {count(outcome.shipped_items)} item
            {outcome.shipped_items === 1 ? "" : "s"}
          </p>
        </article>
        <article className="jo-executive-card jo-blocker-card" aria-labelledby="blocker-title">
          <h2 id="blocker-title">Current blocker</h2>
          <p className="jo-card-line jo-card-strong">{truncate(copy(blocker.title), 72)}</p>
          <p className="jo-card-line">{truncate(copy(blocker.detail), 96)}</p>
        </article>
        <article className="jo-executive-card jo-window-card" aria-labelledby="autonomy-title">
          <h2 id="autonomy-title">Autonomy / system</h2>
          <p className="jo-card-line jo-card-strong">Founder {copy(autonomy.founder_required)}</p>
          <p className="jo-card-line">
            {copy(autonomy.runtime_status)}
            {hostRelevant ? " · Mac awake" : ""}
          </p>
        </article>
      </section>

      <details className="jo-brief-evidence">
        <summary>More detail · sources & decisions</summary>
        <p>
          Situation observed {date(brief.situation_observed_at)}. Brief updated {date(brief.updated_at)}.
        </p>
        <p>{copy(brief.evidence_warning)}</p>
        {decisions.length ? (
          <ul className="jo-decision-compact">
            {decisions.map((item, index) => (
              <li key={index}>
                {copy(item.label)} · {copy(item.title)} · {date(item.observed_at)}
              </li>
            ))}
          </ul>
        ) : null}
        {factory.valid ? (
          <details>
            <summary>Factory authority · creates {count(row(brief.authority_card).remaining_creates)}</summary>
            <p>
              Publication {permission(row(brief.authority_card).publication_allowed)} · Local{" "}
              {permission(row(brief.authority_card).local_allowed)}
            </p>
          </details>
        ) : null}
      </details>
      </div>
      </div>
    </main>
  );
}
