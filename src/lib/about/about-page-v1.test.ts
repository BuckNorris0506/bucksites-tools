import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  ABOUT_FOUNDER,
  ABOUT_FOUNDER_EMAIL,
  ABOUT_GENERAL_EMAIL,
  ABOUT_HERO,
  ABOUT_HOW_WE_DECIDE,
  ABOUT_HUMANS_AUTOMATION,
  ABOUT_TRUST_LINKS,
} from "@/lib/about/about-content-v1";
import { buildAboutPageJsonLdGraphV1 } from "@/lib/about/about-json-ld-v1";
import { jsonLdContainsForbiddenKeys } from "@/lib/seo/structured-data";

const root = (...parts: string[]) => join(process.cwd(), ...parts);

describe("about page v1", () => {
  const pageSrc = readFileSync(root("src", "app", "about", "page.tsx"), "utf8");
  const contentSrc = readFileSync(root("src", "lib", "about", "about-content-v1.ts"), "utf8");

  it("locks approved founder and location facts in content module", () => {
    assert.ok(contentSrc.includes("Jared Buckman"));
    assert.ok(contentSrc.includes("AP Statistics teacher"));
    assert.ok(contentSrc.includes("Kansas City area"));
    assert.ok(ABOUT_HERO.identity.includes("Kansas City area"));
  });

  it("keeps founder and general contact emails separate", () => {
    assert.equal(ABOUT_FOUNDER_EMAIL, "jared@buckparts.com");
    assert.equal(ABOUT_GENERAL_EMAIL, "admin@buckparts.com");
    assert.ok(pageSrc.includes("ABOUT_FOUNDER.email"));
    assert.ok(pageSrc.includes("ABOUT_CONTACT.contacts"));
    assert.ok(pageSrc.includes("mailto:"));
  });

  it("has no founder portrait or avatar markup", () => {
    assert.ok(!/<Image\b/i.test(pageSrc));
    assert.ok(!/avatar/i.test(pageSrc));
    assert.ok(!/portrait/i.test(pageSrc));
    assert.ok(!/<img\b/i.test(pageSrc));
  });

  it("includes approved automation and commitment copy in content module", () => {
    assert.match(
      ABOUT_HUMANS_AUTOMATION.paragraphs[1]!,
      /does not get permission to invent compatibility/,
    );
    assert.match(ABOUT_FOUNDER.commitment, /what is still unknown/);
    assert.ok(pageSrc.includes("ABOUT_HUMANS_AUTOMATION"));
    assert.ok(pageSrc.includes("ABOUT_FOUNDER.commitment"));
  });

  it("links policy destinations to correct routes", () => {
    for (const link of ABOUT_TRUST_LINKS.links) {
      assert.ok(contentSrc.includes(`href: "${link.href}"`), link.href);
    }
    for (const link of ABOUT_HOW_WE_DECIDE.policyLinks) {
      assert.ok(contentSrc.includes(`href: "${link.href}"`), link.href);
    }
    assert.equal(ABOUT_HERO.primaryAction.href, "#how-we-decide");
    assert.equal(ABOUT_HERO.secondaryAction.href, "#contact");
  });

  it("structured data contains only allowed fields", () => {
    const graph = buildAboutPageJsonLdGraphV1("https://buckparts.com");
    const serialized = JSON.stringify(graph);
    assert.ok(serialized.includes('"@type":"Person"'));
    assert.ok(serialized.includes('"@type":"Organization"'));
    assert.ok(serialized.includes(ABOUT_FOUNDER_EMAIL));
    assert.ok(serialized.includes(ABOUT_GENERAL_EMAIL));
    assert.ok(!serialized.includes("foundingDate"));
    assert.ok(!serialized.includes("sameAs"));
    assert.ok(!serialized.includes("postalAddress"));
    assert.ok(!serialized.includes("telephone"));
    assert.ok(!serialized.includes('"image"'));
    assert.equal(jsonLdContainsForbiddenKeys(graph).length, 0);
  });
});
