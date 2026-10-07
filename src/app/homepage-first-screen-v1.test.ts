import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function heroSource(): string {
  const src = read("src/app/page.tsx");
  const start = src.indexOf('aria-label="Home hero"');
  const end = src.indexOf('aria-labelledby="why-buckparts-heading"');
  assert.ok(start >= 0, "home hero missing");
  assert.ok(end > start, "below-fold why section missing");
  return src.slice(start, end);
}

test("homepage first screen states the job, lookup, action, and model-number help", () => {
  const hero = heroSource();
  assert.ok(hero.includes("Find the replacement part that fits."));
  assert.ok(hero.includes('inputLabel="Enter appliance model or part number"'));
  assert.ok(hero.includes('submitLabel="Find my part"'));
  assert.ok(hero.includes('href="/help"'));
  assert.ok(hero.includes("Where do I find my model number?"));
  assert.match(hero, /Free\. No account\. We.ll tell you when we.re not sure\./);
});

test("homepage first screen does not lead with legend, examples, or illustrative buying", () => {
  const hero = heroSource();
  assert.ok(!hero.includes("StatusLegend"));
  assert.ok(!hero.includes("VerifiedLinkCard"));
  assert.ok(!hero.includes("NoVerifiedLinkCard"));
  assert.ok(!hero.includes("EXAMPLE_CHIPS"));
  assert.ok(!hero.includes("Wrong Buck."));
  assert.ok(!hero.includes("Illustrative"));
  assert.ok(!/AI can suggest/i.test(hero));
});

test("homepage reuses SearchForm /search and keeps model-number help on live /help", () => {
  const src = read("src/app/page.tsx");
  const hero = heroSource();
  assert.ok(hero.includes("<SearchForm"));
  assert.ok(!hero.includes("how-to-find-refrigerator-model-number"));
  assert.match(hero, /href="\/help"/);
  assert.ok(src.includes('actionPath="/search"'));
});

test("homepage keeps FOH identity and uncertainty doctrine below the first screen", () => {
  const src = read("src/app/page.tsx");
  const below = src.slice(src.indexOf('aria-labelledby="why-buckparts-heading"'));
  assert.ok(below.includes("Wrong Buck."));
  assert.ok(below.includes("Right Parts"));
  assert.ok(below.includes("<StatusLegend"));
  assert.ok(below.includes("VerifiedLinkCard"));
  assert.ok(below.includes("We say when fit is not established"));
  assert.ok(below.includes("Free to use · No account needed."));
  assert.ok(below.includes("Buying is optional and comes after the fit answer."));
});
