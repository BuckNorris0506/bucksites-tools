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

const SLICE1_GENERIC_VERIFIED_BAN_RX = /\bverified\b/i;
const SLICE1_BRANDED_VERIFIED_LINK_RX = /BuckParts\s+Verified\s+Links?/gi;

/** Drop imports and comments — not shopper-rendered copy. */
export function slice1CustomerFacingSourceV1(src: string): string {
  const withoutBlockComments = src.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(/^\s*\/\/.*$/gm, "");
  return withoutLineComments.replace(
    /import\s+(?:type\s+)?(?:\{[\s\S]*?\}|[^;\n]+)\s+from\s+["'][^"']+["'];?/g,
    "",
  );
}

function masksBrandedVerifiedFamilyV1(rx: RegExp): boolean {
  return rx.source === "\\bverified\\b" || rx.source === "\\bverify\\b";
}

function slice1SourceForBannedPhraseScanV1(src: string, rx: RegExp): string {
  const facing = slice1CustomerFacingSourceV1(src);
  if (masksBrandedVerifiedFamilyV1(rx)) {
    return facing.replace(SLICE1_BRANDED_VERIFIED_LINK_RX, "BuckParts ___ Link");
  }
  return facing;
}

describe("customer UX doctrine (slice 1)", () => {
  it("exports a stable doctrine version", () => {
    assert.equal(CUSTOMER_UX_DOCTRINE_VERSION, 1);
  });

  it("scan helper ignores module specifiers but still catches generic verified link copy", () => {
    const importFixture =
      'import { BUCKPARTS_VERIFIED_LINK_PLURAL } from "@/lib/copy/buckparts-verified-link-copy";\n';
    const genericLeakFixture = '<p>Open filter details before using any verified link.</p>\n';
    const brandedFixture = "<p>before using any BuckParts Verified Link.</p>\n";

    assert.ok(
      !SLICE1_GENERIC_VERIFIED_BAN_RX.test(
        slice1SourceForBannedPhraseScanV1(importFixture, SLICE1_GENERIC_VERIFIED_BAN_RX),
      ),
      "module specifier paths must not count as shopper-visible verified wording",
    );
    assert.ok(
      SLICE1_GENERIC_VERIFIED_BAN_RX.test(
        slice1SourceForBannedPhraseScanV1(genericLeakFixture, SLICE1_GENERIC_VERIFIED_BAN_RX),
      ),
      "generic lowercase verified link copy must still fail the scan",
    );
    assert.ok(
      !SLICE1_GENERIC_VERIFIED_BAN_RX.test(
        slice1SourceForBannedPhraseScanV1(brandedFixture, SLICE1_GENERIC_VERIFIED_BAN_RX),
      ),
      "branded BuckParts Verified Link copy must remain allowed",
    );
  });

  it("slice-1 public copy files avoid banned phrases in source (allowed: code identifiers like slug in expressions)", () => {
    for (const rel of CUSTOMER_UX_DOCTRINE_SLICE1_REL_PATHS) {
      const abs = join(process.cwd(), rel);
      const raw = readFileSync(abs, "utf8");
      for (const rx of SLICE1_BANNED_IN_CUSTOMER_SOURCES) {
        const scanSrc = slice1SourceForBannedPhraseScanV1(raw, rx);
        assert.ok(
          !rx.test(scanSrc),
          `${rel} must not match ${rx} in customer-facing doctrine scan`,
        );
      }
    }
  });
});
