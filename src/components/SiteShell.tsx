import Link from "next/link";
import { listBrandsForNav } from "@/lib/data/brands";

export async function SiteShell({ children }: { children: React.ReactNode }) {
  let brands: { slug: string; name: string }[] = [];
  try {
    brands = await listBrandsForNav();
  } catch {
    // Missing env or DB during static analysis — shell still renders.
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
          >
            BuckSites Tools
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
            <Link href="/help" className="hover:text-neutral-900 dark:hover:text-neutral-200">
              Help
            </Link>
            {brands.slice(0, 8).map((b) => (
              <Link
                key={b.slug}
                href={`/brand/${b.slug}`}
                className="hover:text-neutral-900 dark:hover:text-neutral-200"
              >
                {b.name}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-neutral-200 bg-neutral-50 py-6 text-center text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-500">
        Free refrigerator water filter finder. Replace filters on schedule for
        better taste and flow.
      </footer>
    </div>
  );
}
