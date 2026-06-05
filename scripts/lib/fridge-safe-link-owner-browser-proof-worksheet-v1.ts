/**
 * Read-only owner-browser-proof worksheet for fridge safe-link discovery candidates.
 * Worksheet generation only — no CSV/Supabase/evidence mutation; no /go fetches.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  FRIDGE_OWNER_BROWSER_PROOF_CURSOR_VALIDATION_REL_V1,
  type OwnerBrowserProofCandidateVerdictRowV1,
} from "./fridge-safe-link-owner-browser-proof-batch-validation-v1";
import {
  FRIDGE_SAFE_LINK_BATCH_FACTORY_JSON_REL_V1,
  type FridgeSafeLinkBatchFactoryRowV1,
  type FridgeSafeLinkBatchFactoryV1,
} from "./fridge-safe-link-batch-factory-v1";

export const FRIDGE_OWNER_BROWSER_PROOF_WORKSHEET_CONTRACT_V1 =
  "fridge_safe_link_owner_browser_proof_worksheet_v1" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_WORKSHEET_MD_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-worksheet-v1.md" as const;

export const FRIDGE_OWNER_BROWSER_PROOF_WORKSHEET_ALLOWED_WRITE_REL_PATHS_V1 = [
  FRIDGE_OWNER_BROWSER_PROOF_WORKSHEET_MD_REL_V1,
] as const;

export const FRIDGE_OWNER_BROWSER_PROOF_WORKSHEET_CANDIDATE_SLUGS_V1 = [
  "edr4rxd1",
  "edr3rxd1",
  "ultrawf",
  "eptwfu01",
  "fppwfu01",
  "wf3cb",
  "wfcb",
] as const;

export const FRIDGE_OWNER_BROWSER_PROOF_RESULT_OPTIONS_V1 = [
  "PASS_DIRECT_BUYABLE_OEM",
  "PASS_DIRECT_BUYABLE_COMPATIBLE_WITH_LABEL",
  "FAIL_SEARCH_OR_SUPPORT_ONLY",
  "FAIL_AFTERMARKET_NOT_OEM",
  "FAIL_WRONG_PART_RISK",
  "UNKNOWN_NEEDS_REVIEW",
] as const;

export type OwnerBrowserProofWorksheetCandidateRowV1 = {
  url: string;
  url_type: string | null;
  oem_or_compatible: string | null;
  validation_verdict: string;
  validation_reason: string;
};

export type OwnerBrowserProofWorksheetSlugRowV1 = {
  slug: string;
  oem_part_token: string | null;
  batch_factory_state: string;
  brand_slug: string | null;
  live_url: string;
  candidate_urls: OwnerBrowserProofWorksheetCandidateRowV1[];
  rejected_candidates: string[];
  unknown_candidates: string[];
};

export type OwnerBrowserProofWorksheetV1 = {
  contract: typeof FRIDGE_OWNER_BROWSER_PROOF_WORKSHEET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  verified_link_authorized: false;
  generated_at: string;
  source_paths: string[];
  batch_factory_owner_browser_proof_overlay_applied: boolean;
  validation_status: string | null;
  slug_count: number;
  slugs: OwnerBrowserProofWorksheetSlugRowV1[];
  edr3_b087_excluded_as_oem: boolean;
};

const BROWSER_VERIFY_CHECKLIST_V1 = [
  "Direct product page — not search, category, or support-only page",
  "Visible product/part number matches slug OEM token (or documented compatible label)",
  "Brand/OEM vs aftermarket status confirmed on page",
  "Buy / add-to-cart / current availability visible if claiming direct buyable",
  "No wrong-part or supersession ambiguity for this slug",
] as const;

function loadJson<T>(rootDir: string, rel: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, rel), "utf8")) as T;
}

function normalizeUrlKey(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

export function mergeWorksheetCandidateUrlsV1(args: {
  factoryRow: FridgeSafeLinkBatchFactoryRowV1;
  candidateVerdicts: OwnerBrowserProofCandidateVerdictRowV1[];
}): {
  candidate_urls: OwnerBrowserProofWorksheetCandidateRowV1[];
  rejected_candidates: string[];
  unknown_candidates: string[];
} {
  const byUrl = new Map<string, OwnerBrowserProofWorksheetCandidateRowV1>();
  for (const row of args.candidateVerdicts) {
    byUrl.set(normalizeUrlKey(row.url), {
      url: row.url,
      url_type: row.url_type ?? null,
      oem_or_compatible: row.oem_or_compatible ?? null,
      validation_verdict: row.verdict,
      validation_reason: row.reason,
    });
  }
  for (const url of args.factoryRow.owner_browser_proof_candidates ?? []) {
    const key = normalizeUrlKey(url);
    if (!byUrl.has(key)) {
      byUrl.set(key, {
        url,
        url_type: null,
        oem_or_compatible: null,
        validation_verdict: "ACCEPTABLE_OWNER_BROWSER_CANDIDATE",
        validation_reason: "from batch factory owner_browser_proof_candidates",
      });
    }
  }

  const candidate_urls = [...byUrl.values()].filter(
    (c) =>
      c.validation_verdict === "ACCEPTABLE_OWNER_BROWSER_CANDIDATE" ||
      c.validation_verdict === "UNKNOWN_CAPTCHA_OR_UNVERIFIED",
  );
  const rejected_candidates = [
    ...(args.factoryRow.rejected_owner_browser_proof_candidates ?? []),
    ...args.candidateVerdicts
      .filter((c) => c.verdict === "REJECTED_RISKY_OR_AFTERMARKET" || c.verdict === "NOT_DIRECT_BUYABLE")
      .map((c) => `${c.url} (${c.verdict}: ${c.reason})`),
  ];
  const unknown_candidates = args.candidateVerdicts
    .filter((c) => c.verdict === "UNKNOWN_CAPTCHA_OR_UNVERIFIED")
    .map((c) => `${c.url} (${c.reason})`);

  const rejectionKey = (entry: string): string => {
    const match = entry.match(/^https?:\/\/[^\s(]+/);
    return match ? normalizeUrlKey(match[0]) : entry.trim().toLowerCase();
  };
  const seenRejected = new Set<string>();
  const dedupRejected = rejected_candidates.filter((entry) => {
    const key = rejectionKey(entry);
    if (seenRejected.has(key)) return false;
    seenRejected.add(key);
    return true;
  });
  const dedupUnknown = [...new Set(unknown_candidates)];

  return { candidate_urls, rejected_candidates: dedupRejected, unknown_candidates: dedupUnknown };
}

export function buildFridgeSafeLinkOwnerBrowserProofWorksheetV1(args: {
  rootDir: string;
  now?: () => Date;
}): OwnerBrowserProofWorksheetV1 {
  const rootDir = args.rootDir;
  const now = args.now ?? (() => new Date());

  const factoryPath = path.join(rootDir, FRIDGE_SAFE_LINK_BATCH_FACTORY_JSON_REL_V1);
  const validationPath = path.join(rootDir, FRIDGE_OWNER_BROWSER_PROOF_CURSOR_VALIDATION_REL_V1);
  if (!existsSync(factoryPath)) {
    throw new Error(`missing batch factory draft: ${FRIDGE_SAFE_LINK_BATCH_FACTORY_JSON_REL_V1}`);
  }
  if (!existsSync(validationPath)) {
    throw new Error(
      `missing owner-browser-proof validation packet: ${FRIDGE_OWNER_BROWSER_PROOF_CURSOR_VALIDATION_REL_V1}`,
    );
  }

  const factory = loadJson<FridgeSafeLinkBatchFactoryV1>(rootDir, FRIDGE_SAFE_LINK_BATCH_FACTORY_JSON_REL_V1);
  const validation = loadJson<{
    validation_status?: string;
    validation_details?: {
      candidate_url_verdicts?: OwnerBrowserProofCandidateVerdictRowV1[];
      edr3_b087_excluded_as_oem?: boolean;
    };
  }>(rootDir, FRIDGE_OWNER_BROWSER_PROOF_CURSOR_VALIDATION_REL_V1);

  const verdictsBySlug = new Map<string, OwnerBrowserProofCandidateVerdictRowV1[]>();
  for (const row of validation.validation_details?.candidate_url_verdicts ?? []) {
    const slug = row.slug.toLowerCase();
    const arr = verdictsBySlug.get(slug) ?? [];
    arr.push(row);
    verdictsBySlug.set(slug, arr);
  }

  const slugs: OwnerBrowserProofWorksheetSlugRowV1[] = [];
  for (const slug of FRIDGE_OWNER_BROWSER_PROOF_WORKSHEET_CANDIDATE_SLUGS_V1) {
    const factoryRow = factory.rows.find((r) => r.slug === slug);
    if (!factoryRow) {
      throw new Error(`batch factory missing candidate slug: ${slug}`);
    }
    if (factoryRow.owner_browser_proof_slug_verdict !== "DISCOVERY_CANDIDATES_OK") {
      throw new Error(`${slug}: expected DISCOVERY_CANDIDATES_OK in batch factory`);
    }
    const merged = mergeWorksheetCandidateUrlsV1({
      factoryRow,
      candidateVerdicts: verdictsBySlug.get(slug) ?? [],
    });
    slugs.push({
      slug,
      oem_part_token: factoryRow.oem_part_token,
      batch_factory_state: factoryRow.batch_factory_state,
      brand_slug: factoryRow.brand_slug,
      live_url: factoryRow.live_url,
      ...merged,
    });
  }

  return {
    contract: FRIDGE_OWNER_BROWSER_PROOF_WORKSHEET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    verified_link_authorized: false,
    generated_at: now().toISOString(),
    source_paths: [
      FRIDGE_SAFE_LINK_BATCH_FACTORY_JSON_REL_V1,
      FRIDGE_OWNER_BROWSER_PROOF_CURSOR_VALIDATION_REL_V1,
    ],
    batch_factory_owner_browser_proof_overlay_applied: factory.owner_browser_proof_overlay_applied === true,
    validation_status: validation.validation_status ?? null,
    slug_count: slugs.length,
    slugs,
    edr3_b087_excluded_as_oem: validation.validation_details?.edr3_b087_excluded_as_oem === true,
  };
}

export function buildFridgeSafeLinkOwnerBrowserProofWorksheetMarkdownV1(
  worksheet: OwnerBrowserProofWorksheetV1,
): string {
  const lines: string[] = [
    "# Fridge safe-link owner-browser-proof worksheet v1 (read-only)",
    "",
    `Generated: ${worksheet.generated_at}`,
    "",
    "## Guardrails",
    "",
    "- Worksheet/report generation only — **no Verified Link authorization**.",
    "- Do **not** mutate `data/retailer_links.csv`, `data/filters.csv`, `data/compatibility_mappings.csv`, or `data/evidence/**`.",
    "- Do **not** click production `/go` links as part of this worksheet.",
    "",
    "## Summary",
    "",
    `- slug_count: **${worksheet.slug_count}**`,
    `- batch_factory_owner_browser_proof_overlay_applied: **${worksheet.batch_factory_owner_browser_proof_overlay_applied}**`,
    `- validation_status: **${worksheet.validation_status ?? "UNKNOWN"}**`,
    `- edr3_b087_excluded_as_oem: **${worksheet.edr3_b087_excluded_as_oem}**`,
    "",
    "## Recommended proof result options",
    "",
    ...FRIDGE_OWNER_BROWSER_PROOF_RESULT_OPTIONS_V1.map((opt) => `- \`${opt}\``),
    "",
  ];

  for (const row of worksheet.slugs) {
    lines.push(`---`, "", `## ${row.slug}`, "");
    lines.push(`- **slug:** \`${row.slug}\``);
    lines.push(`- **oem_part_token:** \`${row.oem_part_token ?? "UNKNOWN"}\``);
    lines.push(`- **brand_slug:** \`${row.brand_slug ?? "UNKNOWN"}\``);
    lines.push(`- **batch_factory_state:** \`${row.batch_factory_state}\``);
    lines.push(`- **live_url:** ${row.live_url}`);
    lines.push("");

    lines.push("### Candidate URLs for manual browser proof", "");
    if (row.candidate_urls.length === 0) {
      lines.push("_None listed._", "");
    } else {
      for (const c of row.candidate_urls) {
        lines.push(
          `- ${c.url}`,
          `  - validation_verdict: \`${c.validation_verdict}\``,
          `  - url_type: \`${c.url_type ?? "UNKNOWN"}\` | oem_or_compatible: \`${c.oem_or_compatible ?? "UNKNOWN"}\``,
          `  - reason: ${c.validation_reason}`,
        );
      }
      lines.push("");
    }

    lines.push("### Rejected / risky candidates (do not treat as OEM without re-proof)", "");
    if (row.rejected_candidates.length === 0) {
      lines.push("_None listed._", "");
    } else {
      for (const r of row.rejected_candidates) {
        lines.push(`- ${r}`);
      }
      lines.push("");
    }

    if (row.unknown_candidates.length > 0) {
      lines.push("### Unknown / CAPTCHA-blocked candidates", "");
      for (const u of row.unknown_candidates) {
        lines.push(`- ${u}`);
      }
      lines.push("");
    }

    lines.push("### Jared must verify in browser", "");
    for (const item of BROWSER_VERIFY_CHECKLIST_V1) {
      lines.push(`- [ ] ${item}`);
    }
    lines.push("");

    lines.push("### Recommended proof result (pick one)", "");
    for (const opt of FRIDGE_OWNER_BROWSER_PROOF_RESULT_OPTIONS_V1) {
      lines.push(`- [ ] \`${opt}\``);
    }
    lines.push("");

    lines.push("### Notes", "", "_Fill in after browser review:_", "", "```", "", "```", "");
  }

  return lines.join("\n");
}

export function writeFridgeSafeLinkOwnerBrowserProofWorksheetDraftV1(args: {
  rootDir: string;
  worksheet: OwnerBrowserProofWorksheetV1;
}): { md_rel_path: string } {
  const mdRel = FRIDGE_OWNER_BROWSER_PROOF_WORKSHEET_MD_REL_V1;
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(
    mdAbs,
    `${buildFridgeSafeLinkOwnerBrowserProofWorksheetMarkdownV1(args.worksheet)}\n`,
    "utf8",
  );
  return { md_rel_path: mdRel };
}
