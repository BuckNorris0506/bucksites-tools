import type { PartTrustSummary } from "@/lib/trust/part-trust";

function IconBullet() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="mt-[3px] h-3.5 w-3.5 shrink-0 text-neutral-700 dark:text-neutral-300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 8L7.2 9.7L10.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function fitConfidenceLabel(confidence: "high" | "medium" | "unknown"): string {
  if (confidence === "high") return "Fit confidence: strong";
  if (confidence === "medium") return "Fit confidence: review";
  return "Fit confidence: verify";
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
        <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-900 ring-1 ring-inset ring-neutral-300 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-700">
          {fitConfidenceLabel(trust.match_confidence)}
        </span>
        <span className="inline-flex rounded-full bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900">
          OEM part
        </span>
      </div>

      <div className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/50">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Why this fits
        </p>
        <ul className="mt-2 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
          <li className="flex items-start gap-2">
            <IconBullet />
            <span>
              {compatibleModelCount} compatible model
              {compatibleModelCount === 1 ? "" : "s"} in our reference
            </span>
          </li>
          <li className="flex items-start gap-2">
            <IconBullet />
            <span>{hasNotes ? "Notes available" : "No notes listed"}</span>
          </li>
          <li className="flex items-start gap-2">
            <IconBullet />
            <span>
              {trust.buyer_path_state === "suppress_buy"
                ? "Retail links not verified yet"
                : "Retail links passed buy-link checks"}
            </span>
          </li>
        </ul>
      </div>

      <p className="mt-3 text-xs font-medium text-neutral-600 dark:text-neutral-400">
        Model compatibility shown here comes from our reference data.
      </p>

      {trust.requires_manual_verification && (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Do not buy yet until you verify the model number or the part you removed against your
          manual, unit label, or the OEM number on the old part.
        </p>
      )}
    </>
  );
}
