import Link from "next/link";
import type { BuyLinkRow } from "@/components/BuyLinks";
import { ModelTruthPanel } from "@/components/trust/ModelTruthPanel";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import { BuckPartsVerifiedLinksSection } from "@/components/trust/BuckPartsVerifiedLinksSection";
import { Prose } from "@/components/Prose";
import { TieredBuyLinks } from "@/components/TieredBuyLinks";
import {
  buyPathSortContextForFilter,
  type BuyPathGateSuppressionSummary,
} from "@/lib/retailers/launch-buy-links";
import type { PartTrustSummary } from "@/lib/trust/part-trust";
import {
  intervalLabel,
  sharedFilterIntervalLabel,
} from "@/lib/vertical/interval";
import type { ReactNode } from "react";
import { BUCKPARTS_VERIFIED_LINK_PRIMARY_CTA_SR_PREFIX } from "@/lib/copy/buckparts-verified-link-copy";
import type { ApGoAttributionV1 } from "@/lib/retailers/ap-go-attribution-v1";

const sectionLabelClass =
  "text-xs font-medium uppercase tracking-wide text-bp-muted";

const detailLinkClass =
  "font-medium text-bp-trust underline decoration-bp-trust/30 underline-offset-2 hover:decoration-bp-trust/55";

const alternateRowClass =
  "flex flex-col gap-0.5 px-3 py-3 text-sm transition-colors hover:bg-bp-trust-soft/35";

export type VerticalModelFilterRow = {
  id: string;
  slug: string;
  oem_part_number: string;
  name: string | null;
  replacement_interval_months: number | null;
  notes: string | null;
  retailer_links: BuyLinkRow[];
};

/** When set (e.g. air purifier model PDP), primary row uses model trust chrome + `TrustAwareBuySection` instead of bare `TieredBuyLinks`. */
export type VerticalModelPrimaryTrustBuy = {
  trust: PartTrustSummary;
  mappedPartOptionsCount: number;
  hasPrimaryPartNotes: boolean;
  retailerLinks: BuyLinkRow[];
  gateSuppressionSummary?: BuyPathGateSuppressionSummary | null;
  buySuppressMessage: string;
};

type Props = {
  brandName: string;
  modelNumber: string;
  title: string;
  series: string | null;
  notes: string | null;
  filters: VerticalModelFilterRow[];
  /** e.g. `/air-purifier/filter` */
  filterBasePath: string;
  goBase: string;
  searchHref: string;
  fitConfirmation: string;
  wayfinding?: ReactNode;
  utilityIntro?: string;
  notesSectionTitle?: string;
  expandedSearchFooter?: boolean;
  primaryTrustBuy?: VerticalModelPrimaryTrustBuy | null;
  /** When set (AP phase 1), forwarded to buy CTAs for `/go` click_events attribution. */
  goAttribution?: ApGoAttributionV1 | null;
};

