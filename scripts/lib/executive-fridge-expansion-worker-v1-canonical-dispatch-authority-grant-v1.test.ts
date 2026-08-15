import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  founderRegistryRowGrantsMutatingRepoAuthority,
  isFounderRegistryRowActiveMutationApproval,
  validateFounderDecisionRegistryDocumentV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { lookupDispatchAllowlistEntryV1 } from "./buckparts-command-center-dispatch-allowlist-v1";
import { FRIDGE_EXPANSION_WORKER_SOURCE_COMMAND_V1 } from "./buckparts-fridge-expansion-worker-v1";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GRANT_JSON_REL =
  "data/fridge/batch-production/drafts/executive-fridge-expansion-worker-v1-canonical-dispatch-authority-grant-v1.json";
const GRANT_MD_REL =
  "data/fridge/batch-production/drafts/executive-fridge-expansion-worker-v1-canonical-dispatch-authority-grant-v1.md";
const CONTEXT_KEY =
  "executive_fridge_expansion_worker_v1_canonical_dispatch_authority_grant_context_v1";
const EXACT_COMMAND = "node --import tsx scripts/run-buckparts-fridge-expansion-worker-v1.ts";

function loadGrantTemplate(): Record<string, unknown> {
  const abs = path.join(REPO_ROOT, GRANT_JSON_REL);
  assert.equal(existsSync(abs), true, `missing ${GRANT_JSON_REL}`);
  return JSON.parse(readFileSync(abs, "utf8")) as Record<string, unknown>;
}

test("unsigned grant template is not a live owner-decision and does not edit allowlist", () => {
  const template = loadGrantTemplate();
  assert.equal(template.template_status, "PENDING_OWNER_FILL");
  assert.equal(template.not_an_approved_decision, true);
  assert.equal(template.mutation_authorized, false);
  assert.equal(template.dispatch_allowlist_edited, false);
  assert.equal(template.canonical_selector_edited, false);
  assert.equal(template.runtime_v3_implemented, false);
  assert.equal(template.implementation_stopped_pending_founder_ratification, true);
  assert.equal(template.existing_oar_schema_sufficient, true);
  assert.equal(template.smallest_missing_first_class_field, null);
  assert.equal(existsSync(path.join(REPO_ROOT, GRANT_MD_REL)), true);
  assert.equal(
    existsSync(
      path.join(
        REPO_ROOT,
        "data/owner-decisions/executive-fridge-expansion-worker-v1-canonical-dispatch-authority-grant-v1.json",
      ),
    ),
    false,
  );
  assert.equal(lookupDispatchAllowlistEntryV1(EXACT_COMMAND), null);
  assert.equal(FRIDGE_EXPANSION_WORKER_SOURCE_COMMAND_V1, EXACT_COMMAND);
});

test("unsigned inner registry document fails closed until founder fills dates", () => {
  const template = loadGrantTemplate();
  const inner = template.registry_document_after_founder_signature;
  const v = validateFounderDecisionRegistryDocumentV1(inner);
  assert.equal(v.ok, false);
  if (!v.ok) {
    assert.ok(v.errors.some((e) => e.includes("decided_at") || e.includes("expires_at")));
  }
});

test("founder-filled registry document validates as read_only_agent with no mutation authority", () => {
  const template = loadGrantTemplate();
  const inner = JSON.parse(
    JSON.stringify(template.registry_document_after_founder_signature),
  ) as {
    rows: Array<Record<string, unknown>>;
  };
  const row = inner.rows[0]!;
  row.decided_at = "2026-08-14T12:00:00.000Z";
  row.expires_at = "2026-09-14T12:00:00.000Z";

  const ctx = row[CONTEXT_KEY] as Record<string, unknown>;
  assert.equal(ctx.worker_name, "Fridge Expansion Worker v1");
  assert.equal(ctx.exact_command, EXACT_COMMAND);
  assert.equal(ctx.mutation_allowed, false);
  assert.equal(ctx.owner_review_required, true);
  assert.equal(ctx.production_apply_authorized, false);
  assert.equal(ctx.guarded_apply_authorized, false);
  assert.equal(ctx.invoke_outside_canonical_final_operating_decision_v1_authorized, false);
  assert.equal(ctx.second_selector_authorized, false);
  assert.equal(ctx.outcome_join_steering_authorized, false);
  assert.equal(ctx.new_objective_authority_authorized, false);
  assert.equal(ctx.precedence_reorder_authorized, false);
  assert.equal(ctx.post_ratification_allowlist_membership_authorized, true);
  assert.equal(ctx.post_ratification_existing_candidate_emission_authorized, true);
  assert.equal(ctx.post_ratification_existing_source, "refrigerator_model_first");
  assert.equal(
    ctx.post_ratification_emit_when_eligible_expansion_work_exists_and_mapping_review_unknown_inactive,
    true,
  );
  assert.equal(ctx.post_ratification_replace_mapping_review_command_while_mapping_review_remains, false);
  assert.equal(ctx.dispatch_allowlist_membership_not_granted_until_live_approved_row, true);
  assert.equal(ctx.runtime_v3_not_authorized, true);
  assert.equal(ctx.scheduling_not_authorized, true);

  const v = validateFounderDecisionRegistryDocumentV1(inner);
  assert.equal(v.ok, true, v.ok ? "" : v.errors.join("; "));
  if (!v.ok) return;
  assert.equal(v.doc.rows.length, 1);
  const validated = v.doc.rows[0]!;
  assert.equal(validated.decision_status, "approved");
  assert.equal(validated.allowed_next_scope, "read_only_agent");
  assert.equal(validated.evidence_required_before_mutation, true);
  assert.match(validated.owner_note, /node --import tsx scripts\/run-buckparts-fridge-expansion-worker-v1\.ts/);
  assert.equal(
    founderRegistryRowGrantsMutatingRepoAuthority(validated, "2026-08-14T12:00:01.000Z"),
    false,
  );
  assert.equal(
    isFounderRegistryRowActiveMutationApproval(validated, "2026-08-14T12:00:01.000Z"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(validated, CONTEXT_KEY),
    false,
    "extra context blob is on-disk founder intent; typed registry row does not consume it as a first-class field",
  );
  const prohibitions = validated.prohibited_actions_still_apply.join("\n");
  assert.match(prohibitions, /owner_mutation_approved/);
  assert.match(prohibitions, /guarded-apply/);
  assert.match(prohibitions, /second selector/i);
  assert.match(prohibitions, /Outcome Join/);
  assert.match(prohibitions, /Runtime v3/);
  assert.match(prohibitions, /DISPATCH_ALLOWLIST_ENTRIES_V1/);
  assert.match(prohibitions, /live approved copy/);
});

test("no live owner-decision grants fridge expansion worker canonical dispatch", () => {
  const ownerDir = path.join(REPO_ROOT, "data/owner-decisions");
  const hits: string[] = [];
  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!entry.name.endsWith(".json")) continue;
      const text = readFileSync(abs, "utf8");
      if (text.includes(EXACT_COMMAND) || text.includes("fridge_expansion_worker_v1")) {
        hits.push(path.relative(REPO_ROOT, abs));
      }
    }
  }
  walk(ownerDir);
  assert.deepEqual(hits, []);
});
