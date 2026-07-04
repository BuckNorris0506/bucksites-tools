import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  CUSTOMER_LANGUAGE_DOCTRINE_REL_PATH,
  extractPublicCopyStringLiteralsV1,
  FULL_TRUTH_OR_UNKNOWN_RULE_V1,
  LIVE_SITE_SMOKE_CHECK_ALIAS_NPM_SCRIPT_V1,
  LIVE_SITE_SMOKE_CHECK_NPM_SCRIPT_V1,
  NO_OEM_COLD_RULE_V1,
  OWNER_MANUFACTURER_CATALOG_SEARCH_REMEDIATION_V1,
  PUBLIC_BANNED_BACKEND_HOMEOWNER_PHRASES_V1,
  PUBLIC_BANNED_BACKEND_JARGON_V1,
  PUBLIC_BANNED_CUSTOMER_COPY_LEAKS_V1,
  PUBLIC_CUSTOMER_COPY_SURFACE_REL_PATHS_V1,
  PUBLIC_TRUST_PAGE_REL_PATHS_V1,
  publicCopyLiteralsContainBannedLeakV1,
  UNIVERSAL_PAGE_TRUST_CONTRACT_REL_PATH,
  WATERDROP_DA29_00020B_RESEARCH_DRAFT_REL_PATH,
} from "@/lib/copy/customer-language-doctrine";
import {
  customerFacingFilterProofStatusV1,
} from "@/components/fridge/FilterPdpRepoEvidenceSection";
import { SINGLE_FILTER_FAMILY_AMBIGUITY_FILTER_PAGE_NOTE_V1 } from "@/lib/fridge/fridge-filter-pdp-customer-safety-v1";

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
    assert.match(md, /FULL truth or UNKNOWN/i);
    assert.match(md, /Homeowner language only/i);
    assert.match(md, /treasure hunt/i);
    assert.match(md, /compare the filter code on your old filter or fridge label/i);
    assert.match(md, new RegExp(LIVE_SITE_SMOKE_CHECK_NPM_SCRIPT_V1.replace(/:/g, "\\:")));
    assert.match(md, new RegExp(LIVE_SITE_SMOKE_CHECK_ALIAS_NPM_SCRIPT_V1.replace(/:/g, "\\:")));
    assert.equal(
      FULL_TRUTH_OR_UNKNOWN_RULE_V1,
      "Public BuckParts copy is FULL truth or UNKNOWN only — no mostly true, probably true, good enough, or partial-confidence homeowner claims.",
    );
    assert.equal(
      OWNER_MANUFACTURER_CATALOG_SEARCH_REMEDIATION_V1,
      "Replace manufacturer catalog/search rows with verified direct product pages where exact part-number proof exists.",
    );
    const goUnavailable = readFileSync(path.join(REPO_ROOT, "src/app/go-unavailable/page.tsx"), "utf8");
    assert.ok(!/store shortcut/i.test(goUnavailable));
    const partTrust = readFileSync(path.join(REPO_ROOT, "src/lib/trust/part-trust.ts"), "utf8");
    assert.ok(!/store shortcut/i.test(partTrust));
  });

  it("universal trust contract bans backend QA phrases for homeowner copy", () => {
    const md = readFileSync(path.join(REPO_ROOT, UNIVERSAL_PAGE_TRUST_CONTRACT_REL_PATH), "utf8");
    for (const phrase of PUBLIC_BANNED_BACKEND_HOMEOWNER_PHRASES_V1) {
      assert.match(md, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    }
    assert.match(md, /probably fits \/ mostly true \/ good enough/i);
  });

  it("public trust pages avoid backend jargon (FULL truth / homeowner language)", () => {
    for (const rel of PUBLIC_TRUST_PAGE_REL_PATHS_V1) {
      const src = readFileSync(path.join(REPO_ROOT, rel), "utf8").toLowerCase();
      for (const phrase of PUBLIC_BANNED_BACKEND_JARGON_V1) {
        assert.ok(
          !src.includes(phrase.toLowerCase()),
          `${rel}: banned backend jargon "${phrase}"`,
        );
      }
      for (const phrase of PUBLIC_BANNED_BACKEND_HOMEOWNER_PHRASES_V1) {
        assert.ok(
          !src.includes(phrase.toLowerCase()),
          `${rel}: banned backend homeowner phrase "${phrase}"`,
        );
      }
    }
    const prevention = readFileSync(
      path.join(REPO_ROOT, "src/app/wrong-part-prevention/page.tsx"),
      "utf8",
    );
    assert.match(prevention, /compare the filter code on your old filter or fridge label/i);
    assert.match(prevention, /treasure hunt/i);
    assert.match(prevention, /does not guarantee that every filter/i);
    assert.match(prevention, /not a substitute for reading your old part/i);
  });

  it("Waterdrop research draft exists and is marked not published", () => {
    const md = readFileSync(path.join(REPO_ROOT, WATERDROP_DA29_00020B_RESEARCH_DRAFT_REL_PATH), "utf8");
    assert.match(md, /DESIGN ONLY/i);
    assert.match(md, /not customer-facing/i);
    assert.match(md, /DA29-00020B/i);
  });

  it("public customer-copy surfaces do not leak internal jargon in string literals", () => {
    for (const rel of PUBLIC_CUSTOMER_COPY_SURFACE_REL_PATHS_V1) {
      const src = readFileSync(path.join(REPO_ROOT, rel), "utf8");
      const literals = extractPublicCopyStringLiteralsV1(src);
      for (const phrase of PUBLIC_BANNED_CUSTOMER_COPY_LEAKS_V1) {
        assert.ok(
          !publicCopyLiteralsContainBannedLeakV1(literals, phrase),
          `${rel}: banned customer-copy leak "${phrase}" in string literals`,
        );
      }
    }
  });

  it("filter PDP proof status maps enums to homeowner English", () => {
    assert.equal(
      customerFacingFilterProofStatusV1("direct_buyable"),
      "We checked a direct product page for this filter.",
    );
    assert.equal(
      customerFacingFilterProofStatusV1("search_placeholder"),
      "We only found a store search page, not a direct product page, so we're not linking it yet.",
    );
    assert.equal(
      customerFacingFilterProofStatusV1(null),
      "We haven't confirmed a safe store link yet.",
    );
    assert.equal(
      customerFacingFilterProofStatusV1("likely_valid"),
      "We haven't confirmed a safe store link yet.",
    );
  });

  it("fridge single-family ambiguity warning stays homeowner-readable", () => {
    assert.equal(
      SINGLE_FILTER_FAMILY_AMBIGUITY_FILTER_PAGE_NOTE_V1,
      "Double-check before you buy: Some refrigerators can use more than one filter type. Match the part number on your old filter or refrigerator manual before ordering.",
    );
  });
});
