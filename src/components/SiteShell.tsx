import Link from "next/link";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";

const shellMax = "max-w-7xl";
const shellPad = "px-4 sm:px-6 lg:px-8";

const primaryNavClass =
  "text-[15px] font-semibold text-neutral-900 transition-colors hover:text-neutral-600 dark:text-neutral-100 dark:hover:text-neutral-300 sm:text-base";

export async function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className={`mx-auto w-full ${shellMax} ${shellPad}`}>
          <div className="flex flex-col gap-4 py-5 lg:py-6">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3">
                <span aria-hidden className="grid h-9 w-9 place-items-center">
                  <svg
                    viewBox="0 0 48 48"
                    className="h-9 w-9 text-neutral-900 dark:text-neutral-100"
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
                <span className="text-xl font-semibold tracking-[0.08em] text-neutral-900 dark:text-neutral-50 sm:text-2xl">
                  {SITE_DISPLAY_NAME}
                </span>
              </Link>
              <Link
                href="/search"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-neutral-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
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
              <Link
                href="/help"
                className="text-[15px] font-semibold text-neutral-900 transition-colors hover:text-neutral-600 dark:text-neutral-100 dark:hover:text-neutral-300 sm:text-base"
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
          className={`mx-auto ${shellMax} ${shellPad} flex flex-col items-center gap-4 py-8 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400`}
        >
          <nav
            aria-label="Legal and trust"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] font-medium text-neutral-700 dark:text-neutral-300"
          >
            <Link href="/privacy" className="underline-offset-2 hover:underline">
              Privacy
            </Link>
            <span aria-hidden className="text-neutral-400 dark:text-neutral-600">
              ·
            </span>
            <Link href="/disclosure" className="underline-offset-2 hover:underline">
              Affiliate Disclosure
            </Link>
            <span aria-hidden className="text-neutral-400 dark:text-neutral-600">
              ·
            </span>
            <Link href="/about" className="underline-offset-2 hover:underline">
              About
            </Link>
            <span aria-hidden className="text-neutral-400 dark:text-neutral-600">
              ·
            </span>
            <Link href="/terms" className="underline-offset-2 hover:underline">
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
