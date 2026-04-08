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
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Help articles will appear here once added in Supabase.
        </p>
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
