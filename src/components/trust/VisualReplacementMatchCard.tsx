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
  FRIDGE_MODEL_PDP_CARTRIDGE_CONFIRMATION,
} from "@/lib/copy/buckparts-verified-link-copy";
import { FridgeTrustFunnelDetails } from "@/components/analytics/FridgeTrustFunnelDetails";
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

export function FridgeHomeownerHelpCollapsible({
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

const fieldLabel = "text-xs font-semibold uppercase tracking-wide text-bp-muted";

/**
 * Human-first match summary for refrigerator filter / model hubs — recognition over proof jargon.
 */
export function VisualReplacementMatchCard(props: VisualReplacementMatchCardProps) {
  if (props.variant === "fridge_model") {
    const {
      brandName,
      brandSlug,
      modelNumber,
      connectedFilters,
      replacementIntervalHint,
    } = props;

    const primary = connectedFilters[0];
    const aliases = (primary?.also_known_as ?? []).filter(Boolean);
    const numbersAbove: string[] = [];
    if (primary?.oem_part_number) numbersAbove.push(primary.oem_part_number);
    for (const a of aliases) {
      if (!numbersAbove.includes(a)) numbersAbove.push(a);
    }

    return (
      <section
        className="overflow-hidden rounded-3xl border border-bp-border bg-bp-surface p-6 sm:p-8"
        aria-label="Replacement filter for your model"
      >
        <div className="min-w-0 space-y-6">
          <div className="space-y-1.5">
            <p className={fieldLabel}>Your model</p>
            <p className="text-base text-bp-text/90">
              <Link
                href={`/brand/${brandSlug}`}
                className="font-semibold text-bp-trust underline decoration-bp-trust/25 underline-offset-4 transition hover:decoration-bp-trust/60"
              >
                {brandName}
              </Link>
            </p>
            <h1 className="bp-code text-3xl font-bold tracking-tight text-bp-text sm:text-[2rem]">
              {modelNumber}
            </h1>
            {replacementIntervalHint ? (
              <p className="text-sm leading-relaxed text-bp-muted">{replacementIntervalHint}</p>
            ) : null}
          </div>

          {primary ? (
            <>
              <div className="space-y-1.5 border-t border-bp-border pt-5">
                <p className={fieldLabel}>Your replacement filter</p>
                {primary.name?.trim() ? (
                  <p className="text-lg font-semibold text-bp-text">{primary.name.trim()}</p>
                ) : null}
                <p className="bp-code text-2xl font-bold tracking-tight text-bp-text">
                  {primary.oem_part_number}
                </p>
              </div>

              {aliases.length > 0 ? (
                <div className="rounded-2xl border border-bp-border bg-bp-trust-soft/30 px-4 py-3.5">
                  <p className={fieldLabel}>Also listed as</p>
                  <p className="bp-code mt-1.5 text-sm font-semibold tracking-wide text-bp-text">
                    {aliases.join(" · ")}
                  </p>
                </div>
              ) : null}

              <p className="text-sm font-medium leading-relaxed text-bp-text">
                {FRIDGE_MODEL_PDP_CARTRIDGE_CONFIRMATION}
              </p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-bp-muted">
              We do not have mapped filter numbers for this model in our reference yet.
            </p>
          )}

          {connectedFilters.length > 1 ? (
            <p className="text-sm text-bp-muted">
              This model has {connectedFilters.length} listed filter numbers—see full detail below.
            </p>
          ) : null}
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
    storePlainStatus: _storePlainStatus,
  } = props;
  void _storePlainStatus;

  return (
    <section
      className="overflow-hidden rounded-3xl border border-bp-border bg-bp-surface p-6 sm:p-8"
      aria-label="This filter part"
    >
      <div className="min-w-0 space-y-5">
        <div className="space-y-2">
          <p className={fieldLabel}>This part</p>
          {productName ? (
            <p className="text-lg font-semibold text-bp-text">{productName}</p>
          ) : null}
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
          {intervalLabel ? (
            <p className="text-sm leading-relaxed text-bp-muted">{intervalLabel}</p>
          ) : null}
        </div>

        {aliases.length > 0 ? (
          <div className="rounded-2xl border border-bp-border bg-bp-trust-soft/30 px-4 py-3.5">
            <p className={fieldLabel}>Also listed as</p>
            <p className="bp-code mt-1.5 text-sm font-semibold tracking-wide text-bp-text">
              {aliases.join(" · ")}
            </p>
          </div>
        ) : null}
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
