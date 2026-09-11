import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import {
  hasLocalOfficeRuntime,
  localOfficeProjectionPath,
} from "@/lib/j-office/office-runtime";
import {
  FOUNDER_OPERATING_PICTURE_SCHEMA,
  type FounderOperatingPicture,
} from "@/lib/j-office/types";

export const J_OFFICE_LIVE_REFRESH_ENV = "J_OFFICE_LIVE_REFRESH";
export const J_REPO_ROOT_ENV = "J_REPO_ROOT";

export function resolveOfficeProjectionPath(): string {
  if (!hasLocalOfficeRuntime()) {
    throw new Error("J Office requires local runtime J_OFFICE_HOST_PROJECTION_PATH");
  }
  const path = localOfficeProjectionPath();
  if (!path || !isAbsolute(path)) {
    throw new Error("J Office requires local runtime J_OFFICE_HOST_PROJECTION_PATH");
  }
  return path;
}

export function refreshFounderOperatingPictureFromJ(): void {
  const live = process.env[J_OFFICE_LIVE_REFRESH_ENV]?.trim();
  if (live !== "1") return;
  const jRoot = process.env[J_REPO_ROOT_ENV]?.trim();
  if (!jRoot) {
    throw new Error("J_OFFICE_LIVE_REFRESH=1 requires J_REPO_ROOT");
  }
  if (!isAbsolute(jRoot)) {
    throw new Error("J_REPO_ROOT must be an absolute path");
  }
  const fopMod = join(jRoot, "j/founder_operating_picture.py");
  if (!existsSync(fopMod)) {
    throw new Error("J_REPO_ROOT is not a J repository");
  }
  const dest = resolveOfficeProjectionPath();
  const result = spawnSync(
    "python3",
    ["-m", "j.founder_operating_picture", "--write"],
    {
      cwd: jRoot,
      env: {
        ...process.env,
        J_OFFICE_HOST_PROJECTION_PATH: dest,
      },
      encoding: "utf8",
      timeout: 15_000,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (result.status !== 0) {
    throw new Error("J Founder Operating Picture refresh failed");
  }
  if (!existsSync(dest)) {
    throw new Error("J Founder Operating Picture refresh wrote no projection");
  }
}

export function loadFounderOperatingPicture(): FounderOperatingPicture {
  refreshFounderOperatingPictureFromJ();
  const path = resolveOfficeProjectionPath();
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
