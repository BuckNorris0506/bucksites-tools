import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

test("help article query selects production help_pages columns, not dropped body/meta_description", () => {
  const help = read("src/lib/data/help.ts");
  const getHelp = help.slice(
    help.indexOf("export async function getHelpPageBySlug"),
    help.indexOf("export async function listHelpPages"),
  );
  const listHelp = help.slice(
    help.indexOf("export async function listHelpPages"),
    help.indexOf("export async function getResetInstructionsForBrandSlug"),
  );

  assert.ok(getHelp.includes('.select("id, slug, title, body_markdown")'));
  assert.ok(!/\bbody\b/.test(getHelp.replaceAll("body_markdown", "")));
  assert.ok(!getHelp.includes("meta_description"));

  assert.ok(listHelp.includes('.select("slug, title")'));
  assert.ok(!listHelp.includes("meta_description"));
  assert.ok(!listHelp.includes("body"));
});

test("help article page renders body_markdown and does not request meta_description", () => {
  const page = read("src/app/help/[slug]/page.tsx");
  assert.ok(page.includes("page.body_markdown"));
  assert.ok(!/\bpage\.body\b/.test(page));
  assert.ok(!page.includes("meta_description"));
  assert.ok(page.includes("description: page.title"));
});
