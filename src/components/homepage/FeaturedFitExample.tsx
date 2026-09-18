import Link from "next/link";
import {
  FEATURED_FIT_CONDITION,
  FEATURED_FIT_DATE_LABEL,
  FEATURED_FIT_DATE_MEANING,
  FEATURED_FIT_HREF,
  FEATURED_FIT_MODEL_NUMBER,
  FEATURED_FIT_PART_NUMBER,
  FEATURED_FIT_QUALIFIER,
  FEATURED_FIT_REASON,
  FEATURED_FIT_SOURCE_HOST,
  FEATURED_FIT_SOURCE_PUBLISHER,
  FEATURED_FIT_SOURCE_TITLE,
  FEATURED_FIT_SOURCE_URL,
  FEATURED_FIT_TITLE,
  FEATURED_FIT_VERDICT,
  FEATURED_FIT_VIEW_LINK,
} from "@/lib/homepage/featured-fit-example";

export function FeaturedFitExample() {
  return (
    <aside className="bp-home__result" aria-label={FEATURED_FIT_TITLE}>
      <p className="bp-home__eyebrow">{FEATURED_FIT_TITLE}</p>
      <p className="bp-home__meta mt-2">{FEATURED_FIT_QUALIFIER}</p>

      <dl className="mt-4 space-y-3 text-base">
        <div>
          <dt className="bp-home__label">Appliance model</dt>
          <dd className="bp-code mt-1 inline-block">{FEATURED_FIT_MODEL_NUMBER}</dd>
        </div>
        <div>
          <dt className="bp-home__label">Replacement part</dt>
          <dd className="bp-code mt-1 inline-block">{FEATURED_FIT_PART_NUMBER}</dd>
        </div>
        <div>
          <dt className="bp-home__label">Fit answer</dt>
          <dd className="bp-home__verdict mt-1">{FEATURED_FIT_VERDICT}</dd>
        </div>
        <div>
          <dt className="bp-home__label">Why</dt>
          <dd className="bp-home__meta mt-1">{FEATURED_FIT_REASON}</dd>
        </div>
        <div>
          <dt className="bp-home__label">Source</dt>
          <dd className="bp-home__meta mt-1">
            <a
              href={FEATURED_FIT_SOURCE_URL}
              rel="nofollow noopener noreferrer"
              target="_blank"
              className="font-semibold text-[var(--home-navy)] underline underline-offset-2"
            >
              {FEATURED_FIT_SOURCE_TITLE}
            </a>
            <span>
              {" "}
              · {FEATURED_FIT_SOURCE_PUBLISHER} ({FEATURED_FIT_SOURCE_HOST})
            </span>
          </dd>
        </div>
        <div>
          <dt className="bp-home__label">Condition</dt>
          <dd className="bp-home__meta mt-1">{FEATURED_FIT_CONDITION}</dd>
        </div>
        <div>
          <dt className="bp-home__label">{FEATURED_FIT_DATE_LABEL}</dt>
          <dd className="bp-home__meta mt-1">{FEATURED_FIT_DATE_MEANING}</dd>
        </div>
      </dl>

      <p className="mt-4">
        <Link
          href={FEATURED_FIT_HREF}
          className="text-base font-semibold text-[var(--home-navy)] underline underline-offset-2"
        >
          {FEATURED_FIT_VIEW_LINK}
        </Link>
      </p>
    </aside>
  );
}
