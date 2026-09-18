import type { Metadata } from "next";
import Link from "next/link";
import { FeaturedFitExample } from "@/components/homepage/FeaturedFitExample";
import { HomeLookup } from "@/components/homepage/HomeLookup";
import {
  HOME_BROWSE_FILTERS,
  HOME_BROWSE_FILTERS_HREF,
  HOME_COMMITMENT_1_BODY,
  HOME_COMMITMENT_1_TITLE,
  HOME_COMMITMENT_2_BODY,
  HOME_COMMITMENT_2_TITLE,
  HOME_COMMITMENT_3_BODY,
  HOME_COMMITMENT_3_TITLE,
  HOME_EYEBROW,
  HOME_H1,
  HOME_HOW_WE_CHECK_FIT,
  HOME_HOW_WE_CHECK_FIT_HREF,
  HOME_PHILOSOPHY_BODY,
  HOME_PHILOSOPHY_HEADING,
  HOME_SCOPE,
  HOME_SCOPE_BODY,
  HOME_SCOPE_HEADING,
  HOME_STEP_1_BODY,
  HOME_STEP_1_TITLE,
  HOME_STEP_2_BODY,
  HOME_STEP_2_TITLE,
  HOME_STEP_3_BODY,
  HOME_STEP_3_TITLE,
  HOME_STEPS_HEADING,
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
    <div className="bp-home pb-16 text-bp-text">
      <section aria-label="Home hero" className="bp-home__hero">
        <div className="bp-home__lookup flex flex-col gap-4">
          <div className="space-y-3">
            <p className="bp-home__eyebrow">{HOME_EYEBROW}</p>
            <h1 className="bp-home__h1">{HOME_H1}</h1>
            <p className="bp-home__body max-w-xl">{HOME_SUBHEADLINE}</p>
            <p className="bp-home__body max-w-xl">{HOME_SCOPE}</p>
          </div>
          <HomeLookup />
        </div>
        <div className="bp-home__example">
          <FeaturedFitExample />
        </div>
      </section>

      <section aria-labelledby="home-steps-heading" className="mt-16 border-t border-bp-border pt-10">
        <h2 id="home-steps-heading" className="bp-home__h2">
          {HOME_STEPS_HEADING}
        </h2>
        <ol className="bp-home__steps mt-6 list-none p-0">
          <li className="bp-home__step">
            <p className="text-sm font-semibold text-[var(--home-navy)]">1</p>
            <h3 className="mt-1 text-lg font-semibold text-bp-text">{HOME_STEP_1_TITLE}</h3>
            <p className="bp-home__body mt-2">{HOME_STEP_1_BODY}</p>
          </li>
          <li className="bp-home__step">
            <p className="text-sm font-semibold text-[var(--home-navy)]">2</p>
            <h3 className="mt-1 text-lg font-semibold text-bp-text">{HOME_STEP_2_TITLE}</h3>
            <p className="bp-home__body mt-2">{HOME_STEP_2_BODY}</p>
          </li>
          <li className="bp-home__step">
            <p className="text-sm font-semibold text-[var(--home-navy)]">3</p>
            <h3 className="mt-1 text-lg font-semibold text-bp-text">{HOME_STEP_3_TITLE}</h3>
            <p className="bp-home__body mt-2">{HOME_STEP_3_BODY}</p>
          </li>
        </ol>
      </section>

      <section aria-labelledby="home-philosophy-heading" className="mt-16 border-t border-bp-border pt-10">
        <h2 id="home-philosophy-heading" className="bp-home__h2 max-w-3xl">
          {HOME_PHILOSOPHY_HEADING}
        </h2>
        <p className="bp-home__body mt-4 max-w-3xl">{HOME_PHILOSOPHY_BODY}</p>
        <ul className="bp-home__commitments mt-8 list-none p-0">
          <li>
            <h3 className="text-lg font-semibold text-bp-text">{HOME_COMMITMENT_1_TITLE}</h3>
            <p className="bp-home__body mt-2">{HOME_COMMITMENT_1_BODY}</p>
          </li>
          <li>
            <h3 className="text-lg font-semibold text-bp-text">{HOME_COMMITMENT_2_TITLE}</h3>
            <p className="bp-home__body mt-2">{HOME_COMMITMENT_2_BODY}</p>
          </li>
          <li>
            <h3 className="text-lg font-semibold text-bp-text">{HOME_COMMITMENT_3_TITLE}</h3>
            <p className="bp-home__body mt-2">{HOME_COMMITMENT_3_BODY}</p>
          </li>
        </ul>
        <p className="mt-6">
          <Link
            href={HOME_HOW_WE_CHECK_FIT_HREF}
            className="text-base font-semibold text-[var(--home-navy)] underline underline-offset-2"
          >
            {HOME_HOW_WE_CHECK_FIT}
          </Link>
        </p>
      </section>

      <section aria-labelledby="home-scope-heading" className="mt-16 border-t border-bp-border pt-10">
        <h2 id="home-scope-heading" className="bp-home__h2">
          {HOME_SCOPE_HEADING}
        </h2>
        <p className="bp-home__body mt-3 max-w-2xl">{HOME_SCOPE_BODY}</p>
        <p className="mt-4">
          <Link
            href={HOME_BROWSE_FILTERS_HREF}
            className="text-base font-semibold text-[var(--home-navy)] underline underline-offset-2"
          >
            {HOME_BROWSE_FILTERS}
          </Link>
        </p>
      </section>
    </div>
  );
}
