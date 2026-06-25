#!/usr/bin/env node
/**
 * Playwright browser evidence capture for GE refrigerator rescue slugs.
 *
 *   npm run buckparts:ge-refrigerator-rescue-capture -- --slug mwf
 *   npm run buckparts:ge-refrigerator-rescue-capture -- --all
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

import {
  buildGeRefrigeratorRescueAdapterReportV1,
  GE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1,
} from "./lib/ge-refrigerator-rescue-adapter-v1";
import { captureGeRefrigeratorRescueBrowserEvidenceV1 } from "./lib/ge-refrigerator-rescue-browser-capture-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function loadOemToken(slug: string): string {
  const rows = parse(readFileSync(path.join(REPO_ROOT, "data/filters.csv"), "utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as Array<{ slug?: string; oem_part_number?: string }>;
  const row = rows.find((r) => r.slug?.trim().toLowerCase() === slug);
  return (row?.oem_part_number ?? slug).trim().toUpperCase();
}

async function main(): Promise<void> {
  const slugArg = process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1]?.toLowerCase();
  const slugFlagIdx = process.argv.indexOf("--slug");
  const slugFromFlag =
    slugFlagIdx >= 0 ? process.argv[slugFlagIdx + 1]?.trim().toLowerCase() : undefined;
  const slug = slugArg ?? slugFromFlag;
  const captureAll = process.argv.includes("--all");

  const report = buildGeRefrigeratorRescueAdapterReportV1({ rootDir: REPO_ROOT });
  let slugs: string[];

  if (captureAll) {
    slugs = [...GE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1];
  } else if (slug) {
    if (!GE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1.includes(slug as (typeof GE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1)[number])) {
      console.error(`Slug ${slug} is not in GE rescue search-placeholder cohort.`);
      process.exit(2);
    }
    slugs = [slug];
  } else {
    console.error("Usage: --slug <slug> | --all");
    process.exit(2);
  }

  const results = [];
  let failCount = 0;

  for (const s of slugs) {
    const cohortRow = report.rows.find((r) => r.filter_slug === s);
    const token = cohortRow?.oem_part_token ?? loadOemToken(s);
    process.stderr.write(`Capturing GE browser evidence for ${s} (${token})…\n`);
    const result = await captureGeRefrigeratorRescueBrowserEvidenceV1({
      rootDir: REPO_ROOT,
      filterSlug: s,
      oemPartToken: token,
      csvPrimaryIsSearchPlaceholder: cohortRow?.csv_primary_is_search_placeholder ?? true,
      writeArtifact: true,
    });
    if (result.artifact.browser_truth_status !== "PASS") failCount++;
    results.push({
      filter_slug: s,
      browser_truth_status: result.artifact.browser_truth_status,
      artifact_path: result.artifact_path,
      blockers: result.artifact.blockers,
    });
  }

  process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
