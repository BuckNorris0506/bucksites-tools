import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

export type CsvRow = Record<string, string>;

function normalizeHeader(h: string): string {
  return h.trim().replace(/^\ufeff/, "");
}

/**
 * Read a UTF-8 CSV with a header row. Validates required columns exist.
 * Empty files yield [].
 */
export function readCsvFile(
  filePath: string,
  requiredHeaders: string[],
): CsvRow[] {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`CSV not found: ${abs}`);
  }

  const raw = fs.readFileSync(abs, "utf8").trim();
  if (!raw) {
    return [];
  }

  const rows = parse(raw, {
    columns: (headers: string[]) =>
      headers.map((h) => normalizeHeader(String(h))),
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  }) as CsvRow[];

  if (rows.length === 0) {
    return [];
  }

  const present = new Set(Object.keys(rows[0]));
  const missing = requiredHeaders.filter((h) => !present.has(h));
  if (missing.length > 0) {
    throw new Error(
      `CSV ${abs} is missing required columns: ${missing.join(", ")}. Found: ${Array.from(present).sort().join(", ")}`,
    );
  }

  return rows;
}

/** Resolve `data/brands.csv` or `data/brands.sample.csv` when useSample. */
export function dataCsvPath(
  cwd: string,
  baseName: string,
  useSample: boolean,
): string {
  const suffix = useSample ? `${baseName}.sample.csv` : `${baseName}.csv`;
  return path.join(cwd, "data", suffix);
}

/** e.g. `data/air-purifier/filters.sample.csv` */
export function categoryDataCsvPath(
  cwd: string,
  categoryDir: string,
  baseName: string,
  useSample: boolean,
): string {
  const suffix = useSample ? `${baseName}.sample.csv` : `${baseName}.csv`;
  return path.join(cwd, "data", categoryDir, suffix);
}
