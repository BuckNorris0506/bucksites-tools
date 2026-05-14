/**
 * Read-only Founder Control Plane view model for the owner dashboard.
 * PROVEN inputs: Command Center report fields already loaded server-side; local `package.json` + `.github/workflows` listing.
 * INFERRED: "Manual" burden is approximated by counting `buckparts:*` npm scripts (many are operator-only).
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { FOUNDER_PRIMARY_SIMPLIFICATION_TARGET } from "../../../scripts/lib/buckparts-operating-map-v1";

export type FounderControlLaneCategory =
  | "AUTOMATIC"
  | "MANUAL"
  | "OWNER_DECISION"
  | "AGENT_READ_ONLY"
  | "HUMAN_BROWSER_REQUIRED"
  | "UNKNOWN";

export type FounderControlLaneCard = {
  category: FounderControlLaneCategory;
  title: string;
  lines: string[];
};

export type FounderControlPlaneModel = {
  goal_line: string;
  next_best_action: string;
  copy_paste_burden_note: string;
  simplification_target: string;
  cards: FounderControlLaneCard[];
};

export type FounderControlPlaneReportSlice = {
  next_best_action: string;
  known_unknowns: string[];
  execution_guidance: {
    next_move_mode: string;
    mutating_blocked: boolean;
    mutating_block_reasons: string[];
  };
  command_center_v2: {
    next_owner_action: string;
    amazon_rescue: {
      next_agent_action: string;
      human_browser_required_tokens: string[];
      status: string;
    };
    unknown_or_human_review: { status: string; blocker: string | null };
    deploy_live_site_status: {
      status: string;
      live_site_monitor: { runtime_status?: string; routes?: { ok?: boolean }[] } | null;
    };
  };
};

function listGithubWorkflowBasenames(rootDir: string): string[] {
  const dir = path.join(rootDir, ".github", "workflows");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
}

function countBuckpartsScripts(rootDir: string): number | "UNKNOWN" {
  const pkgPath = path.join(rootDir, "package.json");
  if (!existsSync(pkgPath)) return "UNKNOWN";
  try {
    const raw = JSON.parse(readFileSync(pkgPath, "utf8")) as { scripts?: Record<string, string> };
    const scripts = raw.scripts ?? {};
    return Object.keys(scripts).filter((k) => k.startsWith("buckparts:")).length;
  } catch {
    return "UNKNOWN";
  }
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function buildFounderControlPlaneModel(
  rootDir: string,
  report: FounderControlPlaneReportSlice,
): FounderControlPlaneModel {
  const workflows = listGithubWorkflowBasenames(rootDir);
  const buckCount = countBuckpartsScripts(rootDir);
  const v2 = report.command_center_v2;
  const mon = v2.deploy_live_site_status.live_site_monitor;
  const routeOk = mon && Array.isArray(mon.routes) ? mon.routes.filter((r) => r.ok).length : null;
  const routeTotal = mon && Array.isArray(mon.routes) ? mon.routes.length : null;
  const humanTok = v2.amazon_rescue.human_browser_required_tokens ?? [];

  const automaticLines: string[] = [];
  if (workflows.length === 0) {
    automaticLines.push("UNKNOWN — no `.github/workflows` files found on disk for this deployment.");
  } else {
    automaticLines.push(`PROVEN scheduled CI entrypoints: ${workflows.join(", ")}`);
    automaticLines.push(
      "PROVEN: `buckparts-daily-operator.yml` runs `npm run buckparts:daily` on a daily cron + dispatch (job summary only).",
    );
    if (workflows.includes("buckparts-founder-digest.yml")) {
      automaticLines.push(
        "PROVEN: `buckparts-founder-digest.yml` runs weekly `npm run build` + founder digest Markdown artifact.",
      );
    }
  }
  automaticLines.push(
    "PROVEN (netlify.toml): Netlify invokes `npm run build` for deploy — no scheduled Netlify function declared in-repo.",
  );

  const manualLines: string[] = [
    typeof buckCount === "number"
      ? `PROVEN: \`package.json\` defines ${buckCount} \`buckparts:*\` scripts — most are manual unless wired into CI.`
      : "UNKNOWN — could not count `buckparts:*` scripts from package.json.",
    "INFERRED: This dashboard refreshes when the server rebuilds Command Center; it is not a live websocket.",
    "PROVEN: `npm run buckparts:operator-proof` and `npm run buckparts:operating-map` are local/CI-on-demand unless you add more workflows.",
  ];

  const ownerLines: string[] = [
    truncate(v2.next_owner_action, 420),
    report.execution_guidance.mutating_blocked
      ? `PROVEN: execution_guidance.mutating_blocked=true — ${report.execution_guidance.mutating_block_reasons.slice(0, 2).join(" · ") || "see Command Center for reasons."}`
      : "PROVEN: execution_guidance.mutating_blocked=false (mutating scripts not blanket-blocked in this snapshot).",
  ];

  const agentLines: string[] = [
    truncate(v2.amazon_rescue.next_agent_action, 360),
    `PROVEN: execution_guidance.next_move_mode=${report.execution_guidance.next_move_mode}`,
    "INFERRED: Agents should stay read-only (reports, tests) unless a lane explicitly authorizes mutation — never retailer_links or buy gates from here.",
  ];

  const humanLines: string[] = [
    `PROVEN: ${humanTok.length} token(s) in Amazon rescue human-browser-required cohort.`,
    humanTok.length > 0 ? `Sample: ${humanTok.slice(0, 5).join(", ")}` : "No human-browser tokens listed in this snapshot.",
    `PROVEN: unknown/human-review lane status=${v2.unknown_or_human_review.status}${v2.unknown_or_human_review.blocker ? ` — ${truncate(v2.unknown_or_human_review.blocker, 200)}` : ""}`,
  ];

  const unknownLines: string[] = [
    `PROVEN: deploy lane status=${v2.deploy_live_site_status.status}; live monitor runtime=${mon?.runtime_status ?? "UNKNOWN"}; routes OK=${routeOk ?? "UNKNOWN"}/${routeTotal ?? "UNKNOWN"}.`,
    ...report.known_unknowns.slice(0, 4).map((u) => `• ${truncate(u, 220)}`),
    ...(report.known_unknowns.length === 0 ? ["No `known_unknowns` strings on this Command Center snapshot."] : []),
  ];

  const cards: FounderControlLaneCard[] = [
    { category: "AUTOMATIC", title: "Automatic", lines: automaticLines },
    { category: "MANUAL", title: "Manual", lines: manualLines },
    { category: "OWNER_DECISION", title: "Owner decision", lines: ownerLines },
    { category: "AGENT_READ_ONLY", title: "Agent (read-only)", lines: agentLines },
    { category: "HUMAN_BROWSER_REQUIRED", title: "Human browser required", lines: humanLines },
    { category: "UNKNOWN", title: "Unknown / not proven here", lines: unknownLines },
  ];

  return {
    goal_line:
      "The goal is to make Command Center data visible here so Jared does not have to copy/paste raw reports.",
    next_best_action: truncate(report.next_best_action, 900),
    copy_paste_burden_note:
      typeof buckCount === "number"
        ? `High script surface (${buckCount} \`buckparts:*\` entries) plus large JSON from \`buckparts:command-center\` / \`buckparts:daily\` still drives copy/paste when operators work outside this dashboard.`
        : "Copy/paste burden: UNKNOWN script count — reduce by opening this dashboard first.",
    simplification_target: FOUNDER_PRIMARY_SIMPLIFICATION_TARGET,
    cards,
  };
}
