"use client";

import { useMemo, useState } from "react";

import { CaptainLog } from "@/app/office/CaptainLog";
import { OperatingStateControl } from "@/app/office/OperatingStateControl";
import { scopeFounderOperatingPicture } from "@/lib/j-office/scope-projection";
import type {
  EconValue,
  FounderAction,
  FounderOperatingPicture,
  OfficeBrief,
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

function formatUpdated(value: unknown): string {
  const raw = text(value, "");
  if (!raw) return "UNKNOWN";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function Chip({ value, tone }: { value: unknown; tone?: "need" | "ok" | "warn" }) {
  const label = text(value, "");
  if (!label) return null;
  const cls =
    tone === "need" || /need|blocked/i.test(label)
      ? "jo-chip jo-chip-need"
      : tone === "ok"
        ? "jo-chip jo-chip-ok"
        : tone === "warn"
          ? "jo-chip jo-chip-warn"
          : "jo-chip";
  return <span className={cls}>{label}</span>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function waitingExternalDuplicatesNeed(
  needs: FounderAction[],
  waiting: Record<string, unknown>,
): boolean {
  const waitBlob = `${text(waiting.label, "")} ${text(waiting.detail, "")}`.toLowerCase();
  if (!waitBlob.trim()) return false;
  return needs.some((item) => {
    const hay = `${item.title ?? ""} ${item.action ?? ""} ${item.exact_action ?? ""}`.toLowerCase();
    const needIsCalle = /call-e|calle|recording/.test(hay);
    const waitIsCalle = /call-e|calle|recording|not a founder interrupt|quiet observation/.test(
      waitBlob,
    );
    return needIsCalle && waitIsCalle;
  });
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

  const brief: OfficeBrief = view.office_brief ?? {};
  const outlook = view.economic_outlook;
  const working = asRecord(brief.j_is_working ?? view.now);
  const needs: FounderAction[] = (brief.needs_jared ?? view.needs_jared ?? []).filter(
    (item) => item.action && item.action !== "NONE",
  );
  const changed = (brief.what_changed ?? []).length
    ? brief.what_changed ?? []
    : (view.what_changed ?? []).slice(0, 5).map((row) => ({
        happened: row.title,
        why_it_matters: row.detail,
        next: "Preserved as history.",
        when: row.when,
        kind: row.kind,
      }));
  const money = asRecord(brief.money);
  const autonomy = asRecord(brief.autonomy);
  const system = asRecord(brief.system);
  const running = text(system.running_label ?? view.now.operating_state, "UNKNOWN");
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
  const truth = outlook.outlook_truth ?? {};
  const waitingExternal = asRecord(working.waiting_external);
  const hideWaitingPrimary = waitingExternalDuplicatesNeed(needs, waitingExternal);
  const details = asRecord(working.details);
  const conflicts = Array.isArray(outlook.conflicts) ? outlook.conflicts : [];
  const projects = Array.isArray(brief.active_projects)
    ? (brief.active_projects as Array<Record<string, unknown>>)
    : [];
  const provenance = asRecord(money.model_cost_provenance);
  const primary = text(
    brief.primary_status ?? system.primary_status,
    needs.length > 0 ? "FOUNDER DECISION NEEDED" : "UNKNOWN",
  );
  const primaryTone: "need" | "ok" | "warn" | undefined = /FOUNDER DECISION|SYSTEM PROBLEM|BLOCKED/.test(
    primary,
  )
    ? "need"
    : /PAUSED/.test(primary)
      ? "warn"
      : /ALL GOOD/.test(primary)
        ? "ok"
        : undefined;

  return (
    <div className="j-office">
      <header className="jo-strip">
        <div className="jo-brand">J OFFICE</div>
        <Chip value={primary} tone={primaryTone} />
        <div className="jo-meta">updated {formatUpdated(system.updated_at ?? view.generated_at)}</div>
        {needs.length > 0 ? (
          <span className="jo-chip jo-chip-need">NEEDS JARED · {needs.length}</span>
        ) : null}
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

      <div className="jo-operating-slot">
        <OperatingStateControl />
      </div>

      <CaptainLog />

      <div className="jo-grid">
        <section className="jo-panel jo-now">
          <h2>{primary}</h2>
          <p className="jo-kicker">{text(working.current_action ?? view.now.current_action)}</p>
          <p className="jo-next">Next: {text(working.next ?? view.now.next_action)}</p>
        </section>

        {needs.length > 0 ? (
          <section className="jo-panel jo-needs">
            <h2>NEEDS YOU · {needs.length}</h2>
            {needs.map((item) => (
              <article className="jo-hero" key={item.interrupt_id ?? item.action}>
                <h3>{text(item.title ?? item.action)}</h3>
                {item.deadline_display ? (
                  <p className="jo-deadline">{item.deadline_display}</p>
                ) : null}
                {item.j_has_done_everything_else ? (
                  <p className="jo-kicker">J has completed everything else it can do.</p>
                ) : null}
                <p className="jo-action">{text(item.exact_action ?? item.action)}</p>
                <details className="jo-secondary">
                  <summary>Why this needs you</summary>
                  <p className="jo-note">{text(item.why_only_jared)}</p>
                  <p className="jo-note">
                    If nothing: {text(item.consequence_of_doing_nothing)}
                  </p>
                </details>
                <details className="jo-secondary">
                  <summary>What J resumes afterward</summary>
                  <p className="jo-note">{text(item.what_j_resumes_afterward)}</p>
                  <p className="jo-note">Evidence ref: {text(item.evidence)}</p>
                  <p className="jo-note">Deadline: {text(item.deadline)}</p>
                </details>
              </article>
            ))}
          </section>
        ) : null}

        {projects.length > 0 ? (
          <section className="jo-panel jo-projects">
            <h2>ACTIVE PROJECTS</h2>
            {projects.map((row) => (
              <article className="jo-row" key={text(row.id ?? row.name)}>
                <h3>{text(row.name)}</h3>
                <p className="jo-status">{text(row.status)}</p>
                <p className="jo-next">Next: {text(row.next)}</p>
              </article>
            ))}
          </section>
        ) : null}

        {changed.length > 0 ? (
          <section className="jo-panel jo-changed">
            <h2>WHAT CHANGED</h2>
            {changed.map((row) => (
              <article className="jo-row" key={`${row.happened}-${row.when}`}>
                <h3>{text(row.happened)}</h3>
                <p className="jo-note">{text(row.why_it_matters)}</p>
                <p className="jo-next">Next: {text(row.next)}</p>
              </article>
            ))}
          </section>
        ) : null}

        <section className="jo-panel jo-outlook">
          <h2>MONEY</h2>
          <dl className="jo-facts">
            <div>
              <dt>Settled revenue</dt>
              <dd>
                <Econ value={money.settled ?? outlook.SETTLED_REVENUE_USD} />
              </dd>
            </div>
            <div>
              <dt>Proven pending revenue</dt>
              <dd>
                <Econ value={money.pending ?? outlook.PENDING_REVENUE_USD} />
              </dd>
            </div>
            <div>
              <dt>Business spend</dt>
              <dd>
                <Econ value={money.business_spend ?? money.spend ?? outlook.CASH_SPENT_USD} />
              </dd>
            </div>
            <div>
              <dt>J autonomous model spend</dt>
              <dd>
                <Econ value={money.model_cost ?? outlook.model_research_cost_usd} />
              </dd>
            </div>
          </dl>
          {text(provenance.note, "") ? (
            <p className="jo-note">
              Model-cost provenance: {text(provenance.cost_type)} · {text(provenance.kind)}.{" "}
              {text(provenance.note)}
            </p>
          ) : null}
          {text(money.amazon_line, "") ? <p className="jo-note">{text(money.amazon_line)}</p> : null}
          {text(money.amazon_stale_note, "") ? (
            <p className="jo-note jo-stale">{text(money.amazon_stale_note)}</p>
          ) : null}
          {text(money.gsc_line, "") ? <p className="jo-note">{text(money.gsc_line)}</p> : null}
          {typeof money.verified_failure_count === "number" ? (
            <p className="jo-note">Verified economic failures: {text(money.verified_failure_count)}</p>
          ) : null}
          <details className="jo-secondary">
            <summary>Channel and envelope details</summary>
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
                <dt>SETTLED_PROFIT_USD</dt>
                <dd>
                  <Econ value={outlook.SETTLED_PROFIT_USD} />
                </dd>
              </div>
              <div>
                <dt>Model spend today</dt>
                <dd>
                  <Econ value={money.model_cost_today} />
                </dd>
              </div>
            </dl>
            {amazon ? (
              <p className="jo-note">
                BuckParts Amazon settlement {text(amazon.settlement_status)}. Clicks are not
                revenue. Not attributed to Google ({text(amazon.google_search_attribution)}).
              </p>
            ) : null}
            {gsc ? (
              <p className="jo-note">
                GSC {text(gsc.property)} unsettled from {text(gsc.unsettled_from)}. Impressions
                and clicks are not revenue.
              </p>
            ) : null}
            {conflicts.length > 0 ? (
              <p className="jo-note">Conflict: {conflicts.join(" | ")}</p>
            ) : null}
            <p className="jo-note">Proven</p>
            <ul className="jo-list">
              {(truth.proven ?? []).map((item) => (
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

        <section className="jo-panel jo-system">
          <h2>SYSTEM</h2>
          <p className="jo-note">
            Configured cadence: {text(autonomy.heartbeat_configured_cadence, "hourly")}
          </p>
          <p className="jo-note">
            Effective runtime:{" "}
            {text(autonomy.heartbeat_effective_runtime ?? autonomy.heartbeat, "UNKNOWN")}
          </p>
          <p className="jo-note">DeskCrew: {text(autonomy.deskcrew, "UNKNOWN")}</p>
          <p className="jo-note">
            Spend authority: <Econ value={autonomy.spend_authority ?? outlook.AUTHORIZED_CAPITAL_USD} />
          </p>
          <p className="jo-quiet">
            {autonomy.will_keep_deciding_while_away
              ? "J can keep deciding while you are away."
              : "Autonomous wake will not fire while the LaunchAgent is paused or disabled."}
          </p>
          <details className="jo-secondary">
            <summary>Details</summary>
            <p className="jo-note">Emergency stop: {text(running)}</p>
            <p className="jo-note">Current autonomous lane: {text(autonomy.current_lane)}</p>
            <p className="jo-note">
              Configured scheduler_enabled: {text(autonomy.heartbeat_configured_scheduler_enabled)}
            </p>
            <p className="jo-note">Loaded: {text(autonomy.heartbeat_loaded)}</p>
            <p className="jo-note">Disabled: {text(autonomy.heartbeat_disabled)}</p>
            {text(autonomy.deskcrew_stale_note, "") ? (
              <p className="jo-note jo-stale">{text(autonomy.deskcrew_stale_note)}</p>
            ) : null}
            <p className="jo-note">Objective: {text(working.objective ?? view.now.why_selected)}</p>
            <p className="jo-note">Capacity: {text(details.capacity_state ?? view.now.concurrency)}</p>
            <p className="jo-note">Last GET-only: {text(details.last_get_only_result)}</p>
            <p className="jo-note">Packet: {text(details.get_only_packet_id)}</p>
            <p className="jo-note">Closure: {text(details.terminal_closure)}</p>
            <p className="jo-note">Heartbeat: {text(details.heartbeat_run_id)}</p>
            <p className="jo-note">Heartbeat outcome: {text(details.heartbeat_outcome)}</p>
            <p className="jo-note">Unattended: {text(details.unattended_outcome)}</p>
            {working.conflict_with_recorded_work_item ? (
              <p className="jo-note">
                Recorded work item (not live primary): {text(working.recorded_work_item)}{" "}
                ({text(working.recorded_work_item_set_at)})
              </p>
            ) : null}
            {hideWaitingPrimary && waitingExternal.label ? (
              <p className="jo-note">
                Heartbeat observation: {text(waitingExternal.label)} —{" "}
                {text(waitingExternal.detail)}
              </p>
            ) : null}
            {waitingExternal.label && !hideWaitingPrimary ? (
              <p className="jo-note">
                {text(waitingExternal.label)} — {text(waitingExternal.detail)}
              </p>
            ) : null}
          </details>
        </section>

        <details className="jo-panel jo-queue">
          <summary>Next / Queue</summary>
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
            </article>
          ))}
        </details>

        <details className="jo-panel jo-obligations">
          <summary>Open obligations / risks</summary>
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
        </details>

        <details className="jo-panel jo-disappear">
          <summary>If Jared disappears 24h</summary>
          <ul className="jo-list">
            {((view.if_jared_disappears_24h?.what_j_will_continue_doing as string[]) ?? []).map(
              (item) => (
                <li key={item}>{item}</li>
              ),
            )}
          </ul>
        </details>

        <details className="jo-panel jo-funnel">
          <summary>Opportunity funnel</summary>
          <dl className="jo-facts">
            {Object.entries(view.funnel.counts ?? {}).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </details>

        <details className="jo-panel jo-stuck">
          <summary>Passed early / stuck later</summary>
          {(view.funnel.stuck_after_first_filter ?? []).map((row) => (
            <article className="jo-row" key={row.id ?? row.name}>
              <h3>{row.name}</h3>
              <p className="jo-note">Highest stage: {text(row.stage_reached)}</p>
              <p className="jo-note">Why stopped: {text(row.blocker)}</p>
            </article>
          ))}
        </details>

        <details className="jo-panel jo-learning">
          <summary>Historical results / learning</summary>
          {(view.results_learning ?? []).map((row) => (
            <details className="jo-secondary jo-row" key={row.id ?? row.learning}>
              <summary>{text(row.id)}</summary>
              <p className="jo-note">EXPECTED: {text(row.expected)}</p>
              <p className="jo-note">OBSERVED: {text(row.observed)}</p>
              <p className="jo-note">LEARNING: {text(row.learning)}</p>
            </details>
          ))}
        </details>
      </div>
    </div>
  );
}
