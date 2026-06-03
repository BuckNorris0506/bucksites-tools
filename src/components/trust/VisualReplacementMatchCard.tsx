import React from "react";
import Link from "next/link";

import {
  FRIDGE_HOMEOWNER_HOW_REPLACEMENT_USUALLY_WORKS,
  FRIDGE_HOMEOWNER_SECTION_HOW_REPLACEMENT_WORKS,
  FRIDGE_HOMEOWNER_SECTION_WHAT_TO_COMPARE,
  FRIDGE_HOMEOWNER_SECTION_WHERE_TO_LOOK,
  FRIDGE_HOMEOWNER_SECTION_WHY_REPLACEMENT_MATTERS,
  FRIDGE_HOMEOWNER_WHERE_TO_LOOK_BODY,
  FRIDGE_HOMEOWNER_WHERE_TO_LOOK_MANUAL,
  FRIDGE_HOMEOWNER_WHY_REPLACEMENT_MATTERS,
} from "@/lib/copy/fridge-homeowner-help";
import { COMPARE_BEFORE_BUY_CHECKLIST_LINES } from "@/lib/copy/public-trust";
import {
  BUCKPARTS_VERIFIED_LINK_NONE_YET,
  BUCKPARTS_VERIFIED_LINK_WHEN_SHOWN_NOTE,
} from "@/lib/copy/buckparts-verified-link-copy";
import { FridgeTrustFunnelDetails } from "@/components/analytics/FridgeTrustFunnelDetails";
import { FridgeModelConnectedFilterChips } from "@/components/fridge/FridgeModelConnectedFilterChips";
import type { FridgeTrustFunnelPayload } from "@/lib/analytics/fridge-trust-funnel";
import type { FridgeMappedFilterRow } from "@/lib/data/fridges";
import type { FridgeFormFactor } from "@/lib/fridge/fridge-form-factor-evidence";

/** Plain homeowner-facing store status — no gate internals. */
export type VisualMatchStorePlainStatus =
  | "options_after_checks"
  | "buttons_hidden_pending_checks"
  | "none_yet";

export type VisualReplacementMatchCardProps =
  | {
      variant: "fridge_filter";
      brandName: string;
      brandSlug: string;
      oemPartNumber: string;
      productName?: string | null;
      aliases: string[];
      intervalLabel?: string | null;
      compatibleModelCount: number;
      storePlainStatus: VisualMatchStorePlainStatus;
      telemetryBase?: Omit<FridgeTrustFunnelPayload, "event_name" | "filter_slug">;
    }
  | {
      variant: "fridge_model";
      brandName: string;
      brandSlug: string;
      modelNumber: string;
      mappedFilterCount: number;
      connectedFilters: FridgeMappedFilterRow[];
      formFactor: FridgeFormFactor;
      replacementIntervalHint?: string | null;
      telemetryBase?: Omit<FridgeTrustFunnelPayload, "event_name" | "filter_slug">;
    };

