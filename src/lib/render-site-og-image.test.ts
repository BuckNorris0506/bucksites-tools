import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  SITE_OG_CARD_BUYER_PATH_LINE,
  SITE_OG_CARD_HOOK_RIGHT,
  SITE_OG_CARD_HOOK_WRONG,
  SITE_OG_CARD_SUPPORT_LINE,
  SITE_SOCIAL_OG_IMAGE_ALT,
  SITE_SOCIAL_OG_IMAGE_HEIGHT,
  SITE_SOCIAL_OG_IMAGE_WIDTH,
} from "@/lib/site-social-metadata";
import {
  SITE_OG_CARD_COLORS_V1,
  siteOgImageContentType,
  siteOgImageSize,
} from "@/lib/render-site-og-image";

test("sitewide OG card uses Option C hook and truth-safe copy constants", () => {
  assert.equal(SITE_OG_CARD_HOOK_WRONG, "Wrong Buck.");
  assert.equal(SITE_OG_CARD_HOOK_RIGHT, "Right Parts");
  assert.equal(SITE_OG_CARD_SUPPORT_LINE, "AI can suggest. BuckParts verifies.");
  assert.equal(SITE_OG_CARD_BUYER_PATH_LINE, "Checked before we point you to buy.");

  const combined = [
    SITE_OG_CARD_HOOK_WRONG,
    SITE_OG_CARD_HOOK_RIGHT,
    SITE_OG_CARD_SUPPORT_LINE,
    SITE_OG_CARD_BUYER_PATH_LINE,
    SITE_SOCIAL_OG_IMAGE_ALT,
  ]
    .join(" ")
    .toLowerCase();

  assert.equal(combined.includes("guaranteed fit"), false);
  assert.equal(combined.includes("certified"), false);
  assert.equal(combined.includes("official manufacturer"), false);
  assert.ok(SITE_SOCIAL_OG_IMAGE_ALT.includes("Wrong Buck."));
  assert.ok(SITE_SOCIAL_OG_IMAGE_ALT.includes("Right Parts"));
});

test("OG image dimensions are 1200x630", () => {
  assert.equal(siteOgImageSize.width, SITE_SOCIAL_OG_IMAGE_WIDTH);
  assert.equal(siteOgImageSize.height, SITE_SOCIAL_OG_IMAGE_HEIGHT);
  assert.equal(SITE_SOCIAL_OG_IMAGE_WIDTH, 1200);
  assert.equal(SITE_SOCIAL_OG_IMAGE_HEIGHT, 630);
  assert.equal(siteOgImageContentType, "image/png");
});

test("OG card uses Option C cool-white and ember accent tokens", () => {
  assert.equal(SITE_OG_CARD_COLORS_V1.bg, "#f7f8fa");
  assert.equal(SITE_OG_CARD_COLORS_V1.trust, "#172554");
  assert.equal(SITE_OG_CARD_COLORS_V1.action, "#d24a22");
});

test("logo asset exists for dynamic OG render", () => {
  const logoPath = join(process.cwd(), "public/buckparts-logo-black-transparent.png");
  assert.ok(existsSync(logoPath));
});
