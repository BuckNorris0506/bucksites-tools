import Link from "next/link";
import React, { type ReactNode } from "react";

import {
  SAME_FILTER_DISTINCT_MODEL_COPY_V1,
  type Core300SearchFamilyGroupV1,
  type GroupableSearchFilterHitV1,
  type GroupableSearchModelHitV1,
} from "@/lib/search/same-filter-distinct-model-grouping-v1";

const cardClass =
  "rounded-lg border border-bp-border bg-bp-surface p-4";
const familyLinkClass =
  "font-medium text-bp-trust underline decoration-bp-trust/30 underline-offset-2 hover:decoration-bp-trust/55";

function Meta({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium text-bp-muted">{children}</p>;
}

export function Core300OriginalFilterAnswerCard({
  filter,
  href,
  oemFromModels,
}: {
  filter: GroupableSearchFilterHitV1 | null;
  href: string | null;
  oemFromModels: { oem_part_number: string; slug: string } | null;
}) {
  const oem = filter?.oem_part_number ?? oemFromModels?.oem_part_number;
  if (!oem) return null;

  const body = (
    <>
      <Meta>{SAME_FILTER_DISTINCT_MODEL_COPY_V1.originalReplacementLabel}</Meta>
      <p className="mt-3 bp-code inline-block text-base font-semibold text-bp-text">
        {oem}
      </p>
      {filter?.name ? (
        <p className="mt-1 text-sm text-bp-muted">{filter.name}</p>
      ) : null}
      <p className="mt-2 text-sm leading-relaxed text-bp-text/90">
        {SAME_FILTER_DISTINCT_MODEL_COPY_V1.sharedFilterNote}
      </p>
      {href ? (
        <p className="mt-3 text-xs text-bp-muted">
          Opens models this part fits, notes, and buying options when we have them.
        </p>
      ) : (
        <p className="mt-3 text-xs text-bp-muted">
          Typical original filter from our reference for the units below.
        </p>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${cardClass} bp-card-interactive block transition-colors hover:border-bp-muted/50 hover:bg-bp-trust-soft/40`}>
        {body}
      </Link>
    );
  }

  return <div className={cardClass}>{body}</div>;
}

export function Core300IdentityFamilyCard<M extends GroupableSearchModelHitV1>({
  family,
  modelHref,
}: {
  family: Core300SearchFamilyGroupV1<M>;
  modelHref: (slug: string) => string;
}) {
  const primary = family.canonical ?? family.members[0];
  if (!primary) return null;

  return (
    <div className={cardClass}>
      <Meta>{SAME_FILTER_DISTINCT_MODEL_COPY_V1.identityCheckLabel}</Meta>
      <p className="mt-3 bp-code inline-block text-base font-semibold text-bp-text">
        {family.familyLabel}
      </p>
      <p className="mt-1 text-sm text-bp-muted">Brand: {primary.brand_name}</p>
      <p className="mt-2 text-sm leading-relaxed text-bp-text/90">
        {SAME_FILTER_DISTINCT_MODEL_COPY_V1.distinctMachineNote}
      </p>
      <p className="mt-3 text-sm">
        <Link href={modelHref(primary.slug)} className={familyLinkClass}>
          {SAME_FILTER_DISTINCT_MODEL_COPY_V1.openUnitLabel}
        </Link>
        <span className="text-bp-muted"> — {primary.model_number}</span>
      </p>
      {family.aliases.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-bp-muted">
            {SAME_FILTER_DISTINCT_MODEL_COPY_V1.alsoListedAsLabel}
          </p>
          <ul className="mt-1 space-y-1">
            {family.aliases.map((alias) => (
              <li key={alias.slug} className="text-sm">
                <Link href={modelHref(alias.slug)} className={familyLinkClass}>
                  {alias.model_number}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function Core300OtherListingsNote() {
  return (
    <p className="text-sm leading-relaxed text-bp-text/90">
      {SAME_FILTER_DISTINCT_MODEL_COPY_V1.otherListingsNote}
    </p>
  );
}
