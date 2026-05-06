import Link from "next/link";

import type { PublicRefrigeratorManualEvidence } from "@/lib/manuals/refrigerator-manual-evidence-loader";

export function ManualEvidenceCallout({
  evidence,
}: {
  evidence: PublicRefrigeratorManualEvidence;
}) {
  const primary = evidence.sources[0];
  const hasMultiSource = evidence.sources.length > 1;

  return (
    <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Source-backed help found</h2>
      <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
        Highest tier:{" "}
        <span className="font-medium text-neutral-900 dark:text-neutral-100">{evidence.source_tier_label}</span>
        {primary ? (
          <>
            {" "}
            ·{" "}
            <Link
              href={primary.source_url}
              className="font-medium text-neutral-900 underline underline-offset-2 dark:text-neutral-100"
              rel="nofollow noopener noreferrer"
              target="_blank"
            >
              View primary source
            </Link>
          </>
        ) : null}
      </p>

      <details className="mt-3 rounded-lg border border-neutral-200 bg-white/70 p-3 dark:border-neutral-600 dark:bg-neutral-950/50">
        <summary className="cursor-pointer select-none text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Source list and full notes
        </summary>
        <div className="mt-3 space-y-4 border-t border-neutral-200 pt-3 text-sm dark:border-neutral-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {hasMultiSource ? "Sources" : "Source"}
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-neutral-700 dark:text-neutral-300">
              {evidence.sources.map((source, idx) => (
                <li key={`${idx}-${source.source_url}`}>
                  <Link
                    href={source.source_url}
                    className="underline underline-offset-2"
                    rel="nofollow noopener noreferrer"
                    target="_blank"
                  >
                    {source.source_title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {evidence.filter_location_text ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Where to look for this model
              </p>
              <p className="mt-1 leading-relaxed text-neutral-700 dark:text-neutral-300">
                {evidence.filter_location_text}
              </p>
            </div>
          ) : null}
          {evidence.replacement_steps_summary ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Replacement summary from source
              </p>
              <p className="mt-1 leading-relaxed text-neutral-700 dark:text-neutral-300">
                {evidence.replacement_steps_summary}
              </p>
            </div>
          ) : null}
          {evidence.cautions ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Cautions from source
              </p>
              <p className="mt-1 leading-relaxed text-neutral-700 dark:text-neutral-300">{evidence.cautions}</p>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}
