import React from "react";
import Link from "next/link";

import {
  WHIRLPOOL_4396395_SUCCESSOR_BODY_PARAGRAPHS,
  WHIRLPOOL_4396395_SUCCESSOR_HEADING,
  WHIRLPOOL_4396395_SUCCESSOR_LINK_LABEL,
  WHIRLPOOL_FILTER4_SUCCESSOR_SLUG,
} from "@/lib/fridge/fridge-filter-4396395-successor-v1";

export type FilterPdpLegacySuccessorSectionProps = {
  filterSlug: string;
};

/**
 * Homeowner-facing successor explanation for legacy part numbers (4396395 only).
 * Does not add buy paths or change compatibility claims.
 */
export function FilterPdpLegacySuccessorSection({
  filterSlug,
}: FilterPdpLegacySuccessorSectionProps) {
  if (filterSlug !== "4396395") return null;

  return (
    <section
      className="rounded-2xl border border-bp-border bg-bp-surface p-6 sm:p-7"
      aria-label={WHIRLPOOL_4396395_SUCCESSOR_HEADING}
      data-filter-legacy-successor-v1="4396395"
    >
      <h2 className="text-base font-semibold text-bp-text">{WHIRLPOOL_4396395_SUCCESSOR_HEADING}</h2>
      {WHIRLPOOL_4396395_SUCCESSOR_BODY_PARAGRAPHS.map((paragraph) => (
        <p key={paragraph.slice(0, 48)} className="mt-3 text-sm leading-relaxed text-bp-text/90">
          {paragraph}
        </p>
      ))}
      <p className="mt-4">
        <Link
          href={`/filter/${WHIRLPOOL_FILTER4_SUCCESSOR_SLUG}`}
          className="text-sm font-medium text-bp-accent underline-offset-2 hover:underline"
        >
          {WHIRLPOOL_4396395_SUCCESSOR_LINK_LABEL}
        </Link>
      </p>
    </section>
  );
}
