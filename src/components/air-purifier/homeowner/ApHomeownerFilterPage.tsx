import React from "react";
import Link from "next/link";

import type { BuyLinkRow } from "@/components/BuyLinks";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import {
  apHomeownerFitStateLabel,
  apHomeownerShowsOfficialListingTrustBullet,
  deriveApHomeownerFitState,
  formatApHomeownerCompatModelDisplay,
  getApHomeownerPrimaryVerifiedLink,
  prepareApHomeownerDisplayRetailerLinks,
  type ApHomeownerCompatModel,
} from "@/lib/air-purifier/ap-homeowner-framework-v1";
import { AP_HOMEOWNER_MEDIFY_MA50_RF_COPY } from "@/lib/copy/ap-homeowner-medify-ma50-rf-v1";
import type { BuyPathGateSuppressionSummary } from "@/lib/retailers/launch-buy-links";
import type { PartTrustSummary } from "@/lib/trust/part-trust";
import { intervalLabel } from "@/lib/vertical/interval";

const sectionClass = "rounded-lg border border-bp-border bg-bp-surface p-4 sm:p-5";

export type ApHomeownerFilterPageProps = {
  oemPartNumber: string;
  filterName: string | null;
  replacementIntervalMonths: number | null;
  models: ApHomeownerCompatModel[];
  retailerLinks: BuyLinkRow[];
  trust: PartTrustSummary;
  gateSuppressionSummary?: BuyPathGateSuppressionSummary | null;
  buyPathSortContext: Parameters<typeof TrustAwareBuySection>[0]["buyPathSortContext"];
  goBase?: string;
  searchHref?: string;
  modelBasePath?: string;
};

export function ApHomeownerFilterPage({
  oemPartNumber,
  filterName,
  replacementIntervalMonths,
  models,
  retailerLinks,
  trust,
  gateSuppressionSummary,
  buyPathSortContext,
  goBase = "/air-purifier/go",
  searchHref = "/air-purifier/search",
  modelBasePath = "/air-purifier/model",
}: ApHomeownerFilterPageProps) {
  const copy = AP_HOMEOWNER_MEDIFY_MA50_RF_COPY;
  const primaryVerifiedLink = getApHomeownerPrimaryVerifiedLink({ trust, retailerLinks });
  const fitState = deriveApHomeownerFitState({ trust, primaryVerifiedLink });
  const displayRetailerLinks = prepareApHomeownerDisplayRetailerLinks(
    retailerLinks,
    copy.primaryCtaLabel,
  );
  const interval = intervalLabel(replacementIntervalMonths);
  const showBuySection = trust.buyer_path_state !== "suppress_buy" && retailerLinks.length > 0;
  const showOfficialListingBullet = apHomeownerShowsOfficialListingTrustBullet(trust);
  const mBase = modelBasePath.replace(/\/$/, "");

  return (
    <article className="space-y-8">
      <header className="space-y-3 border-b border-bp-border pb-6">
        <p className="text-sm font-medium text-bp-muted">{copy.eyebrow}</p>
        <div className="max-w-3xl space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-bp-text sm:text-4xl">
            {copy.h1}
          </h1>
          <p className="text-sm leading-relaxed text-bp-muted">{copy.notSeller}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] lg:items-start">
        <div className="space-y-5 lg:order-2 lg:sticky lg:top-6">
          <section className="rounded-lg border border-bp-border bg-bp-surface p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-bp-muted">
              {copy.answerLabel}
            </p>
            <div className="mt-4 space-y-3">
              <p className="text-base font-medium text-bp-text">
                {filterName ?? copy.h1}
              </p>
              <p className="bp-code inline-block text-xl font-semibold text-bp-text sm:text-2xl">
                {oemPartNumber}
              </p>
              <p className="text-sm text-bp-muted">{copy.partNumberPackagingHint}</p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span
                className={
                  fitState === "exact_match"
                    ? "inline-flex rounded-md border border-bp-success/25 bg-bp-success-soft px-2.5 py-1 text-sm font-semibold text-bp-success"
                    : "inline-flex rounded-md border border-bp-caution/35 bg-bp-caution-soft px-2.5 py-1 text-sm font-semibold text-bp-caution"
                }
              >
                {apHomeownerFitStateLabel(fitState)}
              </span>
              {interval ? (
                <span className="text-sm font-medium text-bp-text/90">{interval}</span>
              ) : null}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-bp-muted">{copy.genuineLine}</p>
          </section>

          <section className={sectionClass}>
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-bp-text">See where to buy</h2>
              <p className="text-sm leading-relaxed text-bp-muted">{copy.ctaIntro}</p>
            </div>
            {showBuySection ? (
              <div className="mt-4">
                <TrustAwareBuySection
                  trust={trust}
                  links={displayRetailerLinks}
                  goBase={goBase}
                  primaryCtaLabel={copy.primaryCtaSrPrefix}
                  suppressMessage={copy.suppress}
                  gateSuppressionSummary={gateSuppressionSummary ?? undefined}
                  buyPathSortContext={buyPathSortContext}
                />
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-bp-caution/40 bg-bp-caution-soft px-3 py-3 text-sm leading-relaxed text-bp-caution">
                {copy.suppress}
              </p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-bp-muted">{copy.ctaOpensLine}</p>
          </section>
        </div>

        <div className="space-y-5 lg:order-1">
          <section className={sectionClass}>
            <h2 className="text-base font-semibold text-bp-text">{copy.modelCheckTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-bp-muted">{copy.modelCheckBody}</p>
            <p className="mt-2 text-sm leading-relaxed text-bp-muted">
              {copy.modelCheckWrongModelBody}
            </p>
            <Link
              href={searchHref}
              className="mt-4 inline-flex text-sm font-semibold text-bp-trust underline-offset-2 hover:underline"
            >
              {copy.differentModel}
              <span className="ml-1 text-bp-muted" aria-hidden>
                &rarr;
              </span>
            </Link>
          </section>

          <CompatModelList
            title={copy.compatTitle}
            body={copy.compatBody}
            models={models}
            modelBasePath={mBase}
          />

          <section className={sectionClass}>
            <h2 className="text-base font-semibold text-bp-text">{copy.trustTitle}</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-bp-muted">
              <li>
                This page is for{" "}
                <span className="font-mono font-semibold text-bp-text">{oemPartNumber}</span>, the
                replacement-filter number shown above.
              </li>
              <li>BuckParts is not the seller.</li>
              {showOfficialListingBullet ? (
                <li>{copy.trustOfficialListingClause}</li>
              ) : null}
              <li>A buy link appears only when the retailer page passes the filter check.</li>
            </ul>
          </section>
        </div>
      </div>
    </article>
  );
}

function CompatModelList({
  title,
  body,
  models,
  modelBasePath,
}: {
  title: string;
  body: string;
  models: ApHomeownerCompatModel[];
  modelBasePath: string;
}) {
  return (
    <section className={sectionClass}>
      <h2 className="text-base font-semibold text-bp-text">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-bp-muted">{body}</p>
      {models.length > 0 ? (
        <ul className="mt-4 divide-y divide-bp-border rounded-md border border-bp-border">
          {models.map((model) => (
            <li key={model.id}>
              <Link
                href={`${modelBasePath}/${model.slug}`}
                className="block px-3 py-3 text-sm transition-colors hover:bg-bp-trust-soft/40"
              >
                <span className="font-semibold text-bp-text">
                  {formatApHomeownerCompatModelDisplay(model)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-bp-muted">
          We don&apos;t have purifier links for this filter yet. Compare the part number on your
          current cartridge or your manual before ordering.
        </p>
      )}
    </section>
  );
}
