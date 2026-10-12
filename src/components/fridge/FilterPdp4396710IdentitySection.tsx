import React from "react";

import {
  isWhirlpool4396710Page,
  WHIRLPOOL_4396710_FAQS,
  WHIRLPOOL_4396710_OPENING_PARAGRAPHS,
} from "@/lib/fridge/fridge-filter-4396710-identity-v1";

export type FilterPdp4396710IdentitySectionProps = {
  filterSlug: string;
};

/**
 * Identity explanation for historical Whirlpool part 4396710.
 * Does not add compatibility rows or buy paths.
 */
export function FilterPdp4396710IdentitySection({
  filterSlug,
}: FilterPdp4396710IdentitySectionProps) {
  if (!isWhirlpool4396710Page(filterSlug)) return null;

  return (
    <section
      className="space-y-6 rounded-2xl border border-bp-border bg-bp-surface p-6 sm:p-7"
      aria-label="About Whirlpool part 4396710"
      data-filter-4396710-identity-v1="true"
    >
      <div className="space-y-3 text-sm leading-relaxed text-bp-text/90">
        {WHIRLPOOL_4396710_OPENING_PARAGRAPHS.map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
      </div>
      <div>
        <h2 className="text-base font-semibold text-bp-text">Questions about 4396710</h2>
        <div className="mt-4 space-y-4">
          {WHIRLPOOL_4396710_FAQS.map((faq) => (
            <div key={faq.question}>
              <h3 className="text-sm font-semibold text-bp-text">{faq.question}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-bp-text/90">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
