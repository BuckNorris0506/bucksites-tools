import type { Metadata } from "next";

/** Sitewide Open Graph / Twitter title — lookup-first; no ecommerce framing. */
export const SITE_SOCIAL_OG_TITLE =
  "BuckParts — Find the right replacement filter before you buy";

/** Sitewide social description — fit evidence + safe paths; does not claim every page has a verified link. */
export const SITE_SOCIAL_OG_DESCRIPTION =
  "Look up refrigerator, air purifier, and water filter replacements. BuckParts checks fit evidence and safe buying paths before showing a BuckParts Verified Link.";

/** App Router generated OG image route (see src/app/opengraph-image.tsx). */
export const SITE_SOCIAL_OG_IMAGE_PATH = "/opengraph-image";

export const SITE_SOCIAL_OG_IMAGE_WIDTH = 1200;
export const SITE_SOCIAL_OG_IMAGE_HEIGHT = 630;

export const SITE_SOCIAL_OG_IMAGE_ALT =
  "BuckParts social preview: Wrong filter? BuckParts checks before you buy. AI can suggest. BuckParts verifies.";

export type BuildSiteSocialMetadataArgs = {
  siteUrl?: string;
  siteName?: string;
};

/**
 * Root sitewide metadata for link previews (Open Graph + Twitter).
 * Child routes may override title/description; defaults apply when they do not.
 */
export function buildSiteSocialMetadata(
  args: BuildSiteSocialMetadataArgs = {},
): Metadata {
  const siteName = args.siteName?.trim() || "BuckParts";

  return {
    title: {
      default: SITE_SOCIAL_OG_TITLE,
      template: `%s · ${siteName}`,
    },
    description: SITE_SOCIAL_OG_DESCRIPTION,
    openGraph: {
      title: SITE_SOCIAL_OG_TITLE,
      description: SITE_SOCIAL_OG_DESCRIPTION,
      type: "website",
      siteName,
      url: "/",
      images: [
        {
          url: SITE_SOCIAL_OG_IMAGE_PATH,
          width: SITE_SOCIAL_OG_IMAGE_WIDTH,
          height: SITE_SOCIAL_OG_IMAGE_HEIGHT,
          alt: SITE_SOCIAL_OG_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_SOCIAL_OG_TITLE,
      description: SITE_SOCIAL_OG_DESCRIPTION,
      images: [SITE_SOCIAL_OG_IMAGE_PATH],
    },
  };
}
