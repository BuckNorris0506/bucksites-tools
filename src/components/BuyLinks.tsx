import Link from "next/link";
import type { RetailerLink } from "@/lib/types/database";

export function BuyLinks({ links }: { links: RetailerLink[] }) {
  if (!links.length) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        No retailer links yet for this filter.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {links.map((link) => (
        <li key={link.id}>
          <Link
            href={`/go/${link.id}`}
            rel="nofollow sponsored"
            className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            {link.retailer_name?.trim() || "Buy online"}
            <span className="ml-2 text-neutral-400" aria-hidden>
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
