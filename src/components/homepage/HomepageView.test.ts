import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { HOMEPAGE_ASTRA_COPY_V1 as copy } from "@/lib/copy/homepage-astra-v1";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

test("homepage uses approved Astra lookup copy and does not paraphrase the H1", () => {
  const src = read("src/components/homepage/HomepageView.tsx");
  const constants = read("src/lib/copy/homepage-astra-v1.ts");
  assert.ok(constants.includes("Find the filter"));
  assert.ok(constants.includes("that fits."));
  assert.ok(src.includes("copy.h1Lead"));
  assert.ok(src.includes("copy.submit"));
  assert.equal(copy.h1Lead, "Find the filter");
  assert.equal(copy.submit, "Find my filter");
  assert.equal(copy.inputLabel, "Appliance model or filter number");
  assert.equal(copy.placeholder, "Enter your number");
  assert.equal(copy.numberHelp, "Where do I find the number?");
  assert.equal(copy.exampleCode, "DA29-00020B");
});

test("homepage lookup reuses production /search routing and recent-search min length", () => {
  const src = read("src/components/homepage/HomepageView.tsx");
  const searchForm = read("src/components/SearchForm.tsx");
  assert.ok(src.includes("addRecentSearch(trimmed)"));
  assert.ok(src.includes('router.push(`/search?q=${encodeURIComponent(trimmed)}`)'));
  assert.ok(src.includes("RECENT_SEARCH_MIN_LENGTH"));
  assert.ok(searchForm.includes("addRecentSearch(trimmed)"));
  assert.ok(searchForm.includes("Look it up"));
  assert.ok(!src.includes("lookup-handoff"));
  assert.ok(!src.includes("No live compatibility check is performed here"));
});

test("homepage first screen does not lead with slogan, status legend, or illustrative buying", () => {
  const src = read("src/components/homepage/HomepageView.tsx");
  assert.ok(!src.includes("Wrong Buck."));
  assert.ok(!src.includes("StatusLegend"));
  assert.ok(!src.includes("VerifiedLinkCard"));
  assert.ok(!src.includes("NoVerifiedLinkCard"));
  assert.ok(!/AI can suggest/i.test(src));
  assert.ok(!src.includes("guaranteed"));
  assert.ok(!src.includes("listFridgeHomepageStartingPointsV1"));
});

test("homepage number help is a native dialog and does not use a fake appliance photo", () => {
  const src = read("src/components/homepage/HomepageView.tsx");
  assert.ok(src.includes("<dialog"));
  assert.ok(src.includes("showModal"));
  assert.ok(src.includes("Start with the label.") || src.includes("copy.helpTitle"));
  assert.ok(src.includes("not a real appliance"));
  assert.ok(!/img |<Image /.test(src));
  assert.ok(src.includes('href="/help"'));
});

test("homepage philosophy and coverage use existing same-origin routes", () => {
  const src = read("src/components/homepage/HomepageView.tsx");
  assert.ok(src.includes('href="/truth-policy"'));
  assert.ok(src.includes('href="/catalog"'));
  assert.ok(!src.includes('target="_blank"'));
  assert.ok(!src.includes('href="/air-purifier"'));
  assert.ok(!src.includes('href="/whole-house-water"'));
});

test("homepage retains legally required footer links including wrong-part prevention", () => {
  const src = read("src/components/homepage/HomepageView.tsx");
  for (const href of [
    "/about",
    "/truth-policy",
    "/disclosure",
    "/privacy",
    "/terms",
    "/wrong-part-prevention",
  ]) {
    assert.ok(src.includes(`href="${href}"`), href);
  }
});

test("homepage example is DA29-00020B text, not an auto-submit or under-review model", () => {
  const src = read("src/components/homepage/HomepageView.tsx");
  assert.ok(src.includes("DA29-00020B") || src.includes("copy.exampleCode"));
  assert.equal(copy.exampleCode, "DA29-00020B");
  assert.ok(!src.includes("LFXS26973S"));
  assert.ok(!src.includes("data-example"));
});

test("SiteShell keeps existing chrome off the homepage and SearchForm unchanged", () => {
  const shell = read("src/components/SiteShell.tsx");
  const searchForm = read("src/components/SearchForm.tsx");
  assert.ok(shell.includes('pathname === "/"'));
  assert.ok(shell.includes('href="/search"'));
  assert.ok(shell.includes("Browse filters"));
  assert.equal(searchForm.includes("Find my filter"), false);
  assert.ok(searchForm.includes("Look it up"));
});

test("approved empty-search copy is announced rather than silently ignored", () => {
  const src = read("src/components/homepage/HomepageView.tsx");
  assert.equal(
    copy.emptyError,
    "Enter a model or filter number. If you don’t have it, use the number-finding help below.",
  );
  assert.ok(src.includes('role="alert"'));
  assert.ok(src.includes("aria-invalid"));
});
