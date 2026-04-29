import assert from "node:assert/strict";
import test from "node:test";

import { buildFrigidaireReplacementStrategyReport } from "./report-frigidaire-replacement-strategy";

const EXPECTED_TOKENS = ["242017801", "242086201", "242294502", "EPTWFU01", "FPPWFU01"];

test("includes all target tokens with DEAD status", () => {
  const report = buildFrigidaireReplacementStrategyReport();
  const tokens = report.targets.map((target) => target.token).sort();
  assert.deepEqual(tokens, [...EXPECTED_TOKENS].sort());
  for (const target of report.targets) {
    assert.equal(target.oem_status, "DEAD");
  }
});

test("recommended path falls back to compatible aftermarket when APP/Amazon exact token are unknown", () => {
  const report = buildFrigidaireReplacementStrategyReport();

  for (const target of report.targets) {
    const appp = target.replacement_options.find(
      (option) => option.path_type === "APPLIANCEPARTSPROS_STYLE_PDP",
    );
    const amazon = target.replacement_options.find(
      (option) => option.path_type === "AMAZON_EXACT_TOKEN_PDP",
    );
    const compatible = target.replacement_options.find(
      (option) => option.path_type === "COMPATIBLE_AFTERMARKET_PARTS",
    );

    assert.ok(appp);
    assert.ok(amazon);
    assert.ok(compatible);
    assert.equal(appp.proof_status, "UNKNOWN");
    assert.equal(amazon.proof_status, "UNKNOWN");
    assert.equal(compatible.proof_status, "PROVEN_FROM_REPO");
    assert.equal(target.recommended_path, "COMPATIBLE_AFTERMARKET_PARTS");
  }
});

test("report is read-only", () => {
  const report = buildFrigidaireReplacementStrategyReport();
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

