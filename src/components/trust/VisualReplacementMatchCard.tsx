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
import { FridgeModelConnectedFilterChips } from "@/components/fridge/FridgeModelConnectedFilterChips";
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
    };

/** Neutral marker for unknown form-factor models. */
function NeutralApplianceMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 220"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="27" y="10" width="126" height="198" rx="18" fill="currentColor" />
      <rect x="33" y="16" width="114" height="186" rx="14" fill="white" />
      <circle cx="90" cy="106" r="24" fill="currentColor" opacity="0.12" />
      <path d="M90 90V122" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <path d="M74 106H106" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <rect x="66" y="182" width="48" height="6" rx="3" fill="currentColor" opacity="0.28" />
    </svg>
  );
}

/** BuckParts-owned French-door + bottom-freezer visual (no manufacturer artwork). */
function FrenchDoorBottomFreezerGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 190 230"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="95" cy="210" rx="55" ry="8" fill="currentColor" opacity="0.14" />
      <rect x="29" y="14" width="132" height="196" rx="20" fill="currentColor" />
      <rect x="35" y="20" width="120" height="184" rx="16" fill="white" />
      <rect x="35" y="20" width="58" height="122" rx="14" fill="currentColor" opacity="0.06" />
      <rect x="97" y="20" width="58" height="122" rx="14" fill="currentColor" opacity="0.06" />
      <rect x="93" y="20" width="4" height="122" rx="2" fill="currentColor" opacity="0.35" />
      <rect x="35" y="142" width="120" height="62" rx="12" fill="currentColor" opacity="0.1" />
      <rect x="52" y="76" width="4" height="34" rx="2" fill="currentColor" opacity="0.45" />
      <rect x="134" y="76" width="4" height="34" rx="2" fill="currentColor" opacity="0.45" />
      <rect x="82" y="157" width="26" height="4" rx="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function FridgeHomeownerHelpSectionsInner() {
  const sectionLabel = "text-xs font-semibold uppercase tracking-wide text-stone-600";
  return (
    <div className="space-y-4">
      <div>
        <h2 className={sectionLabel}>{FRIDGE_HOMEOWNER_SECTION_WHERE_TO_LOOK}</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          {FRIDGE_HOMEOWNER_WHERE_TO_LOOK_BODY}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          {FRIDGE_HOMEOWNER_WHERE_TO_LOOK_MANUAL}
        </p>
      </div>
      <div>
        <h2 className={sectionLabel}>{FRIDGE_HOMEOWNER_SECTION_HOW_REPLACEMENT_WORKS}</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          {FRIDGE_HOMEOWNER_HOW_REPLACEMENT_USUALLY_WORKS}
        </p>
      </div>
      <div>
        <h2 className={sectionLabel}>{FRIDGE_HOMEOWNER_SECTION_WHY_REPLACEMENT_MATTERS}</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          {FRIDGE_HOMEOWNER_WHY_REPLACEMENT_MATTERS}
        </p>
      </div>
      <div>
        <h2 className={sectionLabel}>{FRIDGE_HOMEOWNER_SECTION_WHAT_TO_COMPARE}</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-stone-700">
          {COMPARE_BEFORE_BUY_CHECKLIST_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FridgeHomeownerHelpCollapsible() {
  return (
    <details className="rounded-2xl bg-stone-50/60 px-4 py-3.5 ring-1 ring-stone-200/30">
      <summary className="cursor-pointer select-none text-sm font-medium text-stone-700">
        Need help finding the filter?
      </summary>
      <div className="mt-3 border-t border-stone-200/60 pt-3.5">
        <FridgeHomeownerHelpSectionsInner />
      </div>
    </details>
  );
}

function storeStatusSentence(status: VisualMatchStorePlainStatus): string {
  if (status === "options_after_checks") {
    return "Store options here are shown only when they pass BuckParts checks.";
  }
  if (status === "buttons_hidden_pending_checks") {
    return "We're not showing store buttons yet — those listings still need to pass BuckParts checks.";
  }
  return "No store option here yet.";
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
      formFactor,
      replacementIntervalHint,
    } = props;

    const stepItems = [
      "Find the number on your old filter.",
      mappedFilterCount > 0
        ? "See the same number below? Select it."
        : "When your number appears on this page, select it.",
      "Not sure? Check your owner’s manual first.",
    ];

    const formFactorVisual =
      formFactor === "french_door_bottom_freezer" ? (
        <div
          className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/50"
          data-form-factor-visual="french_door_bottom_freezer-owned-svg"
        >
          <FrenchDoorBottomFreezerGlyph className="mx-auto h-auto w-[88px] text-blue-950/90 sm:w-[104px]" />
        </div>
      ) : null;

    return (
      <section
        className="overflow-hidden rounded-3xl bg-gradient-to-b from-amber-50/45 via-white to-stone-50/25 p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)] ring-1 ring-stone-200/55 sm:p-8"
        aria-label="Your refrigerator match"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          {formFactorVisual ? <div className="flex shrink-0 justify-center sm:block">{formFactorVisual}</div> : null}
          <div className="min-w-0 flex-1 space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-stone-600">
                We found your refrigerator
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-stone-900 tabular-nums sm:text-[2rem]">
                {modelNumber}
              </h1>
              <p className="text-base text-stone-700">
                <Link
                  href={`/brand/${brandSlug}`}
                  className="font-semibold text-blue-950 underline decoration-blue-950/25 underline-offset-4 transition hover:decoration-blue-950/60"
                >
                  {brandName}
                </Link>
              </p>
              {replacementIntervalHint ? (
                <p className="text-sm leading-relaxed text-stone-600">{replacementIntervalHint}</p>
              ) : null}
            </div>

            <div>
              <p className="text-sm font-semibold text-stone-800">Next steps</p>
              <ul className="mt-3 list-none space-y-2.5 p-0">
                {stepItems.map((text, i) => (
                  <li
                    key={i}
                    className="flex gap-3.5 rounded-2xl bg-white/95 px-4 py-3.5 shadow-sm ring-1 ring-stone-200/40"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-900"
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <p className="m-0 pt-1 text-sm font-medium leading-snug text-stone-800">
                      {text}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {connectedFilters.length > 0 ? (
              <FridgeModelConnectedFilterChips filters={connectedFilters} />
            ) : null}

            <FridgeHomeownerHelpCollapsible />
          </div>
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
  } = props;

  return (
    <section
      className="overflow-hidden rounded-3xl bg-gradient-to-b from-amber-50/35 via-white to-stone-50/20 p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)] ring-1 ring-stone-200/55 sm:p-8"
      aria-label="Your filter match"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="flex shrink-0 justify-center lg:block">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/50">
            <NeutralApplianceMark className="mx-auto h-auto w-[96px] text-blue-950/90 lg:w-[112px]" />
            <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Replacement filter
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              We found this filter
            </p>
            <h1 className="mt-2 font-mono text-3xl font-semibold tracking-tight text-neutral-900 sm:text-[2rem]">
              {oemPartNumber}
            </h1>
            <p className="mt-2 text-sm text-neutral-700">
              <Link
                href={`/brand/${brandSlug}`}
                className="font-medium text-neutral-900 underline-offset-2 hover:underline"
              >
                {brandName}
              </Link>
              <span className="text-neutral-500"> · refrigerator water filter</span>
            </p>
            {productName ? (
              <p className="mt-2 text-sm text-neutral-600">{productName}</p>
            ) : null}
            {intervalLabel ? (
              <p className="mt-2 text-sm text-neutral-600">{intervalLabel}</p>
            ) : null}
          </div>

          {aliases.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Also printed as
              </p>
              <p className="mt-1 font-mono text-sm font-medium text-neutral-900">
                {aliases.join(" · ")}
              </p>
            </div>
          ) : null}

          <FridgeHomeownerHelpCollapsible />

          <p className="text-sm leading-relaxed text-neutral-700">
            {compatibleModelCount === 0
              ? "We're still attaching refrigerator models to this filter."
              : `If your fridge model appears below (${compatibleModelCount} listed), you're on the right track.`}
          </p>

          <p className="text-sm font-medium leading-relaxed text-neutral-800">
            {storeStatusSentence(storePlainStatus)}
          </p>
        </div>
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
