import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { runAppendSpendLedgerMain } from "./append-buckparts-spend-ledger-entry";
import {
  SPEND_LEDGER_APPEND_CONTRACT_V1,
  SPEND_LEDGER_INNER_CONTRACT_V1,
  appendSpendLedgerEntryV1,
  parseSpendLedgerFileV1,
  validateSpendLedgerEntryInputV1,
} from "./lib/buckparts-spend-ledger-contract-v1";

function emptyLedgerTemplate(): string {
  return JSON.stringify(
    {
      contract: SPEND_LEDGER_INNER_CONTRACT_V1,
      read_only: false,
      data_mutation: true,
      updated_at: "2026-05-18T00:00:00.000Z",
      entries: [],
    },
    null,
    2,
  );
}

function seedLedger(rootDir: string, entries: unknown[] = []): string {
  const ledgerPath = path.join(rootDir, "data", "ops", "spend-ledger-v1.json");
  mkdirSync(path.dirname(ledgerPath), { recursive: true });
  writeFileSync(
    ledgerPath,
    `${JSON.stringify(
      {
        contract: SPEND_LEDGER_INNER_CONTRACT_V1,
        read_only: false,
        data_mutation: true,
        updated_at: "2026-05-18T00:00:00.000Z",
        entries,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return ledgerPath;
}

function inferredNetlifyEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    provider: "netlify",
    unit_type: "netlify_credits",
    amount: 15,
    amount_unit: "credits",
    exact_cost_proven: false,
    estimated_cost_usd: null,
    source_surface: "manual:netlify-dashboard",
    task_id: null,
    session_id: null,
    related_commit: "abc1234",
    related_branch: "main",
    purpose: "production_deploy",
    outcome: "success",
    useful_output: true,
    deploy_triggered: true,
    mutation_triggered: false,
    proven_facts: [],
    unknown_facts: ["Netlify dashboard breakdown not attached to this row."],
    notes: null,
    ...overrides,
  };
}

test("appendSpendLedgerEntryV1 appends valid inferred Netlify row", () => {
  const root = mkdtempSync(path.join(tmpdir(), "buckparts-spend-ledger-"));
  seedLedger(root);
  const result = appendSpendLedgerEntryV1({
    rootDir: root,
    entryInput: inferredNetlifyEntry(),
    nowIso: "2026-05-18T12:00:00.000Z",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.summary.contract, SPEND_LEDGER_APPEND_CONTRACT_V1);
  assert.equal(result.summary.status, "APPENDED");
  assert.equal(result.summary.provider, "netlify");
  assert.equal(result.summary.exact_cost_proven, false);

  const ledger = JSON.parse(readFileSync(path.join(root, "data/ops/spend-ledger-v1.json"), "utf8"));
  assert.equal(ledger.entries.length, 1);
  assert.equal(ledger.entries[0].amount, 15);
  assert.equal(ledger.updated_at, "2026-05-18T12:00:00.000Z");
});

test("appendSpendLedgerEntryV1 refuses invalid provider", () => {
  const root = mkdtempSync(path.join(tmpdir(), "buckparts-spend-ledger-"));
  seedLedger(root);
  const result = appendSpendLedgerEntryV1({
    rootDir: root,
    entryInput: inferredNetlifyEntry({ provider: "aws" }),
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.errors.join("\n"), /provider must be one of/);
  const ledger = JSON.parse(readFileSync(path.join(root, "data/ops/spend-ledger-v1.json"), "utf8"));
  assert.equal(ledger.entries.length, 0);
});

test("validateSpendLedgerEntryInputV1 refuses exact_cost_proven=true without proven_facts", () => {
  const result = validateSpendLedgerEntryInputV1(
    inferredNetlifyEntry({
      exact_cost_proven: true,
      proven_facts: [],
      source_surface: "manual:netlify-dashboard:deploy-2026-05-18",
    }),
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.errors.join("\n"), /exact_cost_proven=true requires at least one non-empty proven_facts/);
});

test("appendSpendLedgerEntryV1 preserves existing entries", () => {
  const root = mkdtempSync(path.join(tmpdir(), "buckparts-spend-ledger-"));
  const first = validateSpendLedgerEntryInputV1(
    inferredNetlifyEntry({ id: "entry-1", recorded_at: "2026-05-17T00:00:00.000Z" }),
  );
  assert.equal(first.ok, true);
  if (!first.ok) return;
  seedLedger(root, [first.entry]);

  const second = appendSpendLedgerEntryV1({
    rootDir: root,
    entryInput: inferredNetlifyEntry({ id: "entry-2", recorded_at: "2026-05-18T00:00:00.000Z" }),
    nowIso: "2026-05-18T12:00:00.000Z",
  });
  assert.equal(second.ok, true);
  const ledger = JSON.parse(readFileSync(path.join(root, "data/ops/spend-ledger-v1.json"), "utf8"));
  assert.equal(ledger.entries.length, 2);
  assert.equal(ledger.entries[0].id, "entry-1");
  assert.equal(ledger.entries[1].id, "entry-2");
});

test("validateSpendLedgerEntryInputV1 adds id and recorded_at when missing", () => {
  const { id: _id, recorded_at: _at, ...withoutIds } = inferredNetlifyEntry();
  const result = validateSpendLedgerEntryInputV1(withoutIds);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.entry.id, /^[0-9a-f-]{36}$/i);
  assert.match(result.entry.recorded_at, /^\d{4}-\d{2}-\d{2}T/);
});

test("runAppendSpendLedgerMain does not require network", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "buckparts-spend-ledger-"));
  seedLedger(root);
  const { exitCode, stdout, stderr } = await runAppendSpendLedgerMain({
    rootDir: root,
    stdin: JSON.stringify(inferredNetlifyEntry()),
  });
  assert.equal(exitCode, 0);
  assert.equal(stderr, "");
  const summary = JSON.parse(stdout.trim());
  assert.equal(summary.contract, SPEND_LEDGER_APPEND_CONTRACT_V1);
  assert.equal(summary.status, "APPENDED");
});

test("parseSpendLedgerFileV1 validates contract shape", () => {
  const parsed = parseSpendLedgerFileV1(JSON.parse(emptyLedgerTemplate()));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.ledger.contract, SPEND_LEDGER_INNER_CONTRACT_V1);
  assert.equal(parsed.ledger.data_mutation, true);
  assert.deepEqual(parsed.ledger.entries, []);
});
