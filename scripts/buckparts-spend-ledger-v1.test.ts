/**
 * PROVEN: spend ledger doc + canonical ops file exist with expected contract id.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { SPEND_LEDGER_INNER_CONTRACT_V1 } from "./lib/buckparts-spend-ledger-contract-v1";

const ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const DOC_PATH = path.join(ROOT, "docs", "BuckParts-SPEND-LEDGER-V1.md");
const LEDGER_PATH = path.join(ROOT, "data", "ops", "spend-ledger-v1.json");

test("BuckParts spend ledger v1 doc exists with contract references", () => {
  const doc = readFileSync(DOC_PATH, "utf8");
  assert.match(doc, /buckparts_spend_ledger_v1/);
  assert.match(doc, /data\/ops\/spend-ledger-v1\.json/);
  assert.match(doc, /PROVEN/);
  assert.match(doc, /INFERRED/);
  assert.match(doc, /UNKNOWN/);
  assert.match(doc, /no Command Center neuron/i);
});

test("data/ops/spend-ledger-v1.json exists with inner contract", () => {
  const ledger = JSON.parse(readFileSync(LEDGER_PATH, "utf8")) as {
    contract: string;
    entries: unknown[];
  };
  assert.equal(ledger.contract, SPEND_LEDGER_INNER_CONTRACT_V1);
  assert.ok(Array.isArray(ledger.entries));
});
