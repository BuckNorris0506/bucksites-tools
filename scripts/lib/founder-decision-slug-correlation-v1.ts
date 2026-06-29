/**
 * Exact slug identity for founder decision rows — no substring/haystack matching on free text.
 */

import {
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryRowV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { scanFounderDecisionRegistryJsonFilesV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-scan-v1";

export type FounderDecisionRowWithSlugCorrelationV1 = {
  row: FounderDecisionRegistryRowV1;
  apply_context_target_slugs: readonly string[];
  apply_context_apply_plan_rel_paths: readonly string[];
};

export function normalizeFounderDecisionSlugV1(slug: string): string {
  return slug.trim().toLowerCase();
}

/** Extract slug/plan correlation from `{slug}_apply_context_v1` blobs (not kept on validated rows). */
export function extractFounderDecisionApplyContextCorrelationV1(raw: Record<string, unknown>): {
  apply_context_target_slugs: string[];
  apply_context_apply_plan_rel_paths: string[];
} {
  const apply_context_target_slugs: string[] = [];
  const apply_context_apply_plan_rel_paths: string[] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!key.endsWith("_apply_context_v1") || value === null || typeof value !== "object") continue;
    const ctx = value as Record<string, unknown>;
    if (typeof ctx.target_slug === "string" && ctx.target_slug.trim()) {
      apply_context_target_slugs.push(normalizeFounderDecisionSlugV1(ctx.target_slug));
    }
    if (typeof ctx.apply_plan_rel_path === "string" && ctx.apply_plan_rel_path.trim()) {
      apply_context_apply_plan_rel_paths.push(ctx.apply_plan_rel_path.trim().toLowerCase());
    }
  }
  return {
    apply_context_target_slugs: Array.from(new Set(apply_context_target_slugs)),
    apply_context_apply_plan_rel_paths: Array.from(new Set(apply_context_apply_plan_rel_paths)),
  };
}

function slugIdentityInQueueRowId(queueRowId: string, slug: string): boolean {
  const prefix = "queue-fridge-safe-link-";
  const q = queueRowId.trim().toLowerCase();
  const s = normalizeFounderDecisionSlugV1(slug);
  if (!q.startsWith(prefix)) return false;
  const tail = q.slice(prefix.length);
  return tail === s || tail.startsWith(`${s}-`);
}

function slugIdentityInDelimitedId(id: string, slug: string): boolean {
  const lower = id.trim().toLowerCase();
  const s = normalizeFounderDecisionSlugV1(slug);
  let idx = 0;
  while ((idx = lower.indexOf(s, idx)) !== -1) {
    const before = idx === 0 ? "-" : lower[idx - 1]!;
    const afterIdx = idx + s.length;
    const after = afterIdx >= lower.length ? "-" : lower[afterIdx]!;
    if (/^[-_.]$/.test(before) && /^[-_.]$/.test(after)) return true;
    idx += 1;
  }
  return false;
}

export function founderDecisionRowMatchesSlugIdentityV1(args: {
  slug: string;
  applyPlanRel: string | null;
  loaded: FounderDecisionRowWithSlugCorrelationV1;
}): boolean {
  const slug = normalizeFounderDecisionSlugV1(args.slug);
  const { row, apply_context_target_slugs, apply_context_apply_plan_rel_paths } = args.loaded;

  if (apply_context_target_slugs.includes(slug)) return true;

  if (args.applyPlanRel) {
    const plan = args.applyPlanRel.trim().toLowerCase();
    if (apply_context_apply_plan_rel_paths.includes(plan)) return true;
  }

  if (slugIdentityInQueueRowId(row.source_queue_row_id, slug)) return true;
  if (slugIdentityInDelimitedId(row.source_decision_packet_id, slug)) return true;
  if (slugIdentityInDelimitedId(row.decision_id, slug)) return true;

  return false;
}

export function loadFounderDecisionRowsWithSlugCorrelationV1(
  rootDir: string,
): FounderDecisionRowWithSlugCorrelationV1[] {
  const rows: FounderDecisionRowWithSlugCorrelationV1[] = [];
  for (const file of scanFounderDecisionRegistryJsonFilesV1(rootDir)) {
    if ("parseError" in file || !file.parsed || typeof file.parsed !== "object") continue;
    const doc = file.parsed as { rows?: unknown[] };
    if (!Array.isArray(doc.rows)) continue;
    for (const raw of doc.rows) {
      const validated = validateFounderDecisionRegistryRowV1(raw);
      if (!validated.ok) continue;
      const correlation =
        raw !== null && typeof raw === "object" && !Array.isArray(raw)
          ? extractFounderDecisionApplyContextCorrelationV1(raw as Record<string, unknown>)
          : { apply_context_target_slugs: [], apply_context_apply_plan_rel_paths: [] };
      rows.push({
        row: validated.row,
        apply_context_target_slugs: correlation.apply_context_target_slugs,
        apply_context_apply_plan_rel_paths: correlation.apply_context_apply_plan_rel_paths,
      });
    }
  }
  return rows;
}

export function findFounderOwnerApprovalForSlugV1(args: {
  slug: string;
  applyPlanRel: string | null;
  founderRows: readonly FounderDecisionRowWithSlugCorrelationV1[];
}): { approved: boolean; source_path: string | null; notes: string } {
  const slug = normalizeFounderDecisionSlugV1(args.slug);
  for (const loaded of args.founderRows) {
    const row = loaded.row;
    if (row.decision_status !== "approved") continue;
    if (row.allowed_next_scope !== "owner_mutation_approved") continue;
    if (
      !founderDecisionRowMatchesSlugIdentityV1({
        slug,
        applyPlanRel: args.applyPlanRel,
        loaded,
      })
    ) {
      continue;
    }
    return {
      approved: true,
      source_path: row.decision_id,
      notes: `founder decision ${row.decision_id} approved for slug ${slug}`,
    };
  }
  return {
    approved: false,
    source_path: null,
    notes: `no founder decision row with owner_mutation_approved for slug ${slug}`,
  };
}
