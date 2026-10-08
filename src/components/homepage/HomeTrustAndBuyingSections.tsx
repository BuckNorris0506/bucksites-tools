import Link from "next/link";
import {
  FEATURED_FIT_EVIDENCE_PATH,
  FEATURED_FIT_MODEL_NUMBER,
  FEATURED_FIT_PART_NUMBER,
  FEATURED_FIT_SOURCE_TITLE,
  FEATURED_FIT_WHY_BODY,
  FEATURED_FIT_WHY_LIMIT_BODY,
} from "@/lib/homepage/featured-fit-example";
import {
  HOME_TRUST_EVIDENCE_EYEBROW,
  HOME_TRUST_OEM_LABEL,
  HOME_TRUST_UNKNOWN_LABEL,
  HOME_TRUST_UNKNOWN_MEANS,
  HOME_TRUST_VERIFIED_LABEL,
  HOME_WHERE_TO_BUY_BODY,
  HOME_WHERE_TO_BUY_EYEBROW,
  HOME_WHERE_TO_BUY_HEADING,
} from "@/lib/homepage/homepage-copy";

/** Visible trust summary for WRX735SDHZ / EDR4RXD1 worked example (scoped; not every model). */
export function HomeTrustEvidenceSection() {
  return (
    <section
      id="trust-evidence"
      className="bp-home__trust-evidence"
      aria-labelledby="home-trust-evidence-title"
    >
      <p className="bp-home__section-eyebrow">{HOME_TRUST_EVIDENCE_EYEBROW}</p>
      <h2 id="home-trust-evidence-title" className="bp-home__trust-evidence-title">
        What we know for this example
      </h2>
      <div className="bp-home__trust-grid">
        <article className="bp-home__trust-block">
          <h3>{HOME_TRUST_OEM_LABEL}</h3>
          <p>{FEATURED_FIT_WHY_BODY}</p>
          <p className="bp-home__trust-source">{FEATURED_FIT_SOURCE_TITLE}</p>
        </article>
        <article className="bp-home__trust-block">
          <h3>{HOME_TRUST_VERIFIED_LABEL}</h3>
          <p>
            BuckParts lists {FEATURED_FIT_PART_NUMBER} for {FEATURED_FIT_MODEL_NUMBER} in compatibility
            data. Retailer-path checks are separate—an eligible verified link appears only when current
            gates allow it.
          </p>
        </article>
        <article className="bp-home__trust-block">
          <h3>{HOME_TRUST_UNKNOWN_LABEL}</h3>
          <p>{FEATURED_FIT_WHY_LIMIT_BODY}</p>
          <p>
            A fresh fit-evidence review date is not re-established here. Suffix-wide coverage and current
            retailer availability are not asserted on this page.
          </p>
        </article>
        <article className="bp-home__trust-block bp-home__trust-block--unknown">
          <h3>{HOME_TRUST_UNKNOWN_MEANS}</h3>
          <p>
            Missing evidence stays missing—we do not convert unknown into a guessed fit or a disguised buying
            link.
          </p>
        </article>
      </div>
      <Link href="/truth-policy" className="bp-home__text-link">
        Truth Policy — deep dive
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M4 12h15m-6-6 6 6-6 6" />
        </svg>
      </Link>
      <p className="sr-only">Evidence file: {FEATURED_FIT_EVIDENCE_PATH}</p>
    </section>
  );
}

export function HomeWhereToBuySection() {
  return (
    <section
      id="where-to-buy"
      className="bp-home__where-to-buy"
      aria-labelledby="home-where-to-buy-title"
    >
      <p className="bp-home__section-eyebrow">{HOME_WHERE_TO_BUY_EYEBROW}</p>
      <h2 id="home-where-to-buy-title" className="bp-home__where-to-buy-title">
        {HOME_WHERE_TO_BUY_HEADING}
      </h2>
      <p className="bp-home__where-to-buy-body">{HOME_WHERE_TO_BUY_BODY}</p>
      <p className="bp-home__where-to-buy-trust">
        <strong>We’re not a parts store.</strong> Buying comes after the fit check.
      </p>
      <Link href="/disclosure" className="bp-home__text-link">
        Affiliate Disclosure
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M4 12h15m-6-6 6 6-6 6" />
        </svg>
      </Link>
    </section>
  );
}
