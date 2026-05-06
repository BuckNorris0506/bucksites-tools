import Link from "next/link";

import type { FridgeMappedFilterRow } from "@/lib/data/fridges";

/**
 * Compact, scannable OEM numbers for the fridge model hub. Not ranked; order matches repo sort only.
 */
export function FridgeModelConnectedFilterChips({ filters }: { filters: FridgeMappedFilterRow[] }) {
  if (filters.length === 0) return null;

  return (
    <section aria-label="Filter numbers connected to this refrigerator" className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Numbers connected to this fridge
      </p>
      <p className="text-xs text-neutral-600 dark:text-neutral-400">
        Not ranked and not interchangeable by default—match what you already have.
      </p>
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.id}
            href={`/filter/${f.slug}`}
            className="inline-flex min-h-9 items-center rounded-full border border-neutral-300 bg-white px-3 py-1.5 font-mono text-sm font-semibold text-neutral-900 shadow-sm transition-colors hover:border-neutral-500 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:border-neutral-500 dark:hover:bg-neutral-900/80"
          >
            {f.oem_part_number}
          </Link>
        ))}
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Order matches our data storage, not a recommendation.
      </p>
    </section>
  );
}
