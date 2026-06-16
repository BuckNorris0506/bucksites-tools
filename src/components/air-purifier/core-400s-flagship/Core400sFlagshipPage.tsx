import React from "react";
import Link from "next/link";

import {
  BuckPartsVerifiedLinksSection,
} from "@/components/trust/BuckPartsVerifiedLinksSection";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import type {
  VerticalModelPrimaryTrustBuy,
} from "@/components/vertical/VerticalModelPageContent";
import {
  CORE_400S_STANDARD_PART_NUMBER,
  core400sFitStateLabel,
  deriveCore400sFitState,
  formatCore400sVerifiedDate,
  getCore400sPrimaryVerifiedLink,
  type Core400sConfusableFamily,
  type Core400sModelSummary,
} from "@/lib/air-purifier/core-400s-flagship-v1";
import { CORE_400S_FLAGSHIP_COPY } from "@/lib/copy/core-400s-flagship-v1";
import type { Core400sFlagshipBundle } from "@/lib/data/air-purifier/core-400s-flagship-bundle";
import type { AirPurifierModelWithFilters } from "@/lib/data/air-purifier/models";
import { buyPathSortContextForFilter } from "@/lib/retailers/launch-buy-links";
import { intervalLabel } from "@/lib/vertical/interval";
import {
  BUCKPARTS_VERIFIED_LINK_PRIMARY_CTA_SR_PREFIX,
} from "@/lib/copy/buckparts-verified-link-copy";

const sectionClass = "rounded-lg border border-bp-border bg-bp-surface p-4 sm:p-5";

type Props = {
  model: AirPurifierModelWithFilters;
  bundle: Core400sFlagshipBundle;
  primaryTrustBuy?: VerticalModelPrimaryTrustBuy | null;
};

