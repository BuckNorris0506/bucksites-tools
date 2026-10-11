import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";

test("refrigerator catalog hub links to /brand index route", () => {
  const hub = readFileSync(
    path.join(process.cwd(), "src/lib/catalog/public-category-hub.ts"),
    "utf8",
  );
  assert.ok(hub.includes('href: "/brand"'));
  const indexPage = readFileSync(path.join(process.cwd(), "src/app/brand/page.tsx"), "utf8");
  assert.ok(indexPage.includes('canonicalAlternatesForPath("/brand")'));
  assert.ok(indexPage.includes("listBrandsForNav"));
});
