"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";
import {
  HOME_FIND_MY_NUMBER,
  HOME_HOW_WE_CHECK_FIT,
  HOME_HOW_WE_CHECK_FIT_HREF,
  HOME_NUMBER_HELP_ID,
  OPEN_NUMBER_HELP_EVENT,
} from "@/lib/homepage/homepage-copy";

const shellMax = "max-w-7xl";
const shellPad = "px-5 sm:px-6 lg:px-8";

const primaryNavClass =
  "inline-flex min-h-11 items-center text-[15px] font-semibold text-bp-muted transition-colors hover:text-bp-trust sm:text-base";

function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 sm:gap-3">
      <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center sm:h-9 sm:w-9">
        <svg
          viewBox="0 0 48 48"
          className="h-8 w-8 text-bp-logo sm:h-9 sm:w-9"
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
      <span className="text-lg font-semibold tracking-[0.08em] text-bp-text sm:text-xl">
        {SITE_DISPLAY_NAME}
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  function onFindNumberClick() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(OPEN_NUMBER_HELP_EVENT));
  }

  return (
    <header className="border-b border-bp-border border-t-[3px] border-t-bp-trust bg-bp-surface">
      <div className={`mx-auto w-full ${shellMax} ${shellPad}`}>
        <div
          className={
            isHome
              ? "flex items-center justify-between gap-4 py-2.5 sm:py-3"
              : "flex flex-col gap-2.5 py-3 sm:py-3.5 lg:gap-3 lg:py-4"
          }
        >
          <div className="flex items-center justify-between gap-4">
            <BrandMark />
            {isHome ? (
              <nav aria-label="Primary" className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1">
                <Link href={HOME_HOW_WE_CHECK_FIT_HREF} className={primaryNavClass}>
                  {HOME_HOW_WE_CHECK_FIT}
                </Link>
                <Link
                  href={`/#${HOME_NUMBER_HELP_ID}`}
                  className={primaryNavClass}
                  onClick={onFindNumberClick}
                >
                  {HOME_FIND_MY_NUMBER}
                </Link>
              </nav>
            ) : (
              <Link
                href="/search"
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-bp-trust/20 bg-bp-trust px-4 text-sm font-semibold text-white transition-colors hover:bg-bp-trust/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bp-trust sm:min-h-11 sm:px-5"
              >
                Search
              </Link>
            )}
          </div>

          {isHome ? null : (
            <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-5 gap-y-1.5 sm:gap-x-7">
              <Link href="/catalog" className={primaryNavClass}>
                Browse filters
              </Link>
              <Link href="/help" className={primaryNavClass}>
                Help
              </Link>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const shellMaxInner = "max-w-7xl";
  const shellPadInner = "px-5 sm:px-6 lg:px-8";
  return (
    <main
      className={
        isHome
          ? `mx-auto w-full flex-1 ${shellMaxInner} ${shellPadInner} py-4 sm:py-5 lg:py-5`
          : `mx-auto w-full flex-1 ${shellMaxInner} ${shellPadInner} py-6 sm:py-8 lg:py-10`
      }
    >
      {children}
    </main>
  );
}
