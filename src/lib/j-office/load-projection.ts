import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  FOUNDER_OPERATING_PICTURE_SCHEMA,
  type FounderOperatingPicture,
} from "@/lib/j-office/types";

export const J_OFFICE_PROJECTION_RELATIVE =
  "data/j-office/founder_operating_picture.json";

export function loadFounderOperatingPicture(
  rootDir: string = process.cwd(),
): FounderOperatingPicture {
  const path = join(rootDir, J_OFFICE_PROJECTION_RELATIVE);
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as FounderOperatingPicture;
  if (parsed?.schema_version !== FOUNDER_OPERATING_PICTURE_SCHEMA) {
    throw new Error("J Office projection schema mismatch");
  }
  if (parsed.read_only !== true) {
    throw new Error("J Office projection is not marked read_only");
  }
  if (parsed.mutates === true) {
    throw new Error("J Office refused a mutating projection");
  }
  return parsed;
}

export function isEconValue(value: unknown): value is {
  display: string;
  is_unknown: boolean;
  is_zero: boolean;
} {
  return Boolean(
    value &&
      typeof value === "object" &&
      "display" in value &&
      "is_unknown" in value &&
      "is_zero" in value,
  );
}

export function unknownIsNotZero(value: {
  display: string;
  is_unknown: boolean;
  is_zero: boolean;
}): boolean {
  if (value.is_unknown) {
    return !value.is_zero && !/^\$?0(\.0+)?$/.test(String(value.display));
  }
  return true;
}
