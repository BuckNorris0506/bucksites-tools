/**
 * Contract: do not document or encode `npm run … | JSON.parse|jq|node -e` patterns for JSON-producing BuckParts scripts.
 * PROVEN: scans repo text; markdown fenced blocks stripped before match; excludes this contract doc (may cite patterns in prose only).
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

const SCAN_DIRS = ["docs", "scripts", "src", ".github"] as const;
const ROOT_FILES = ["README.md", "AGENTS.md"] as const;

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  "dist",
  ".git",
  "out",
  "coverage",
  ".turbo",
  "mcps",
]);

const TEXT_EXT = new Set([".md", ".ts", ".tsx", ".mts", ".cts", ".yml", ".yaml", ".sh"]);

/** Fenced blocks often contain illustrative shell; strip before matching. */
function stripMarkdownFencedBlocks(source: string): string {
  return source.replace(/```[\s\S]*?```/g, "\n");
}

const EXCLUDE_FILE_NAMES = new Set([
  "BuckParts-JSON-STDOUT-CONTRACT.md",
  "json-stdout-contract.test.ts",
]);

type Violation = { file: string; rule: string; line: number; text: string };

const RULES: { id: string; describe: string; test: (line: string) => boolean }[] = [
  {
    id: "npm_run_pipe_jq",
    describe: "`npm run … | … jq` (npm stdout is not pure JSON)",
    test: (line) => /npm\s+run\s+/.test(line) && /\|/.test(line) && /\bjq\b/.test(line),
  },
  {
    id: "npm_run_pipe_json_parse",
    describe: "`npm run … | … JSON.parse`",
    test: (line) => /npm\s+run\s+/.test(line) && /\|/.test(line) && /\bJSON\.parse\b/.test(line),
  },
  {
    id: "npm_run_pipe_node_eval",
    describe: "`npm run … | node -e` / `node --eval` (common JSON.parse harness)",
    test: (line) => /npm\s+run\s+/.test(line) && /\|/.test(line) && /\bnode\s+(-e|--eval)\b/.test(line),
  },
  {
    id: "npm_run_buckparts_redirect_json",
    describe: "`npm run … buckparts:… > … .json` (npm banner would be inside the file)",
    test: (line) =>
      /npm\s+run\s+/.test(line) &&
      /buckparts:/.test(line) &&
      />\s*[^\s]+\.json\b/.test(line),
  },
];

function shouldScanFile(abs: string): boolean {
  const base = path.basename(abs);
  if (EXCLUDE_FILE_NAMES.has(base)) return false;
  return TEXT_EXT.has(path.extname(base));
}

function walkCollectFiles(dir: string, acc: string[]): void {
  let ents;
  try {
    ents = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of ents) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIR_NAMES.has(ent.name)) continue;
      walkCollectFiles(full, acc);
    } else if (ent.isFile() && shouldScanFile(full)) {
      acc.push(full);
    }
  }
}

function scanFile(abs: string): Violation[] {
  const raw = readFileSync(abs, "utf8");
  const rel = path.relative(ROOT, abs).split(path.sep).join("/");
  const source = path.extname(abs) === ".md" ? stripMarkdownFencedBlocks(raw) : raw;
  const lines = source.split(/\r?\n/);
  const out: Violation[] = [];
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.test(line)) {
        out.push({ file: rel, rule: rule.describe, line: i + 1, text: line.trim() });
      }
    }
  });
  return out;
}

test("repo text must not encode npm-run stdout piped into JSON parsers (contract scan)", () => {
  const files: string[] = [];
  for (const d of SCAN_DIRS) {
    const abs = path.join(ROOT, d);
    try {
      if (statSync(abs).isDirectory()) walkCollectFiles(abs, files);
    } catch {
      /* dir missing in sparse checkout — skip */
    }
  }
  for (const rf of ROOT_FILES) {
    const abs = path.join(ROOT, rf);
    try {
      if (statSync(abs).isFile() && shouldScanFile(abs)) files.push(abs);
    } catch {
      /* optional root file */
    }
  }

  const violations: Violation[] = [];
  for (const f of files) {
    violations.push(...scanFile(f));
  }

  if (violations.length > 0) {
    const msg = violations
      .map((v) => `${v.file}:${v.line} — ${v.rule}\n  ${v.text}`)
      .join("\n");
    assert.fail(`JSON stdout contract violations:\n${msg}`);
  }
});
