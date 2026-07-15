import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { resolveArtifactProvenanceV1 } from "./buckparts-artifact-provenance-v1";
import { buildBuckpartsFridgeModelPdpCtaGoLinkProofPackV1 } from "./buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1";
import { buildGeMwfpXwfeRetailerLinksSupabaseParityProofV1 } from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1";
import { GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1 } from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";
import type { BuckpartsFridgePdpRenderedTruthProofPackV1 } from "./buckparts-fridge-model-pdp-rendered-truth-proof-pack-v1";

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function initTempGitRepo(): { dir: string; head: string } {
  const dir = mkdtempSync(path.join(tmpdir(), "prov-git-"));
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "prov-test@example.com"]);
  git(dir, ["config", "user.name", "prov-test"]);
  writeFileSync(path.join(dir, "README.md"), "init\n");
  git(dir, ["add", "README.md"]);
  git(dir, ["commit", "-m", "init"]);
  const head = git(dir, ["rev-parse", "--short", "HEAD"]);
  return { dir, head };
}

function assertCleanBound(p: ReturnType<typeof resolveArtifactProvenanceV1>, head: string) {
  assert.equal(p.provenance_status, "BOUND_TO_SOURCE_COMMIT");
  assert.equal(p.source_commit, head);
  assert.equal(p.base_commit, head);
  assert.equal(p.worktree_clean, true);
}

function assertDirty(p: ReturnType<typeof resolveArtifactProvenanceV1>, head: string) {
  assert.equal(p.provenance_status, "DIRTY_WORKTREE");
  assert.equal(p.source_commit, null);
  assert.equal(p.base_commit, head);
  assert.equal(p.worktree_clean, false);
}

