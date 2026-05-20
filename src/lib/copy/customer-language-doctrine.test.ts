import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  CUSTOMER_LANGUAGE_DOCTRINE_REL_PATH,
  NO_OEM_COLD_RULE_V1,
  WATERDROP_DA29_00020B_RESEARCH_DRAFT_REL_PATH,
} from "@/lib/copy/customer-language-doctrine";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.."));

describe("customer language doctrine", () => {
  it("doctrine doc defines no OEM cold rule and preferred homeowner terms", () => {
    const md = readFileSync(path.join(REPO_ROOT, CUSTOMER_LANGUAGE_DOCTRINE_REL_PATH), "utf8");
    assert.match(md, /no “OEM” cold/i);
    assert.match(md, /original equipment manufacturer/i);
    assert.match(md, /Samsung-made/i);
    assert.match(md, /compatible replacement filter/i);
    assert.match(md, /non-Samsung replacement filter/i);
    assert.match(NO_OEM_COLD_RULE_V1, /must not use OEM unless defined/i);
    assert.match(md, /purchase options/i);
    assert.match(md, /Store links appear only after BuckParts checks the listing against the part number/i);
    assert.match(md, /avoid sending you to a bad match/i);
    const goUnavailable = readFileSync(path.join(REPO_ROOT, "src/app/go-unavailable/page.tsx"), "utf8");
    assert.ok(!/store shortcut/i.test(goUnavailable));
    const partTrust = readFileSync(path.join(REPO_ROOT, "src/lib/trust/part-trust.ts"), "utf8");
    assert.ok(!/store shortcut/i.test(partTrust));
  });

  it("Waterdrop research draft exists and is marked not published", () => {
    const md = readFileSync(path.join(REPO_ROOT, WATERDROP_DA29_00020B_RESEARCH_DRAFT_REL_PATH), "utf8");
    assert.match(md, /DESIGN ONLY/i);
    assert.match(md, /not customer-facing/i);
    assert.match(md, /DA29-00020B/i);
  });
});
