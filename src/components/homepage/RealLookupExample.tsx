"use client";

import Image from "next/image";
import { useState } from "react";
import {
  FEATURED_FIT_ANSWER_KICKER,
  FEATURED_FIT_BRAND,
  FEATURED_FIT_MODEL_NUMBER,
  FEATURED_FIT_PART_NAME,
  FEATURED_FIT_PART_NUMBER,
  FEATURED_FIT_ILLUSTRATION_ALT,
  FEATURED_FIT_ILLUSTRATION_PATH,
} from "@/lib/homepage/featured-fit-example";
import {
  HOME_EXAMPLE_QUALIFIER,
  HOME_SCENE_LABEL,
  HOME_WHY_MATCH,
} from "@/lib/homepage/homepage-copy";
import { WhyThisMatchDialog } from "@/components/homepage/WhyThisMatchDialog";

export function RealLookupExample() {
  const [whyOpen, setWhyOpen] = useState(false);

  return (
    <>
      <div
        className="bp-home__product-scene"
        aria-label={`Real lookup example: Whirlpool ${FEATURED_FIT_MODEL_NUMBER} and ${FEATURED_FIT_PART_NAME}. This is not your appliance result.`}
      >
        <div className="bp-home__scene-mat" aria-hidden="true" />
        <p className="bp-home__scene-label">{HOME_SCENE_LABEL}</p>
        <Image
          className="bp-home__product-illustration"
          src={FEATURED_FIT_ILLUSTRATION_PATH}
          alt={FEATURED_FIT_ILLUSTRATION_ALT}
          width={200}
          height={320}
          priority
        />
        <div className="bp-home__model-ticket">
          <span className="bp-home__ticket-label">A refrigerator model</span>
          <strong>{FEATURED_FIT_MODEL_NUMBER}</strong>
          <span className="bp-home__model-type">{FEATURED_FIT_BRAND}</span>
        </div>
        <svg
          className="bp-home__relationship-path"
          viewBox="0 0 183 92"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10 4V52Q10 67 27 67H165"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeDasharray="4 5"
          />
          <path d="m157 60 8 7-8 7" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        <article className="bp-home__answer-preview">
          <div className="bp-home__answer-body">
            <p className="bp-home__answer-kicker">{FEATURED_FIT_ANSWER_KICKER}</p>
            <div className="bp-home__answer-line">
              <h2>{FEATURED_FIT_PART_NAME}</h2>
              <span className="bp-home__part-code">{FEATURED_FIT_PART_NUMBER}</span>
            </div>
          </div>
          <div className="bp-home__answer-footer">
            <button
              type="button"
              className="bp-home__evidence-button"
              onClick={() => setWhyOpen(true)}
            >
              {HOME_WHY_MATCH}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="m9 5 7 7-7 7" />
              </svg>
            </button>
            <span className="bp-home__example-qualifier">{HOME_EXAMPLE_QUALIFIER}</span>
          </div>
        </article>
      </div>
      {whyOpen ? <WhyThisMatchDialog open={whyOpen} onClose={() => setWhyOpen(false)} /> : null}
    </>
  );
}