test("live git resolver: clean tree is BOUND_TO_SOURCE_COMMIT", () => {
  const { dir, head } = initTempGitRepo();
  try {
    const p = resolveArtifactProvenanceV1({ rootDir: dir });
    assertCleanBound(p, head);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("live git resolver: unstaged-only change is DIRTY_WORKTREE", () => {
  const { dir, head } = initTempGitRepo();
  try {
    writeFileSync(path.join(dir, "README.md"), "unstaged\n");
    assertDirty(resolveArtifactProvenanceV1({ rootDir: dir }), head);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("live git resolver: staged-only change is DIRTY_WORKTREE", () => {
  const { dir, head } = initTempGitRepo();
  try {
    writeFileSync(path.join(dir, "README.md"), "staged\n");
    git(dir, ["add", "README.md"]);
    assertDirty(resolveArtifactProvenanceV1({ rootDir: dir }), head);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("live git resolver: untracked-only file is DIRTY_WORKTREE", () => {
  const { dir, head } = initTempGitRepo();
  try {
    writeFileSync(path.join(dir, "untracked.txt"), "x\n");
    assertDirty(resolveArtifactProvenanceV1({ rootDir: dir }), head);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("live git resolver: staged + untracked combination is DIRTY_WORKTREE", () => {
  const { dir, head } = initTempGitRepo();
  try {
    writeFileSync(path.join(dir, "README.md"), "staged\n");
    git(dir, ["add", "README.md"]);
    writeFileSync(path.join(dir, "extra.txt"), "y\n");
    assertDirty(resolveArtifactProvenanceV1({ rootDir: dir }), head);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("live git resolver: non-git directory yields UNKNOWN", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "prov-nongit-"));
  try {
    writeFileSync(path.join(dir, "x.txt"), "x");
    const p = resolveArtifactProvenanceV1({ rootDir: dir });
    assert.equal(p.provenance_status, "UNKNOWN");
    assert.equal(p.source_commit, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function makeCtaMatchPack(): BuckpartsFridgePdpRenderedTruthProofPackV1 {
  const matchSlugs = Array.from(
    { length: 28 },
    (_, i) => `fixture-fridge-${String(i).padStart(2, "0")}`,
  );
  return {
    contract: "buckparts_fridge_model_pdp_rendered_truth_proof_pack_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    live_production_fetch_enabled: false,
    generated_at: "2026-07-15T00:00:00.000Z",
    source_command: "fixture",
    scope: {
      cohorts: ["qa_20"],
      slug_count: matchSlugs.length,
      slugs: matchSlugs,
      excluded_partial_slugs: GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
    },
    rows: matchSlugs.map((slug) => ({
      cohort: "qa_20",
      slug,
      backend_closed_cohort: true,
      partial_excluded: true,
      csv_mappings: ["ultrawf"],
      supabase_mappings: ["ultrawf"],
      pdp_loader_mappings: ["ultrawf"],
      rendered_filter_slugs: ["ultrawf"],
      quarantine: false,
      quarantine_reason: null,
      classification: "MATCH" as const,
      frontend_safe_promoted: true,
      only_in_supabase_vs_csv: [],
      only_in_csv_vs_supabase: [],
      only_in_supabase_vs_pdp: [],
      only_in_pdp_vs_supabase: [],
      notes: [],
    })),
    proven_facts: [],
    unknown_facts: [],
    recommended_next_action: "fixture",
  };
}

test("CTA builder provenance uses live git resolver (clean vs dirty)", async () => {
  const { dir, head } = initTempGitRepo();
  try {
    const loadFridge = async () =>
      ({
        status: "FOUND" as const,
        fridge: {
          slug: "fixture-fridge-00",
          brand_slug: "fixture",
          model_number: "X",
          compatible_filters: [],
        },
      }) as never;
    const clean = await buildBuckpartsFridgeModelPdpCtaGoLinkProofPackV1({
      rootDir: dir,
      loadRenderedTruthPack: makeCtaMatchPack,
      loadFridge,
      resolveQuarantine: () => ({ quarantine: false, reason: null }),
    });
    assert.equal(clean.provenance_status, "BOUND_TO_SOURCE_COMMIT");
    assert.equal(clean.source_commit, head);
    assert.equal(clean.base_commit, head);
    assert.equal(clean.worktree_clean, true);

    writeFileSync(path.join(dir, "dirty.txt"), "d\n");
    const dirty = await buildBuckpartsFridgeModelPdpCtaGoLinkProofPackV1({
      rootDir: dir,
      loadRenderedTruthPack: makeCtaMatchPack,
      loadFridge,
      resolveQuarantine: () => ({ quarantine: false, reason: null }),
    });
    assert.equal(dirty.provenance_status, "DIRTY_WORKTREE");
    assert.equal(dirty.source_commit, null);
    assert.equal(dirty.base_commit, head);
    assert.equal(dirty.worktree_clean, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("GE parity builder provenance uses live git resolver (clean vs dirty)", async () => {
  const { dir } = initTempGitRepo();
  try {
    mkdirSync(path.join(dir, "data"), { recursive: true });
    writeFileSync(
      path.join(dir, "data/retailer_links.csv"),
      [
        "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at",
        "smartwater-mwfp,GE Appliance Parts,https://www.geapplianceparts.com/store/parts/spec/MWFP,true,0,oem-parts-catalog,direct_buyable,notes,2026-07-14T17:40:40.135Z",
        "xwfe,GE Appliance Parts,https://www.geapplianceparts.com/store/parts/spec/XWFE,true,0,oem-parts-catalog,direct_buyable,notes,2026-07-14T17:40:40.135Z",
      ].join("\n") + "\n",
    );
    git(dir, ["add", "data/retailer_links.csv"]);
    git(dir, ["commit", "-m", "csv"]);
    const cleanHead = git(dir, ["rev-parse", "--short", "HEAD"]);

    const loadSupabase = async () => ({
      status: "CHECKED" as const,
      by_slug: new Map([
        [
          "smartwater-mwfp",
          {
            id: "1",
            filter_id: "f1",
            affiliate_url: "https://www.geapplianceparts.com/store/parts/spec/MWFP",
            retailer_name: "GE Appliance Parts",
            browser_truth_classification: "direct_buyable",
            browser_truth_notes: "",
            browser_truth_checked_at: "",
            is_primary: true,
            retailer_key: "oem-parts-catalog",
          },
        ],
        [
          "xwfe",
          {
            id: "2",
            filter_id: "f2",
            affiliate_url: "https://www.geapplianceparts.com/store/parts/spec/XWFE",
            retailer_name: "GE Appliance Parts",
            browser_truth_classification: "direct_buyable",
            browser_truth_notes: "",
            browser_truth_checked_at: "",
            is_primary: true,
            retailer_key: "oem-parts-catalog",
          },
        ],
      ]),
      filter_id_by_slug: new Map([
        ["smartwater-mwfp", "f1"],
        ["xwfe", "f2"],
      ]),
    });

    const clean = await buildGeMwfpXwfeRetailerLinksSupabaseParityProofV1({
      rootDir: dir,
      loadSupabase,
    });
    assert.equal(clean.provenance_status, "BOUND_TO_SOURCE_COMMIT");
    assert.equal(clean.source_commit, cleanHead);
    assert.equal(clean.base_commit, cleanHead);
    assert.equal(clean.worktree_clean, true);

    writeFileSync(path.join(dir, "dirty.txt"), "d\n");
    const dirty = await buildGeMwfpXwfeRetailerLinksSupabaseParityProofV1({
      rootDir: dir,
      loadSupabase,
    });
    assert.equal(dirty.provenance_status, "DIRTY_WORKTREE");
    assert.equal(dirty.source_commit, null);
    assert.equal(dirty.base_commit, cleanHead);
    assert.equal(dirty.worktree_clean, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