export function Core400sFlagshipPage({ model, bundle, primaryTrustBuy }: Props) {
  const primary = model.filters[0] ?? null;
  const primaryVerifiedLink = getCore400sPrimaryVerifiedLink({
    trust: primaryTrustBuy?.trust,
    retailerLinks: primaryTrustBuy?.retailerLinks,
  });
  const fitState = deriveCore400sFitState({
    trust: primaryTrustBuy?.trust,
    primaryVerifiedLink,
  });
  const verifiedDate = formatCore400sVerifiedDate(
    primaryVerifiedLink?.browser_truth_checked_at,
  );
  const interval = intervalLabel(primary?.replacement_interval_months);
  const showConfusableNote = bundle.confusableFamilies.length === 3;

  return (
    <article className="space-y-8">
      <header className="space-y-3 border-b border-bp-border pb-6">
        <p className="text-sm font-medium text-bp-muted">{CORE_400S_FLAGSHIP_COPY.eyebrow}</p>
        <div className="max-w-3xl space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-bp-text sm:text-4xl">
            {CORE_400S_FLAGSHIP_COPY.h1}
          </h1>
          <p className="text-sm leading-relaxed text-bp-muted">
            {CORE_400S_FLAGSHIP_COPY.notSeller}
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] lg:items-start">
        <div className="space-y-5 lg:order-2 lg:sticky lg:top-6">
          <section className="rounded-lg border border-bp-border bg-bp-surface p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-bp-muted">
              {CORE_400S_FLAGSHIP_COPY.answerLabel}
            </p>
            <div className="mt-4 space-y-3">
              <p className="text-base font-medium text-bp-text">
                {primary?.name ?? "Core 400 / Core 400S replacement filter"}
              </p>
              <p className="bp-code inline-block text-xl font-semibold text-bp-text sm:text-2xl">
                {primary?.oem_part_number ?? CORE_400S_STANDARD_PART_NUMBER}
              </p>
              <p className="text-sm text-bp-muted">
                {CORE_400S_FLAGSHIP_COPY.catalogRefLabel}:{" "}
                <span className="font-mono font-semibold text-bp-text">
                  {CORE_400S_STANDARD_PART_NUMBER}
                </span>
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span
                className={
                  fitState === "exact_match"
                    ? "inline-flex rounded-md border border-bp-success/25 bg-bp-success-soft px-2.5 py-1 text-sm font-semibold text-bp-success"
                    : "inline-flex rounded-md border border-bp-caution/35 bg-bp-caution-soft px-2.5 py-1 text-sm font-semibold text-bp-caution"
                }
              >
                {core400sFitStateLabel(fitState)}
              </span>
              {interval ? (
                <span className="text-sm font-medium text-bp-text/90">{interval}</span>
              ) : null}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-bp-muted">
              {CORE_400S_FLAGSHIP_COPY.genuineLine}
            </p>
          </section>

          <section className={sectionClass}>
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-bp-text">
                See where to buy{verifiedDate ? ` - verified ${verifiedDate}` : ""}
              </h2>
              <p className="text-sm leading-relaxed text-bp-muted">
                {CORE_400S_FLAGSHIP_COPY.ctaIntro}
              </p>
            </div>
            {primaryTrustBuy && primary ? (
              <div className="mt-4">
                <BuckPartsVerifiedLinksSection>
                  <TrustAwareBuySection
                    trust={primaryTrustBuy.trust}
                    links={primaryTrustBuy.retailerLinks}
                    goBase="/air-purifier/go"
                    primaryCtaLabel={BUCKPARTS_VERIFIED_LINK_PRIMARY_CTA_SR_PREFIX}
                    suppressMessage={CORE_400S_FLAGSHIP_COPY.suppress}
                    gateSuppressionSummary={primaryTrustBuy.gateSuppressionSummary ?? undefined}
                    buyPathSortContext={buyPathSortContextForFilter(
                      primary.slug,
                      primary.name,
                      primary.oem_part_number,
                    )}
                  />
                </BuckPartsVerifiedLinksSection>
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-bp-caution/40 bg-bp-caution-soft px-3 py-3 text-sm leading-relaxed text-bp-caution">
                {CORE_400S_FLAGSHIP_COPY.suppress}
              </p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-bp-muted">
              {CORE_400S_FLAGSHIP_COPY.ctaOpensLine}
            </p>
          </section>
        </div>

        <div className="space-y-5 lg:order-1">
          <section className={sectionClass}>
            <h2 className="text-base font-semibold text-bp-text">
              {CORE_400S_FLAGSHIP_COPY.modelCheckTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-bp-muted">
              {CORE_400S_FLAGSHIP_COPY.modelCheckBody}
            </p>
            {showConfusableNote ? (
              <ConfusableNote families={bundle.confusableFamilies} />
            ) : null}
            <Link
              href="/air-purifier/search"
              className="mt-4 inline-flex text-sm font-semibold text-bp-trust underline-offset-2 hover:underline"
            >
              {CORE_400S_FLAGSHIP_COPY.differentModel}
              <span className="ml-1 text-bp-muted" aria-hidden>
                &rarr;
              </span>
            </Link>
          </section>

          {primary?.notes ? (
            <section className={sectionClass}>
              <h2 className="text-base font-semibold text-bp-text">
                {CORE_400S_FLAGSHIP_COPY.insideTitle}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-bp-muted">
                {CORE_400S_FLAGSHIP_COPY.insideBody}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-bp-muted">{primary.notes}</p>
            </section>
          ) : null}

          <ModelListBlock
            title={CORE_400S_FLAGSHIP_COPY.familyTitle}
            body={CORE_400S_FLAGSHIP_COPY.familyBody}
            models={bundle.familyModels}
            currentSlug={model.slug}
          />

          <ModelListBlock
            title={`${CORE_400S_FLAGSHIP_COPY.alsoFitsTitle} (${bundle.alsoFitsModels.length})`}
            body={CORE_400S_FLAGSHIP_COPY.alsoFitsBody}
            models={bundle.alsoFitsModels}
            currentSlug={model.slug}
          />

          <section className={sectionClass}>
            <h2 className="text-base font-semibold text-bp-text">
              {CORE_400S_FLAGSHIP_COPY.trustTitle}
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-bp-muted">
              <li>
                Checked against{" "}
                <span className="font-mono font-semibold text-bp-text">
                  {CORE_400S_STANDARD_PART_NUMBER}
                </span>
                {verifiedDate ? ` on ${verifiedDate}` : ""}.
              </li>
              <li>The filter and model lists come from BuckParts air purifier data.</li>
              <li>BuckParts is not the seller and only shows a link when checks clear.</li>
            </ul>
          </section>

          <section className={sectionClass}>
            <h2 className="text-base font-semibold text-bp-text">
              {CORE_400S_FLAGSHIP_COPY.reminderTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-bp-muted">
              {CORE_400S_FLAGSHIP_COPY.reminderBody}
            </p>
            <p className="mt-3 inline-flex rounded-md border border-bp-border bg-bp-trust-soft/55 px-3 py-2 text-sm font-semibold text-bp-text">
              {CORE_400S_FLAGSHIP_COPY.reminderAction}: {interval ?? "6 months"}
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}

function ModelListBlock({
  title,
  body,
  models,
  currentSlug,
}: {
  title: string;
  body: string;
  models: Core400sModelSummary[];
  currentSlug: string;
}) {
  return (
    <section className={sectionClass}>
      <h2 className="text-base font-semibold text-bp-text">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-bp-muted">{body}</p>
      {models.length === 0 ? (
        <p className="mt-3 text-sm text-bp-muted">No related models are listed yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-bp-border rounded-md border border-bp-border">
          {models.map((relatedModel) => {
            const isCurrent = relatedModel.slug === currentSlug;
            return (
              <li key={relatedModel.id}>
                <Link
                  href={`/air-purifier/model/${relatedModel.slug}`}
                  aria-current={isCurrent ? "page" : undefined}
                  className="flex flex-col gap-1 px-3 py-3 text-sm transition-colors hover:bg-bp-trust-soft/40"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="bp-code font-semibold text-bp-text">
                      {relatedModel.model_number}
                    </span>
                    {isCurrent ? (
                      <span className="rounded-md bg-bp-success-soft px-2 py-0.5 text-xs font-semibold text-bp-success">
                        You are here
                      </span>
                    ) : null}
                  </span>
                  {relatedModel.title ? (
                    <span className="text-bp-muted">{relatedModel.title}</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ConfusableNote({ families }: { families: Core400sConfusableFamily[] }) {
  const familyNames = families.map((family) => family.series).join(" / ");
  const partNumbers = Array.from(
    new Set(families.flatMap((family) => family.filterPartNumbers)),
  ).join(" / ");

  return (
    <div className="mt-4 rounded-lg border border-bp-caution/40 bg-bp-caution-soft px-3 py-3 text-sm leading-relaxed text-bp-caution">
      <p className="font-semibold text-bp-caution">Different Core families use different filters.</p>
      <p className="mt-1">
        {familyNames} are mapped to {partNumbers}, not {CORE_400S_STANDARD_PART_NUMBER}. Confirm the
        label says Core 400S before using this page.
      </p>
    </div>
  );
}
