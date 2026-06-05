/**
 * Read-only owner browser proof session worksheet from OWNER_BROWSER_PROOF_ASSIST bundle.
 * Session report generation only — no CSV/Supabase/evidence mutation; no /go fetches.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  FRIDGE_OWNER_BROWSER_PROOF_ASSIST_BUNDLE_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_ASSIST_B087_ASIN_V1,
  FRIDGE_OWNER_BROWSER_PROOF_ASSIST_CURSOR_VALIDATION_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_ASSIST_EXPECTED_SLUGS_V1,
  loadOwnerBrowserProofAssistBundleV1,
  type OwnerBrowserProofAssistBundleV1,
  type OwnerBrowserProofAssistPacketV1,
} from "./fridge-safe-link-owner-browser-proof-assist-validation-v1";

export const FRIDGE_OWNER_BROWSER_PROOF_SESSION_CONTRACT_V1 =
  "fridge_safe_link_owner_browser_proof_session_v1" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_SESSION_MD_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-session-v1.md" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_SESSION_ALLOWED_WRITE_REL_PATHS_V1 = [
  FRIDGE_OWNER_BROWSER_PROOF_SESSION_MD_REL_V1,
] as const;

export const FRIDGE_OWNER_BROWSER_PROOF_SESSION_RESULT_OPTIONS_V1 = [
  "PASS_BROWSER_PROOF",
  "FAIL_BROWSER_PROOF",
  "NEEDS_RECONCILIATION",
  "NO_SAFE_LINK_FOUND",
] as const;

export const BUCKPARTS_FILTER_LIVE_URL_BASE_V1 = "https://buckparts.com/filter/" as const;

export type OwnerBrowserProofSessionSlugRowV1 = {
  session_order: number;
  slug: string;
  risk: string;
  session_reason: string;
  oem_part_token: string;
  brand_slug: string;
  product_line: string | null;
  live_url: string;
  candidate_urls: Array<{
    priority: number;
    url: string;
    retailer: string;
    notes: string | null;
  }>;
  urls_to_avoid: Array<{
    url: string;
    retailer: string | null;
    reason: string | null;
    action: string | null;
  }>;
  visual_checklist: string[];
  pass_criteria: string;
  fail_criteria: string[];
  recommended_screenshot_names: string[];
  wrong_part_risk_notes: string | null;
};

export type OwnerBrowserProofSessionDoNotUseRowV1 = {
  slug: string;
  url: string;
  retailer: string | null;
  reason: string;
  action: string;
  evidence_level: string | null;
};

export type OwnerBrowserProofSessionV1 = {
  contract: typeof FRIDGE_OWNER_BROWSER_PROOF_SESSION_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  verified_link_authorized: false;
  apply_planning_authorized: false;
  command_center_closure_authorized: false;
  generated_at: string;
  source_paths: string[];
  bundle_id: string;
  manifest_id: string;
  validation_status: string | null;
  session_order: string[];
  slug_count: number;
  slugs: OwnerBrowserProofSessionSlugRowV1[];
  do_not_use: OwnerBrowserProofSessionDoNotUseRowV1[];
  edr3_b087_excluded_from_candidates: boolean;
};

function loadJson<T>(rootDir: string, rel: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, rel), "utf8")) as T;
}

function asStringArray(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

function packetBySlug(bundle: OwnerBrowserProofAssistBundleV1): Map<string, OwnerBrowserProofAssistPacketV1> {
  return new Map(bundle.packets.map((p) => [p.slug, p]));
}

export function deriveOwnerBrowserProofSessionOrderV1(
  bundle: OwnerBrowserProofAssistBundleV1,
): Array<{ slug: string; risk: string; reason: string }> {
  const fromManifest = bundle.manifest.session_priority_order ?? [];
  if (fromManifest.length > 0) {
    return fromManifest.map((row) => ({
      slug: row.slug,
      risk: row.risk ?? "UNKNOWN",
      reason: row.reason ?? "",
    }));
  }
  return [...FRIDGE_OWNER_BROWSER_PROOF_ASSIST_EXPECTED_SLUGS_V1].map((slug) => ({
    slug,
    risk: "UNKNOWN",
    reason: "fallback order — manifest.session_priority_order missing",
  }));
}

export function buildOwnerBrowserProofSessionSlugRowV1(args: {
  session_order: number;
  risk: string;
  session_reason: string;
  packet: OwnerBrowserProofAssistPacketV1;
}): OwnerBrowserProofSessionSlugRowV1 {
  const { packet } = args;
  const ws = packet.browser_proof_worksheet;
  const candidate_urls = [...(packet.candidate_urls ?? [])]
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    .map((c, index) => ({
      priority: c.priority ?? index + 1,
      url: c.url,
      retailer: c.retailer ?? "UNKNOWN",
      notes: c.notes ?? null,
    }));

  return {
    session_order: args.session_order,
    slug: packet.slug,
    risk: args.risk,
    session_reason: args.session_reason,
    oem_part_token: String(packet.oem_part_token ?? packet.slug.toUpperCase()),
    brand_slug: String(packet.brand_slug ?? "unknown"),
    product_line: typeof packet.product_line === "string" ? packet.product_line : null,
    live_url: `${BUCKPARTS_FILTER_LIVE_URL_BASE_V1}${packet.slug}`,
    candidate_urls,
    urls_to_avoid: (packet.urls_to_avoid ?? [])
      .filter((u) => typeof u.url === "string" && u.url.trim())
      .map((u) => ({
        url: u.url,
        retailer: u.retailer ?? null,
        reason: u.reason ?? null,
        action: u.action ?? null,
      })),
    visual_checklist: ws?.visual_checklist ?? [],
    pass_criteria: ws?.pass_criteria ?? "Confirm all visual checklist items.",
    fail_criteria: asStringArray(ws?.fail_criteria),
    recommended_screenshot_names: ws?.recommended_screenshot_names ?? [],
    wrong_part_risk_notes:
      typeof ws?.wrong_part_risk === "object" && ws.wrong_part_risk !== null
        ? String((ws.wrong_part_risk as { notes?: string }).notes ?? "")
        : null,
  };
}

export function collectOwnerBrowserProofSessionDoNotUseV1(
  bundle: OwnerBrowserProofAssistBundleV1,
): OwnerBrowserProofSessionDoNotUseRowV1[] {
  const rows: OwnerBrowserProofSessionDoNotUseRowV1[] = [];

  for (const entry of bundle.do_not_use ?? []) {
    if (!entry.url?.trim()) continue;
    rows.push({
      slug: entry.slug ?? "unknown",
      url: entry.url,
      retailer: entry.retailer ?? null,
      reason: entry.reason ?? "listed in bundle.do_not_use",
      action: entry.action ?? "HARD_DO_NOT_USE",
      evidence_level: entry.evidence_level ?? null,
    });
  }

  for (const packet of bundle.packets) {
    for (const avoid of packet.urls_to_avoid ?? []) {
      if (!avoid.url?.trim()) continue;
      const action = String(avoid.action ?? "");
      if (!action.includes("DO_NOT_USE") && !action.includes("HARD_FAIL")) continue;
      if (rows.some((r) => r.url === avoid.url)) continue;
      rows.push({
        slug: packet.slug,
        url: avoid.url,
        retailer: avoid.retailer ?? null,
        reason: avoid.reason ?? "listed in packet.urls_to_avoid",
        action,
        evidence_level: avoid.evidence_level ?? null,
      });
    }
  }

  return rows;
}

export function proveEdr3B087ExcludedFromSessionCandidatesV1(
  session: OwnerBrowserProofSessionV1,
): boolean {
  for (const row of session.slugs) {
    if (row.candidate_urls.some((c) => c.url.includes(FRIDGE_OWNER_BROWSER_PROOF_ASSIST_B087_ASIN_V1))) {
      return false;
    }
  }
  return true;
}

export function buildFridgeSafeLinkOwnerBrowserProofSessionV1(args: {
  rootDir: string;
  now?: () => Date;
}): OwnerBrowserProofSessionV1 {
  const rootDir = args.rootDir;
  const now = args.now ?? (() => new Date());
  const bundle = loadOwnerBrowserProofAssistBundleV1(rootDir);
  const bySlug = packetBySlug(bundle);
  const order = deriveOwnerBrowserProofSessionOrderV1(bundle);

  let validation_status: string | null = null;
  const validationPath = path.join(rootDir, FRIDGE_OWNER_BROWSER_PROOF_ASSIST_CURSOR_VALIDATION_REL_V1);
  if (existsSync(validationPath)) {
    const validation = loadJson<{ validation_status?: string }>(
      rootDir,
      FRIDGE_OWNER_BROWSER_PROOF_ASSIST_CURSOR_VALIDATION_REL_V1,
    );
    validation_status = validation.validation_status ?? null;
  }

  const slugs: OwnerBrowserProofSessionSlugRowV1[] = [];
  for (const [index, item] of order.entries()) {
    const packet = bySlug.get(item.slug);
    if (!packet) {
      throw new Error(`assist bundle missing packet for session slug: ${item.slug}`);
    }
    slugs.push(
      buildOwnerBrowserProofSessionSlugRowV1({
        session_order: index + 1,
        risk: item.risk,
        session_reason: item.reason,
        packet,
      }),
    );
  }

  const do_not_use = collectOwnerBrowserProofSessionDoNotUseV1(bundle);
  const session: OwnerBrowserProofSessionV1 = {
    contract: FRIDGE_OWNER_BROWSER_PROOF_SESSION_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    verified_link_authorized: false,
    apply_planning_authorized: false,
    command_center_closure_authorized: false,
    generated_at: now().toISOString(),
    source_paths: [
      FRIDGE_OWNER_BROWSER_PROOF_ASSIST_BUNDLE_REL_V1,
      FRIDGE_OWNER_BROWSER_PROOF_ASSIST_CURSOR_VALIDATION_REL_V1,
    ],
    bundle_id: bundle.bundle_id,
    manifest_id: bundle.manifest.manifest_id,
    validation_status,
    session_order: order.map((o) => o.slug),
    slug_count: slugs.length,
    slugs,
    do_not_use,
    edr3_b087_excluded_from_candidates: true,
  };
  session.edr3_b087_excluded_from_candidates = proveEdr3B087ExcludedFromSessionCandidatesV1(session);
  return session;
}

export function buildFridgeSafeLinkOwnerBrowserProofSessionMarkdownV1(
  session: OwnerBrowserProofSessionV1,
): string {
  const lines: string[] = [
    "# Fridge safe-link owner browser proof session v1 (read-only)",
    "",
    `Generated: ${session.generated_at}`,
    "",
    "## Stop condition",
    "",
    "This session worksheet is for **manual browser proof only**. It does **not** authorize:",
    "",
    "- apply planning or Verified Link authorization",
    "- Command Center closure or truth closure",
    "- `data/retailer_links.csv` mutation",
    "- Supabase mutation",
    "- `data/evidence/**` writes",
    "- production `/go` clicks",
    "",
    "Record results here first. Repo intake of proof evidence requires a separate approved step.",
    "",
    "## Session summary",
    "",
    `- bundle_id: \`${session.bundle_id}\``,
    `- manifest_id: \`${session.manifest_id}\``,
    `- validation_status: **${session.validation_status ?? "UNKNOWN"}**`,
    `- slug_count: **${session.slug_count}**`,
    `- edr3_b087_excluded_from_candidates: **${session.edr3_b087_excluded_from_candidates}**`,
    "",
    "### One-page summary table",
    "",
    "| # | Slug | Risk | OEM | Live page | Candidates | Avoid | Owner result |",
    "|---:|---|---|---|---:|---:|---:|---|",
  ];

  for (const row of session.slugs) {
    lines.push(
      `| ${row.session_order} | \`${row.slug}\` | ${row.risk} | \`${row.oem_part_token}\` | [open](${row.live_url}) | ${row.candidate_urls.length} | ${row.urls_to_avoid.length} | _pick below_ |`,
    );
  }

  lines.push(
    "",
    "### Start order (easiest → hardest)",
    "",
    ...session.slugs.map(
      (row) =>
        `${row.session_order}. \`${row.slug}\` (${row.risk}) — ${row.session_reason || "_no reason recorded_"}`,
    ),
    "",
    "### Owner result options (pick one per slug)",
    "",
    ...FRIDGE_OWNER_BROWSER_PROOF_SESSION_RESULT_OPTIONS_V1.map((opt) => `- \`${opt}\``),
    "",
    "## DO_NOT_USE table",
    "",
    "| Slug | URL | Retailer | Action | Reason | Evidence |",
    "|---|---|---|---|---|---|",
  );

  if (session.do_not_use.length === 0) {
    lines.push("| _none_ | | | | | |");
  } else {
    for (const row of session.do_not_use) {
      lines.push(
        `| \`${row.slug}\` | ${row.url} | ${row.retailer ?? "—"} | \`${row.action}\` | ${row.reason} | ${row.evidence_level ?? "UNKNOWN"} |`,
      );
    }
  }

  for (const row of session.slugs) {
    lines.push(
      "---",
      "",
      `## Session ${row.session_order}: ${row.slug}`,
      "",
      `- **slug:** \`${row.slug}\``,
      `- **OEM token:** \`${row.oem_part_token}\``,
      `- **brand:** \`${row.brand_slug}\``,
      `- **product line:** ${row.product_line ?? "UNKNOWN"}`,
      `- **risk:** ${row.risk} — ${row.session_reason}`,
      `- **live BuckParts page:** ${row.live_url}`,
      "",
      "### Candidate URLs to open",
      "",
    );

    if (row.candidate_urls.length === 0) {
      lines.push("_None listed._", "");
    } else {
      for (const c of row.candidate_urls) {
        lines.push(
          `${c.priority}. **${c.retailer}** — ${c.url}`,
          c.notes ? `   - notes: ${c.notes}` : "",
        );
      }
      lines.push("");
    }

    lines.push("### URLs to avoid", "");
    if (row.urls_to_avoid.length === 0) {
      lines.push("_None listed for this slug._", "");
    } else {
      for (const u of row.urls_to_avoid) {
        lines.push(
          `- ${u.url}`,
          u.action ? `  - action: \`${u.action}\`` : "",
          u.reason ? `  - reason: ${u.reason}` : "",
        );
      }
      lines.push("");
    }

    lines.push("### Exact visual checks", "");
    if (row.visual_checklist.length === 0) {
      lines.push("_No checklist in bundle — use global rules below._", "");
    } else {
      for (const item of row.visual_checklist) {
        lines.push(`- [ ] ${item}`);
      }
      lines.push("");
    }

    lines.push("### Pass criteria", "", row.pass_criteria, "", "### Fail criteria", "");
    if (row.fail_criteria.length === 0) {
      lines.push("_None listed._", "");
    } else {
      for (const item of row.fail_criteria) {
        lines.push(`- ${item}`);
      }
      lines.push("");
    }

    if (row.wrong_part_risk_notes) {
      lines.push("### Wrong-part risk notes", "", row.wrong_part_risk_notes, "");
    }

    lines.push("### Screenshot filename checklist", "");
    if (row.recommended_screenshot_names.length === 0) {
      lines.push("_No filenames suggested — use `{slug}-{retailer}-pdp-{date}.png`._", "");
    } else {
      for (const name of row.recommended_screenshot_names) {
        lines.push(`- [ ] \`${name}\``);
      }
      lines.push("");
    }

    lines.push("### Notes", "", "_Fill in during browser session:_", "", "```", "", "```", "");

    lines.push("### Final owner result (pick one)", "");
    for (const opt of FRIDGE_OWNER_BROWSER_PROOF_SESSION_RESULT_OPTIONS_V1) {
      lines.push(`- [ ] \`${opt}\``);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function writeFridgeSafeLinkOwnerBrowserProofSessionDraftV1(args: {
  rootDir: string;
  session: OwnerBrowserProofSessionV1;
}): { md_rel_path: string } {
  const mdRel = FRIDGE_OWNER_BROWSER_PROOF_SESSION_MD_REL_V1;
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(
    mdAbs,
    `${buildFridgeSafeLinkOwnerBrowserProofSessionMarkdownV1(args.session)}\n`,
    "utf8",
  );
  return { md_rel_path: mdRel };
}
