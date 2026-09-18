"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";
import { HOME_FOOTER_NOT_A_STORE } from "@/lib/homepage/homepage-copy";
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

const footerLinkClass =
  "font-medium text-bp-trust underline-offset-2 transition-colors hover:underline";

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
          <path d="M16 24L24 40L32 24L24 18L16 24Z" fill="currentColor" />
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-[0.08em] text-bp-text sm:text-xl">
        {SITE_DISPLAY_NAME}
      </span>
    </Link>
  );
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  function onFindNumberClick() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(OPEN_NUMBER_HELP_EVENT));
  }

  return (
    <div
      className={`flex min-h-screen flex-col bg-bp-bg text-bp-text${isHome ? " bp-home-shell" : ""}`}
    >
      <header className="border-b border-bp-border border-t-[3px] border-t-bp-trust bg-bp-surface">
        <div className={`mx-auto w-full ${shellMax} ${shellPad}`}>
          <div
            className={
              isHome
                ? "flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                : "flex flex-col gap-2.5 py-3 sm:py-3.5 lg:gap-3 lg:py-4"
            }
          >
            <div className="flex items-center justify-between gap-4">
              <BrandMark />
              {isHome ? (
                <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-5 gap-y-1">
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
      <main
        className={
          isHome
            ? `mx-auto w-full flex-1 ${shellMax} ${shellPad} py-3 sm:py-4`
            : `mx-auto w-full flex-1 ${shellMax} ${shellPad} py-6 sm:py-8 lg:py-10`
        }
      >
        {children}
      </main>
      <footer className="border-t border-bp-border bg-bp-surface">
        <div
          className={`mx-auto ${shellMax} ${shellPad} flex flex-col items-center gap-4 py-8 text-sm leading-relaxed text-bp-muted`}
        >
          <nav
            aria-label="Legal and trust"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] text-bp-text"
          >
            <Link href="/about" className={footerLinkClass}>
              About
            </Link>
            <span aria-hidden className="text-bp-border">
              ·
            </span>
            <Link href="/help" className={footerLinkClass}>
              Help / Contact
            </Link>
            <span aria-hidden className="text-bp-border">
              ·
            </span>
            <Link href="/truth-policy" className={footerLinkClass}>
              Truth Policy
            </Link>
            <span aria-hidden className="text-bp-border">
              ·
            </span>
            <Link href="/privacy" className={footerLinkClass}>
              Privacy
            </Link>
            <span aria-hidden className="text-bp-border">
              ·
            </span>
            <Link href="/terms" className={footerLinkClass}>
              Terms
            </Link>
            <span aria-hidden className="text-bp-border">
              ·
            </span>
            <Link href="/disclosure" className={footerLinkClass}>
              Affiliate Disclosure
            </Link>
            <span aria-hidden className="text-bp-border">
              ·
            </span>
            <Link href="/wrong-part-prevention" className={footerLinkClass}>
              Wrong-part prevention
            </Link>
          </nav>
          <p className="max-w-2xl text-center">{HOME_FOOTER_NOT_A_STORE}</p>
          <p className="max-w-2xl text-center">
            Check your part number first. A BuckParts Verified Link appears only when we can match the
            retailer product page to the filter number—not every filter has one.
          </p>
        </div>
      </footer>
    </div>
  );
}