function FridgeHomeownerHelpSectionsInner() {
  const sectionLabel = "text-xs font-semibold uppercase tracking-wide text-bp-muted";
  return (
    <div className="space-y-4">
      <div>
        <h2 className={sectionLabel}>{FRIDGE_HOMEOWNER_SECTION_WHERE_TO_LOOK}</h2>
        <p className="mt-2 text-sm leading-relaxed text-bp-text/90">
          {FRIDGE_HOMEOWNER_WHERE_TO_LOOK_BODY}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-bp-text/90">
          {FRIDGE_HOMEOWNER_WHERE_TO_LOOK_MANUAL}
        </p>
      </div>
      <div>
        <h2 className={sectionLabel}>{FRIDGE_HOMEOWNER_SECTION_HOW_REPLACEMENT_WORKS}</h2>
        <p className="mt-2 text-sm leading-relaxed text-bp-text/90">
          {FRIDGE_HOMEOWNER_HOW_REPLACEMENT_USUALLY_WORKS}
        </p>
      </div>
      <div>
        <h2 className={sectionLabel}>{FRIDGE_HOMEOWNER_SECTION_WHY_REPLACEMENT_MATTERS}</h2>
        <p className="mt-2 text-sm leading-relaxed text-bp-text/90">
          {FRIDGE_HOMEOWNER_WHY_REPLACEMENT_MATTERS}
        </p>
      </div>
      <div>
        <h2 className={sectionLabel}>{FRIDGE_HOMEOWNER_SECTION_WHAT_TO_COMPARE}</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-bp-text/90">
          {COMPARE_BEFORE_BUY_CHECKLIST_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FridgeHomeownerHelpCollapsible({
  telemetryBase,
}: {
  telemetryBase?: Omit<FridgeTrustFunnelPayload, "event_name" | "filter_slug">;
}) {
  return (
    <FridgeTrustFunnelDetails
      className="rounded-2xl border border-bp-border bg-bp-trust-soft/40 px-4 py-3.5"
      summaryClassName="cursor-pointer select-none text-sm font-medium text-bp-text/90"
      summaryText="Need help finding the filter?"
      payload={{
        event_name: "fridge_help_opened",
        page_type: telemetryBase?.page_type ?? "fridge_model",
        page_slug: telemetryBase?.page_slug ?? "unknown",
        model_slug: telemetryBase?.model_slug ?? null,
        filter_slug: null,
        trust_state: telemetryBase?.trust_state ?? "normal",
        source_tier_present: telemetryBase?.source_tier_present ?? false,
        has_safe_cta: telemetryBase?.has_safe_cta ?? false,
        is_quarantined: telemetryBase?.is_quarantined ?? false,
      }}
    >
      <div className="mt-3 border-t border-bp-border pt-3.5">
        <FridgeHomeownerHelpSectionsInner />
      </div>
    </FridgeTrustFunnelDetails>
  );
}

function storeStatusSentence(status: VisualMatchStorePlainStatus): string {
  if (status === "options_after_checks") {
    return BUCKPARTS_VERIFIED_LINK_WHEN_SHOWN_NOTE;
  }
  return BUCKPARTS_VERIFIED_LINK_NONE_YET;
}

/**
 * Human-first match summary for refrigerator filter / model hubs — recognition over proof jargon.
 */
export function VisualReplacementMatchCard(props: VisualReplacementMatchCardProps) {
  if (props.variant === "fridge_model") {
    const {
      brandName,
      brandSlug,
      modelNumber,
      mappedFilterCount,
      connectedFilters,
      replacementIntervalHint,
      telemetryBase,
    } = props;

    const stepItems = [
      "Find the number on your old filter.",
      mappedFilterCount > 0
        ? "See the same number below? Select it."
        : "When your number appears on this page, select it.",
      "Not sure? Check your owner’s manual first.",
    ];

    return (
      <section
        className="overflow-hidden rounded-3xl border border-bp-border bg-bp-surface p-6 sm:p-8"
        aria-label="Your refrigerator match"
      >
        <div className="min-w-0 space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-bp-muted">
                We found your refrigerator
              </p>
              <h1 className="bp-code text-3xl font-bold tracking-tight text-bp-text sm:text-[2rem]">
                {modelNumber}
              </h1>
              <p className="text-base text-bp-text/90">
                <Link
                  href={`/brand/${brandSlug}`}
                  className="font-semibold text-bp-trust underline decoration-bp-trust/25 underline-offset-4 transition hover:decoration-bp-trust/60"
                >
                  {brandName}
                </Link>
              </p>
              {replacementIntervalHint ? (
                <p className="text-sm leading-relaxed text-bp-muted">{replacementIntervalHint}</p>
              ) : null}
            </div>

            <div>
              <p className="text-sm font-semibold text-bp-text">Next steps</p>
              <ul className="mt-3 list-none space-y-2.5 p-0">
                {stepItems.map((text, i) => (
                  <li
                    key={i}
                    className="flex gap-3.5 rounded-2xl border border-bp-border bg-bp-trust-soft/25 px-4 py-3.5"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-bp-trust/20 bg-bp-trust-soft text-sm font-bold text-bp-trust"
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <p className="m-0 pt-1 text-sm font-medium leading-snug text-bp-text/90">
                      {text}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {connectedFilters.length > 0 ? (
              <FridgeModelConnectedFilterChips
                filters={connectedFilters}
                telemetryBase={telemetryBase}
              />
            ) : null}

            <FridgeHomeownerHelpCollapsible telemetryBase={telemetryBase} />
        </div>
      </section>
    );
  }

  const {
    brandName,
    brandSlug,
    oemPartNumber,
    productName,
    aliases,
    intervalLabel,
    compatibleModelCount,
    storePlainStatus,
    telemetryBase,
  } = props;

  const stepItems = [
    "Compare this number to the one printed on your old filter.",
    "If it matches, use this page.",
    "If you’re not sure, check your owner’s manual or a refrigerator model page below.",
  ];

  return (
    <section
      className="overflow-hidden rounded-3xl border border-bp-border bg-bp-surface p-6 sm:p-8"
      aria-label="Your filter match"
    >
      <div className="min-w-0 space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-bp-muted">We found this filter</p>
            <h1 className="bp-code text-3xl font-bold tracking-tight text-bp-text sm:text-[2rem]">
              {oemPartNumber}
            </h1>
            <p className="text-base text-bp-text/90">
              <Link
                href={`/brand/${brandSlug}`}
                className="font-semibold text-bp-trust underline decoration-bp-trust/25 underline-offset-4 transition hover:decoration-bp-trust/60"
              >
                {brandName}
              </Link>
              <span className="text-bp-muted"> · refrigerator water filter</span>
            </p>
            {productName ? (
              <p className="text-sm leading-relaxed text-bp-muted">{productName}</p>
            ) : null}
            {intervalLabel ? (
              <p className="text-sm leading-relaxed text-bp-muted">{intervalLabel}</p>
            ) : null}
          </div>

          {aliases.length > 0 ? (
            <div className="rounded-2xl border border-bp-border bg-bp-trust-soft/30 px-4 py-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-bp-muted">
                Also printed as
              </p>
              <p className="bp-code mt-1.5 inline-block text-sm font-semibold tracking-wide text-bp-text">
                {aliases.join(" · ")}
              </p>
            </div>
          ) : null}

          <div>
            <p className="text-sm font-semibold text-bp-text">Next steps</p>
            <ul className="mt-3 list-none space-y-2.5 p-0">
              {stepItems.map((text, i) => (
                <li
                  key={i}
                  className="flex gap-3.5 rounded-2xl border border-bp-border bg-bp-trust-soft/25 px-4 py-3.5"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-bp-trust/20 bg-bp-trust-soft text-sm font-bold text-bp-trust"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <p className="m-0 pt-1 text-sm font-medium leading-snug text-bp-text/90">{text}</p>
                </li>
              ))}
            </ul>
          </div>

          <FridgeHomeownerHelpCollapsible telemetryBase={telemetryBase} />

          <p className="text-sm leading-relaxed text-bp-text/90">
            {compatibleModelCount === 0
              ? "We’re still listing refrigerator models that use this filter."
              : `If your refrigerator is in the list below (${compatibleModelCount} listed), you’re in the right place.`}
          </p>

          <p className="text-sm font-medium leading-relaxed text-bp-text">
            {storeStatusSentence(storePlainStatus)}
          </p>
      </div>
    </section>
  );
}

export function deriveFridgeFilterStorePlainStatus(args: {
  gatedLinkCount: number;
  rawLinkCount: number;
  buyerPathShowsStoreButtons: boolean;
}): VisualMatchStorePlainStatus {
  const { gatedLinkCount, rawLinkCount, buyerPathShowsStoreButtons } = args;
  if (buyerPathShowsStoreButtons && gatedLinkCount > 0) return "options_after_checks";
  if (rawLinkCount > 0) return "buttons_hidden_pending_checks";
  return "none_yet";
}
