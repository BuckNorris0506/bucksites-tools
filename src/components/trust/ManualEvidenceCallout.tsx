import Link from "next/link";

import type { PublicRefrigeratorManualEvidence } from "@/lib/manuals/refrigerator-manual-evidence-loader";

export function ManualEvidenceCallout({
  evidence,
}: {
  evidence: PublicRefrigeratorManualEvidence;
}) {
  const hasMultiSource = evidence.sources.length > 1;
  return (
    <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        Model-specific manual evidence
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        {hasMultiSource ? "Sources" : "Source"}:{" "}
        {evidence.sources.map((source, idx) => (
          <span key={`${source.source_url}-${idx}`}>
            {idx > 0 ? "; " : null}
            <Link
              href={source.source_url}
              className="underline underline-offset-2"
              rel="nofollow noopener noreferrer"
              target="_blank"
            >
              {source.source_title}
            </Link>
          </span>
        ))}
        . Highest source tier: {evidence.source_tier_label}.
      </p>
      {evidence.filter_location_text ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Where to look for this model
          </p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            {evidence.filter_location_text}
          </p>
        </div>
      ) : null}
      {evidence.replacement_steps_summary ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Replacement summary from source
          </p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            {evidence.replacement_steps_summary}
          </p>
        </div>
      ) : null}
      {evidence.cautions ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Cautions from source
          </p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            {evidence.cautions}
          </p>
        </div>
      ) : null}
    </section>
  );
}
