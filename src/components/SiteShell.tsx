import Link from "next/link";
import { catalogHasAnyPopulatedCategory } from "@/lib/catalog/catalog-availability";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";

const shellMax = "max-w-7xl";
const shellPad = "px-4 sm:px-6 lg:px-8";

const primaryNavClass =
  "text-[15px] font-semibold text-neutral-900 transition-colors hover:text-neutral-600 dark:text-neutral-100 dark:hover:text-neutral-300 sm:text-base";

const secondaryNavClass =
  "text-[15px] font-medium text-neutral-700 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white sm:text-base";

export async function SiteShell({ children }: { children: React.ReactNode }) {
  let showCatalog = false;
  try {
    showCatalog = await catalogHasAnyPopulatedCategory();
  } catch {
    showCatalog = false;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className={`mx-auto w-full ${shellMax} ${shellPad}`}>
          <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between lg:py-6">
            <Link
              href="/"
              className="shrink-0 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-[1.65rem] sm:leading-tight"
            >
              {SITE_DISPLAY_NAME}
            </Link>

            <nav
              aria-label="Primary"
              className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:justify-end sm:gap-x-8"
            >
              <Link href="/search" className={primaryNavClass}>
                Search
              </Link>
              {showCatalog && (
                <Link href="/catalog" className={secondaryNavClass}>
                  Catalog
                </Link>
              )}
              <Link
                href="/help"
                className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100 sm:text-[15px]"
              >
                Help
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main
        className={`mx-auto w-full flex-1 ${shellMax} ${shellPad} py-8 sm:py-10 lg:py-12`}
      >
        {children}
      </main>
      <footer className="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
        <div
          className={`mx-auto ${shellMax} ${shellPad} py-8 text-center text-sm leading-relaxed text-neutral-600 dark:text-neutral-400`}
        >
          Replacement part lookup: confirm fit and timing, then shop via linked retailers where
          available.
        </div>
      </footer>
    </div>
  );
}
