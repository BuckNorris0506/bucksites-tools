"use client";

import { useMemo, useState } from "react";

import { scopeFounderOperatingPicture } from "@/lib/j-office/scope-projection";
import type {
  EconValue,
  FounderOperatingPicture,
} from "@/lib/j-office/types";

function asEcon(value: unknown): EconValue | null {
  if (!value || typeof value !== "object") return null;
  const row = value as EconValue;
  if (typeof row.display !== "string") return null;
  return row;
}

function Econ({ value }: { value: unknown }) {
  const row = asEcon(value);
  if (row) {
    if (row.is_unknown) return <span className="jo-unknown">{row.display}</span>;
    if (row.is_zero) return <span className="jo-zero">{row.display}</span>;
    return <span>{row.display}</span>;
  }
  if (typeof value === "string") {
    if (value.toUpperCase() === "UNKNOWN") {
      return <span className="jo-unknown">UNKNOWN</span>;
    }
    return <span>{value}</span>;
  }
  if (typeof value === "number") {
    if (value === 0) return <span className="jo-zero">0</span>;
    return <span>{String(value)}</span>;
  }
  return <span className="jo-unknown">UNKNOWN</span>;
}

function text(value: unknown, fallback = "UNKNOWN"): string {
  if (value == null || value === "") return fallback;
  return String(value);
}

function Chip({ value }: { value: unknown }) {
  const label = text(value, "");
  if (!label) return null;
  const tone = label.toLowerCase();
  const cls =
    tone.includes("need") || tone === "blocked"
      ? "jo-chip jo-chip-need"
      : tone.includes("stale") || tone.includes("conflict")
        ? "jo-chip jo-chip-warn"
        : "jo-chip";
  return <span className={cls}>{label}</span>;
}

