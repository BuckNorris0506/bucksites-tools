import type { Metadata } from "next";
import { HomepageView } from "@/components/homepage/HomepageView";
import {
  SITE_SOCIAL_OG_DESCRIPTION,
  SITE_SOCIAL_OG_TITLE,
} from "@/lib/site-social-metadata";

export const metadata: Metadata = {
  title: SITE_SOCIAL_OG_TITLE,
  description: SITE_SOCIAL_OG_DESCRIPTION,
  openGraph: {
    title: SITE_SOCIAL_OG_TITLE,
    description: SITE_SOCIAL_OG_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_SOCIAL_OG_TITLE,
    description: SITE_SOCIAL_OG_DESCRIPTION,
  },
};

export default function HomePage() {
  return <HomepageView />;
}
