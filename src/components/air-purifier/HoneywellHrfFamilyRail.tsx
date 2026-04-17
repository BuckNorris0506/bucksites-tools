import Link from "next/link";
import { Fragment } from "react";

const HONEYWELL_HRF_SERIES = [
  { slug: "honeywell-hrf-r1", label: "R1" },
  { slug: "honeywell-hrf-r2", label: "R2" },
  { slug: "honeywell-hrf-r3", label: "R3" },
] as const;

export function isHoneywellHrfSlug(slug: string): boolean {
  return HONEYWELL_HRF_SERIES.some((s) => s.slug === slug.trim().toLowerCase());
}

export function HoneywellHrfFamilyRail({ currentSlug }: { currentSlug: string }) {
  const s = currentSlug.trim().toLowerCase();
  if (!isHoneywellHrfSlug(s)) return null;

  return (
    <div className="max-w-2xl space-y-1.5">
      <p className="text-sm leading-snug text-neutral-600 dark:text-neutral-400">
        Choose your Honeywell R size:
      </p>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {HONEYWELL_HRF_SERIES.map((item, i) => (
          <Fragment key={item.slug}>
            {i > 0 ? (
              <span className="mx-1.5 text-neutral-400 dark:text-neutral-500">·</span>
            ) : null}
            {item.slug === s ? (
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{item.label}</span>
            ) : (
              <Link
                href={`/air-purifier/filter/${item.slug}`}
                className="font-medium text-neutral-700 underline-offset-2 hover:text-neutral-900 hover:underline dark:text-neutral-300 dark:hover:text-neutral-100"
              >
                {item.label}
              </Link>
            )}
          </Fragment>
        ))}
      </p>
    </div>
  );
}
