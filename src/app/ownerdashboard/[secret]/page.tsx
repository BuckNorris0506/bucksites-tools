import { timingSafeEqual } from "node:crypto";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import type { CommandCenterV2Report } from "../../../../scripts/lib/buckparts-command-center-v2-types";
import { loadCommandCenterReportForOwner } from "@/lib/owner-dashboard/load-command-center-report";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Owner dashboard",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

type PageProps = { params: { secret: string } };

function constantTimeSecretMatch(expected: string, provided: string): boolean {
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function LaneCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-blue-950 px-4 py-3 dark:border-slate-700 dark:bg-blue-950">
        <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs leading-snug text-white/80">{subtitle}</p> : null}
      </div>
      <div className="space-y-3 px-4 py-4 text-sm text-slate-800 dark:text-slate-200 sm:px-5 sm:py-5">{children}</div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "OK"
      ? "bg-emerald-900/15 text-emerald-800 ring-emerald-700/30 dark:text-emerald-300"
      : status === "ATTENTION"
        ? "bg-amber-900/20 text-amber-900 ring-amber-700/40 dark:text-amber-200"
        : status === "BLOCKED" || status === "CRITICAL"
          ? "bg-red-900/25 text-red-950 ring-red-800/40 dark:text-red-200"
          : "bg-slate-200 text-slate-800 ring-slate-400/40 dark:bg-slate-800 dark:text-slate-200";
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${tone}`}
    >
      {status}
    </span>
  );
}

function TokenTable({ label, tokens }: { label: string; tokens: string[] }) {
  if (tokens.length === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}:</span> none
      </p>
    );
  }
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-700">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {tokens.map((t) => (
              <tr key={t} className="bg-slate-50/80 dark:bg-slate-900/40">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-[13px] text-slate-900 dark:text-slate-100">
                  {t}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FieldBlock({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <div className="text-sm leading-relaxed text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

function OwnerDashboardSetupNeeded() {
  return (
    <div className="min-h-[50vh] bg-slate-100 px-4 py-16 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-blue-950 dark:text-white">Owner dashboard</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Set <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs dark:bg-slate-800">OWNER_DASHBOARD_SECRET</code>{" "}
          in your environment and restart the dev server. No secret value is shown here.
        </p>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          This route stays unlisted and is not intended for production use until the variable is configured on the host.
        </p>
      </div>
    </div>
  );
}

export default async function OwnerDashboardPage({ params }: PageProps) {
  const expected = process.env.OWNER_DASHBOARD_SECRET?.trim();

  if (!expected) {
    if (process.env.NODE_ENV === "development") {
      return <OwnerDashboardSetupNeeded />;
    }
    notFound();
  }

  if (!constantTimeSecretMatch(expected, params.secret)) {
    notFound();
  }

  const loaded = await loadCommandCenterReportForOwner();
  if (!loaded.ok) {
    return (
      <div className="min-h-[50vh] bg-slate-100 px-4 py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-white p-6 dark:border-red-900/50 dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-red-900 dark:text-red-200">Report unavailable</h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            Command Center could not be built. Cause is UNKNOWN or non-actionable on this page—check server logs and
            run <code className="font-mono text-xs">npm run buckparts:command-center</code> locally.
          </p>
          <p className="mt-3 font-mono text-xs text-slate-500 dark:text-slate-400">{loaded.message}</p>
        </div>
      </div>
    );
  }

  const { report } = loaded;
  const v2: CommandCenterV2Report = report.command_center_v2;
  const health = report.system_health_summary;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-blue-950 px-4 py-6 dark:border-slate-800 dark:bg-blue-950 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Private · read-only</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Owner dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">
            Command Center v2 snapshot. Data is generated on the server from repo reports; nothing here mutates the
            database.
          </p>
          <p className="mt-3 text-xs text-white/70">
            Generated {report.generated_at} · v2 {v2.generated_at} · {report.report_name}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <LaneCard title="1 · Status / top summary" subtitle="System health from command center v1 digest">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={health.status} />
            <span className="text-xs text-slate-500 dark:text-slate-400">read_only / no mutations</span>
          </div>
          {health.reasons.length > 0 ? (
            <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
              {health.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
          <FieldBlock label="Recommended next step (v1 summary)" value={health.recommended_next_step} />
        </LaneCard>

        <LaneCard title="2 · Amazon rescue" subtitle="Registry + queue–aware cohorts">
          <div className="flex flex-wrap gap-2">
            <StatusPill status={v2.amazon_rescue.status} />
            {v2.amazon_rescue.registry_load_error ? (
              <span className="text-xs font-medium text-red-700 dark:text-red-300">
                Registry: {v2.amazon_rescue.registry_load_error}
              </span>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Registry entries: {v2.amazon_rescue.registry_entry_count} ({v2.amazon_rescue.registry_path})
              </span>
            )}
          </div>
          <FieldBlock
            label="Next allowed agent token"
            value={
              v2.amazon_rescue.next_allowed_agent_token ? (
                <span className="font-mono text-sm">{v2.amazon_rescue.next_allowed_agent_token}</span>
              ) : (
                <span className="text-slate-500">none (UNKNOWN or queue empty after registry)</span>
              )
            }
          />
          <TokenTable label="Fresh search top tokens" tokens={v2.amazon_rescue.fresh_search_top_tokens} />
          <TokenTable label="Human browser required" tokens={v2.amazon_rescue.human_browser_required_tokens} />
          <TokenTable label="Frozen operator hold" tokens={v2.amazon_rescue.frozen_operator_hold_tokens} />
          <TokenTable label="Do not touch (registry)" tokens={v2.amazon_rescue.do_not_touch ?? []} />
          <FieldBlock label="Next agent action" value={v2.amazon_rescue.next_agent_action} />
          <FieldBlock label="Next owner action" value={v2.amazon_rescue.next_owner_action} />
        </LaneCard>

        <LaneCard title="3 · Unknown / human review" subtitle="UNKNOWN evidence and deferred cohort">
          <div className="flex flex-wrap gap-2">
            <StatusPill status={v2.unknown_or_human_review.status} />
            {typeof v2.unknown_or_human_review.count === "number" ? (
              <span className="text-xs text-slate-500">Count: {v2.unknown_or_human_review.count}</span>
            ) : null}
          </div>
          {v2.unknown_or_human_review.blocker ? (
            <p className="text-xs text-amber-900 dark:text-amber-200">{v2.unknown_or_human_review.blocker}</p>
          ) : null}
          <TokenTable label="Top items" tokens={v2.unknown_or_human_review.top_items ?? []} />
          <FieldBlock label="Next agent action" value={v2.unknown_or_human_review.next_agent_action} />
          <FieldBlock label="Next owner action" value={v2.unknown_or_human_review.next_owner_action} />
        </LaneCard>

        <LaneCard title="4 · Coverage health" subtitle="Command surface signals">
          <div className="flex flex-wrap gap-2">
            <StatusPill status={v2.coverage_health.status} />
          </div>
          {v2.coverage_health.blocker ? (
            <p className="text-xs text-slate-700 dark:text-slate-300">{v2.coverage_health.blocker}</p>
          ) : null}
          <TokenTable label="Top reasons" tokens={v2.coverage_health.top_items ?? []} />
          <FieldBlock label="Next agent action" value={v2.coverage_health.next_agent_action} />
          <FieldBlock label="Next owner action" value={v2.coverage_health.next_owner_action} />
        </LaneCard>

        <LaneCard title="5 · Affiliate readiness" subtitle="From tracker-derived lane">
          <div className="flex flex-wrap gap-2">
            <StatusPill status={v2.affiliate_readiness.status} />
          </div>
          <TokenTable label="Signals" tokens={v2.affiliate_readiness.top_items ?? []} />
          <FieldBlock label="Next agent action" value={v2.affiliate_readiness.next_agent_action} />
          <FieldBlock label="Next owner action" value={v2.affiliate_readiness.next_owner_action} />
        </LaneCard>

        <LaneCard title="6 · Recent evidence rollup" subtitle="Filename-level counts (conservative)">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["Live outcomes", v2.recent_evidence.evidence_rollup.live_outcome_count],
                ["Unknown outcomes", v2.recent_evidence.evidence_rollup.unknown_outcome_count],
                ["Fail / hold", v2.recent_evidence.evidence_rollup.fail_hold_outcome_count],
                ["Unclassified JSON", v2.recent_evidence.evidence_rollup.unclassified_json_count],
              ] as const
            ).map(([k, n]) => (
              <div
                key={k}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{k}</p>
                <p className="mt-1 font-mono text-lg text-slate-900 dark:text-slate-50">{n}</p>
              </div>
            ))}
          </div>
          <TokenTable label="Recent evidence filenames" tokens={v2.recent_evidence.evidence_rollup.recent_evidence_filenames} />
          <FieldBlock label="Next agent action" value={v2.recent_evidence.next_agent_action} />
          <FieldBlock label="Next owner action" value={v2.recent_evidence.next_owner_action} />
        </LaneCard>

        <LaneCard title="7 · Next owner action (synthesized)" subtitle="Highest-priority owner step from v2">
          <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100">{v2.next_owner_action}</p>
        </LaneCard>

        <LaneCard title="8 · Next agent action (Amazon lane)" subtitle="Same as Amazon rescue agent guidance">
          <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100">{v2.amazon_rescue.next_agent_action}</p>
        </LaneCard>

        <LaneCard title="9 · Revenue snapshot" subtitle="Placeholder — not implemented in repo">
          <div className="flex flex-wrap gap-2">
            <StatusPill status={v2.revenue_snapshot.status} />
          </div>
          {v2.revenue_snapshot.blocker ? (
            <p className="text-xs text-slate-600 dark:text-slate-400">{v2.revenue_snapshot.blocker}</p>
          ) : null}
          <FieldBlock label="Next owner action" value={v2.revenue_snapshot.next_owner_action} />
        </LaneCard>

        <LaneCard title="10 · Deploy / live-site status" subtitle="Placeholder — not implemented in repo">
          <div className="flex flex-wrap gap-2">
            <StatusPill status={v2.deploy_live_site_status.status} />
          </div>
          {v2.deploy_live_site_status.blocker ? (
            <p className="text-xs text-slate-600 dark:text-slate-400">{v2.deploy_live_site_status.blocker}</p>
          ) : null}
          <FieldBlock label="Next owner action" value={v2.deploy_live_site_status.next_owner_action} />
        </LaneCard>

        <details className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">
            Raw JSON · command_center_v2 (debug)
          </summary>
          <pre className="max-h-[480px] overflow-auto border-t border-slate-200 p-4 text-[11px] leading-snug text-slate-800 dark:border-slate-700 dark:text-slate-200">
            {JSON.stringify(v2, null, 2)}
          </pre>
        </details>
      </main>
    </div>
  );
}
