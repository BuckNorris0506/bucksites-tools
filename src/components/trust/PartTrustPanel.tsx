import type { PartTrustSummary } from "@/lib/trust/part-trust";

function labelForConfidence(confidence: PartTrustSummary["match_confidence"]): string {
  if (confidence === "high") return "Fit confidence: high";
  if (confidence === "medium") return "Fit confidence: caution";
  return "Fit confidence: unknown";
}

function badgeClass(confidence: PartTrustSummary["match_confidence"]): string {
  if (confidence === "high") {
    return "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900";
  }
  if (confidence === "medium") {
    return "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-900";
  }
  return "bg-red-50 text-red-900 ring-1 ring-inset ring-red-200 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-900";
}

export function PartTrustPanel({
  trust,
}: {
  trust: PartTrustSummary;
}) {
  return (
    <section className="mt-6 space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(trust.match_confidence)}`}>
          {labelForConfidence(trust.match_confidence)}
        </span>
        <span className="inline-flex rounded-full bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900">
          {trust.oem_or_compatible === "oem" ? "OEM part" : "Compatible part"}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        {trust.replacement_reasoning_summary}
      </p>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Why this fits
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
          {trust.evidence_notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>

      {trust.requires_manual_verification && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Do not buy yet until you verify the model number or the part you removed against your
          manual, unit label, or the OEM number on the old part.
        </p>
      )}
    </section>
  );
}
