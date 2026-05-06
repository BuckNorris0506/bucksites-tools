import React from "react";
import Link from "next/link";

import type { FridgeMappedFilterRow } from "@/lib/data/fridges";

/**
 * Compact, scannable OEM numbers for the fridge model hub — compare only; list order is not a ranking.
 */
export function FridgeModelConnectedFilterChips({ filters }: { filters: FridgeMappedFilterRow[] }) {
  if (filters.length === 0) return null;

  return (
    <section
      aria-label="Filter numbers to compare for this refrigerator"
      className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-stone-200/45 dark:bg-slate-900/40 dark:ring-slate-500/30 sm:p-7"
    >
      <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Numbers to compare</p>
      <p className="mt-2 text-sm leading-snug text-stone-600 dark:text-stone-400">
        Not sorted as best to worst.
      </p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {filters.map((f) => (
          <Link
            key={f.id}
            href={`/filter/${f.slug}`}
            className="inline-flex min-h-11 items-center rounded-2xl bg-gradient-to-b from-stone-50 to-white px-4 py-2.5 text-base font-semibold tracking-wide text-stone-900 shadow-sm ring-1 ring-stone-200/55 transition hover:-translate-y-0.5 hover:from-blue-50/95 hover:to-sky-50/80 hover:shadow-md hover:ring-blue-200/55 active:translate-y-0 dark:from-slate-900/75 dark:to-slate-900/95 dark:text-stone-100 dark:ring-slate-500/35 dark:hover:from-slate-800/95 dark:hover:to-slate-900/95 dark:hover:ring-blue-700/35"
          >
            {f.oem_part_number}
          </Link>
        ))}
      </div>
      <p className="mt-4 text-sm leading-snug text-stone-600 dark:text-stone-400">
        Do not guess. Match the number printed on your old filter.
      </p>
    </section>
  );
}
