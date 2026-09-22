import type { Metadata } from "next";
import Link from "next/link";
import { HomeLookup } from "@/components/homepage/HomeLookup";
import { RealLookupExample } from "@/components/homepage/RealLookupExample";
import {
  HOME_APPROACH_EYEBROW,
  HOME_BROWSE_FILTERS,
  HOME_BROWSE_FILTERS_HREF,
  HOME_EYEBROW,
  HOME_H1_LINE_1,
  HOME_H1_LINE_2,
  HOME_HOW_WE_CHECK_FIT,
  HOME_HOW_WE_CHECK_FIT_HREF,
  HOME_PHILOSOPHY_BODY_1,
  HOME_PHILOSOPHY_BODY_2,
  HOME_PHILOSOPHY_HEADING,
  HOME_SCOPE_BODY,
  HOME_SCOPE_HEADING,
  HOME_STEP_1,
  HOME_STEP_2,
  HOME_STEP_3,
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
        <div className="bp-home__hero-inner">
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
          <RealLookupExample />
        </div>
      </section>

      <div className="bp-home__sequence-band">
        <ol className="bp-home__sequence" aria-label="The BuckParts sequence">
          <li>
            <span className="bp-home__sequence-number" aria-hidden="true">
              1
            </span>
            <span>{HOME_STEP_1}</span>
          </li>
          <li className="bp-home__sequence-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 12h17m-6-6 6 6-6 6" />
            </svg>
          </li>
          <li>
            <span className="bp-home__sequence-number" aria-hidden="true">
              2
            </span>
            <span>{HOME_STEP_2}</span>
          </li>
          <li className="bp-home__sequence-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 12h17m-6-6 6 6-6 6" />
            </svg>
          </li>
          <li>
            <span className="bp-home__sequence-number" aria-hidden="true">
              3
            </span>
            <span>{HOME_STEP_3}</span>
          </li>
        </ol>
      </div>

      <section
        id="how-we-work"
        className="bp-home__philosophy"
        aria-labelledby="philosophy-title"
      >
        <div className="bp-home__philosophy-grid">
          <div>
            <p className="bp-home__section-eyebrow">{HOME_APPROACH_EYEBROW}</p>
            <h2 id="philosophy-title" className="bp-home__philosophy-title">
              {HOME_PHILOSOPHY_HEADING}
            </h2>
          </div>
          <div className="bp-home__philosophy-copy">
            <p>{HOME_PHILOSOPHY_BODY_1}</p>
            <p>{HOME_PHILOSOPHY_BODY_2}</p>
            <Link href={HOME_HOW_WE_CHECK_FIT_HREF} className="bp-home__text-link">
              {HOME_HOW_WE_CHECK_FIT}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M6 18 18 6M7 6h11v11" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

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
    </div>
  );
}
