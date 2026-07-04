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

const familyLinkClass =
  "font-medium text-bp-trust underline decoration-bp-trust/30 underline-offset-2 hover:decoration-bp-trust/55";

export function HoneywellHrfFamilyRail({ currentSlug }: { currentSlug: string }) {
  const s = currentSlug.trim().toLowerCase();
  if (!isHoneywellHrfSlug(s)) return null;

  return (
    <div className="max-w-2xl space-y-1.5">
      <p className="text-sm leading-snug text-bp-muted">
        Choose your Honeywell R size:
      </p>
      <p className="text-sm text-bp-muted">
        {HONEYWELL_HRF_SERIES.map((item, i) => (
          <Fragment key={item.slug}>
            {i > 0 ? (
              <span className="mx-1.5 text-bp-muted/70">·</span>
            ) : null}
            {item.slug === s ? (
              <span className="font-semibold text-bp-text">{item.label}</span>
            ) : (
              <Link href={`/air-purifier/filter/${item.slug}`} className={familyLinkClass}>
                {item.label}
              </Link>
            )}
          </Fragment>
        ))}
      </p>
    </div>
  );
}
