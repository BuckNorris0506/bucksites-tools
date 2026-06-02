import {
  renderSiteOgImage,
  siteOgImageContentType,
  siteOgImageSize,
} from "@/lib/render-site-og-image";
import { SITE_SOCIAL_OG_IMAGE_ALT } from "@/lib/site-social-metadata";

export const alt = SITE_SOCIAL_OG_IMAGE_ALT;
export const size = siteOgImageSize;
export const contentType = siteOgImageContentType;

export default renderSiteOgImage;
