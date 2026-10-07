"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { founderDecisionBody, type CaptainNeeded } from "./captain-log";

type Row = Record<string, unknown>;
const row = (value: unknown): Row => value && typeof value === "object" ? value as Row : {};
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.map(row) : [];
const copy = (value: unknown) => typeof value === "string" && value ? value : "UNKNOWN";
function date(value: unknown) {
  const raw = copy(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " CT";
}

function Icon({ kind }: { kind: string }) {
  const paths: Record<string, string> = { outcome: "M4 17l5-5 4 3 7-10M15 5h5v5", blocker: "M12 3L2 21h20L12 3zM12 9v5M12 17v1", next: "M4 12h16M14 6l6 6-6 6", autonomy: "M12 3l8 4v6c0 4-8 8-8 8s-8-4-8-8V7l8-4zM8 12l3 3 5-6", judgment: "M5 12l4 4L19 6" };
  return <span className="jo-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[kind] ?? paths.judgment} /></svg></span>;
}

function Checkpoint({ value, state }: { value: Row; state?: string }) {
  return <div className="jo-checkpoint"><span className={`jo-truth-badge jo-truth-${copy(value.freshness).toLowerCase()}`}>{state ?? (value.freshness === "UNKNOWN" || !value.freshness ? "UNKNOWN" : "VERIFIED")} · {copy(value.freshness)}</span><span>Checkpoint {value.verified_at ? date(value.verified_at) : "UNKNOWN"}</span></div>;
}
const permission = (value: unknown) => value === true ? "Yes" : value === false ? "No" : "UNKNOWN";

export function ExecutiveBrief({ value }: { value: unknown }) {
  const brief = row(value);
  const owns = row(brief.owns);
  const continuity = row(brief.continuity);
  const handovers = rows(brief.handovers);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function decide(packet: Row, choice: "APPROVE" | "DECLINE") {
    const body = founderDecisionBody(packet as CaptainNeeded, choice);
    if (!body) return;
    setPending(true);
    try {
      const response = await fetch("/office/api/captain-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error("Decision was not recorded. Refresh and review the current packet.");
      setMessage("Decision recorded. This does not publish externally.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Decision not recorded."); }
    finally { setPending(false); }
  }
  const outcome = row(brief.outcome_card);
  const blocker = row(brief.blocker_card);
  const next = row(brief.next_card);
  const window = row(brief.window_card);
  const autonomy = row(brief.autonomy_card);
  const factory = row(brief.factory_card);
  const score = row(factory.score);
  const authority = row(brief.authority_card);
  const latest = row(brief.latest_event);
  const decisions = rows(brief.decisions ?? brief.trace).slice(0, 5);
  const firstNeed = handovers[0];
  const money = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? `$${value.toFixed(2)}` : "UNKNOWN";
  const count = (value: unknown) => typeof value === "number" ? String(value) : "UNKNOWN";
  function packet(item: Row, index: number) {
    const decision = row(item.decision_packet);
    return <div className="jo-handoff-packet" key={index} aria-label="Founder handover">
      <p className="jo-ask">{copy(item.ask)}</p>
      <p><strong>Why you:</strong> {copy(item.why)}</p>
      <p><strong>Afterward:</strong> {copy(item.after)}</p>
      <p><strong>J recommends:</strong> {copy(item.recommendation)}</p>
      <p><strong>If you do nothing:</strong> {copy(item.if_nothing)}</p>
      <details><summary>Decision packet · {copy(item.cause)}</summary>
        {typeof decision.post_text === "string" ? <blockquote>{decision.post_text}</blockquote> : null}
        <p>Alternatives: {copy(item.alternatives)}</p><p>Tradeoffs: {copy(item.tradeoffs)}</p><p>Timing: {copy(item.timing)}</p>
      </details>
      {founderDecisionBody(decision as CaptainNeeded, "APPROVE") ? <div className="jo-handoff-actions">
        <p className="jo-note">Records your decision only. Does not publish externally.</p>
        <button disabled={pending} onClick={() => void decide(decision, "APPROVE")}>Record approval</button>
        <button disabled={pending} onClick={() => void decide(decision, "DECLINE")}>Record decline</button>
      </div> : null}
    </div>;
  }
  return <main className="jo-executive jo-dashboard">
    <section className={`jo-handoff-hero${firstNeed ? " jo-handoff-needed" : ""}`} aria-labelledby="situation-title">
      <div className="jo-handoff-main">
        <p className="jo-eyebrow">FOUNDER NEEDED <span className="jo-founder-answer">{firstNeed ? "YES" : Array.isArray(brief.handovers) ? "NO" : "UNKNOWN"}</span></p>
        <h1 id="situation-title">{copy(brief.handoff_headline ?? brief.founder_status)}</h1>
        <p className="jo-assurance">{copy(brief.handoff_assurance ?? brief.stewardship)}</p>
        {firstNeed ? handovers.map(packet) : <>
          <p className="jo-current-situation">{copy(brief.headline)}{brief.current_stage ? <span className="jo-stage-badge">{copy(brief.current_stage).replaceAll("_", " ")}</span> : null}</p>
          <p className="jo-situation-explanation">{copy(brief.handoff_support ?? brief.detail)}</p>
        </>}
        {brief.situation_stale ? <p className="jo-stale">Situation evidence is stale; current conditions unconfirmed.</p> : null}
      </div>
      <aside className="jo-leave-panel" aria-label="If you leave now">
        <h2>IF YOU LEAVE NOW</h2>
        <ul>{(Array.isArray(brief.continue_items) ? brief.continue_items : [continuity.continue]).map((item, index) => <li key={index}>{copy(item)}</li>)}</ul>
        <p className="jo-runtime">{copy(continuity.runtime)}</p>
        <details><summary>Reconsideration & escalation</summary><p>{copy(continuity.reconsider)}</p><p>{copy(continuity.escalate)}</p></details>
      </aside>
    </section>
    {message ? <p role="status">{message}</p> : null}
    <section className="jo-executive-cards" aria-label="Executive operating picture">
      <article className="jo-executive-card jo-outcome-card" aria-labelledby="outcome-title">
        <Icon kind="outcome" />
        <h2 id="outcome-title">LATEST VERIFIED BUSINESS OUTCOME</h2>
        <p className="jo-outcome-number">{money(outcome.earnings)}</p>
        <h3>{outcome.earnings != null ? "Amazon earnings" : "No verified outcome available"}</h3>
        <div className="jo-outcome-facts"><span>{money(outcome.shipped_revenue)} shipped revenue</span><span>{count(outcome.shipped_items)} shipped item{outcome.shipped_items === 1 ? "" : "s"}</span></div>
        <p className="jo-card-note">Attribution unknown.</p>
        <p className="jo-card-meta">Observed {date(outcome.observed_at)}</p><Checkpoint value={outcome} />
      </article>
      <article className="jo-executive-card jo-blocker-card" aria-labelledby="blocker-title">
        <Icon kind="blocker" />
        <h2 id="blocker-title">CURRENT BLOCKER</h2><h3>{copy(blocker.title)}</h3><p>{copy(blocker.detail)}</p>
        {blocker.dangerous_count != null || blocker.snapshot != null ? <dl className="jo-count-pair"><div><dt>Dangerous count</dt><dd>{count(blocker.dangerous_count)}</dd></div><div><dt>Safety snapshot</dt><dd>{count(blocker.snapshot)}</dd></div></dl> : null}
        {blocker.restraint ? <p className="jo-card-note">{copy(blocker.restraint)}</p> : null}<Checkpoint value={blocker} state="HELD" />
      </article>
      <article className="jo-executive-card jo-next-card" aria-labelledby="next-title">
        <Icon kind="next" />
        <h2 id="next-title">J OWNS NEXT</h2><h3>{copy(next.title)}</h3><p>{copy(next.detail)}</p>
        {Array.isArray(next.display_triggers) && next.display_triggers.length ? <p className="jo-trigger-label">Reconsider when</p> : null}<ul className="jo-trigger-list">{(Array.isArray(next.display_triggers) ? next.display_triggers : Array.isArray(next.triggers) ? next.triggers : [owns.trigger]).map((item, index) => <li key={index}>{copy(item)}</li>)}</ul>
        <p className="jo-card-meta">{next.review_at ? `Recorded review · ${date(next.review_at)}` : "Next scheduled execution time UNKNOWN"}</p><Checkpoint value={next} state={copy(next.state) === "UNKNOWN" ? undefined : copy(next.state)} />
        {next.scope_note ? <p className="jo-card-note">{copy(next.scope_note)}</p> : null}
      </article>
      <article className="jo-executive-card jo-window-card" aria-labelledby="autonomy-title">
        <Icon kind="autonomy" /><h2 id="autonomy-title">CURRENT AUTONOMY</h2><h3>{copy(autonomy.title)}</h3>
        <dl className="jo-autonomy-facts"><div><dt>Founder required</dt><dd>{copy(autonomy.founder_required)}</dd></div><div><dt>Authority effect</dt><dd>None from this view</dd></div><div><dt>Host dependency</dt><dd>Mac awake</dd></div></dl>
        <p className="jo-card-meta">{copy(autonomy.note)}</p><Checkpoint value={autonomy} state={copy(autonomy.runtime_status)} />
      </article>
    </section>
    {brief.factory_card ? <section className="jo-factory-panel" aria-label="Refrigerator factory scoreboard">
      <div className="jo-factory-score"><Icon kind="next" /><h2>REFRIGERATOR FACTORY SCOREBOARD</h2><p className="jo-factory-number">{count(score.TERMINAL_CLASSIFIED)} <span>/ {count(score.TOTAL_UNIVERSE)}</span></p><p>terminally classified · {typeof score.PERCENT_COMPLETE === "number" ? `${score.PERCENT_COMPLETE}% complete` : "percent UNKNOWN"}</p><Checkpoint value={factory} state={factory.valid ? "VERIFIED" : "UNKNOWN"} /></div>
      <div className="jo-factory-detail"><h3>{copy(factory.objective)}</h3><dl className="jo-factory-counts"><div><dt>Researching</dt><dd>{count(score.ACTIVE_RESEARCH)}</dd></div><div><dt>Awaiting validation</dt><dd>{count(score.RETURNED_AWAITING_VALIDATION)}</dd></div><div><dt>Held / nonterminal</dt><dd>{count(score.HELD)}</dd></div></dl><p>{copy(factory.continuation ?? factory.problem)}</p>
      <details><summary>Terminal classes & source scope</summary><p>Filter relationship {count(score.PROVEN_FILTER_RELATIONSHIP)} · No filter {count(score.PROVEN_NO_FILTER)} · Variant / duplicate {count(score.CANONICAL_VARIANT_OR_DUPLICATE)} · Source exhausted {count(score.UNRESOLVED_SOURCE_EXHAUSTED)}</p><p>The denominator is the recorded authoritative certification snapshot, not every refrigerator ever manufactured.</p></details></div>
      <div className="jo-factory-event"><h2>LATEST FACTORY EVENT</h2><h3>{copy(latest.title)}</h3><p>{copy(latest.why)}</p><p className="jo-metered-cost">{money(latest.metered_usage)} <span>provider metered usage</span></p><p className="jo-card-note">Promotional debit: {copy(latest.promotional_debit)}. Metered usage is not proof of cash paid.</p><Checkpoint value={latest} state={copy(latest.state)} /></div>
      <details className="jo-authority-detail"><summary>Current authority · creates remaining {count(authority.remaining_creates)} · publication {permission(authority.publication_allowed)}</summary><p>Scoped local work: {permission(authority.local_allowed)} · Network reads: {permission(authority.network_reads_allowed)} · New paid create: {permission(authority.paid_create_allowed)} · Create consumed: {permission(authority.create_consumed)}</p><Checkpoint value={authority} state="AUTHORITY SNAPSHOT" /><p>Source: {copy(authority.source)}. Authority is read at projection refresh; no grant is added by Office.</p></details>
    </section> : null}
    <section className="jo-decisions-strip" aria-label="J's recent decisions"><div className="jo-section-heading"><h2>RECENT EXECUTIVE EVENTS / DECISIONS</h2></div>
      <div className="jo-decision-rows">{decisions.length ? decisions.map((item, index) => <article className="jo-judgment-item" key={index}>
        <Icon kind="judgment" /><span className={`jo-judgment-label jo-label-${copy(item.label).toLowerCase()}`}>{copy(item.label)}</span><div><h3>{copy(item.title)}</h3><p>{copy(item.why)}</p>{typeof item.metered_usage === "number" ? <p className="jo-card-note">{money(item.metered_usage)} metered · debit {copy(item.promotional_debit)}</p> : null}{item.observed_at ? <time className="jo-card-meta">{date(item.observed_at)}</time> : null}</div>
      </article>) : <p>No consequential decision is established.</p>}</div>
    </section>
    {rows(brief.business_view).length ? <section className="jo-business-view" aria-label="J's current business view"><h2>J’S CURRENT BUSINESS VIEW</h2><div>{rows(brief.business_view).map((item, index) => <article key={index}><h3>{copy(item.title)}</h3><span>{copy(item.status)}</span><p>{copy(item.detail)}</p></article>)}</div></section> : null}
    <details className="jo-brief-evidence"><summary>Brief sources & freshness</summary>
      <p>Situation observed {date(brief.situation_observed_at)}. Brief updated {date(brief.updated_at)}.</p>
      <p>{copy(brief.evidence_warning)}</p><p>Latest outcome evidence: {copy(outcome.evidence)}</p><p>Hold evidence: {copy(blocker.evidence)}</p><p>Next assessment: {copy(next.evidence)}</p>
      <p>{copy(window.note)}</p><p>Exact outcome attribution and profit are not established.</p><p>Factory sources: {(Array.isArray(factory.sources) ? factory.sources : []).map(copy).join(" · ")}</p><p>Priority: {copy(owns.priority)}</p><p>Fallback: {copy(owns.fallback)}</p>
      {decisions.map((item, index) => <p key={index}>{copy(item.label)} · {date(item.observed_at)} · {copy(item.evidence)} · {copy(item.unknown)}</p>)}
    </details>
  </main>;
}
