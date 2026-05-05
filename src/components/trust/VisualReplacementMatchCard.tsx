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
      replacementIntervalHint?: string | null;
    };

function FridgeGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 220"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="25" y="8" width="130" height="204" rx="10" fill="currentColor" />
      <rect x="31" y="14" width="118" height="192" rx="8" fill="white" />
      <rect x="31" y="92" width="118" height="2" fill="currentColor" />
      <rect x="119" y="48" width="5" height="28" rx="2.5" fill="currentColor" />
      <rect x="119" y="119" width="5" height="52" rx="2.5" fill="currentColor" />
      <circle cx="90" cy="204" r="4" fill="currentColor" />
    </svg>
  );
}

function FridgeHomeownerHelpSections() {
  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 bg-white px-4 py-4 dark:border-neutral-700 dark:bg-neutral-900/50">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {FRIDGE_HOMEOWNER_SECTION_WHERE_TO_LOOK}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {FRIDGE_HOMEOWNER_WHERE_TO_LOOK_BODY}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {FRIDGE_HOMEOWNER_WHERE_TO_LOOK_MANUAL}
        </p>
      </div>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {FRIDGE_HOMEOWNER_SECTION_HOW_REPLACEMENT_WORKS}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {FRIDGE_HOMEOWNER_HOW_REPLACEMENT_USUALLY_WORKS}
        </p>
      </div>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {FRIDGE_HOMEOWNER_SECTION_WHY_REPLACEMENT_MATTERS}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {FRIDGE_HOMEOWNER_WHY_REPLACEMENT_MATTERS}
        </p>
      </div>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {FRIDGE_HOMEOWNER_SECTION_WHAT_TO_COMPARE}
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {COMPARE_BEFORE_BUY_CHECKLIST_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
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
      replacementIntervalHint,
    } = props;

    return (
      <section
        className="rounded-2xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white p-5 shadow-sm dark:border-neutral-800 dark:from-neutral-950 dark:to-neutral-950 sm:p-6"
        aria-label="Your refrigerator match"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex shrink-0 justify-center sm:block">
            <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
              <FridgeGlyph className="mx-auto h-auto w-[88px] text-neutral-900 dark:text-neutral-100 sm:w-[104px]" />
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              We found this refrigerator model
            </p>
            <h1 className="font-mono text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-[1.65rem]">
              {modelNumber}
            </h1>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              <Link
                href={`/brand/${brandSlug}`}
                className="font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
              >
                {brandName}
              </Link>
            </p>
            {replacementIntervalHint ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{replacementIntervalHint}</p>
            ) : null}
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {mappedFilterCount === 0
                ? "We're still mapping compatible filters for this model."
                : `We match ${mappedFilterCount} compatible filter${mappedFilterCount === 1 ? "" : "s"} below.`}{" "}
              Compare the number printed on your current filter before ordering.
            </p>
            <FridgeHomeownerHelpSections />
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
      className="rounded-2xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white p-5 shadow-sm dark:border-neutral-800 dark:from-neutral-950 dark:to-neutral-950 sm:p-6"
      aria-label="Your filter match"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
        <div className="flex shrink-0 justify-center lg:block">
          <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
            <FridgeGlyph className="mx-auto h-auto w-[96px] text-neutral-900 dark:text-neutral-100 lg:w-[112px]" />
            <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Replacement filter
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              We found this filter
            </p>
            <h1 className="mt-2 font-mono text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-[2rem]">
              {oemPartNumber}
            </h1>
            <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
              <Link
                href={`/brand/${brandSlug}`}
                className="font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
              >
                {brandName}
              </Link>
              <span className="text-neutral-500 dark:text-neutral-400"> · refrigerator water filter</span>
            </p>
            {productName ? (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{productName}</p>
            ) : null}
            {intervalLabel ? (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{intervalLabel}</p>
            ) : null}
          </div>

          {aliases.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Also printed as
              </p>
              <p className="mt-1 font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {aliases.join(" · ")}
              </p>
            </div>
          ) : null}

          <FridgeHomeownerHelpSections />

          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            {compatibleModelCount === 0
              ? "We're still attaching refrigerator models to this filter."
              : `If your fridge model appears below (${compatibleModelCount} listed), you're on the right track.`}
          </p>

          <p className="text-sm font-medium leading-relaxed text-neutral-800 dark:text-neutral-200">
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
