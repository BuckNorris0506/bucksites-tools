import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  SITE_OG_CARD_HOOK_WRONG,
  SITE_OG_CARD_SUPPORT_LINE,
  SITE_SOCIAL_OG_DESCRIPTION,
  SITE_SOCIAL_OG_IMAGE_ALT,
  SITE_SOCIAL_OG_IMAGE_HEIGHT,
  SITE_SOCIAL_OG_IMAGE_PATH,
  SITE_SOCIAL_OG_IMAGE_WIDTH,
  SITE_SOCIAL_OG_TITLE,
  buildSiteSocialMetadata,
} from "@/lib/site-social-metadata";

test("sitewide social metadata uses lookup-first copy without ecommerce claims", () => {
  const meta = buildSiteSocialMetadata({
    siteUrl: "https://buckparts.com",
    siteName: "BuckParts",
  });

  assert.equal(meta.title?.default, SITE_SOCIAL_OG_TITLE);
  assert.equal(meta.description, SITE_SOCIAL_OG_DESCRIPTION);
  assert.equal(meta.openGraph?.title, SITE_SOCIAL_OG_TITLE);
  assert.equal(meta.openGraph?.description, SITE_SOCIAL_OG_DESCRIPTION);
  assert.equal(meta.openGraph?.type, "website");
  assert.equal(meta.openGraph?.siteName, "BuckParts");
  assert.equal(meta.openGraph?.url, "/");
  assert.equal(meta.twitter?.card, "summary_large_image");
  assert.equal(meta.twitter?.title, SITE_SOCIAL_OG_TITLE);
  assert.equal(meta.twitter?.description, SITE_SOCIAL_OG_DESCRIPTION);

  const combined = [
    SITE_SOCIAL_OG_TITLE,
    SITE_SOCIAL_OG_DESCRIPTION,
    SITE_SOCIAL_OG_IMAGE_ALT,
  ]
    .join(" ")
    .toLowerCase();
  assert.equal(combined.includes("every filter"), false);
  assert.equal(combined.includes("ecommerce"), false);
  assert.equal(combined.includes("online store"), false);
  assert.ok(SITE_SOCIAL_OG_IMAGE_ALT.includes(SITE_OG_CARD_HOOK_WRONG));
  assert.ok(SITE_SOCIAL_OG_IMAGE_ALT.includes(SITE_OG_CARD_SUPPORT_LINE));
});

test("sitewide social metadata references OG and Twitter image routes", () => {
  const meta = buildSiteSocialMetadata({ siteUrl: "https://buckparts.com" });
  const ogImages = meta.openGraph?.images;
  assert.ok(Array.isArray(ogImages));
  const first = ogImages[0];
  assert.ok(first && typeof first === "object" && "url" in first);
  assert.equal(first.url, SITE_SOCIAL_OG_IMAGE_PATH);
  assert.equal(first.width, SITE_SOCIAL_OG_IMAGE_WIDTH);
  assert.equal(first.height, SITE_SOCIAL_OG_IMAGE_HEIGHT);
  assert.equal(first.alt, SITE_SOCIAL_OG_IMAGE_ALT);
  assert.deepEqual(meta.twitter?.images, [SITE_SOCIAL_OG_IMAGE_PATH]);
});

test("OG/Twitter image route files exist in App Router", () => {
  const root = process.cwd();
  assert.ok(existsSync(join(root, "src/app/opengraph-image.png")));
  assert.ok(existsSync(join(root, "src/app/twitter-image.png")));
});

test("homepage metadata aligns with sitewide social defaults", async () => {
  const { metadata: homeMetadata } = await import("@/app/page");
  assert.equal(homeMetadata.title, SITE_SOCIAL_OG_TITLE);
  assert.equal(homeMetadata.description, SITE_SOCIAL_OG_DESCRIPTION);
  assert.equal(homeMetadata.openGraph?.title, SITE_SOCIAL_OG_TITLE);
  assert.equal(homeMetadata.twitter?.card, "summary_large_image");
});