export function JOfficeView({ picture }: { picture: FounderOperatingPicture }) {
  const scopes = picture.business_scopes?.length
    ? picture.business_scopes
    : [{ id: "all", label: "ALL" }];
  const [scopeId, setScopeId] = useState(scopes[0]?.id ?? "all");
  const view = useMemo(
    () => scopeFounderOperatingPicture(picture, scopeId),
    [picture, scopeId],
  );

  const outlook = view.economic_outlook;
  const amazon =
    outlook.buckparts && typeof outlook.buckparts === "object"
      ? (outlook.buckparts as { amazon?: Record<string, unknown>; gsc?: Record<string, unknown> })
          .amazon
      : undefined;
  const gsc =
    outlook.buckparts && typeof outlook.buckparts === "object"
      ? (outlook.buckparts as { amazon?: Record<string, unknown>; gsc?: Record<string, unknown> })
          .gsc
      : undefined;
  const freshness = view.freshness ?? {};
  const conflicts = Array.isArray(outlook.conflicts) ? outlook.conflicts : [];
  const stale =
    Boolean(freshness.amazon_stale) ||
    Boolean(freshness.gsc_stale) ||
    Boolean(freshness.gsc_unsettled_warning);
  const needs = view.needs_jared ?? [];
  const now = view.now;
  const disappear = view.if_jared_disappears_24h ?? {};
  const counts = view.funnel.counts ?? {};
  const truth = outlook.outlook_truth ?? {};

  return (
    <div className="j-office">
      <header className="jo-strip">
        <div className="jo-brand">J Office</div>
        <div className="jo-meta">generated_at {text(view.generated_at)}</div>
        <span className={stale ? "jo-chip jo-chip-warn" : "jo-chip jo-chip-ok"}>
          {stale ? "STALE / UNSETTLED" : "CURRENT"}
        </span>
        {conflicts.length > 0 ? (
          <span className="jo-chip jo-chip-warn">CONFLICT</span>
        ) : (
          <span className="jo-chip">NO CONFLICT</span>
        )}
        <Chip value={now.operating_state ?? outlook.envelope_state} />
        <span className={needs.length ? "jo-chip jo-chip-need" : "jo-chip jo-chip-ok"}>
          {needs.length ? `NEEDS JARED · ${needs.length}` : "NEEDS JARED · Nothing"}
        </span>
      </header>

      {scopes.length > 1 ? (
        <nav className="jo-scopes" aria-label="Business scope">
          {scopes.map((scope) => (
            <button
              key={scope.id}
              type="button"
              aria-pressed={scope.id === scopeId}
              onClick={() => setScopeId(scope.id)}
            >
              {scope.label}
            </button>
          ))}
        </nav>
      ) : null}

      <div className="jo-grid">
        <section className="jo-panel jo-outlook">
          <h2>Economic Outlook</h2>
          <dl className="jo-facts">
            <div>
              <dt>AUTHORIZED_CAPITAL_USD</dt>
              <dd>
                <Econ value={outlook.AUTHORIZED_CAPITAL_USD} />
              </dd>
            </div>
            <div>
              <dt>CASH_AVAILABLE_USD</dt>
              <dd>
                <Econ value={outlook.CASH_AVAILABLE_USD} />
              </dd>
            </div>
            <div>
              <dt>CASH_COMMITTED_USD</dt>
              <dd>
                <Econ value={outlook.CASH_COMMITTED_USD} />
              </dd>
            </div>
            <div>
              <dt>CASH_SPENT_USD</dt>
              <dd>
                <Econ value={outlook.CASH_SPENT_USD} />
              </dd>
            </div>
            <div>
              <dt>SETTLED_REVENUE_USD</dt>
              <dd>
                <Econ value={outlook.SETTLED_REVENUE_USD} />
              </dd>
            </div>
            <div>
              <dt>PENDING_REVENUE_USD</dt>
              <dd>
                <Econ value={outlook.PENDING_REVENUE_USD} />
              </dd>
            </div>
            <div>
              <dt>SETTLED_PROFIT_USD</dt>
              <dd>
                <Econ value={outlook.SETTLED_PROFIT_USD} />
              </dd>
            </div>
            <div>
              <dt>Envelope</dt>
              <dd>{text(outlook.envelope_state)}</dd>
            </div>
            <div>
              <dt>Model cost</dt>
              <dd>
                <Econ value={outlook.model_research_cost_usd} />
              </dd>
            </div>
          </dl>
          {amazon ? (
            <p className="jo-note">
              BuckParts Amazon: <Econ value={amazon.clicks} /> clicks,{" "}
              <Econ value={amazon.ordered_items} /> ordered,{" "}
              <Econ value={amazon.shipped_items} /> shipped,{" "}
              <Econ value={amazon.earnings_shown_usd} /> earnings shown,
              settlement <Econ value={amazon.settlement_status} />. Dashboard last
              updated {text(amazon.dashboard_last_updated)}. Clicks are not revenue.
              Not attributed to Google ({text(amazon.google_search_attribution)}).
            </p>
          ) : null}
          {gsc ? (
            <p className="jo-note">
              BuckParts GSC {text(gsc.property)}: <Econ value={gsc.clicks} /> clicks,{" "}
              <Econ value={gsc.impressions} /> impressions, settled through{" "}
              {text(gsc.settled_through)}. Impressions/clicks are not revenue.
            </p>
          ) : null}
          <p className="jo-note">{text(outlook.next_event_that_could_change_economics)}</p>
          {stale ? (
            <p className="jo-note jo-unknown">{text(freshness.gsc_unsettled_warning, "Stale evidence.")}</p>
          ) : null}
          {conflicts.length > 0 ? (
            <p className="jo-note jo-unknown">CONFLICT: {conflicts.join(" | ")}</p>
          ) : null}
          <details className="jo-secondary">
            <summary>Proven / inferred / UNKNOWN</summary>
            <p className="jo-note">Proven</p>
            <ul className="jo-list">
              {(truth.proven ?? []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="jo-note">Inferred</p>
            <ul className="jo-list">
              {(truth.inferred ?? []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="jo-note">UNKNOWN</p>
            <ul className="jo-list">
              {(truth.unknown ?? []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        </section>

        <section className="jo-panel jo-now">
          <h2>J is working on</h2>
          <h3>{text(now.identity, "None.")}</h3>
          {now.empty_slot ? <p className="jo-note">{text(now.empty_slot_response)}</p> : null}
          <dl className="jo-facts">
            <div>
              <dt>Business</dt>
              <dd>{text(now.business)}</dd>
            </div>
            <div>
              <dt>Why selected</dt>
              <dd>{text(now.why_selected)}</dd>
            </div>
            <div>
              <dt>State</dt>
              <dd>{text(now.state)}</dd>
            </div>
            <div>
              <dt>Constraint</dt>
              <dd>
                {text(
                  now.constraint && typeof now.constraint === "object"
                    ? (now.constraint as { objective_constraint?: string }).objective_constraint
                    : null,
                )}
              </dd>
            </div>
            <div>
              <dt>Next action</dt>
              <dd>{text(now.next_action)}</dd>
            </div>
            <div>
              <dt>Next external milestone</dt>
              <dd>{text(now.next_external_milestone)}</dd>
            </div>
            <div>
              <dt>Economic relevance</dt>
              <dd>{text(now.economic_relevance)}</dd>
            </div>
            <div>
              <dt>Jared required</dt>
              <dd>{now.founder_action_required ? "YES" : "NO"}</dd>
            </div>
            <div>
              <dt>Without Jared</dt>
              <dd>{text(now.what_j_can_do_without_jared)}</dd>
            </div>
          </dl>
        </section>

        <section className="jo-panel jo-needs">
          <h2>Needs Jared</h2>
          {needs.length === 0 ? (
            <p className="jo-empty">NEEDS JARED Nothing.</p>
          ) : (
            needs.map((item) => (
              <article className="jo-row" key={item.action}>
                <h3>{item.action}</h3>
                <p className="jo-note">J recommendation: {text(item.recommendation)}</p>
                <p className="jo-note">Evidence: {text(item.evidence)}</p>
                <p className="jo-note">Deadline: {text(item.deadline)}</p>
                <p className="jo-note">
                  Economic consequence: {text(item.economic_consequence)}
                </p>
                <p className="jo-note">
                  If nothing: {text(item.consequence_of_doing_nothing)}
                </p>
                <p className="jo-note">Then J resumes: {text(item.what_j_resumes_afterward)}</p>
              </article>
            ))
          )}
        </section>

        <section className="jo-panel jo-queue">
          <h2>Next / Queue</h2>
          {(view.next_queue ?? []).slice(0, 5).map((row) => (
            <article className="jo-row" key={row.id ?? row.item}>
              <h3>
                {row.item} <Chip value={row.visual} />
              </h3>
              <p className="jo-note">
                {text(row.business)} · {text(row.stage)}
              </p>
              <p className="jo-note">Why behind NOW: {text(row.why_behind_now)}</p>
              <p className="jo-note">Blocker: {text(row.blocker)}</p>
              <p className="jo-note">
                Promote: {text(row.promote)} · Kill: {text(row.kill)} · Defer:{" "}
                {text(row.defer)}
              </p>
            </article>
          ))}
        </section>

        <section className="jo-panel jo-obligations">
          <h2>Open obligations / risks</h2>
          {(view.open_obligations ?? []).length === 0 ? (
            <p className="jo-note">None recorded.</p>
          ) : (
            <ul className="jo-list">
              {view.open_obligations.map((row) => (
                <li key={row.item}>
                  {row.item}: {text(row.detail)}
                  {row.stale ? " STALE" : ""}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="jo-panel jo-disappear">
          <h2>If Jared disappears 24h</h2>
          <p className="jo-note">J WILL</p>
          <ul className="jo-list">
            {((disappear.what_j_will_continue_doing as string[]) ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="jo-note">J WILL MONITOR</p>
          <ul className="jo-list">
            {((disappear.what_j_will_monitor as string[]) ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="jo-note">J WILL NOT</p>
          <ul className="jo-list">
            {(
              (disappear.what_j_will_not_do_for_missing_authority as string[]) ?? []
            ).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="jo-note">WILL WAIT</p>
          <ul className="jo-list">
            {((disappear.what_will_wait as string[]) ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="jo-note">TIME-SENSITIVE</p>
          <ul className="jo-list">
            {((disappear.what_could_become_time_sensitive as Array<Record<string, unknown>>) ?? []).map(
              (item) => (
                <li key={String(item.item)}>
                  {text(item.item)} · {text(item.at)}
                </li>
              ),
            )}
          </ul>
        </section>

        <section className="jo-panel jo-funnel">
          <h2>Opportunity funnel</h2>
          <dl className="jo-facts">
            {Object.entries(counts).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="jo-note">{text(view.funnel.semantics, "")}</p>
        </section>

        <section className="jo-panel jo-stuck">
          <h2>Passed early / stuck later</h2>
          {(view.funnel.stuck_after_first_filter ?? []).map((row) => (
            <article className="jo-row" key={row.id ?? row.name}>
              <h3>{row.name}</h3>
              <p className="jo-note">Highest stage: {text(row.stage_reached)}</p>
              <p className="jo-note">Why stopped: {text(row.blocker)}</p>
              <p className="jo-note">Permanent vs revisitable: {text(row.permanence)}</p>
              <p className="jo-note">
                New evidence to reopen: {text(row.evidence_missing, "None recorded.")}
              </p>
            </article>
          ))}
        </section>

        <section className="jo-panel jo-changed">
          <h2>What changed</h2>
          {(view.what_changed ?? []).map((row) => (
            <article className="jo-row" key={`${row.title}-${row.when}`}>
              <h3>{text(row.title)}</h3>
              <p className="jo-note">
                {text(row.when)} · {text(row.kind, "")}
              </p>
              <p className="jo-note">{text(row.detail)}</p>
            </article>
          ))}
        </section>

        <section className="jo-panel jo-learning">
          <h2>Results / learning</h2>
          {(view.results_learning ?? []).map((row) => (
            <details className="jo-secondary jo-row" key={row.id ?? row.learning}>
              <summary>{text(row.id)}</summary>
              <p className="jo-note">EXPECTED: {text(row.expected)}</p>
              <p className="jo-note">OBSERVED: {text(row.observed)}</p>
              <p className="jo-note">
                ECONOMIC CONSEQUENCE: {text(row.economic_consequence)}
              </p>
              <p className="jo-note">LEARNING: {text(row.learning)}</p>
              <p className="jo-note">
                RESULTING DECISION CHANGE: {text(row.resulting_decision_change)}
              </p>
            </details>
          ))}
        </section>
      </div>
    </div>
  );
}
