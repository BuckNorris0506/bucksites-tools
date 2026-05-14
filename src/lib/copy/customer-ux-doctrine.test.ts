import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  CUSTOMER_UX_DOCTRINE_SLICE1_REL_PATHS,
  CUSTOMER_UX_DOCTRINE_VERSION,
} from "@/lib/copy/customer-ux-doctrine";

/** Customer-facing slice-1 surfaces: avoid broad claims and internal operator tokens in prose (not TypeScript field names like slug). */
const SLICE1_BANNED_IN_CUSTOMER_SOURCES: RegExp[] = [
  /\bverified\b/i,
  /\bverify\b/i,
  /\bguaranteed\b/i,
  /\bAI-powered\b/i,
  /\bdatabase match\b/i,
  /\bsafe to buy\b/i,
  /\bCTA\b/,
  /\bbrowser_truth\b/,
  /\brepo\b/i,
  /\bgating\b/i,
  /\bentity\b/i,
  /\bmonetized path\b/i,
];

describe("customer UX doctrine (slice 1)", () => {
  it("exports a stable doctrine version", () => {
    assert.equal(CUSTOMER_UX_DOCTRINE_VERSION, 1);
  });

  it("slice-1 public copy files avoid banned phrases in source (allowed: code identifiers like slug in expressions)", () => {
    for (const rel of CUSTOMER_UX_DOCTRINE_SLICE1_REL_PATHS) {
      const abs = join(process.cwd(), rel);
      const src = readFileSync(abs, "utf8");
      for (const rx of SLICE1_BANNED_IN_CUSTOMER_SOURCES) {
        assert.ok(
          !rx.test(src),
          `${rel} must not match ${rx} in customer-facing doctrine scan`,
        );
      }
    }
  });
});
