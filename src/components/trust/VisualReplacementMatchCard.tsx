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

/** BuckParts-owned refrigerator water filter cartridge (no product photography). */
function RefrigeratorWaterFilterCartridgeGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 220"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="cart-body" x1="36" y1="28" x2="104" y2="198" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F4F6FA" />
          <stop offset="0.45" stopColor="#E2E8F0" />
          <stop offset="1" stopColor="#C8D0DC" />
        </linearGradient>
        <linearGradient id="cart-cap" x1="40" y1="22" x2="100" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E8EDF4" />
        </linearGradient>
        <linearGradient id="cart-rib" x1="44" y1="92" x2="96" y2="108" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="1" stopColor="#B8C4D4" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="206" rx="44" ry="10" fill="currentColor" opacity="0.1" />
      <rect x="38" y="64" width="64" height="128" rx="22" fill="url(#cart-body)" />
      <rect x="38" y="64" width="64" height="128" rx="22" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2" />
      <path d="M42 118h56" stroke="url(#cart-rib)" strokeWidth="10" strokeLinecap="round" />
      <path d="M42 148h56" stroke="currentColor" strokeOpacity="0.08" strokeWidth="6" strokeLinecap="round" />
      <rect x="44" y="24" width="52" height="48" rx="16" fill="url(#cart-cap)" />
      <rect x="44" y="24" width="52" height="48" rx="16" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
      <ellipse cx="70" cy="36" rx="18" ry="8" fill="white" fillOpacity="0.65" />
      <rect x="62" y="40" width="16" height="10" rx="4" fill="currentColor" fillOpacity="0.2" />
      <path d="M52 78h36" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** BuckParts-owned French-door + bottom-freezer visual (no manufacturer artwork). */
function FrenchDoorBottomFreezerGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 290"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="fridge-shell" x1="44" y1="34" x2="176" y2="246" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8FAFC" />
          <stop offset="0.48" stopColor="#E5EAF1" />
          <stop offset="1" stopColor="#CDD5E0" />
        </linearGradient>
        <linearGradient id="fridge-door-left" x1="56" y1="46" x2="106" y2="186" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E6EBF2" />
        </linearGradient>
        <linearGradient id="fridge-door-right" x1="114" y1="46" x2="164" y2="186" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FCFDFF" />
          <stop offset="1" stopColor="#E3E9F1" />
        </linearGradient>
        <linearGradient id="fridge-drawer" x1="56" y1="188" x2="164" y2="248" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F3F6FB" />
          <stop offset="1" stopColor="#DCE3ED" />
        </linearGradient>
      </defs>

      <ellipse cx="110" cy="266" rx="68" ry="12" fill="currentColor" opacity="0.12" />
      <ellipse cx="110" cy="264" rx="52" ry="9" fill="currentColor" opacity="0.08" />

      <rect x="44" y="30" width="132" height="228" rx="28" fill="url(#fridge-shell)" />
      <rect x="44" y="30" width="132" height="228" rx="28" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />

      <rect x="56" y="44" width="50" height="144" rx="18" fill="url(#fridge-door-left)" />
      <rect x="114" y="44" width="50" height="144" rx="18" fill="url(#fridge-door-right)" />
      <rect x="108" y="44" width="4" height="144" rx="2" fill="currentColor" opacity="0.24" />

      <rect x="56" y="188" width="108" height="58" rx="16" fill="url(#fridge-drawer)" />
      <rect x="56" y="188" width="108" height="58" rx="16" stroke="currentColor" strokeOpacity="0.14" />
      <rect x="90" y="204" width="40" height="5" rx="2.5" fill="currentColor" opacity="0.34" />

      <rect x="72" y="98" width="4" height="38" rx="2" fill="currentColor" opacity="0.34" />
      <rect x="144" y="98" width="4" height="38" rx="2" fill="currentColor" opacity="0.34" />

      <path d="M58 52h18" stroke="white" strokeOpacity="0.72" strokeWidth="2" strokeLinecap="round" />
      <path d="M116 52h18" stroke="white" strokeOpacity="0.68" strokeWidth="2" strokeLinecap="round" />
      <path d="M58 196h24" stroke="white" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
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
    return "When store buttons appear below, we’ve finished our listing review for this part.";
  }
  if (status === "buttons_hidden_pending_checks") {
    return "We’re not showing store buttons yet while we finish reviewing listings for this part.";
  }
  return "We’re not showing a store button on this page yet.";
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
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200/50"
          data-form-factor-visual="french_door_bottom_freezer-owned-svg"
        >
          <FrenchDoorBottomFreezerGlyph className="mx-auto h-auto w-[120px] text-blue-950/90 sm:w-[138px]" />
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

  const stepItems = [
    "Compare this number to the one printed on your old filter.",
    "If it matches, use this page.",
    "If you’re not sure, check your owner’s manual or a refrigerator model page below.",
  ];

  return (
    <section
      className="overflow-hidden rounded-3xl bg-gradient-to-b from-amber-50/45 via-white to-stone-50/25 p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)] ring-1 ring-stone-200/55 sm:p-8"
      aria-label="Your filter match"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <div className="flex shrink-0 justify-center sm:block">
          <div
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200/50"
            data-filter-visual="refrigerator-water-cartridge-owned-svg"
          >
            <RefrigeratorWaterFilterCartridgeGlyph className="mx-auto h-auto w-[88px] text-blue-950/90 sm:w-[100px]" />
            <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-wide text-stone-500">
              Water filter cartridge
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-600">We found this filter</p>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900 tabular-nums sm:text-[2rem]">
              {oemPartNumber}
            </h1>
            <p className="text-base text-stone-700">
              <Link
                href={`/brand/${brandSlug}`}
                className="font-semibold text-blue-950 underline decoration-blue-950/25 underline-offset-4 transition hover:decoration-blue-950/60"
              >
                {brandName}
              </Link>
              <span className="text-stone-600"> · refrigerator water filter</span>
            </p>
            {productName ? (
              <p className="text-sm leading-relaxed text-stone-600">{productName}</p>
            ) : null}
            {intervalLabel ? (
              <p className="text-sm leading-relaxed text-stone-600">{intervalLabel}</p>
            ) : null}
          </div>

          {aliases.length > 0 ? (
            <div className="rounded-2xl bg-white/90 px-4 py-3.5 shadow-sm ring-1 ring-stone-200/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Also printed as
              </p>
              <p className="mt-1.5 text-sm font-semibold tabular-nums tracking-wide text-stone-900">
                {aliases.join(" · ")}
              </p>
            </div>
          ) : null}

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
                  <p className="m-0 pt-1 text-sm font-medium leading-snug text-stone-800">{text}</p>
                </li>
              ))}
            </ul>
          </div>

          <FridgeHomeownerHelpCollapsible />

          <p className="text-sm leading-relaxed text-stone-700">
            {compatibleModelCount === 0
              ? "We’re still listing refrigerator models that use this filter."
              : `If your refrigerator is in the list below (${compatibleModelCount} listed), you’re in the right place.`}
          </p>

          <p className="text-sm font-medium leading-relaxed text-stone-800">
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
