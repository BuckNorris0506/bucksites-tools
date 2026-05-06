import Link from "next/link";

import type { PublicRefrigeratorManualEvidence } from "@/lib/manuals/refrigerator-manual-evidence-loader";

function CheckBadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
        className="fill-emerald-100 dark:fill-emerald-900/50"
      />
      <path
        d="M8.5 12.5 11 15l4.5-4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-emerald-800 dark:text-emerald-200"
      />
    </svg>
  );
}

export function ManualEvidenceCallout({
  evidence,
}: {
  evidence: PublicRefrigeratorManualEvidence;
}) {
  const primary = evidence.sources[0];
  const hasMultiSource = evidence.sources.length > 1;

  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50/80 via-white to-stone-50/35 p-6 shadow-sm ring-1 ring-emerald-200/45 dark:from-emerald-950/25 dark:via-neutral-900 dark:to-neutral-900 dark:ring-emerald-800/35 sm:p-7">
      <div className="flex flex-wrap items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-emerald-200/50 dark:bg-neutral-800/70 dark:ring-emerald-700/40"
          aria-hidden
        >
          <CheckBadgeIcon className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-50">Source-backed help found</h2>
            <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              Extra guidance from documentation we&apos;ve reviewed—open the source if you want to read it yourself.
            </p>
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-stone-700 dark:text-stone-200">
            <span className="text-stone-600 dark:text-stone-400">Source strength in our files:</span>
            <span className="inline-flex rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-stone-800 shadow-sm ring-1 ring-stone-200/60 dark:bg-neutral-800/90 dark:text-stone-100 dark:ring-stone-600/50">
              {evidence.source_tier_label}
            </span>
            {primary ? (
              <>
                <span className="text-stone-300 dark:text-stone-600" aria-hidden>
                  ·
                </span>
                <Link
                  href={primary.source_url}
                  className="font-semibold text-blue-950 underline decoration-blue-950/25 underline-offset-4 transition hover:decoration-blue-950/60 dark:text-blue-300 dark:decoration-blue-400/30 dark:hover:decoration-blue-300/70"
                  rel="nofollow noopener noreferrer"
                  target="_blank"
                >
                  View primary source
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <details className="mt-5 rounded-2xl bg-white/85 px-4 py-4 ring-1 ring-stone-200/40 dark:bg-neutral-800/40 dark:ring-stone-600/30">
        <summary className="cursor-pointer select-none text-sm font-medium text-stone-800 dark:text-stone-100">
          Source list and full notes
        </summary>
        <div className="mt-4 space-y-4 border-t border-stone-200/70 pt-4 text-sm dark:border-stone-600/40">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-400">
              {hasMultiSource ? "Sources" : "Source"}
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-stone-700 dark:text-stone-300">
              {evidence.sources.map((source, idx) => (
                <li key={`${idx}-${source.source_url}`}>
                  <Link
                    href={source.source_url}
                    className="font-medium text-blue-950 underline decoration-blue-950/20 underline-offset-2 hover:decoration-blue-950/50 dark:text-blue-300 dark:decoration-blue-400/25 dark:hover:decoration-blue-300/60"
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
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-400">
                Where to look for this model
              </p>
              <p className="mt-1 leading-relaxed text-stone-700 dark:text-stone-300">
                {evidence.filter_location_text}
              </p>
            </div>
          ) : null}
          {evidence.replacement_steps_summary ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-400">
                Replacement summary from source
              </p>
              <p className="mt-1 leading-relaxed text-stone-700 dark:text-stone-300">
                {evidence.replacement_steps_summary}
              </p>
            </div>
          ) : null}
          {evidence.cautions ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-400">
                Cautions from source
              </p>
              <p className="mt-1 leading-relaxed text-stone-700 dark:text-stone-300">{evidence.cautions}</p>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}
