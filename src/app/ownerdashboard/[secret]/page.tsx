import { timingSafeEqual } from "node:crypto";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import type {
  ApBatchV3RunInstantiationV1,
  BatchProductionOwnerDecisionsLaneV1,
  BatchProductionOperatingChecklistV1,
  BatchProductionOperatingDispatchV1,
  BuckpartsAgentControlPlaneV1,
  BuckpartsMarketingIntelligenceEngineV1,
  CommandCenterV2Report,
  MarketingOpportunityV1,
  TopOfGameFoundationScorecardV1,
} from "../../../../scripts/lib/buckparts-command-center-v2-types";
import { buildRunnerStepVisibilityModeledV1 } from "../../../../scripts/lib/buckparts-runner-step-summary-v1";
import { loadCommandCenterReportForOwner } from "@/lib/owner-dashboard/load-command-center-report";
import {
  buildFounderControlPlaneModel,
  type FounderControlLaneCategory,
  type FounderControlPlaneModel,
} from "@/lib/owner-dashboard/founder-control-plane-model";
import {
  buildFounderActionQueueForOwnerDashboard,
  type FounderActionQueueRowV1,
} from "@/lib/owner-dashboard/founder-action-queue-v1";
import {
  buildFounderExecutionPacketsV1,
  type FounderExecutionPacketV1,
} from "@/lib/owner-dashboard/founder-execution-packet-v1";
import {
  buildFounderDecisionPacketsV1,
} from "@/lib/owner-dashboard/founder-decision-packet-v1";
import { FOUNDER_DECISION_REGISTRY_OWNER_DASHBOARD_LINE_V1 } from "@/lib/owner-dashboard/founder-decision-registry-v1";
import {
  buildFounderDecisionRegistryReadModelV1,
  type FounderDecisionRegistryReadModelV1,
} from "@/lib/owner-dashboard/founder-decision-registry-read-model-v1";
import { scanFounderDecisionRegistryJsonFilesV1 } from "@/lib/owner-dashboard/founder-decision-registry-scan-v1";
import { loadClosedOarPrecedentSubstratesV1 } from "@/lib/owner-dashboard/precedent-clause-drafting-v1";
import {
  FAILURE_PATTERN_REGISTRY_OWNER_DASHBOARD_LINE_V1,
  buildFailurePatternRegistryReadModelFromSeededV1,
  formatFailurePatternRegistryInformationalLineV1,
  type FailurePatternRegistryReadModelV1,
} from "@/lib/owner-dashboard/failure-pattern-registry-v1";
import {
  CODEX_PACKET_PROOF_OWNER_DASHBOARD_LINE_V1,
} from "@/lib/owner-dashboard/codex-packet-proof-read-model-v1";
import {
  CODEX_OUTPUT_REVIEW_OWNER_DASHBOARD_LINE_V1,
} from "@/lib/owner-dashboard/codex-output-review-packet-v1";
import {
  LAYER_SIX_READINESS_OWNER_DASHBOARD_LINE_V1,
  buildLayerSixReadinessSummaryV1,
  type LayerSixReadinessSummaryV1,
} from "@/lib/owner-dashboard/layer-six-readiness-summary-v1";
import type { SemiCruiseStatusSummaryV1 } from "@/lib/owner-dashboard/semi-cruise-status-summary-v1";
import {
  buildCustomerRealityAuthorityGatedModelV1,
  type CustomerRealityAuthorityGatedModelV1,
} from "@/lib/owner-dashboard/customer-reality-authority-gated-v1";
import type { CustomerClosureReportV1 } from "../../../../scripts/lib/customer-closure-report-v1";
import type { CustomerRealityScoreboardV1 } from "../../../../scripts/lib/customer-reality-scoreboard-v1";
import type { CustomerSteeringComparisonV1 } from "../../../../scripts/lib/customer-steering-comparison-v1";

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

/** Foundation lane status (distinct from operational OK/ATTENTION pills). */
function FoundationLaneStatusPill({ status }: { status: string }) {
  const tone =
    status === "PROVEN"
      ? "bg-emerald-900/15 text-emerald-800 ring-emerald-700/30 dark:text-emerald-300"
      : status === "PARTIAL"
        ? "bg-amber-900/20 text-amber-900 ring-amber-700/40 dark:text-amber-200"
        : status === "BLOCKED"
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

function ExecutiveSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border-2 border-blue-950/20 bg-white shadow-md dark:border-blue-900/50 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/80">
        <h2 className="text-lg font-semibold tracking-tight text-blue-950 dark:text-white">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-xs leading-snug text-slate-600 dark:text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      <div className="space-y-4 px-4 py-4 text-sm text-slate-800 dark:text-slate-200 sm:px-5 sm:py-5">{children}</div>
    </section>
  );
}

