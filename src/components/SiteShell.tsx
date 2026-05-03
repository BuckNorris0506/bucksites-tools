import Link from "next/link";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";

const shellMax = "max-w-7xl";
const shellPad = "px-4 sm:px-6 lg:px-8";

/** Primary nav: slate body, navy on hover — same language as homepage links */
const primaryNavClass =
  "text-[15px] font-semibold text-slate-700 transition-colors hover:text-blue-950 dark:text-slate-300 dark:hover:text-white sm:text-base";

const footerLinkClass =
  "font-medium text-blue-950 underline-offset-2 transition-colors hover:text-blue-900 hover:underline dark:text-blue-300 dark:hover:text-blue-200";

export async function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 border-t-[3px] border-t-blue-950 bg-white dark:border-slate-800 dark:border-t-blue-800 dark:bg-slate-950">
        <div className={`mx-auto w-full ${shellMax} ${shellPad}`}>
          <div className="flex flex-col gap-4 py-5 lg:py-6">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3">
                <span aria-hidden className="grid h-9 w-9 place-items-center">
                  <svg
                    viewBox="0 0 48 48"
                    className="h-9 w-9 text-blue-950 dark:text-blue-400"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14 8L10 16L16 20L20 14L24 20L28 14L32 20L38 16L34 8"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                    />
                    <path
                      d="M16 24L24 40L32 24L24 18L16 24Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <span className="text-xl font-semibold tracking-[0.08em] text-slate-900 dark:text-slate-50 sm:text-2xl">
                  {SITE_DISPLAY_NAME}
                </span>
              </Link>
              <Link
                href="/search"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-blue-950 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:bg-blue-900 dark:shadow-none dark:hover:bg-blue-800"
              >
                Search
              </Link>
            </div>

            <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:gap-x-8">
              <Link href="/search" className={primaryNavClass}>
                Search
              </Link>
              <Link href="/catalog" className={primaryNavClass}>
                Browse filters
              </Link>
              <Link href="/help" className={primaryNavClass}>
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
      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div
          className={`mx-auto ${shellMax} ${shellPad} flex flex-col items-center gap-4 py-8 text-sm leading-relaxed text-slate-600 dark:text-slate-400`}
        >
          <nav
            aria-label="Legal and trust"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] text-slate-700 dark:text-slate-300"
          >
            <Link href="/privacy" className={footerLinkClass}>
              Privacy
            </Link>
            <span aria-hidden className="text-slate-300 dark:text-slate-600">
              ·
            </span>
            <Link href="/disclosure" className={footerLinkClass}>
              Affiliate Disclosure
            </Link>
            <span aria-hidden className="text-slate-300 dark:text-slate-600">
              ·
            </span>
            <Link href="/about" className={footerLinkClass}>
              About
            </Link>
            <span aria-hidden className="text-slate-300 dark:text-slate-600">
              ·
            </span>
            <Link href="/terms" className={footerLinkClass}>
              Terms
            </Link>
          </nav>
          <p className="max-w-2xl text-center">
            Check your part number first. We only show store links we can match to your exact filter
            code.
          </p>
        </div>
      </footer>
    </div>
  );
}