export function VerticalModelPageContent({
  brandName,
  modelNumber,
  title,
  series,
  notes,
  filters,
  filterBasePath,
  goBase,
  searchHref,
  fitConfirmation,
  wayfinding,
  utilityIntro,
  notesSectionTitle = "Extra notes",
  expandedSearchFooter = false,
  primaryTrustBuy,
  goAttribution,
}: Props) {
  const path = filterBasePath.replace(/\/$/, "");
  const primary = filters[0];
  const alternates = filters.slice(1);
  const sharedInterval = sharedFilterIntervalLabel(filters);
  const primaryInterval = primary ? intervalLabel(primary.replacement_interval_months) : null;

  return (
    <article className="space-y-10">
      {wayfinding}
      {utilityIntro ? (
        <p className="max-w-2xl text-sm leading-relaxed text-bp-muted">
          {utilityIntro}
        </p>
      ) : null}

      <div className="rounded-xl border border-bp-border bg-bp-surface p-5 sm:p-6">
        <p className={sectionLabelClass}>Brand</p>
        <p className="text-lg font-semibold text-bp-text">{brandName}</p>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-bp-text">
          Model <span className="bp-code">{modelNumber}</span>
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-bp-text/90">
          {title}
        </p>
        {series && (
          <p className="mt-1 text-sm text-bp-muted">Series: {series}</p>
        )}

        <p className="mt-5 rounded-lg border border-bp-border bg-bp-trust-soft/40 px-3 py-2.5 text-sm leading-relaxed text-bp-text/90">
          {fitConfirmation}
        </p>

        {filters.length === 0 ? (
          <p className="mt-6 text-sm text-bp-muted">
            We don’t have a replacement filter listed for this model yet. Try another spelling in
            search, or check the sticker on the unit and your manual for the original part number.
          </p>
        ) : (
          <>
            <div className="mt-6 border-t border-bp-border pt-6">
              <p className={sectionLabelClass}>
                {filters.length > 1 ? "Primary part on file" : "Your replacement"}
              </p>
              <p className="bp-code mt-2 text-xl font-semibold tracking-tight text-bp-text">
                {primary.oem_part_number}
              </p>
              {primary.name && (
                <p className="mt-1 text-sm text-bp-text/90">
                  {primary.name}
                </p>
              )}
              {(primaryInterval ?? sharedInterval) && (
                <p className="mt-2 text-sm text-bp-text/90">
                  {primaryInterval ?? sharedInterval}
                </p>
              )}

              {primaryTrustBuy ? (
                <>
                  <ModelTruthPanel
                    trust={primaryTrustBuy.trust}
                    mappedPartOptionsCount={primaryTrustBuy.mappedPartOptionsCount}
                    hasPrimaryPartNotes={primaryTrustBuy.hasPrimaryPartNotes}
                  />
                  <div className="mt-5">
                    <BuckPartsVerifiedLinksSection>
                      <TrustAwareBuySection
                        trust={primaryTrustBuy.trust}
                        links={primaryTrustBuy.retailerLinks}
                        goBase={goBase}
                        primaryCtaLabel={BUCKPARTS_VERIFIED_LINK_PRIMARY_CTA_SR_PREFIX}
                        suppressMessage={primaryTrustBuy.buySuppressMessage}
                        gateSuppressionSummary={primaryTrustBuy.gateSuppressionSummary ?? undefined}
                        buyPathSortContext={buyPathSortContextForFilter(
                          primary.slug,
                          primary.name,
                          primary.oem_part_number,
                        )}
                        goAttribution={goAttribution}
                      />
                    </BuckPartsVerifiedLinksSection>
                  </div>
                </>
              ) : (
                <div className="mt-5">
                  <BuckPartsVerifiedLinksSection>
                    <TieredBuyLinks
                      links={primary.retailer_links}
                      goBase={goBase}
                      primaryCtaLabel={BUCKPARTS_VERIFIED_LINK_PRIMARY_CTA_SR_PREFIX}
                      buyPathSortContext={buyPathSortContextForFilter(
                        primary.slug,
                        primary.name,
                        primary.oem_part_number,
                      )}
                      goAttribution={goAttribution}
                    />
                  </BuckPartsVerifiedLinksSection>
                </div>
              )}

              <p className="mt-4 text-sm">
                <Link href={`${path}/${primary.slug}`} className={detailLinkClass}>
                  All details for this part
                </Link>
                <span className="text-bp-muted">
                  {" "}
                  (notes, compatible models, BuckParts Verified Links when listed)
                </span>
              </p>
            </div>

            {alternates.length > 0 && (
              <div className="mt-8 border-t border-bp-border pt-6">
                <h2 className="text-sm font-semibold text-bp-text">
                  Other parts that also fit this model
                </h2>
                <p className="mt-1 text-xs text-bp-muted">
                  Less common crosses — open each for full part details.
                </p>
                <ul className="mt-3 divide-y divide-bp-border rounded-lg border border-bp-border">
                  {alternates.map((f) => (
                    <li key={f.id}>
                      <Link href={`${path}/${f.slug}`} className={alternateRowClass}>
                        <span className="bp-code font-semibold text-bp-text">
                          {f.oem_part_number}
                        </span>
                        {f.name && (
                          <span className="text-bp-muted">{f.name}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <section className="border-t border-bp-border pt-8">
        <h2 className="text-sm font-semibold text-bp-text">
          {notesSectionTitle}
        </h2>
        <p className="mt-2 text-sm text-bp-muted">
          <Link
            href={searchHref}
            className="font-medium text-bp-trust underline underline-offset-2"
          >
            {expandedSearchFooter ? "Search again" : "Back to search"}
          </Link>
          {expandedSearchFooter ? (
            <span className="text-bp-muted">
              {" "}
              if you need a different model or part number.
            </span>
          ) : null}
        </p>
        {(series || sharedInterval || notes) && (
          <div className="mt-4 space-y-3 text-sm text-bp-muted">
            {sharedInterval && filters.length > 1 && (
              <p>
                <span className="font-medium text-bp-text/90">
                  Timing when several parts fit:
                </span>{" "}
                {sharedInterval}
              </p>
            )}
            {notes && (
              <div className="max-w-prose">
                <Prose>{notes}</Prose>
              </div>
            )}
          </div>
        )}
      </section>
    </article>
  );
}
