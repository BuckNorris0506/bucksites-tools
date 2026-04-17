import Link from "next/link";
import { Fragment } from "react";
import { getFridgeWinnerRail } from "@/lib/refrigerator-filter-winner-rails";

export function FridgeWinnerFamilyRail({ currentSlug }: { currentSlug: string }) {
  const rail = getFridgeWinnerRail(currentSlug);
  if (!rail || rail.peers.length === 0) return null;

  return (
    <div className="max-w-2xl space-y-1.5">
      <p className="text-sm leading-snug text-neutral-600 dark:text-neutral-400">{rail.title}</p>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {rail.peers.map((p, i) => (
          <Fragment key={p.slug}>
            {i > 0 ? (
              <span className="mx-1.5 text-neutral-400 dark:text-neutral-500">·</span>
            ) : null}
            <Link
              href={`/filter/${p.slug}`}
              className="font-medium text-neutral-700 underline-offset-2 hover:text-neutral-900 hover:underline dark:text-neutral-300 dark:hover:text-neutral-100"
            >
              {p.label}
            </Link>
          </Fragment>
        ))}
      </p>
    </div>
  );
}
