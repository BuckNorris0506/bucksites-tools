import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

test("SearchForm keeps the existing /search lookup path and default Look it up action", () => {
  const src = read("src/components/SearchForm.tsx");
  assert.ok(src.includes('actionPath = "/search"'));
  assert.ok(src.includes('SEARCH_FORM_DEFAULT_SUBMIT_LABEL = "Look it up"'));
  assert.ok(src.includes("submitLabel = SEARCH_FORM_DEFAULT_SUBMIT_LABEL"));
  assert.ok(src.includes("router.push(`${path}?q=${encodeURIComponent(trimmed)}`)"));
  assert.ok(src.includes('htmlFor="search-q"'));
  assert.ok(src.includes("min-h-14"));
  assert.ok(src.includes("focus-visible:outline"));
});

test("SearchForm can show a visible label without changing the default search pages", () => {
  const src = read("src/components/SearchForm.tsx");
  assert.ok(src.includes("showInputLabel = false"));
  assert.ok(src.includes("showInputLabel"));
  assert.ok(src.includes("sr-only"));
});
