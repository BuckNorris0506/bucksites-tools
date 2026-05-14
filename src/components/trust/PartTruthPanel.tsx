import React from "react";
import {
  buyPathStoreLinksBullet,
  partIdentityPillLabel,
} from "@/lib/copy/public-trust";
import type { PartTrustSummary } from "@/lib/trust/part-trust";

function IconBullet() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="mt-[3px] h-3.5 w-3.5 shrink-0 text-bp-muted"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 8L7.2 9.7L10.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function fitConfidenceLabel(confidence: "high" | "medium" | "unknown"): string {
  if (confidence === "high") return "Fit: numbers line up well on file";
  if (confidence === "medium") return "Fit: compare once more on your unit";
  return "Fit: confirm using your old part or manual";
}

function fitConfidencePillClass(confidence: "high" | "medium" | "unknown"): string {
  if (confidence === "high") {
    return "inline-flex rounded-full border border-bp-success/35 bg-bp-success-soft px-2.5 py-1 text-xs font-semibold text-bp-success";
  }
  if (confidence === "medium") {
    return "inline-flex rounded-full border border-bp-caution/35 bg-bp-caution-soft px-2.5 py-1 text-xs font-semibold text-bp-caution";
  }
  return "inline-flex rounded-full border border-bp-border bg-bp-code-bg px-2.5 py-1 text-xs font-semibold text-bp-text";
}

/**
 * Presentational trust chrome for refrigerator filter (and future) detail pages.
 * Markup and copy mirror `src/app/filter/[slug]/page.tsx` as of extraction.
 */
export function PartTruthPanel({
  trust,
  compatibleModelCount,
  hasNotes,
}: {
  trust: PartTrustSummary;
  compatibleModelCount: number;
  hasNotes: boolean;
}) {
  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className={fitConfidencePillClass(trust.match_confidence)}>
          {fitConfidenceLabel(trust.match_confidence)}
        </span>
        <span className="inline-flex rounded-full border border-bp-trust/25 bg-bp-trust px-2.5 py-1 text-xs font-semibold text-white">
          {partIdentityPillLabel(trust.oem_or_compatible)}
        </span>
      </div>

      {trust.replacement_reasoning_summary.trim() ? (
        <p className="mt-4 text-sm leading-relaxed text-bp-text/90">
          {trust.replacement_reasoning_summary}
        </p>
      ) : null}

      <div className="mt-5 rounded-lg border border-bp-border bg-bp-surface px-4 py-3 shadow-none">
        <p className="text-xs font-medium uppercase tracking-wide text-bp-muted">
          Why this fits
        </p>
        <ul className="mt-2 space-y-2 text-sm text-bp-text/90">
          <li className="flex items-start gap-2">
            <IconBullet />
            <span>
              {compatibleModelCount} compatible model
              {compatibleModelCount === 1 ? "" : "s"} on file for this part number
            </span>
          </li>
          <li className="flex items-start gap-2">
            <IconBullet />
            <span>{hasNotes ? "Notes available" : "No notes listed"}</span>
          </li>
          <li className="flex items-start gap-2">
            <IconBullet />
            <span>
              {buyPathStoreLinksBullet(trust.buyer_path_state === "suppress_buy")}
            </span>
          </li>
        </ul>
      </div>

      <p className="mt-3 text-xs font-medium text-bp-muted">
        Model lists here reflect what we have on file for this part number—not every unit ever sold.
      </p>

      {trust.requires_manual_verification && (
        <p className="mt-4 rounded-md border border-bp-caution/40 bg-bp-caution-soft px-3 py-2 text-sm leading-relaxed text-bp-caution">
          Do not buy yet until you verify the model number or the part you removed against your
          manual, unit label, or the part number on the old part.
        </p>
      )}
    </>
  );
}