function TopOfGameFoundationSection({ tog }: { tog: TopOfGameFoundationScorecardV1 }) {
  const score = tog.foundation_maturity_score_100;
  const scoreLabel = `${score} / 100`;
  return (
    <ExecutiveSection
      title="Top-of-Game Foundation"
      subtitle="Read-only Command Center v2 contract (top_of_game_foundation_scorecard_v1). Lane scores summarize backend readiness — not PDP compatibility proof, not public publish approval, and not dollar payouts from click_events."
    >
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Maturity score</p>
          <p className="mt-0.5 font-mono text-2xl font-semibold text-slate-900 dark:text-slate-50">{scoreLabel}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Goal</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {tog.goal_reached ? "GOAL REACHED" : "GOAL NOT REACHED"}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Dashboard readiness (scorecard flag)
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {tog.owner_dashboard_ready ? "Dashboard wiring: ready" : "Dashboard wiring: in progress"}
          </p>
        </div>
      </div>
      <FieldBlock
        label="Scorecard note"
        value={<span className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{tog.owner_dashboard_note}</span>}
      />
      <FieldBlock label="Runtime" value={tog.runtime_status} />
      <FieldBlock
        label="Foundation lanes"
        value={
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900/60">
                <tr>
                  {["Lane", "Status", "Score", "Next proof"].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-3 py-2 font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tog.lanes.map((lane) => (
                  <tr key={lane.lane_id} className="bg-white dark:bg-slate-950">
                    <td className="max-w-[14rem] px-3 py-2 align-top text-slate-900 dark:text-slate-100">
                      <p className="text-[13px] font-medium leading-snug">{lane.label}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{lane.lane_id}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top">
                      <FoundationLaneStatusPill status={lane.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top font-mono text-[12px] text-slate-900 dark:text-slate-100">
                      {lane.score_contribution} / {lane.max_contribution}
                    </td>
                    <td className="max-w-[22rem] px-3 py-2 align-top text-[11px] leading-snug text-slate-700 dark:text-slate-300">
                      {lane.next_proof_required}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      />
      <FieldBlock
        label="Foundation blockers"
        value={
          tog.blockers.length === 0 ? (
            <span className="text-sm text-slate-700 dark:text-slate-300">No foundation blockers.</span>
          ) : (
            <ul className="list-inside list-disc space-y-1 text-xs text-slate-800 dark:text-slate-200">
              {tog.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )
        }
      />
      <FieldBlock label="Next best foundation move" value={tog.next_best_foundation_move} />
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        Revenue / commission on this page still follows click_visibility + ledger contracts — high lane scores do not mean
        shoppers or verified affiliate payouts.
      </p>
    </ExecutiveSection>
  );
}

function DrilldownGroup({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <details
      id={id}
      className="group rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950"
    >
      <summary className="cursor-pointer select-none list-none px-4 py-3 text-sm font-semibold text-slate-900 outline-none marker:hidden dark:text-slate-100 [&::-webkit-details-marker]:hidden">
        <span className="mr-2 inline-block translate-y-px text-slate-400 transition-transform group-open:rotate-90">
          ▸
        </span>
        {title}
      </summary>
      <div className="space-y-6 border-t border-slate-200 px-4 py-4 dark:border-slate-700">{children}</div>
    </details>
  );
}

function ControlPlaneCategoryPill({ category }: { category: FounderControlLaneCategory }) {
  const tone: Record<FounderControlLaneCategory, string> = {
    AUTOMATIC: "bg-emerald-900/15 text-emerald-800 ring-emerald-700/30 dark:text-emerald-300",
    MANUAL: "bg-slate-200 text-slate-900 ring-slate-400/40 dark:bg-slate-800 dark:text-slate-100",
    OWNER_DECISION: "bg-amber-900/25 text-amber-950 ring-amber-800/35 dark:text-amber-200",
    AGENT_READ_ONLY: "bg-blue-900/20 text-blue-950 ring-blue-800/35 dark:text-blue-200",
    HUMAN_BROWSER_REQUIRED: "bg-violet-900/25 text-violet-950 ring-violet-800/35 dark:text-violet-200",
    UNKNOWN: "bg-slate-200 text-slate-800 ring-slate-400/40 dark:bg-slate-800 dark:text-slate-200",
  };
  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${tone[category]}`}
    >
      {category.replaceAll("_", " ")}
    </span>
  );
}

function FounderControlPlaneSection({ model }: { model: FounderControlPlaneModel }) {
  return (
    <ExecutiveSection
      title="Founder Control Plane"
      subtitle="Read-only snapshot: how work runs (automatic vs manual), who must act, and what stays unknown — derived from this Command Center load plus on-disk workflow/package.json listing."
    >
      <p className="rounded-md border border-blue-200 bg-blue-50/80 px-3 py-2 text-sm leading-relaxed text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100">
        {model.goal_line}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Next best action</p>
          <p className="mt-1 text-sm font-medium leading-snug text-slate-900 dark:text-slate-100">{model.next_best_action}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Copy / paste burden</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{model.copy_paste_burden_note}</p>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Simplification target</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-800 dark:text-slate-200">{model.simplification_target}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {model.cards.map((card) => (
          <div
            key={card.category}
            className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-900/60"
          >
            <div className="flex flex-wrap items-center gap-2">
              <ControlPlaneCategoryPill category={card.category} />
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{card.title}</span>
            </div>
            <ul className="list-inside list-disc space-y-1.5 text-[11px] leading-snug text-slate-700 dark:text-slate-300">
              {card.lines.map((line, i) => (
                <li key={i} className="marker:text-slate-400">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Notification wiring (Slack, email) for CI jobs is not shown here — treat as UNKNOWN unless configured outside this repo.
      </p>
    </ExecutiveSection>
  );
}

function AuthorityModePill({ mode }: { mode: CustomerRealityAuthorityGatedModelV1["authority_mode"] }) {
  const tone =
    mode === "AUTHORITY_GATED_ACTIVE"
      ? "bg-red-900/25 text-red-950 ring-red-800/40 dark:text-red-200"
      : mode === "ADVISORY_COMPARE"
        ? "bg-amber-900/20 text-amber-900 ring-amber-700/40 dark:text-amber-200"
        : "bg-slate-200 text-slate-800 ring-slate-400/40 dark:bg-slate-800 dark:text-slate-200";
  const label =
    mode === "AUTHORITY_GATED_ACTIVE"
      ? "Authority gates active (advisory)"
      : mode === "ADVISORY_COMPARE"
        ? "Compare both (visibility)"
        : "Visibility only (dry-run)";
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${tone}`}
    >
      {label}
    </span>
  );
}

function BuyerTrustSurfaceTemplatePanel({
  template,
}: {
  template: CustomerRealityAuthorityGatedModelV1["trust_surface_template"];
}) {
  return (
    <div
      data-testid="buyer-trust-surface-template-v1"
      className="rounded-md border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-900/60"
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Buyer trust surface template (reusable PDP pattern)
      </p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <FieldBlock label="Certainty status" value={template.certainty_status} />
        <FieldBlock label="Verified path status" value={template.verified_path_status} />
        <FieldBlock label="Wrong-part risk" value={template.wrong_part_risk} />
        <FieldBlock label="Evidence basis" value={template.evidence_basis} />
        <FieldBlock label="Why not buy" value={template.why_not_buy ?? "—"} />
        <FieldBlock label="Why safe" value={template.why_safe ?? "—"} />
        <FieldBlock label="Closure proof" value={template.closure_proof ?? "UNKNOWN — no PROVEN customer-visible closure in this snapshot."} />
      </div>
    </div>
  );
}

function CustomerRealityAuthorityGatedSection({
  model,
  scoreboard,
  steering,
  closure,
}: {
  model: CustomerRealityAuthorityGatedModelV1;
  scoreboard: CustomerRealityScoreboardV1 | null | undefined;
  steering: CustomerSteeringComparisonV1 | null | undefined;
  closure: CustomerClosureReportV1 | null | undefined;
}) {
  const defaultOpen = model.authority_mode === "AUTHORITY_GATED_ACTIVE";
  return (
    <details
      open={defaultOpen}
      data-testid="customer-reality-authority-gated-v1"
      className="group rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950"
    >
      <summary className="cursor-pointer select-none list-none px-4 py-3 outline-none marker:hidden [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 inline-block translate-y-px text-slate-400 transition-transform group-open:rotate-90">
            ▸
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Customer Reality · authority-gated visibility
          </span>
          <AuthorityModePill mode={model.authority_mode} />
        </div>
        <p className="mt-1 pl-5 text-xs leading-snug text-slate-600 dark:text-slate-400">
          Dry-run lanes only. Factory <code className="font-mono text-[11px]">next_best_action</code> is unchanged.
          Customer steering earns advisory prominence only when lane gates are PROVEN.
        </p>
      </summary>
      <div className="space-y-5 border-t border-slate-200 px-4 py-4 dark:border-slate-700">
        <p
          className={`rounded-md border px-3 py-2 text-xs leading-relaxed ${
            model.authority_claim_permitted
              ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100"
              : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
          }`}
        >
          {model.authority_claim_permitted
            ? "Authority gates are PROVEN for this snapshot. Customer dry-run is advisory — it does not replace factory next_best_action or Founder Action Queue steering."
            : model.why_factory_remains_primary}
        </p>
        <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
          {model.authority_gate_reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>

        <div data-testid="customer-steering-comparison-v1" className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Steering comparison (dry-run)
          </p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-md border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-800 dark:text-blue-300">
                Factory NBA (primary)
              </p>
              <p className="mt-1 text-sm font-medium leading-snug text-slate-900 dark:text-slate-100">
                {model.factory_next_best_action}
              </p>
              {model.steering_override_source ? (
                <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                  Override source: {model.steering_override_source}
                </p>
              ) : null}
            </div>
            <div className="rounded-md border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/40 dark:bg-violet-950/20">
              <p className="text-[10px] font-bold uppercase tracking-wide text-violet-800 dark:text-violet-300">
                Customer dry-run action
              </p>
              <p className="mt-1 text-sm font-medium leading-snug text-slate-900 dark:text-slate-100">
                {model.customer_dry_run_action ?? "UNKNOWN"}
              </p>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                dry_run_only · replaces_next_best_action=false
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FieldBlock
              label="Conflict"
              value={model.conflicts_with_factory === null ? "UNKNOWN" : String(model.conflicts_with_factory)}
            />
            <FieldBlock label="Customer tier" value={model.customer_tier === null ? "UNKNOWN" : String(model.customer_tier)} />
            <FieldBlock
              label="Blocks discovery"
              value={model.blocks_discovery === null ? "UNKNOWN" : String(model.blocks_discovery)}
            />
            <FieldBlock
              label="Founder review primary"
              value={model.recommended_primary_for_founder_review ?? "UNKNOWN"}
            />
          </div>
          {model.why_customer_may_outrank_factory ? (
            <FieldBlock label="Why customer may outrank factory" value={model.why_customer_may_outrank_factory} />
          ) : null}
          {steering?.factory_steering.why_this_action ? (
            <FieldBlock label="Why factory NBA" value={steering.factory_steering.why_this_action} />
          ) : null}
        </div>

        {scoreboard ? (
          <div data-testid="customer-reality-scoreboard-v1" className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Customer reality scoreboard
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FieldBlock label="Verified buyer paths" value={scoreboard.verified_buyer_path_coverage.summary} />
              <FieldBlock label="Certainty visibility" value={scoreboard.certainty_visibility_status.summary} />
              <FieldBlock label="Wrong-part exposure" value={scoreboard.wrong_part_exposure_status.summary} />
              <FieldBlock label="Repair closure" value={scoreboard.repair_closure_status.summary} />
              <FieldBlock label="Search failures" value={scoreboard.search_failure_status.summary} />
              <FieldBlock label="Commission truth" value={scoreboard.commission_truth_status.summary} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">customer_reality_scoreboard_v1: not present.</p>
        )}

        {closure ? (
          <div data-testid="customer-closure-report-v1" className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Customer closure report
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FieldBlock
                label="Customer-visible closures"
                value={String(closure.customer_visible_closures_count)}
              />
              <FieldBlock label="Closure confidence" value={closure.closure_confidence} />
              <FieldBlock
                label="Discovery without closure"
                value={String(closure.discovery_without_closure_ratio)}
              />
              <FieldBlock
                label="Pages upgraded this week"
                value={closure.pages_upgraded_this_week_status.summary}
              />
            </div>
            {closure.customer_visible_shipments.filter((s) => s.customer_visible).length > 0 ? (
              <FieldBlock
                label="Proven customer-visible slugs (sample)"
                value={
                  <ul className="list-inside list-disc text-xs">
                    {closure.customer_visible_shipments
                      .filter((s) => s.customer_visible)
                      .slice(0, 8)
                      .map((s) => (
                        <li key={s.slug}>
                          {s.slug} · {s.census_classification}
                        </li>
                      ))}
                  </ul>
                }
              />
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-slate-500">customer_closure_report_v1: not present.</p>
        )}

        <BuyerTrustSurfaceTemplatePanel template={model.trust_surface_template} />
      </div>
    </details>
  );
}

function founderActionQueueStatusLabel(status: FounderActionQueueRowV1["status"]): string {
  switch (status) {
    case "needs_owner":
      return "Your decision";
    case "agent_safe":
      return "Agent · read-only";
    case "blocked":
      return "Blocked";
    case "waiting":
      return "Waiting";
    case "do_not_touch":
      return "Scope guard (do not expand mutating work)";
    default:
      return status;
  }
}

function FounderActionQueueSection({
  queue,
}: {
  queue: ReturnType<typeof buildFounderActionQueueForOwnerDashboard>;
}) {
  return (
    <ExecutiveSection
      title="Founder Action Queue"
      subtitle="Read-only v1 — up to seven prioritized actions derived from Command Center (owner-specific items first, then read-only agent work, then blocked or waiting dependencies, scope guards last)."
    >
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        Machine-readable contract <span className="font-mono text-[11px]">{queue.contract}</span> — this section does not
        write Supabase, affiliate data, retailer links, or evidence files.
      </p>
      <div className="space-y-4">
        {queue.rows.map((row, idx) => (
          <div
            key={`${row.id}-${idx}`}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/50"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Priority {idx + 1}
                </p>
                <h3 className="mt-0.5 text-base font-semibold text-slate-900 dark:text-slate-50">{row.title}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-800 ring-1 ring-slate-300/60 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600/60">
                  {founderActionQueueStatusLabel(row.status)}
                  <span className="ml-1 font-mono normal-case text-slate-500 dark:text-slate-400">({row.status})</span>
                </span>
                <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-950 ring-1 ring-blue-200/70 dark:bg-blue-950/40 dark:text-blue-100 dark:ring-blue-800/50">
                  Burden: {row.owner_burden}
                </span>
                <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-950 ring-1 ring-emerald-200/70 dark:bg-emerald-950/30 dark:text-emerald-100 dark:ring-emerald-800/40">
                  Actor: {row.recommended_actor}
                </span>
                <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-950 ring-1 ring-amber-200/70 dark:bg-amber-950/30 dark:text-amber-100 dark:ring-amber-800/40">
                  Mutations: {row.mutation_authority.replace(/_/g, " ")}
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-800 dark:text-slate-200">{row.next_action}</p>
            <p className="mt-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Evidence basis:</span> {row.evidence_basis}
            </p>
          </div>
        ))}
      </div>
    </ExecutiveSection>
  );
}

function FounderDecisionPacketsSection({
  model,
}: {
  model: ReturnType<typeof buildFounderDecisionPacketsV1>;
}) {
  const top = model.decision_packets.slice(0, 3);
  return (
    <ExecutiveSection
      title="Founder Decision Packets"
      subtitle="Owner-only v1 — structured decisions for queue rows that are not agent-safe execution candidates (needs_owner / blocked / waiting with founder or external actor, or gated agent rows). Copy is row-class-specific where queue ids match built-in lanes (human browser, affiliate, mutating gates, next_best_action, generic). Not copy/paste prompts for autonomous agents."
    >
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        Contract <span className="font-mono text-[11px]">{model.contract}</span> · read_only={String(model.read_only)} ·
        data_mutation={String(model.data_mutation)} · decision packets: {model.decision_packets.length} · skipped queue
        rows: {model.skipped_rows.length}
      </p>
      <p className="mt-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
        Owner-only: these packets do not grant agents mutation authority or replace Founder Execution Packets below.
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        {FOUNDER_DECISION_REGISTRY_OWNER_DASHBOARD_LINE_V1}
      </p>
      {top.length === 0 ? (
        <p className="mt-2 text-sm text-slate-800 dark:text-slate-200">
          <span className="font-semibold text-slate-900 dark:text-slate-100">PROVEN:</span> No owner decision packets
          for this queue snapshot (e.g. only agent_safe rows or scope guards).
        </p>
      ) : (
        <div className="mt-3 space-y-5">
          {top.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{p.title}</h3>
                <span className="text-[11px] font-medium text-amber-950 dark:text-amber-100">
                  Blocked until decided: {String(p.blocked_until_decided)}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Decision needed:</span>{" "}
                {p.decision_needed}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{p.why_jared}</p>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Evidence basis:</span> {p.evidence_basis}
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                {p.options.map((o) => (
                  <li key={o.id}>
                    <span className="font-mono text-[10px]">{o.id}</span>: {o.label}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300">Recommended next</p>
              <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-2 font-mono text-[10px] leading-relaxed text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                {p.recommended_next_prompt_or_command}
              </pre>
            </div>
          ))}
        </div>
      )}
    </ExecutiveSection>
  );
}

function BatchProductionOperatingChecklistSection({
  checklist,
  dispatch,
  runInstantiation,
}: {
  checklist: BatchProductionOperatingChecklistV1;
  dispatch: BatchProductionOperatingDispatchV1;
  runInstantiation?: ApBatchV3RunInstantiationV1 | null;
}) {
  const run = checklist.runs[0] ?? null;
  const stageRows = checklist.stages.length > 0 ? checklist.stages : (run?.stages ?? []);
  const currentStageId = dispatch.current_stage_id;

  return (
    <ExecutiveSection
      title="Batch Production Operating Checklist"
      subtitle="Command Center owns the loop — this page only displays what Command Center dispatched. Do not manage batch work from the dashboard."
    >
      <div data-testid="batch-production-operating-checklist" className="space-y-5">
        <div
          data-testid="batch-production-operating-dispatch"
          className="rounded-lg border border-blue-300/80 bg-gradient-to-br from-blue-50/95 to-white p-4 shadow-sm dark:border-blue-700/50 dark:from-blue-950/50 dark:to-slate-950"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-blue-800 dark:text-blue-200">
            Command Center selected next action
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusPill status={dispatch.runtime_status} />
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-800 ring-1 ring-slate-400/40 dark:bg-slate-800 dark:text-slate-200">
              {dispatch.dispatch_status.replaceAll("_", " ")}
            </span>
            <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400">{dispatch.selected_subsystem}</span>
            <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400">via {dispatch.command_surface}</span>
          </div>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-900 dark:text-slate-100">
            {dispatch.why_this_is_next}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FieldBlock label="Current stage" value={currentStageId ?? "Loop clear"} />
            <FieldBlock label="Next stage" value={dispatch.next_stage_id ?? "—"} />
            <FieldBlock
              label="Expansion"
              value={dispatch.expansion_blocked ? "Blocked by dispatch" : "Allowed when READY"}
            />
            <FieldBlock label="Mutation" value={dispatch.mutation_allowed ? "allowed" : "blocked"} />
            <FieldBlock label="Owner approval" value={dispatch.owner_approval_required ? "required" : "not required"} />
            <FieldBlock label="Exact command" value={<span className="break-all font-mono text-xs">{dispatch.exact_command}</span>} />
          </div>
          <FieldBlock label="Proof required before execution" value={dispatch.proof_required_before_execution} />
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <FieldBlock
              label="Allowed mutations"
              value={dispatch.allowed_mutations.length > 0 ? dispatch.allowed_mutations.join(", ") : "none (read-only)"}
            />
            <FieldBlock label="Forbidden mutations" value={dispatch.forbidden_mutations.join(", ")} />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <FieldBlock label="On success" value={dispatch.success_transition} />
            <FieldBlock label="On failure" value={dispatch.failure_transition} />
          </div>
          {dispatch.blocked_reasons.length > 0 ? (
            <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-amber-900 dark:text-amber-200">
              {dispatch.blocked_reasons.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {runInstantiation && runInstantiation.run_id !== "UNKNOWN" ? (
          <div
            data-testid="batch-production-ap-batch-v3-run-plan"
            className="rounded-lg border border-emerald-300/70 bg-emerald-50/70 p-4 text-xs text-slate-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-slate-200"
          >
            <p className="font-semibold">Command Center AP batch run ({runInstantiation.run_id})</p>
            <p className="mt-2 text-[11px] text-slate-700 dark:text-slate-300">
              Packet stage: {runInstantiation.packet_stage_status}
              {runInstantiation.packets_stage_complete ? " · packets committed on disk" : ""}
              {" · "}run id source: {runInstantiation.active_run_id_source}
            </p>
            <p className="mt-2">
              Buyer-path candidates: {runInstantiation.buyer_path_candidate_count} · catalog-review:{" "}
              {runInstantiation.catalog_review_candidate_count} · owner-review (separate):{" "}
              {runInstantiation.owner_review_candidate_count}
            </p>
            <p className="mt-1 text-slate-600 dark:text-slate-400">{runInstantiation.next_command_center_step}</p>
          </div>
        ) : null}

        <details className="rounded-lg border border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/30">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
            Checklist reference (read-only — not for manual management)
          </summary>
          <div className="space-y-4 border-t border-slate-200 px-4 py-4 dark:border-slate-700">
            <div data-testid="batch-production-operating-decision" className="text-xs text-slate-700 dark:text-slate-300">
              <p>
                Checklist status: {checklist.runtime_status} · expansion:{" "}
                {checklist.expansion_readiness.ready_to_add_products_or_wedges === true
                  ? "growth mode ready"
                  : checklist.expansion_readiness.ready_to_add_products_or_wedges === false
                    ? "not ready"
                    : "unknown"}
              </p>
            </div>
            <div data-testid="batch-production-expansion-readiness">
              <p className="text-xs text-slate-600 dark:text-slate-400">{checklist.expansion_readiness.summary}</p>
              {checklist.closed_run_notes.length > 0 ? (
                <ul
                  data-testid="batch-production-closed-run-notes"
                  className="mt-2 list-inside list-disc text-xs text-slate-600 dark:text-slate-400"
                >
                  {checklist.closed_run_notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div data-testid="batch-production-stage-list">
              <ol className="space-y-2">
                {stageRows.map((stage) => (
                  <li key={stage.stage_id} className="rounded border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-950">
                    <span className="font-medium">{stage.stage_label}</span> · {stage.status}
                    {stage.stage_id === currentStageId ? " · current" : ""}
                  </li>
                ))}
              </ol>
            </div>
            <div data-testid="batch-production-setbacks">
              {checklist.setbacks.fired.length > 0 ? (
                <ul className="list-inside list-disc text-xs text-amber-900 dark:text-amber-200">
                  {checklist.setbacks.fired.map((s) => (
                    <li key={s.detector_id}>{s.display_name}</li>
                  ))}
                </ul>
              ) : checklist.closed_run_notes.length > 0 ? (
                <ul
                  data-testid="batch-production-closed-run-notes-setbacks"
                  className="list-inside list-disc text-xs text-slate-600 dark:text-slate-400"
                >
                  {checklist.closed_run_notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-400">No fired setbacks.</p>
              )}
            </div>
          </div>
        </details>
      </div>
    </ExecutiveSection>
  );
}


function AgentControlPlaneSection({ plane }: { plane: BuckpartsAgentControlPlaneV1 }) {
  return (
    <ExecutiveSection
      title="Agent Control Plane v1"
      subtitle="Read-only always-on agent queue — does not replace batch dispatch; product mutations stay Command Center–gated."
    >
      <div data-testid="agent-control-plane-v1" className="space-y-3">
        <p className="text-sm text-slate-800 dark:text-slate-200">{plane.always_on_queue_summary}</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-700 dark:text-slate-300 sm:grid-cols-4">
          <dt className="font-semibold text-slate-600 dark:text-slate-400">eligible_jobs</dt>
          <dd>{plane.eligible_job_count}</dd>
          <dt className="font-semibold text-slate-600 dark:text-slate-400">ap_batch_v3</dt>
          <dd>{plane.ap_batch_v3_truth.classification}</dd>
          <dt className="font-semibold text-slate-600 dark:text-slate-400">csv_mutations</dt>
          <dd>{plane.ap_batch_v3_truth.safe_csv_mutation_count}</dd>
          <dt className="font-semibold text-slate-600 dark:text-slate-400">catalog_actions</dt>
          <dd>{plane.ap_batch_v3_truth.catalog_owner_action_count}</dd>
        </dl>
        {plane.eligible_jobs.length > 0 ? (
          <ul className="space-y-2 text-xs text-slate-800 dark:text-slate-200">
            {plane.eligible_jobs.map((job) => (
              <li
                key={job.job_id}
                className="rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950"
              >
                <span className="font-mono font-semibold">{job.agent_lane}</span>
                <span className="ml-2 text-slate-500">({job.permission_level})</span>
                <p className="mt-1 text-slate-600 dark:text-slate-400">{job.why_eligible_or_blocked}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-600 dark:text-slate-400">No eligible jobs in this snapshot.</p>
        )}
      </div>
    </ExecutiveSection>
  );
}

function MarketingIntelligenceEngineSection({
  engine,
}: {
  engine: BuckpartsMarketingIntelligenceEngineV1;
}) {
  const rows: MarketingOpportunityV1[] = engine.selected_opportunities;

  return (
    <ExecutiveSection
      title="Marketing Intelligence — Wrong Part Prevention Department"
      subtitle="From Command Center v2 marketing_intelligence_engine_v1 — ranked asset briefs only; not a campaign manager."
    >
      <div data-testid="marketing-intelligence-engine-v1" className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100">
          <span className="font-semibold">{engine.motto}</span> — read-only opportunities from GSC demand, buyer-path
          coverage, batch lane, and aggregator truth. No auto-publish.
        </p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-700 dark:text-slate-300 sm:grid-cols-4">
          <dt className="font-semibold text-slate-600 dark:text-slate-400">source_status</dt>
          <dd>{engine.source_status}</dd>
          <dt className="font-semibold text-slate-600 dark:text-slate-400">opportunity_count</dt>
          <dd>{engine.opportunity_count}</dd>
          <dt className="font-semibold text-slate-600 dark:text-slate-400">selected</dt>
          <dd>{rows.length}</dd>
          <dt className="font-semibold text-slate-600 dark:text-slate-400">read_only</dt>
          <dd>{String(engine.read_only)}</dd>
        </dl>
        {rows.length === 0 ? (
          <p className="text-xs text-slate-600 dark:text-slate-400">No selected opportunities in this snapshot.</p>
        ) : (
          <ol className="space-y-3">
            {rows.map((opp) => (
              <li
                key={opp.opportunity_id}
                className="rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-950"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-500">{opp.opportunity_id}</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase dark:bg-slate-800">
                    {opp.opportunity_class.replaceAll("_", " ")}
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    {opp.publishability_status.replaceAll("_", " ")}
                  </span>
                  <span className="text-[10px] text-slate-500">rank {opp.rank_score}</span>
                </div>
                <p className="mt-2 font-medium text-slate-900 dark:text-slate-100">{opp.plain_english_explanation}</p>
                <p className="mt-1 text-slate-700 dark:text-slate-300">{opp.trust_copy_angle}</p>
                {opp.sarcastic_hooks[0] ? (
                  <p className="mt-2 italic text-slate-600 dark:text-slate-400">{opp.sarcastic_hooks[0]}</p>
                ) : null}
                {opp.blocked_reasons.length > 0 ? (
                  <ul className="mt-2 list-inside list-disc text-amber-900 dark:text-amber-200">
                    {opp.blocked_reasons.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </ExecutiveSection>
  );
}

function BatchProductionOwnerDecisionsLaneSection({
  lane,
}: {
  lane: BatchProductionOwnerDecisionsLaneV1;
}) {
  const excludedText =
    lane.excluded_not_owner_review_ready_row_ids === "UNKNOWN"
      ? null
      : lane.excluded_not_owner_review_ready_row_ids.length > 0
        ? lane.excluded_not_owner_review_ready_row_ids.join(", ")
        : null;

  return (
    <ExecutiveSection
      title="Batch Production Lane · Layer 7 owner decisions"
      subtitle="From Command Center v2 batch_production_owner_decisions_lane_v1 — read-only planning scope only"
    >
      <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100">
        Batch Production Lane v1 is proven through a 5-row read-only owner-decision loop. Three rows are approved for
        planning/read-model work only. No production mutation authority exists.
      </p>
      {excludedText ? (
        <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">
          Excluded / not owner-review-ready (Command Center):{" "}
          <span className="font-mono text-[11px]">{excludedText}</span>
        </p>
      ) : null}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-700 dark:text-slate-300 sm:grid-cols-3">
        <dt className="font-semibold text-slate-600 dark:text-slate-400">runtime_status</dt>
        <dd>{lane.runtime_status}</dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">approved_for_planning_count</dt>
        <dd>{lane.approved_for_planning_count}</dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">source_row_count</dt>
        <dd>{String(lane.source_row_count)}</dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">may_mutate</dt>
        <dd>{String(lane.may_mutate)}</dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">batch_size_20_status</dt>
        <dd>{lane.batch_size_20_status}</dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">layer_6 production mutation</dt>
        <dd>{lane.layer_6_founder_only_production_mutation_approval}</dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">primary registry file</dt>
        <dd className="font-mono text-[10px] break-all">{lane.primary_source_registry_file}</dd>
      </dl>
      {lane.approved_rows.length > 0 ? (
        <div className="mt-3 overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900/60">
              <tr>
                {["row_id", "token", "founder_option_id", "allowed_next_scope"].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2 font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lane.approved_rows.map((r) => (
                <tr key={r.row_id} className="bg-white dark:bg-slate-950">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px]">{r.row_id}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px]">{r.token}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px]">{r.founder_option_id}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px]">{r.allowed_next_scope}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <FieldBlock label="next_agent_action" value={lane.next_agent_action} />
    </ExecutiveSection>
  );
}

function FounderDecisionRegistryReadModelSection({
  model,
}: {
  model: FounderDecisionRegistryReadModelV1;
}) {
  return (
    <ExecutiveSection
      title="Founder Decision Registry (read model v1)"
      subtitle="Read-only scan of data/owner-decisions/*.json. Counts are informational only — BuckParts does not consume registry rows for queues, Decision Packets, Execution Packets, Runner Step, or mutation gates."
    >
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        Contract <span className="font-mono text-[11px]">{model.contract}</span> · read_only={String(model.read_only)} ·
        data_mutation={String(model.data_mutation)}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-700 dark:text-slate-300 sm:grid-cols-3">
        <dt className="font-semibold text-slate-600 dark:text-slate-400">JSON documents</dt>
        <dd>{model.total_documents}</dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">Row slots</dt>
        <dd>{model.total_rows}</dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">Valid / invalid</dt>
        <dd>
          {model.valid_rows} / {model.invalid_rows}
        </dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">Codex review-linked rows</dt>
        <dd>{model.codex_output_review_decision_rows}</dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">approve_readonly (registry)</dt>
        <dd>{model.approved_readonly_findings_count}</dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">reject / follow-up / defer</dt>
        <dd>
          {model.rejected_findings_count} / {model.request_followup_readonly_count} / {model.deferred_review_count}
        </dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">Active mutation approvals</dt>
        <dd>{model.active_mutation_approvals}</dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">Expired / review-due</dt>
        <dd>{model.expired_or_review_due_rows}</dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">read_only_agent</dt>
        <dd>{model.read_only_agent_rows}</dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">human_external</dt>
        <dd>{model.human_external_rows}</dd>
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        PROVEN: Codex Output Review decisions may be recorded with optional <span className="font-mono text-[10px]">codex_output_review_context_v1</span> in registry JSON — counts are visibility only; they do not authorize Supabase writes, retailer_links mutation, evidence edits, affiliate changes, git commits, or Runner automation.
      </p>
      <p className="mt-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
        PROVEN: This section does not grant automation authority; npm run buckparts:founder-decision-registry emits the same read model JSON to stdout.
      </p>
    </ExecutiveSection>
  );
}

function FailurePatternRegistrySection({ model }: { model: FailurePatternRegistryReadModelV1 }) {
  const line = formatFailurePatternRegistryInformationalLineV1(model);
  return (
    <ExecutiveSection
      title="Failure Pattern Registry (v1)"
      subtitle={FAILURE_PATTERN_REGISTRY_OWNER_DASHBOARD_LINE_V1}
    >
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        Contract <span className="font-mono text-[11px]">{model.contract}</span> · read_only={String(model.read_only)} ·
        data_mutation={String(model.data_mutation)} · informational_only={String(model.informational_only)}
      </p>
      <p className="mt-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300">{line}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-700 dark:text-slate-300 sm:grid-cols-4">
        <dt className="font-semibold text-slate-600 dark:text-slate-400">guarded</dt>
        <dd>{model.guarded_count}</dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">unguarded (observed)</dt>
        <dd>{model.unguarded_count}</dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">recurring</dt>
        <dd>{model.recurring_count}</dd>
        <dt className="font-semibold text-slate-600 dark:text-slate-400">unknown_guardrail</dt>
        <dd>{model.unknown_guardrail_count}</dd>
      </dl>
      <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
        {model.rows.map((r) => (
          <li key={r.failure_id}>
            <span className="font-mono text-[10px]">{r.failure_id}</span> · {r.title} ·{" "}
            <span className="text-slate-500">{r.proof_status}</span>
          </li>
        ))}
      </ul>
    </ExecutiveSection>
  );
}

function CodexPacketProofDashboardSection() {
  return (
    <ExecutiveSection
      title="Codex Packet Proof (informational v1)"
      subtitle={CODEX_PACKET_PROOF_OWNER_DASHBOARD_LINE_V1}
    >
      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
        <span className="font-semibold text-slate-900 dark:text-slate-100">UNKNOWN:</span> This dashboard does not load
        Codex CLI output or filesystem artifacts yet. Weekly digest may surface proof when{' '}
        <span className="font-mono text-[11px]">FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH</span> points at saved JSON
        from <span className="font-mono text-[11px]">npm run buckparts:codex-next-execution-packet</span>.
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
        Does not prove founder-only approval (Layer 6), closed-loop Runner, or mutation safety beyond read-only sandbox +
        prompt boundaries.
      </p>
    </ExecutiveSection>
  );
}

function CodexOutputReviewDashboardSection() {
  return (
    <ExecutiveSection title="Codex Output Review Packet (owner-only v1)" subtitle={CODEX_OUTPUT_REVIEW_OWNER_DASHBOARD_LINE_V1}>
      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
        <span className="font-semibold text-slate-900 dark:text-slate-100">UNKNOWN:</span> This HTTP handler does not read Codex temp paths or founder digest proof JSON. Weekly digest may surface{" "}
        <span className="font-mono text-[11px]">codex_output_review_packet_v1</span> when{" "}
        <span className="font-mono text-[11px]">FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH</span> is set and the PASS proof&apos;s{" "}
        <span className="font-mono text-[11px]">final_message_path</span> file is readable at digest time.
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
        Does not authorize mutation, Runner widening, or Layer 6 completion; approve/reject/defer options are judgment copy only. When you record a matching row under{" "}
        <span className="font-mono text-[10px]">data/owner-decisions/</span> using <span className="font-mono text-[10px]">codex_output_review_context_v1</span>, the Founder Decision Registry card above surfaces counts only — still not HTTP proof of Codex transport.
      </p>
    </ExecutiveSection>
  );
}

function SemiCruiseStatusSection({ summary }: { summary: SemiCruiseStatusSummaryV1 }) {
  return (
    <ExecutiveSection
      title="Semi-Cruise + Netlify conservation (read-only v1)"
      subtitle="Command Center projection — informational only; does not authorize deploys, git push, or mutation."
    >
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        Contract <span className="font-mono text-[11px]">{summary.contract}</span> · read_only=
        {String(summary.read_only)} · data_mutation={String(summary.data_mutation)} · runtime_status=
        <span className="font-mono text-[10px]"> {summary.runtime_status}</span>
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <FieldBlock label="Read-only Semi-Cruise" value={summary.read_only_semi_cruise_status} />
        <FieldBlock label="Mutation Semi-Cruise" value={summary.mutation_semi_cruise_status} />
        <FieldBlock label="Netlify publishing" value={summary.netlify_publishing_status} />
        <FieldBlock label="Deploy credit risk" value={summary.deploy_credit_risk_status} />
        <FieldBlock
          label="Neurons BRIGHT / DIM / DARK"
          value={`${summary.bright_neuron_count} / ${summary.dim_neuron_count} / ${summary.dark_neuron_count}`}
        />
      </div>
      <p className="mt-3 text-sm text-slate-800 dark:text-slate-200">
        <span className="font-semibold text-slate-900 dark:text-slate-100">Recommended:</span>{" "}
        {summary.recommended_next_action}
      </p>
      {summary.remaining_owner_gates.length > 0 ? (
        <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
          {summary.remaining_owner_gates.slice(0, 6).map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
        Netlify credit truth remains on the Usage &amp; billing dashboard — this summary does not call Netlify APIs.
      </p>
    </ExecutiveSection>
  );
}

function LayerSixReadinessSection({ summary }: { summary: LayerSixReadinessSummaryV1 }) {
  return (
    <ExecutiveSection title="Layer 6 Readiness Summary (informational v1)" subtitle={LAYER_SIX_READINESS_OWNER_DASHBOARD_LINE_V1}>
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        Contract <span className="font-mono text-[11px]">{summary.contract}</span> · read_only={String(summary.read_only)}{" "}
        · automation_input={String(summary.automation_input)}
      </p>
      <p className="mt-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
        readiness_status:{" "}
        <span className="font-mono text-[10px]">{summary.readiness_status}</span>
        <span className="ml-2 font-normal text-slate-600 dark:text-slate-400">
          — Layer 6 remains NOT_PROVEN in-repo; this does not expand Runner autonomy.
        </span>
      </p>
      <p className="mt-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
        codex_output_review_surface_v1:{" "}
        <span className="font-mono text-[10px]">{summary.codex_output_review_surface_v1}</span>
        <span className="ml-2 font-normal text-slate-600 dark:text-slate-400">
          — UNKNOWN on this dashboard (digest-only packet wiring); PROVEN_PRESENT only when digest supplies READY_FOR_FOUNDER_REVIEW.
        </span>
      </p>
      <p className="mt-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
        founder_decision_recording_for_codex_review_v1:{" "}
        <span className="font-mono text-[10px]">{summary.founder_decision_recording_for_codex_review_v1}</span>
        <span className="ml-2 font-normal text-slate-600 dark:text-slate-400">
          — digest can prove a matching registry row exists for the same Codex review queue id; this dashboard only scans registry files (no Codex proof JSON), so this usually stays UNKNOWN here. Does not claim Layer 6 complete or automation.
        </span>
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
        {summary.reasons.slice(0, 4).map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
        Registry source: guarded={summary.failure_pattern_registry.guarded_count}, unguarded=
        {summary.failure_pattern_registry.unguarded_count}, recurring={summary.failure_pattern_registry.recurring_count},
        unknown_guardrail={summary.failure_pattern_registry.unknown_guardrail_count}
      </p>
    </ExecutiveSection>
  );
}

function FounderExecutionPacketsSection({
  model,
}: {
  model: ReturnType<typeof buildFounderExecutionPacketsV1>;
}) {
  return (
    <ExecutiveSection
      title="Founder Execution Packets"
      subtitle="Read-only v1 — copy/paste prompts for queue rows that are already classified as agent-safe, agent-led, and read-only only (same rules as the weekly digest)."
    >
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        Contract <span className="font-mono text-[11px]">{model.contract}</span> · read_only={String(model.read_only)} ·
        data_mutation={String(model.data_mutation)} · skipped queue rows: {model.skipped_rows.length}
      </p>
      {model.packets.length === 0 ? (
        <p className="mt-2 text-sm text-slate-800 dark:text-slate-200">
          <span className="font-semibold text-slate-900 dark:text-slate-100">PROVEN:</span> No agent-safe execution packets
          were produced from the Founder Action Queue above (no qualifying rows).
        </p>
      ) : (
        <div className="mt-3 space-y-5">
          {model.packets.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/50"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{p.title}</h3>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Actor: {p.recommended_actor} · {p.packet_kind}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Validation (run separately):{" "}
                <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300">{p.validation_command.replace(/\n/g, " · ")}</span>
              </p>
              <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                {p.copy_paste_prompt}
              </pre>
            </div>
          ))}
        </div>
      )}
    </ExecutiveSection>
  );
}

function RunnerStepVisibilitySection({
  commandCenterOk,
  nextPacket,
}: {
  commandCenterOk: boolean;
  nextPacket: FounderExecutionPacketV1 | null;
}) {
  const m = buildRunnerStepVisibilityModeledV1({
    surface: "owner_dashboard",
    command_center_ok: commandCenterOk,
    nextPacket,
  });
  return (
    <ExecutiveSection
      title="Runner Step (read-only v1)"
      subtitle="Modeled from this page's Command Center snapshot. This request does not run npm run buckparts:runner-step — live CLI JSON is UNKNOWN here."
    >
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        Visibility contract <span className="font-mono text-[11px]">{m.contract}</span> · live Runner Step JSON on
        this surface: <span className="font-semibold text-slate-800 dark:text-slate-200">{m.live_runner_step_json}</span>{" "}
        (run <code className="font-mono text-[11px]">npm run buckparts:runner-step</code> locally for PASS/FAIL JSON).
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-800 dark:text-slate-200 sm:grid-cols-2">
        <FieldBlock
          label="Modeled next packet"
          value={
            m.modeled_next_packet_title
              ? `${m.modeled_next_packet_title} (${m.modeled_next_packet_id})`
              : "None (no agent-safe packet from this queue snapshot)."
          }
        />
        <FieldBlock
          label="Planned validation (allowlist only, not run here)"
          value={<span className="font-mono text-[11px]">{m.planned_validation_commands.join(" · ")}</span>}
        />
        <FieldBlock
          label="Prohibited-actions line count (when packet exists)"
          value={String(m.prohibited_actions_count)}
        />
        <FieldBlock label="External Cursor/Codex/OpenAI runner" value="UNKNOWN (not integrated in-repo)" />
      </div>
      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50/80 p-3 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
        <p className="font-semibold text-slate-900 dark:text-slate-100">Layer truth (design — not a live CLI result)</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Layer 3 repo subprocess: PROVEN only after buckparts:runner-step runs — UNKNOWN on this page.</li>
          <li>Layer 3 external agents: UNKNOWN.</li>
          <li>Layer 4 capture: PROVEN_FOR_REPO_COMMANDS_ONLY when CLI runs — UNKNOWN here.</li>
          <li>Layer 5: PARTIAL · Layer 6: NOT_PROVEN.</li>
        </ul>
        <p className="mt-3 text-[11px] text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-slate-200">Next human:</span> {m.next_human_action_hint}
        </p>
        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-slate-200">Next runner:</span> {m.next_runner_action_hint}
        </p>
      </div>
    </ExecutiveSection>
  );
}

function buildStopTheLineItems(args: {
  health: { status: string; reasons: string[]; recommended_next_step: string };
  integritySentinel: { overall_status: string; action_confidence: string; owner_note: string };
  quarantineModelCount: number;
  v2NextOwnerAction: string;
}): string[] {
  const out: string[] = [];
  const os = args.integritySentinel.overall_status;
  if (os === "FAIL") {
    out.push(`Integrity Sentinel: FAIL — ${args.integritySentinel.owner_note.trim() || "UNKNOWN"}`);
  } else if (os === "WARN") {
    out.push(`Integrity Sentinel: WARN — ${args.integritySentinel.owner_note.trim() || "UNKNOWN"}`);
  }
  const hs = args.health.status;
  if (hs === "BLOCKED" || hs === "CRITICAL") {
    const r = args.health.reasons[0]?.trim();
    out.push(r ? `System health ${hs}: ${r}` : `System health status: ${hs}`);
  } else if (hs === "ATTENTION") {
    const r = args.health.reasons[0]?.trim();
    if (r) out.push(`System health ATTENTION: ${r}`);
    else if (args.health.recommended_next_step.trim()) {
      out.push(`System health ATTENTION — recommended next step: ${args.health.recommended_next_step.trim()}`);
    }
  }
  if (args.quarantineModelCount > 0) {
    out.push(
      `${args.quarantineModelCount} quarantined fridge model(s) — owner review required (see Evidence & coverage drilldown).`,
    );
  }
  const ac = args.integritySentinel.action_confidence;
  if (ac === "CAUTION_INCOMPLETE_INPUTS" || ac === "UNKNOWN") {
    out.push(`Integrity action confidence: ${ac} — treat automation hints cautiously.`);
  }
  const synth = args.v2NextOwnerAction.trim();
  if (synth) out.push(`Synthesized next owner action (v2): ${synth}`);
  const rec = args.health.recommended_next_step.trim();
  if (rec && !out.some((x) => x.includes(rec))) out.push(`Recommended next step (v1 digest): ${rec}`);
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const line of out) {
    const key = line.slice(0, 160);
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(line);
    if (uniq.length >= 3) break;
  }
  return uniq;
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
  const quarantine = report.owner_quarantined_fridge_models;
  const launchPolicy = report.owner_vertical_launch_policy;
  const neurons = report.owner_command_center_neurons;
  const integritySentinel = report.owner_integrity_sentinel;
  const searchDemand = report.owner_search_demand_and_gaps.search_demand_and_gaps;
  const gscExternalDemand = report.owner_gsc_external_demand.gsc_external_demand;

  const trustNeuron = neurons.neurons.find((n) => n.neuron_key === "trust_funnel_measurement");
  const stopLineItems = buildStopTheLineItems({
    health,
    integritySentinel,
    quarantineModelCount: quarantine.models.length,
    v2NextOwnerAction: v2.next_owner_action,
  });

  const customerRealityAuthorityGated = buildCustomerRealityAuthorityGatedModelV1({
    factory_next_best_action: report.next_best_action,
    scoreboard: v2.customer_reality_scoreboard_v1,
    steering: v2.customer_steering_comparison_v1,
    closure: v2.customer_closure_report_v1,
  });

  const founderControlPlane = buildFounderControlPlaneModel(process.cwd(), {
    next_best_action: report.next_best_action,
    known_unknowns: report.known_unknowns,
    execution_guidance: report.execution_guidance,
    command_center_v2: {
      next_owner_action: v2.next_owner_action,
      amazon_rescue: {
        next_agent_action: v2.amazon_rescue.next_agent_action,
        human_browser_required_tokens: v2.amazon_rescue.human_browser_required_tokens,
        status: v2.amazon_rescue.status,
      },
      unknown_or_human_review: {
        status: v2.unknown_or_human_review.status,
        blocker: v2.unknown_or_human_review.blocker ?? null,
      },
      deploy_live_site_status: {
        status: v2.deploy_live_site_status.status,
        live_site_monitor: v2.deploy_live_site_status.live_site_monitor,
      },
    },
  });

  const founderActionQueue = buildFounderActionQueueForOwnerDashboard({
    next_best_action: report.next_best_action,
    execution_guidance: report.execution_guidance,
    command_center_v2: v2,
  });

  const founderExecutionPackets = buildFounderExecutionPacketsV1(founderActionQueue.rows, {
    generated_at: report.generated_at,
    source: "owner_dashboard",
  });

  const closedOarRows = loadClosedOarPrecedentSubstratesV1(process.cwd());
  const founderDecisionPackets = buildFounderDecisionPacketsV1(founderActionQueue.rows, {
    generated_at: report.generated_at,
    source: "owner_dashboard",
    runner: null,
    closed_oar_rows: closedOarRows,
  });

  const registryReadModel = buildFounderDecisionRegistryReadModelV1(
    scanFounderDecisionRegistryJsonFilesV1(process.cwd()),
    { generated_at: report.generated_at, reference_time_iso: new Date().toISOString() },
  );

  const failurePatternReadModel = buildFailurePatternRegistryReadModelFromSeededV1(report.generated_at);
  const layerSixReadiness = buildLayerSixReadinessSummaryV1(failurePatternReadModel, {
    generated_at: report.generated_at,
    runner: null,
    founder_decision_registry_read_model: registryReadModel,
  });

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
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 rounded-md border border-white/25 bg-white/10 px-3 py-2 text-xs text-white/95">
            <span>
              <span className="font-semibold text-white">System status</span>: {health?.status ?? "UNKNOWN"}
            </span>
            <span>
              <span className="font-semibold text-white">Integrity Sentinel</span>:{" "}
              {integritySentinel?.overall_status ?? "UNKNOWN"}
            </span>
            <span>
              <span className="font-semibold text-white">Action confidence</span>:{" "}
              {integritySentinel?.action_confidence ?? "UNKNOWN"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <ExecutiveSection
          title="Stop-the-line"
          subtitle="Highest-priority signals from system health, Integrity Sentinel, quarantine queue, and synthesized v2 owner action (max 3 items)."
        >
          <ul className="list-inside list-disc space-y-2 text-sm text-slate-800 dark:text-slate-200">
            {(stopLineItems.length > 0
              ? stopLineItems
              : ["No elevated stop-the-line signals in this snapshot beyond routine monitoring."]
            ).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </ExecutiveSection>

        <FounderControlPlaneSection model={founderControlPlane} />

        <CustomerRealityAuthorityGatedSection
          model={customerRealityAuthorityGated}
          scoreboard={v2.customer_reality_scoreboard_v1}
          steering={v2.customer_steering_comparison_v1}
          closure={v2.customer_closure_report_v1}
        />

        <BatchProductionOwnerDecisionsLaneSection lane={v2.batch_production_owner_decisions_lane_v1} />

        <BatchProductionOperatingChecklistSection
          checklist={v2.batch_production_operating_checklist_v1}
          dispatch={v2.batch_production_operating_dispatch_v1}
          runInstantiation={v2.ap_batch_v3_run_instantiation_v1}
        />

        <MarketingIntelligenceEngineSection engine={v2.marketing_intelligence_engine_v1} />

        <AgentControlPlaneSection plane={v2.agent_control_plane_v1} />

        <FounderActionQueueSection queue={founderActionQueue} />

        <FounderDecisionPacketsSection model={founderDecisionPackets} />

        <FounderDecisionRegistryReadModelSection model={registryReadModel} />

        <FailurePatternRegistrySection model={failurePatternReadModel} />

        <SemiCruiseStatusSection summary={v2.semi_cruise_status_summary_v1} />

        <LayerSixReadinessSection summary={layerSixReadiness} />

        <CodexPacketProofDashboardSection />

        <CodexOutputReviewDashboardSection />

        <FounderExecutionPacketsSection model={founderExecutionPackets} />

        <RunnerStepVisibilitySection commandCenterOk={true} nextPacket={founderExecutionPackets.packets[0] ?? null} />

        <TopOfGameFoundationSection tog={v2.top_of_game_foundation_scorecard_v1} />

        <ExecutiveSection
          title="Demand"
          subtitle="Internal BuckParts search demand plus external GSC demand (top 5 queries/pages truncated)."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldBlock label="Internal · connection_level" value={searchDemand.connection_level} />
            <FieldBlock label="Internal · runtime_status" value={searchDemand.runtime_status} />
            <FieldBlock label="Internal · search_events_last_7d" value={String(searchDemand.search_events_last_7d)} />
            <FieldBlock label="Internal · search_events_last_30d" value={String(searchDemand.search_events_last_30d)} />
            <FieldBlock label="Internal · zero_result_last_7d" value={String(searchDemand.zero_result_last_7d)} />
            <FieldBlock label="Internal · zero_result_last_30d" value={String(searchDemand.zero_result_last_30d)} />
            <FieldBlock label="Internal · actionable_search_gaps" value={String(searchDemand.actionable_search_gaps)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldBlock label="External · total_impressions" value={String(gscExternalDemand.total_impressions)} />
            <FieldBlock label="External · total_clicks" value={String(gscExternalDemand.total_clicks)} />
            <FieldBlock label="External · average_ctr" value={String(gscExternalDemand.average_ctr)} />
            <FieldBlock label="External · average_position" value={String(gscExternalDemand.average_position)} />
          </div>
          <FieldBlock
            label="External · top queries (by impressions, max 5)"
            value={
              gscExternalDemand.top_queries_by_impressions === "UNKNOWN" ? (
                "UNKNOWN"
              ) : (
                <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {gscExternalDemand.top_queries_by_impressions.slice(0, 5).map((q) => (
                    <li key={`exec-q-${q.key}-${q.impressions}-${q.clicks}`}>
                      {q.key} · impressions={q.impressions} · clicks={q.clicks} · ctr={String(q.ctr)}
                    </li>
                  ))}
                </ul>
              )
            }
          />
          <FieldBlock
            label="External · top pages (by impressions, max 5)"
            value={
              gscExternalDemand.top_pages_by_impressions === "UNKNOWN" ? (
                "UNKNOWN"
              ) : (
                <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {gscExternalDemand.top_pages_by_impressions.slice(0, 5).map((p) => (
                    <li key={`exec-p-${p.key}-${p.impressions}-${p.clicks}`}>
                      {p.key} · impressions={p.impressions} · clicks={p.clicks} · ctr={String(p.ctr)}
                    </li>
                  ))}
                </ul>
              )
            }
          />
          <FieldBlock
            label="External · high-impression / low-click opportunities"
            value={
              gscExternalDemand.high_impression_low_click_opportunities === "UNKNOWN"
                ? "UNKNOWN"
                : gscExternalDemand.high_impression_low_click_opportunities.length === 0
                  ? "None flagged in current artifact."
                  : (
                      <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
                        {gscExternalDemand.high_impression_low_click_opportunities.slice(0, 5).map((q) => (
                          <li key={`exec-o-${q.key}-${q.impressions}-${q.clicks}`}>
                            {q.key} · impressions={q.impressions} · clicks={q.clicks} · ctr={String(q.ctr)}
                          </li>
                        ))}
                      </ul>
                    )
            }
          />
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <a
              href="#demand-drilldown"
              className="font-semibold text-blue-800 underline underline-offset-2 dark:text-blue-300"
            >
              Open demand drilldown
            </a>{" "}
            for full Search Demand & gaps and GSC external demand tables.
          </p>
        </ExecutiveSection>

        <ExecutiveSection
          title="AP homeowner pilot scorecard"
          subtitle="Read-only join of GSC tracked_page_slices_v1 exact-page demand and 30d /go handoff clicks per pilot slug. Clicks are not revenue."
        >
          <FieldBlock label="runtime_status" value={v2.ap_homeowner_pilot_scorecard_v1.runtime_status} />
          <FieldBlock label="click_query_status" value={v2.ap_homeowner_pilot_scorecard_v1.click_query_status} />
          <FieldBlock
            label="gsc_artifact_source"
            value={String(v2.ap_homeowner_pilot_scorecard_v1.gsc_artifact_source)}
          />
          <div className="overflow-x-auto">
            <table className="mt-2 w-full min-w-[720px] border-collapse text-left text-xs text-slate-800 dark:text-slate-200">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  {[
                    "slug",
                    "gsc_match_status",
                    "gsc_impressions",
                    "gsc_clicks",
                    "handoff_clicks_30d",
                    "handoff_status",
                    "interpretation",
                  ].map((header) => (
                    <th key={header} className="px-2 py-1.5 font-semibold uppercase tracking-wide text-slate-500">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {v2.ap_homeowner_pilot_scorecard_v1.rows.map((row) => (
                  <tr key={row.slug} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-1.5 font-mono">{row.slug}</td>
                    <td className="px-2 py-1.5">{row.gsc_match_status}</td>
                    <td className="px-2 py-1.5">{String(row.gsc_impressions_30d)}</td>
                    <td className="px-2 py-1.5">{String(row.gsc_clicks_30d)}</td>
                    <td className="px-2 py-1.5">{String(row.handoff_clicks_30d)}</td>
                    <td className="px-2 py-1.5">{row.handoff_status}</td>
                    <td className="px-2 py-1.5">{row.interpretation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ExecutiveSection>

        <ExecutiveSection
          title="Throughput & monetization"
          subtitle="/go click visibility (read-only aggregates) and GA4 trust-funnel artifact summary. Dollar commission/revenue remains UNKNOWN in-repo."
        >
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            GA4 event totals can read{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">zero</span> from low traffic, reporting
            lag, filters, or sparse events — that alone does{" "}
            <span className="font-semibold">not</span> prove a tracking failure (no automatic stop-the-line escalation
            from zeros alone).
          </p>
          {v2.revenue_snapshot.click_visibility ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FieldBlock
                label="Raw clicks · 7d"
                value={
                  v2.revenue_snapshot.click_visibility.raw_last_7_days_clicks === "UNKNOWN"
                    ? "UNKNOWN"
                    : String(v2.revenue_snapshot.click_visibility.raw_last_7_days_clicks)
                }
              />
              <FieldBlock
                label="Raw clicks · 30d"
                value={
                  v2.revenue_snapshot.click_visibility.raw_last_30_days_clicks === "UNKNOWN"
                    ? "UNKNOWN"
                    : String(v2.revenue_snapshot.click_visibility.raw_last_30_days_clicks)
                }
              />
              <FieldBlock
                label="Human-likely · 7d"
                value={
                  v2.revenue_snapshot.click_visibility.human_likely_last_7_days_clicks === "UNKNOWN"
                    ? "UNKNOWN"
                    : String(v2.revenue_snapshot.click_visibility.human_likely_last_7_days_clicks)
                }
              />
              <FieldBlock
                label="Human-likely · 30d"
                value={
                  v2.revenue_snapshot.click_visibility.human_likely_last_30_days_clicks === "UNKNOWN"
                    ? "UNKNOWN"
                    : String(v2.revenue_snapshot.click_visibility.human_likely_last_30_days_clicks)
                }
              />
              <FieldBlock label="Click freshness" value={v2.revenue_snapshot.click_visibility.click_freshness_status} />
              <FieldBlock label="Snapshot runtime" value={v2.revenue_snapshot.click_visibility.runtime_status} />
            </div>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400">Click visibility snapshot: UNKNOWN (missing).</p>
          )}
          <FieldBlock
            label="Commission / revenue (in-repo)"
            value={
              v2.revenue_snapshot.click_visibility?.commission_or_revenue === "NOT_CONNECTED"
                ? "NOT_CONNECTED — UNKNOWN dollar revenue from this dashboard (do not infer valuation from clicks)."
                : String(v2.revenue_snapshot.click_visibility?.commission_or_revenue ?? "UNKNOWN")
            }
          />
          {trustNeuron?.trust_funnel_aggregate ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FieldBlock label="GA4 artifact_source" value={trustNeuron.trust_funnel_aggregate.artifact_source} />
              <FieldBlock label="GA4 artifact status" value={trustNeuron.trust_funnel_aggregate.status} />
              <FieldBlock label="GA4 fetched_at" value={trustNeuron.trust_funnel_aggregate.fetched_at} />
              <FieldBlock
                label="GA4 event_totals"
                value={
                  trustNeuron.trust_funnel_aggregate.event_totals === "UNKNOWN"
                    ? "UNKNOWN"
                    : `model_views=${trustNeuron.trust_funnel_aggregate.event_totals.fridge_model_view}, chip_clicks=${trustNeuron.trust_funnel_aggregate.event_totals.fridge_filter_chip_click}, detail_clicks=${trustNeuron.trust_funnel_aggregate.event_totals.fridge_filter_detail_click_from_model}, filter_views=${trustNeuron.trust_funnel_aggregate.event_totals.fridge_filter_view}, help_opens=${trustNeuron.trust_funnel_aggregate.event_totals.fridge_help_opened}`
                }
              />
              <FieldBlock
                label="GA4 rates"
                value={
                  trustNeuron.trust_funnel_aggregate.rates === "UNKNOWN"
                    ? "UNKNOWN"
                    : `chip/model=${String(trustNeuron.trust_funnel_aggregate.rates.chip_clicks_per_model_view)}, filter/chip=${String(trustNeuron.trust_funnel_aggregate.rates.filter_views_per_chip_click)}, help/filter=${String(trustNeuron.trust_funnel_aggregate.rates.help_opens_per_filter_view)}`
                }
              />
              <FieldBlock
                label="GA4 dimension_breakdowns (stage 1)"
                value={`top_model_slugs=${trustNeuron.trust_funnel_aggregate.dimension_breakdowns.top_model_slugs}, top_filter_slugs=${trustNeuron.trust_funnel_aggregate.dimension_breakdowns.top_filter_slugs}, quarantined_vs_normal=${trustNeuron.trust_funnel_aggregate.dimension_breakdowns.quarantined_vs_normal}`}
              />
            </div>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              GA4 trust-funnel aggregate: UNKNOWN (not present on trust neuron in this snapshot).
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Full click breakdowns and neuron prose live under monitor / drilldown sections below.
          </p>
        </ExecutiveSection>

        <div className="space-y-3 border-t border-slate-300 pt-8 dark:border-slate-600">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Operational drilldowns (collapsed by default)
          </p>
        <DrilldownGroup title="System summary & synthesized actions (lanes 1, 7)">
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
        <LaneCard title="7 · Next owner action (synthesized)" subtitle="Highest-priority owner step from v2">
          <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100">{v2.next_owner_action}</p>
        </LaneCard>
        </DrilldownGroup>
        <DrilldownGroup title="Batch Production Lane · Layer 7 (read-only)">
        <LaneCard
          title="Batch owner decisions (Command Center)"
          subtitle="batch_production_owner_decisions_lane_v1 — no dashboard-only truth source"
        >
          <FieldBlock label="runtime_status" value={v2.batch_production_owner_decisions_lane_v1.runtime_status} />
          <FieldBlock
            label="approved_for_planning_count"
            value={String(v2.batch_production_owner_decisions_lane_v1.approved_for_planning_count)}
          />
          <FieldBlock
            label="excluded_not_owner_review_ready"
            value={
              v2.batch_production_owner_decisions_lane_v1.excluded_not_owner_review_ready_row_ids === "UNKNOWN"
                ? "UNKNOWN"
                : v2.batch_production_owner_decisions_lane_v1.excluded_not_owner_review_ready_row_ids.join(", ")
            }
          />
        </LaneCard>
        </DrilldownGroup>
        <DrilldownGroup title="Amazon & review ops (lanes 2, 3, 8)">
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
        <LaneCard title="8 · Next agent action (Amazon lane)" subtitle="Same as Amazon rescue agent guidance">
          <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100">{v2.amazon_rescue.next_agent_action}</p>
        </LaneCard>
        </DrilldownGroup>
        <DrilldownGroup title="Evidence & coverage (lanes 4, 5, 6, 11)">
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
        <LaneCard title="11 · Quarantined fridge models" subtitle="Owner-only review queue (read-only)">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={quarantine.models.length > 0 ? "ATTENTION" : "OK"} />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              data_mutation: {String(quarantine.data_mutation)}
            </span>
          </div>
          {quarantine.models.length === 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-400">No quarantined fridge models.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/60">
                  <tr>
                    {[
                      "slug",
                      "reason",
                      "public_status",
                      "mapped_filters",
                      "safe_ctas",
                      "owner_action_required",
                    ].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-3 py-2 font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {quarantine.models.map((m) => (
                    <tr key={m.fridge_model_slug} className="bg-white dark:bg-slate-950">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px] text-slate-900 dark:text-slate-100">
                        {m.fridge_model_slug}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px]">{m.reason}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px]">{m.public_status}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px]">{m.mapped_filter_count}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px]">{m.safe_cta_count}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px]">
                        {String(m.owner_action_required)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <FieldBlock
            label="Evidence doc"
            value={
              quarantine.models.length > 0
                ? quarantine.models.map((m) => m.internal_evidence_doc).join(", ")
                : "UNKNOWN"
            }
          />
        </LaneCard>
        </DrilldownGroup>
        <DrilldownGroup title="SEO & launch hygiene (lane 12)">
        <LaneCard
          title="12 · Vertical launch / crawler / promo policy"
          subtitle="Derived from launch-state, sitemap, layout robots, and catalog/homepage constants (read-only)"
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status="OK" />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              data_mutation: {String(launchPolicy.data_mutation)}
            </span>
          </div>
          <FieldBlock
            label="generated_from"
            value={
              <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-700 dark:text-slate-300">
                {launchPolicy.generated_from.map((s) => (
                  <li key={s} className="font-mono">
                    {s}
                  </li>
                ))}
              </ul>
            }
          />
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900/60">
                <tr>
                  {[
                    "vertical",
                    "wedge",
                    "launch",
                    "live",
                    "sitemap_disc",
                    "layout_noindex",
                    "catalog_hub",
                    "home_promo",
                    "note",
                  ].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-3 py-2 font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {launchPolicy.rows.map((r) => (
                  <tr key={r.vertical_slug} className="bg-white dark:bg-slate-950">
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px] text-slate-900 dark:text-slate-100">
                      {r.vertical_slug}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px]">{r.wedge_catalog}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px]">{r.launch_state}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px]">{String(r.is_live)}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px]">
                      {String(r.sitemap_discovery_urls_expected)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px]">
                      {String(r.layout_noindex_follow_expected)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px]">
                      {String(r.catalog_hub_promo_expected)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px]">
                      {String(r.homepage_browse_promo_expected)}
                    </td>
                    <td className="max-w-[14rem] px-3 py-2 text-[11px] leading-snug text-slate-700 dark:text-slate-300">
                      {r.owner_note ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LaneCard>
        </DrilldownGroup>
        <DrilldownGroup title="Command Center neurons · full detail (lane 13)">
        <LaneCard
          title="13 · Command Center neurons"
          subtitle="Owner-only signal wiring status (bright/dim/dark) without claiming unavailable ingest"
        >
          <FieldBlock
            label="generated_from"
            value={
              <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-700 dark:text-slate-300">
                {neurons.generated_from.map((s) => (
                  <li key={s} className="font-mono">
                    {s}
                  </li>
                ))}
              </ul>
            }
          />
          {neurons.neurons.map((n) => (
            <div key={n.neuron_key} className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {n.connection_level}
                </span>
                <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {n.status}
                </span>
              </div>
              <FieldBlock label="Freshness method" value={n.freshness_method} />
              {n.neuron_key === "trust_funnel_measurement" && n.trust_funnel_aggregate ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <FieldBlock label="artifact_source" value={n.trust_funnel_aggregate.artifact_source} />
                  <FieldBlock label="status" value={n.trust_funnel_aggregate.status} />
                  <FieldBlock label="fetched_at" value={n.trust_funnel_aggregate.fetched_at} />
                  <FieldBlock
                    label="event_totals"
                    value={
                      n.trust_funnel_aggregate.event_totals === "UNKNOWN"
                        ? "UNKNOWN"
                        : `model_views=${n.trust_funnel_aggregate.event_totals.fridge_model_view}, chip_clicks=${n.trust_funnel_aggregate.event_totals.fridge_filter_chip_click}, detail_clicks=${n.trust_funnel_aggregate.event_totals.fridge_filter_detail_click_from_model}, filter_views=${n.trust_funnel_aggregate.event_totals.fridge_filter_view}, help_opens=${n.trust_funnel_aggregate.event_totals.fridge_help_opened}`
                    }
                  />
                  <FieldBlock
                    label="rates"
                    value={
                      n.trust_funnel_aggregate.rates === "UNKNOWN"
                        ? "UNKNOWN"
                        : `chip/model=${String(n.trust_funnel_aggregate.rates.chip_clicks_per_model_view)}, filter/chip=${String(n.trust_funnel_aggregate.rates.filter_views_per_chip_click)}, help/filter=${String(n.trust_funnel_aggregate.rates.help_opens_per_filter_view)}`
                    }
                  />
                  <FieldBlock
                    label="dimension_breakdowns"
                    value={`top_model_slugs=${n.trust_funnel_aggregate.dimension_breakdowns.top_model_slugs}, top_filter_slugs=${n.trust_funnel_aggregate.dimension_breakdowns.top_filter_slugs}, quarantined_vs_normal=${n.trust_funnel_aggregate.dimension_breakdowns.quarantined_vs_normal}`}
                  />
                </div>
              ) : null}
              <FieldBlock
                label="Proven facts"
                value={
                  n.proven_facts.length > 0 ? (
                    <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      {n.proven_facts.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  ) : (
                    "none"
                  )
                }
              />
              <FieldBlock
                label="UNKNOWN facts"
                value={
                  n.unknown_facts.length > 0 ? (
                    <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      {n.unknown_facts.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  ) : (
                    "none"
                  )
                }
              />
              <FieldBlock label="Next owner action" value={n.next_owner_action} />
            </div>
          ))}
        </LaneCard>
        </DrilldownGroup>
        <DrilldownGroup title="Integrity Sentinel · full detail (lane 14)">
        <LaneCard
          title="14 · Integrity Sentinel"
          subtitle="Watcher-of-watcher: validates source health, freshness, fallback, UNKNOWN honesty, and action confidence"
        >
          <FieldBlock
            label="overall_status"
            value={
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {integritySentinel.overall_status}
              </span>
            }
          />
          <FieldBlock label="action_confidence" value={integritySentinel.action_confidence} />
          <FieldBlock label="owner_note" value={integritySentinel.owner_note} />
          <FieldBlock label="data_mutation" value={String(integritySentinel.data_mutation)} />
          {integritySentinel.providers.map((p) => (
            <div key={p.provider_key} className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-700">
              <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{p.provider_key}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <FieldBlock label="source_class" value={p.source_class} />
                <FieldBlock label="freshness_signal_present" value={String(p.freshness_signal_present)} />
                <FieldBlock label="fallback_active" value={String(p.fallback_active)} />
                <FieldBlock label="unknown_honesty" value={p.unknown_honesty} />
                <FieldBlock label="action_safety" value={p.action_safety} />
              </div>
              <FieldBlock
                label="proven_facts"
                value={
                  p.proven_facts.length > 0 ? (
                    <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      {p.proven_facts.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  ) : (
                    "none"
                  )
                }
              />
              <FieldBlock
                label="unknown_facts"
                value={
                  p.unknown_facts.length > 0 ? (
                    <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      {p.unknown_facts.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  ) : (
                    "none"
                  )
                }
              />
            </div>
          ))}
        </LaneCard>
        </DrilldownGroup>
        <DrilldownGroup id="demand-drilldown" title="Demand drilldown (lanes 15, 16)">
        <LaneCard
          title="15 · Search Demand & gaps"
          subtitle="Owner-only internal BuckParts search demand neuron (not GSC demand)"
        >
          <FieldBlock label="neuron_key" value={searchDemand.neuron_key} />
          <FieldBlock label="connection_level" value={searchDemand.connection_level} />
          <FieldBlock label="source_class" value={searchDemand.source_class} />
          <FieldBlock label="freshness_method" value={searchDemand.freshness_method} />
          <FieldBlock label="runtime_status" value={searchDemand.runtime_status} />
          <FieldBlock
            label="window_days"
            value={
              searchDemand.window_days === "UNKNOWN"
                ? "UNKNOWN"
                : `short=${searchDemand.window_days.short}, long=${searchDemand.window_days.long}`
            }
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <FieldBlock label="search_events_last_7d" value={String(searchDemand.search_events_last_7d)} />
            <FieldBlock label="search_events_last_30d" value={String(searchDemand.search_events_last_30d)} />
            <FieldBlock label="zero_result_last_7d" value={String(searchDemand.zero_result_last_7d)} />
            <FieldBlock label="zero_result_last_30d" value={String(searchDemand.zero_result_last_30d)} />
            <FieldBlock label="actionable_search_gaps" value={String(searchDemand.actionable_search_gaps)} />
          </div>
          <FieldBlock
            label="proven_facts"
            value={
              searchDemand.proven_facts.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {searchDemand.proven_facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              ) : (
                "none"
              )
            }
          />
          <FieldBlock
            label="unknown_facts"
            value={
              searchDemand.unknown_facts.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {searchDemand.unknown_facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              ) : (
                "none"
              )
            }
          />
          <FieldBlock label="next_owner_action" value={searchDemand.next_owner_action} />
        </LaneCard>
        <LaneCard
          title="16 · GSC external demand"
          subtitle="Owner-only external demand neuron from durable artifact with local/manual fallbacks"
        >
          <FieldBlock label="neuron_key" value={gscExternalDemand.neuron_key} />
          <FieldBlock label="connection_level" value={gscExternalDemand.connection_level} />
          <FieldBlock label="source_class" value={gscExternalDemand.source_class} />
          <FieldBlock label="artifact_source" value={gscExternalDemand.artifact_source} />
          <FieldBlock label="status" value={gscExternalDemand.status} />
          <FieldBlock label="fetched_at" value={gscExternalDemand.fetched_at} />
          <FieldBlock label="freshness_method" value={gscExternalDemand.freshness_method} />
          <FieldBlock label="export_file_used" value={gscExternalDemand.export_file_used} />
          <FieldBlock label="export_date" value={gscExternalDemand.export_date} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <FieldBlock label="total_impressions" value={String(gscExternalDemand.total_impressions)} />
            <FieldBlock label="total_clicks" value={String(gscExternalDemand.total_clicks)} />
            <FieldBlock label="average_ctr" value={String(gscExternalDemand.average_ctr)} />
            <FieldBlock label="average_position" value={String(gscExternalDemand.average_position)} />
          </div>
          <FieldBlock
            label="top_queries_by_impressions"
            value={
              gscExternalDemand.top_queries_by_impressions === "UNKNOWN" ? (
                "UNKNOWN"
              ) : (
                <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {gscExternalDemand.top_queries_by_impressions.map((q) => (
                    <li key={`${q.key}-${q.impressions}-${q.clicks}`}>
                      {q.key} · impressions={q.impressions} · clicks={q.clicks} · ctr={String(q.ctr)}
                    </li>
                  ))}
                </ul>
              )
            }
          />
          <FieldBlock
            label="top_queries_by_clicks"
            value={
              gscExternalDemand.top_queries_by_clicks === "UNKNOWN" ? (
                "UNKNOWN"
              ) : (
                <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {gscExternalDemand.top_queries_by_clicks.map((q) => (
                    <li key={`${q.key}-${q.impressions}-${q.clicks}`}>
                      {q.key} · clicks={q.clicks} · impressions={q.impressions} · ctr={String(q.ctr)}
                    </li>
                  ))}
                </ul>
              )
            }
          />
          <FieldBlock
            label="top_pages_by_impressions"
            value={
              gscExternalDemand.top_pages_by_impressions === "UNKNOWN" ? (
                "UNKNOWN"
              ) : (
                <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {gscExternalDemand.top_pages_by_impressions.map((p) => (
                    <li key={`${p.key}-${p.impressions}-${p.clicks}`}>
                      {p.key} · impressions={p.impressions} · clicks={p.clicks} · ctr={String(p.ctr)}
                    </li>
                  ))}
                </ul>
              )
            }
          />
          <FieldBlock
            label="top_pages_by_clicks"
            value={
              gscExternalDemand.top_pages_by_clicks === "UNKNOWN" ? (
                "UNKNOWN"
              ) : (
                <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {gscExternalDemand.top_pages_by_clicks.map((p) => (
                    <li key={`${p.key}-${p.impressions}-${p.clicks}`}>
                      {p.key} · clicks={p.clicks} · impressions={p.impressions} · ctr={String(p.ctr)}
                    </li>
                  ))}
                </ul>
              )
            }
          />
          <FieldBlock
            label="high_impression_low_click_opportunities"
            value={
              gscExternalDemand.high_impression_low_click_opportunities === "UNKNOWN" ? (
                "UNKNOWN"
              ) : (
                <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {gscExternalDemand.high_impression_low_click_opportunities.map((q) => (
                    <li key={`${q.key}-${q.impressions}-${q.clicks}`}>
                      {q.key} · impressions={q.impressions} · clicks={q.clicks} · ctr={String(q.ctr)}
                    </li>
                  ))}
                </ul>
              )
            }
          />
          <FieldBlock
            label="proven_facts"
            value={
              gscExternalDemand.proven_facts.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {gscExternalDemand.proven_facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              ) : (
                "none"
              )
            }
          />
          <FieldBlock
            label="unknown_facts"
            value={
              gscExternalDemand.unknown_facts.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {gscExternalDemand.unknown_facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              ) : (
                "none"
              )
            }
          />
          <FieldBlock label="next_owner_action" value={gscExternalDemand.next_owner_action} />
        </LaneCard>
        </DrilldownGroup>
        <DrilldownGroup title="Monitor drilldown · revenue / outbound clicks (lane 9)">
          <LaneCard
            title="9 · Revenue / outbound clicks"
            subtitle="click_events read-only snapshot (commission not connected in-repo)"
          >
          <div className="flex flex-wrap gap-2">
            <StatusPill status={v2.revenue_snapshot.status} />
            {v2.revenue_snapshot.click_visibility ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Clicks snapshot {v2.revenue_snapshot.click_visibility.generated_at} ·{" "}
                {v2.revenue_snapshot.click_visibility.runtime_status}
              </span>
            ) : null}
          </div>
          {v2.revenue_snapshot.blocker ? (
            <p className="text-xs text-slate-600 dark:text-slate-400">{v2.revenue_snapshot.blocker}</p>
          ) : null}
          {v2.revenue_snapshot.click_visibility ? (
            <div className="space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Raw counts are all <code className="font-mono text-[11px]">click_events</code> rows in the window (includes
                bots, crawlers, and internal audit). Human-likely uses a conservative{" "}
                <code className="font-mono text-[11px]">user_agent</code> filter — not proof of shoppers.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <FieldBlock
                  label="Raw last 7d"
                  value={
                    <span className="font-mono">
                      {v2.revenue_snapshot.click_visibility.raw_last_7_days_clicks === "UNKNOWN"
                        ? "UNKNOWN"
                        : v2.revenue_snapshot.click_visibility.raw_last_7_days_clicks}
                    </span>
                  }
                />
                <FieldBlock
                  label="Raw last 30d"
                  value={
                    <span className="font-mono">
                      {v2.revenue_snapshot.click_visibility.raw_last_30_days_clicks === "UNKNOWN"
                        ? "UNKNOWN"
                        : v2.revenue_snapshot.click_visibility.raw_last_30_days_clicks}
                    </span>
                  }
                />
                <FieldBlock
                  label="Human-likely last 7d"
                  value={
                    <span className="font-mono">
                      {v2.revenue_snapshot.click_visibility.human_likely_last_7_days_clicks === "UNKNOWN"
                        ? "UNKNOWN"
                        : v2.revenue_snapshot.click_visibility.human_likely_last_7_days_clicks}
                    </span>
                  }
                />
                <FieldBlock
                  label="Human-likely last 30d"
                  value={
                    <span className="font-mono">
                      {v2.revenue_snapshot.click_visibility.human_likely_last_30_days_clicks === "UNKNOWN"
                        ? "UNKNOWN"
                        : v2.revenue_snapshot.click_visibility.human_likely_last_30_days_clicks}
                    </span>
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <FieldBlock
                  label="Excluded last 30d (non–human-likely)"
                  value={
                    <span className="font-mono">
                      {v2.revenue_snapshot.click_visibility.excluded_last_30_days_clicks === "UNKNOWN"
                        ? "UNKNOWN"
                        : v2.revenue_snapshot.click_visibility.excluded_last_30_days_clicks}
                    </span>
                  }
                />
                <FieldBlock
                  label="Freshness"
                  value={
                    <span className="font-mono text-xs">
                      {v2.revenue_snapshot.click_visibility.click_freshness_status}
                    </span>
                  }
                />
                <FieldBlock
                  label="Newest click (UTC)"
                  value={
                    <span className="break-all font-mono text-xs">
                      {v2.revenue_snapshot.click_visibility.newest_click_at}
                    </span>
                  }
                />
                <FieldBlock
                  label="Oldest in 30d window (UTC)"
                  value={
                    <span className="break-all font-mono text-xs">
                      {v2.revenue_snapshot.click_visibility.oldest_click_at_in_30d_window}
                    </span>
                  }
                />
              </div>
              <FieldBlock label="Freshness reason" value={v2.revenue_snapshot.click_visibility.click_freshness_reason} />
              {v2.revenue_snapshot.click_visibility.excluded_by_category_30d !== "UNKNOWN" &&
              v2.revenue_snapshot.click_visibility.excluded_by_category_30d ? (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Excluded clicks by category · 30d
                  </p>
                  <ul className="space-y-1 text-xs text-slate-800 dark:text-slate-200">
                    {Object.entries(v2.revenue_snapshot.click_visibility.excluded_by_category_30d)
                      .filter(([, n]) => typeof n === "number" && n > 0)
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .map(([k, n]) => (
                        <li key={k} className="flex justify-between gap-2 font-mono">
                          <span>{k}</span>
                          <span>{n as number}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
              {v2.revenue_snapshot.click_visibility.top_user_agent_families_30d &&
              v2.revenue_snapshot.click_visibility.top_user_agent_families_30d.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Top user_agent strings · 30d
                  </p>
                  <ul className="space-y-2 text-xs text-slate-800 dark:text-slate-200">
                    {v2.revenue_snapshot.click_visibility.top_user_agent_families_30d.slice(0, 10).map((u) => (
                      <li key={u.user_agent} className="rounded border border-slate-100 p-2 dark:border-slate-800">
                        <div className="flex justify-between gap-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{u.category}</span>
                          <span>{u.clicks}</span>
                        </div>
                        <p className="mt-1 break-all font-mono text-[11px] leading-snug">{u.user_agent}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {v2.revenue_snapshot.click_visibility.click_quality_notes ? (
                <p className="text-xs italic text-slate-600 dark:text-slate-400">
                  {v2.revenue_snapshot.click_visibility.click_quality_notes}
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <FieldBlock
                  label="Commission / revenue"
                  value={
                    <span className="font-mono uppercase">
                      {v2.revenue_snapshot.click_visibility.commission_or_revenue}
                    </span>
                  }
                />
                <FieldBlock
                  label="Wedge · fridge 30d (raw)"
                  value={
                    <span className="font-mono">
                      {v2.revenue_snapshot.click_visibility.clicks_by_wedge_30d.refrigerator_water === "UNKNOWN"
                        ? "UNKNOWN"
                        : v2.revenue_snapshot.click_visibility.clicks_by_wedge_30d.refrigerator_water}
                    </span>
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(
                  [
                    ["AP", v2.revenue_snapshot.click_visibility.clicks_by_wedge_30d.air_purifier],
                    ["WHW", v2.revenue_snapshot.click_visibility.clicks_by_wedge_30d.whole_house_water],
                    ["Vacuum", v2.revenue_snapshot.click_visibility.clicks_by_wedge_30d.vacuum],
                    ["Humidifier", v2.revenue_snapshot.click_visibility.clicks_by_wedge_30d.humidifier],
                    ["Appliance air", v2.revenue_snapshot.click_visibility.clicks_by_wedge_30d.appliance_air],
                    ["Other / legacy", v2.revenue_snapshot.click_visibility.clicks_by_wedge_30d.other_or_legacy],
                  ] as const
                ).map(([label, n]) => (
                  <div
                    key={label}
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {label} · 30d
                    </p>
                    <p className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-50">
                      {n === "UNKNOWN" ? "UNKNOWN" : n}
                    </p>
                  </div>
                ))}
              </div>
              {v2.revenue_snapshot.click_visibility.top_retailer_slugs_30d &&
              v2.revenue_snapshot.click_visibility.top_retailer_slugs_30d.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Top retailer_slug (fridge wedge) · 30d
                  </p>
                  <ul className="space-y-1 text-xs text-slate-800 dark:text-slate-200">
                    {v2.revenue_snapshot.click_visibility.top_retailer_slugs_30d.map((r) => (
                      <li key={r.retailer_slug} className="flex justify-between gap-2 font-mono">
                        <span className="truncate">{r.retailer_slug}</span>
                        <span>{r.clicks}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {v2.revenue_snapshot.click_visibility.top_page_attribution_30d &&
              v2.revenue_snapshot.click_visibility.top_page_attribution_30d.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Top page_type / page_slug (fridge) · 30d
                  </p>
                  <ul className="space-y-1 text-xs text-slate-800 dark:text-slate-200">
                    {v2.revenue_snapshot.click_visibility.top_page_attribution_30d.map((p, i) => (
                      <li key={`${p.page_type}-${p.page_slug}-${i}`} className="flex justify-between gap-2 font-mono">
                        <span className="truncate">
                          {(p.page_type ?? "null")} / {(p.page_slug ?? "null")}
                        </span>
                        <span>{p.clicks}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {v2.revenue_snapshot.click_visibility.top_wedge_link_ids_30d &&
              v2.revenue_snapshot.click_visibility.top_wedge_link_ids_30d.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Top wedge link ids · 30d
                  </p>
                  <ul className="space-y-1 text-xs text-slate-800 dark:text-slate-200">
                    {v2.revenue_snapshot.click_visibility.top_wedge_link_ids_30d.map((l) => (
                      <li key={`${l.wedge}-${l.link_id}`} className="flex justify-between gap-2 font-mono">
                        <span className="truncate">
                          {l.wedge} · {l.link_id}
                        </span>
                        <span>{l.clicks}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {v2.revenue_snapshot.click_visibility.aggregation_notes &&
              v2.revenue_snapshot.click_visibility.aggregation_notes.length > 0 ? (
                <ul className="list-inside list-disc text-xs text-amber-900 dark:text-amber-200">
                  {v2.revenue_snapshot.click_visibility.aggregation_notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <FieldBlock label="Next agent action" value={v2.revenue_snapshot.next_agent_action} />
          <FieldBlock label="Next owner action" value={v2.revenue_snapshot.next_owner_action} />
        </LaneCard>
        </DrilldownGroup>
        <DrilldownGroup title="Debug · deploy placeholder & raw JSON (lane 10)">
          <LaneCard title="10 · Deploy / live-site status" subtitle="live_site_monitor_v1 when artifact exists">
            <div className="flex flex-wrap gap-2">
              <StatusPill status={v2.deploy_live_site_status.status} />
            </div>
            {v2.deploy_live_site_status.blocker ? (
              <p className="text-xs text-slate-600 dark:text-slate-400">{v2.deploy_live_site_status.blocker}</p>
            ) : null}
            {v2.deploy_live_site_status.live_site_monitor ? (
              <>
                <FieldBlock label="Smoke checked_at" value={v2.deploy_live_site_status.live_site_monitor.checked_at} />
                <FieldBlock label="target_base_url" value={v2.deploy_live_site_status.live_site_monitor.target_base_url} />
                <FieldBlock
                  label="deploy_sync_status"
                  value={v2.deploy_live_site_status.live_site_monitor.deploy_sync_status}
                />
              </>
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
        </DrilldownGroup>
        </div>
      </main>
    </div>
  );
}
