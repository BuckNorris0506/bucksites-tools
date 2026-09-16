import type { Metadata } from "next";
import Link from "next/link";
import { listHelpPages } from "@/lib/data/help";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Help",
  description: "Guides for refrigerator water filters and reset indicators.",
};

export default async function HelpIndexPage() {
  let pages: Awaited<ReturnType<typeof listHelpPages>> = [];
  try {
    pages = await listHelpPages();
  } catch {
    pages = [];
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        Help
      </h1>
      {pages.length === 0 ? (
        <div className="max-w-xl space-y-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          <p>
            Start with the model number on the appliance sticker or the part
            number on the old filter. Search accepts either.
          </p>
          <p>
            If you cannot find a number, look inside the refrigerator, on the
            filter housing, or in the owner’s manual. Do not guess from a photo
            or a “fits most” listing.
          </p>
          <p>
            <Link
              href="/search"
              className="font-medium text-neutral-900 underline underline-offset-2 dark:text-neutral-100"
            >
              Search a model or part number
            </Link>
            <span aria-hidden> · </span>
            <Link
              href="/wrong-part-prevention"
              className="font-medium text-neutral-900 underline underline-offset-2 dark:text-neutral-100"
            >
              How BuckParts avoids the wrong part
            </Link>
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {pages.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/help/${p.slug}`}
                className="text-neutral-900 underline dark:text-neutral-100"
              >
                {p.title}
              </Link>
              {p.meta_description && (
                <p className="text-sm text-neutral-500">{p.meta_description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
