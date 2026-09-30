import type { Metadata } from "next";
import Link from "next/link";
import { HomeLookup } from "@/components/homepage/HomeLookup";
import {
  HomeTrustEvidenceSection,
  HomeWhereToBuySection,
} from "@/components/homepage/HomeTrustAndBuyingSections";
import { RealLookupExample } from "@/components/homepage/RealLookupExample";
import {
  HOME_BROWSE_FILTERS,
  HOME_BROWSE_FILTERS_HREF,
  HOME_EYEBROW,
  HOME_H1_LINE_1,
  HOME_H1_LINE_2,
  HOME_SCOPE_BODY,
  HOME_SCOPE_HEADING,
  HOME_SUBHEADLINE,
} from "@/lib/homepage/homepage-copy";
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
  return (
    <div className="bp-home">
      <a href="#lookup" className="bp-home__skip">
        Skip to filter lookup
      </a>

      <section aria-labelledby="hero-title" className="bp-home__hero-stage">
        <div className="bp-home__hero-inner bp-home__hero-inner--lookup-only">
          <div className="bp-home__task">
            <p className="bp-home__eyebrow">{HOME_EYEBROW}</p>
            <h1 id="hero-title" className="bp-home__h1">
              {HOME_H1_LINE_1}
              <span>{HOME_H1_LINE_2}</span>
            </h1>
            <p className="bp-home__hero-intro">{HOME_SUBHEADLINE}</p>
            <div id="lookup">
              <HomeLookup />
            </div>
          </div>
        </div>
      </section>

      <section className="bp-home__worked-example-band" aria-label="Worked lookup example">
        <RealLookupExample />
      </section>

      <HomeTrustEvidenceSection />

      <section className="bp-home__scope" aria-labelledby="scope-title">
        <div className="bp-home__scope-inner">
          <div>
            <h2 id="scope-title" className="bp-home__scope-title">
              {HOME_SCOPE_HEADING}
            </h2>
            <p className="bp-home__scope-content">{HOME_SCOPE_BODY}</p>
          </div>
          <Link href={HOME_BROWSE_FILTERS_HREF} className="bp-home__text-link bp-home__scope-link">
            {HOME_BROWSE_FILTERS}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M4 12h15m-6-6 6 6-6 6" />
            </svg>
          </Link>
        </div>
      </section>

      <HomeWhereToBuySection />
    </div>
  );
}
