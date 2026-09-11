import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { buildHomepageOnlySitemapFallback } from "@/app/sitemap";
import {
  isEconValue,
  loadFounderOperatingPicture,
  unknownIsNotZero,
} from "@/lib/j-office/load-projection";
import { scopeFounderOperatingPicture } from "@/lib/j-office/scope-projection";
import { FOUNDER_OPERATING_PICTURE_SCHEMA } from "@/lib/j-office/types";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function durableFingerprint(picture: ReturnType<typeof loadFounderOperatingPicture>): string {
  const payload = structuredClone(picture) as Record<string, unknown>;
  delete payload.generated_at;
  const freshness = payload.freshness;
  if (freshness && typeof freshness === "object") {
    delete (freshness as { generated_at?: string }).generated_at;
  }
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

test("office consumes J Founder Operating Picture rather than duplicating business logic", () => {
  const picture = loadFounderOperatingPicture();
  assert.equal(picture.schema_version, FOUNDER_OPERATING_PICTURE_SCHEMA);
  assert.equal(picture.read_only, true);
  assert.equal(picture.mutates, false);
  const viewSrc = read("src/app/office/JOfficeView.tsx");
  const loadSrc = read("src/lib/j-office/load-projection.ts");
  assert.match(loadSrc, /founder_operating_picture\.json/);
  assert.equal(viewSrc.includes("AUTHORIZED_CAPITAL_USD"), true);
  assert.equal(viewSrc.includes("build_founder_operating_picture"), false);
  assert.equal(viewSrc.includes("settled_revenue_usd +"), false);
  assert.equal(read("src/lib/j-office/scope-projection.ts").includes("re-rank"), true);
});

test("UNKNOWN is not coerced to zero", () => {
  const picture = loadFounderOperatingPicture();
  const model = picture.economic_outlook.model_research_cost_usd;
  assert.ok(model);
  assert.equal(model.is_unknown, true);
  assert.equal(model.is_zero, false);
  assert.equal(unknownIsNotZero(model), true);
  const amazon = picture.economic_outlook.buckparts as {
    amazon: { settlement_status: string; earnings_shown_usd: { is_zero: boolean } };
  };
  assert.equal(amazon.amazon.settlement_status, "UNKNOWN");
  assert.notEqual(amazon.amazon.settlement_status, "0");
  assert.equal(amazon.amazon.earnings_shown_usd.is_zero, true);
});

test("stale and conflict states are visible in the projection and UI", () => {
  const picture = loadFounderOperatingPicture();
  const viewSrc = read("src/app/office/JOfficeView.tsx");
  assert.match(viewSrc, /STALE \/ UNSETTLED/);
  assert.match(viewSrc, /CONFLICT/);
  assert.ok(picture.freshness?.gsc_unsettled_warning);
  assert.ok(Array.isArray(picture.economic_outlook.conflicts));
});

test("closed opportunities are not active and stuck-later items render", () => {
  const picture = loadFounderOperatingPicture();
  for (const row of picture.funnel.records ?? []) {
    if (row.rejected_or_closed) assert.equal(row.active, false);
  }
  for (const row of picture.next_queue) {
    if (row.closed || row.visual === "CLOSED") assert.equal(row.active, false);
  }
  const stuck = picture.funnel.stuck_after_first_filter ?? [];
  assert.ok(stuck.length >= 1);
  const names = stuck.map((row) => row.name).join(" ");
  assert.match(names, /Percona|Madison|DeskCrew|Immunefi/i);
  const viewSrc = read("src/app/office/JOfficeView.tsx");
  assert.match(viewSrc, /Passed early \/ stuck later/);
});

test("queue order is the J projection order", () => {
  const picture = loadFounderOperatingPicture();
  const items = picture.next_queue.map((row) => row.item);
  assert.equal(items[0], "DrivenData — Lost in Transcription");
  assert.ok(items.includes("First-dollar acquisition candidate cycle"));
  assert.ok(items.includes("Empty-portfolio origination"));
  const viewSrc = read("src/app/office/JOfficeView.tsx");
  assert.equal(viewSrc.includes(".sort("), false);
  assert.match(viewSrc, /next_queue/);
});

test("NEEDS JARED contains only genuine founder actions", () => {
  const picture = loadFounderOperatingPicture();
  for (const item of picture.needs_jared) {
    assert.ok(item.action);
    assert.notEqual(item.action, "NONE");
  }
  const viewSrc = read("src/app/office/JOfficeView.tsx");
  assert.match(viewSrc, /NEEDS JARED Nothing/);
});

test("business isolation hides BuckParts channel facts outside BuckParts scope", () => {
  const picture = loadFounderOperatingPicture();
  const deskcrew = scopeFounderOperatingPicture(picture, "deskcrew");
  assert.equal(deskcrew.economic_outlook.buckparts, undefined);
  const paths = deskcrew.economic_outlook.current_revenue_producing_paths ?? [];
  assert.equal(
    paths.some((row) => String(row.business_id) === "buckparts"),
    false,
  );
  const deskcrewBlob = JSON.stringify(deskcrew.economic_outlook);
  assert.equal(deskcrewBlob.includes("449"), false);
  assert.equal(deskcrew.economic_outlook.outlook_truth?.proven?.length ?? 0, 0);
  assert.equal(
    (deskcrew.results_learning ?? []).some((row) =>
      String(row.observed ?? "").includes("449"),
    ),
    false,
  );
  const buckparts = scopeFounderOperatingPicture(picture, "buckparts");
  assert.ok(buckparts.economic_outlook.buckparts);
  const amazon = buckparts.economic_outlook.buckparts as {
    amazon: { clicks: { value: number } };
    gsc: { impressions: { value: number } };
  };
  assert.equal(amazon.amazon.clicks.value, 3);
  assert.equal(amazon.gsc.impressions.value, 449);
});

test("BuckParts GSC and Amazon state renders truthfully", () => {
  const picture = loadFounderOperatingPicture();
  const bp = picture.economic_outlook.buckparts as {
    amazon: Record<string, unknown>;
    gsc: Record<string, unknown>;
    do_not_attribute_amazon_clicks_to_google: boolean;
  };
  assert.equal((bp.amazon.clicks as { value: number }).value, 3);
  assert.equal((bp.amazon.ordered_items as { value: number }).value, 0);
  assert.equal((bp.amazon.shipped_items as { value: number }).value, 0);
  assert.equal((bp.amazon.earnings_shown_usd as { value: number }).value, 0);
  assert.equal(bp.amazon.dashboard_last_updated, "2026-09-09");
  assert.equal(bp.amazon.google_search_attribution, "NOT_PROVEN");
  assert.equal((bp.gsc.clicks as { value: number }).value, 0);
  assert.equal((bp.gsc.impressions as { value: number }).value, 449);
  assert.equal(bp.gsc.settled_through, "2026-09-08");
  assert.equal(bp.do_not_attribute_amazon_clicks_to_google, true);
});

test("Mac desktop CSS uses a grid and does not collapse core sections", () => {
  const css = read("src/app/office/office.css");
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(css, /grid-template-areas:/);
  assert.match(css, /outlook needs/);
  const viewSrc = read("src/app/office/JOfficeView.tsx");
  assert.match(viewSrc, /className="jo-panel jo-outlook"/);
  assert.match(viewSrc, /className="jo-panel jo-now"/);
  assert.match(viewSrc, /className="jo-panel jo-needs"/);
  assert.equal(viewSrc.includes("<details className=\"jo-panel jo-outlook\""), false);
  assert.equal(viewSrc.includes("<details className=\"jo-panel jo-now\""), false);
  assert.equal(viewSrc.includes("<details className=\"jo-panel jo-needs\""), false);
});

test("narrow viewport stacks outlook, now, needs first without horizontal scroll", () => {
  const css = read("src/app/office/office.css");
  assert.match(css, /\.jo-outlook \{ order: 1; \}/);
  assert.match(css, /\.jo-now \{ order: 2; \}/);
  assert.match(css, /\.jo-needs \{ order: 3; \}/);
  assert.match(css, /overflow-x: hidden/);
  assert.match(css, /flex-direction: column/);
});

test("office is read-only and introduces no mutation route", () => {
  const files = [
    "src/app/office/page.tsx",
    "src/app/office/layout.tsx",
    "src/app/office/JOfficeView.tsx",
    "src/middleware.ts",
    "src/lib/j-office/load-projection.ts",
  ];
  for (const file of files) {
    const src = read(file);
    assert.equal(/<form/i.test(src), false, file);
    assert.equal(/method=["']post["']/i.test(src), false, file);
    assert.equal(/fetch\([^)]*method:\s*["']POST["']/.test(src), false, file);
    assert.equal(src.includes("export async function POST"), false, file);
    assert.equal(src.includes("export async function PUT"), false, file);
    assert.equal(src.includes("export async function PATCH"), false, file);
    assert.equal(src.includes("export async function DELETE"), false, file);
  }
  const officeDir = readdirSync(join(root, "src/app/office"));
  assert.equal(officeDir.includes("route.ts"), false);
});

test("/office is noindex and absent from consumer nav and sitemap", async () => {
  const layout = read("src/app/office/layout.tsx");
  const page = read("src/app/office/page.tsx");
  const robotsSrc = read("src/app/robots.ts");
  const shell = read("src/components/SiteShell.tsx");
  const sitemapSrc = read("src/app/sitemap.ts");
  const jsonLd = read("src/lib/seo/structured-data.ts");
  assert.match(layout, /index: false/);
  assert.match(page, /index: false/);
  assert.match(robotsSrc, /"\/office"/);
  assert.equal(shell.includes("/office"), false);
  assert.equal(sitemapSrc.includes("/office"), false);
  assert.equal(jsonLd.includes("/office"), false);
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://buckparts.com";
  try {
    const fallback = buildHomepageOnlySitemapFallback(new Error("office isolation"), () => new Date("2026-09-10T00:00:00Z"));
    assert.equal(fallback.some((row) => String(row.url).includes("/office")), false);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
});

test("loading the office projection does not mutate J files", () => {
  const owned = join(root, "data/j-office/founder_operating_picture.json");
  const before = readFileSync(owned);
  const first = loadFounderOperatingPicture();
  const second = loadFounderOperatingPicture();
  const after = readFileSync(owned);
  assert.deepEqual(before, after);
  assert.equal(first.durable_fingerprint, second.durable_fingerprint);
  assert.equal(first.mutates, false);
});

test("regenerated unchanged projection stays deterministic except timestamps", () => {
  const first = loadFounderOperatingPicture();
  const second = loadFounderOperatingPicture();
  assert.equal(durableFingerprint(first), durableFingerprint(second));
  assert.equal(first.durable_fingerprint, second.durable_fingerprint);
});

test("econ helper distinguishes UNKNOWN from zero", () => {
  assert.equal(
    unknownIsNotZero({ display: "UNKNOWN", is_unknown: true, is_zero: false }),
    true,
  );
  assert.equal(
    unknownIsNotZero({ display: "$0.00", is_unknown: false, is_zero: true }),
    true,
  );
  assert.ok(isEconValue({ display: "$0.00", is_unknown: false, is_zero: true }));
});

test("public SiteShell still exposes consumer nav and not J Office", () => {
  const shell = read("src/components/SiteShell.tsx");
  assert.match(shell, /Browse filters/);
  assert.match(shell, /href="\/help"/);
  assert.equal(shell.includes("J Office"), false);
  const rootLayout = read("src/app/layout.tsx");
  assert.match(rootLayout, /x-j-office/);
  assert.match(rootLayout, /SiteShell/);
});
