"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BuckPartsBrandHomeLink } from "@/components/brand/BuckPartsBrandLogo";
import {
  HOME_FIND_MY_NUMBER,
  HOME_FOOTER_STATEMENT,
  HOME_HEADER_HOW_WE_WORK,
  HOME_HEADER_HOW_WE_WORK_HREF,
  HOME_NUMBER_HELP_ID,
  OPEN_NUMBER_HELP_EVENT,
} from "@/lib/homepage/homepage-copy";

const shellMax = "max-w-7xl";
const shellPad = "px-5 sm:px-6 lg:px-8";

const primaryNavClass =
  "inline-flex min-h-11 items-center text-[15px] font-semibold text-bp-muted transition-colors hover:text-bp-trust sm:text-base";

const footerLinkClass =
  "font-medium text-bp-trust underline-offset-2 transition-colors hover:underline";

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
      <header
        className={
          isHome
            ? "bp-home-site-header"
            : "border-b border-bp-border border-t-[3px] border-t-bp-trust bg-bp-surface"
        }
      >
        <div className={`mx-auto w-full ${isHome ? "max-w-[1184px] px-5 sm:px-6 lg:px-8" : `${shellMax} ${shellPad}`}`}>
          {isHome ? (
            <div className="bp-home-site-header__inner">
              <BuckPartsBrandHomeLink priority className="bp-home-brand" />
              <nav aria-label="Main navigation" className="bp-home-header-nav">
                <Link href={HOME_HEADER_HOW_WE_WORK_HREF}>{HOME_HEADER_HOW_WE_WORK}</Link>
                <Link
                  href={`/#${HOME_NUMBER_HELP_ID}`}
                  className="bp-home-header-help"
                  onClick={onFindNumberClick}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 1.5-2.5 1.5-2.5 3M12 16v1" />
                  </svg>
                  {HOME_FIND_MY_NUMBER}
                </Link>
              </nav>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 py-3 sm:py-3.5 lg:gap-3 lg:py-4">
              <div className="flex items-center justify-between gap-4">
                <BuckPartsBrandHomeLink className="bp-brand-logo bp-brand-logo--interior" />
                <Link
                  href="/search"
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-bp-trust/20 bg-bp-trust px-4 text-sm font-semibold text-white transition-colors hover:bg-bp-trust/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bp-trust sm:min-h-11 sm:px-5"
                >
                  Search
                </Link>
              </div>
              <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-5 gap-y-1.5 sm:gap-x-7">
                <Link href="/catalog" className={primaryNavClass}>
                  Browse filters
                </Link>
                <Link href="/help" className={primaryNavClass}>
                  Help
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>
      <main
        className={
          isHome
            ? "mx-auto w-full flex-1"
            : `mx-auto w-full flex-1 ${shellMax} ${shellPad} py-6 sm:py-8 lg:py-10`
        }
      >
        {children}
      </main>
      <footer className={isHome ? "bp-home-site-footer" : "border-t border-bp-border bg-bp-surface"}>
        <div
          className={`mx-auto ${isHome ? "max-w-[1184px] px-5 py-8 sm:px-6 lg:px-8" : `${shellMax} ${shellPad} flex flex-col items-center gap-4 py-8 text-sm leading-relaxed text-bp-muted`}`}
        >
          {isHome ? (
            <div className="footer-main">
              <p className="footer-statement">{HOME_FOOTER_STATEMENT}</p>
              <nav aria-label="About and policies" className="footer-nav">
                <Link href="/about">About</Link>
                <Link href="/help">Help</Link>
                <Link href="/truth-policy">Truth policy</Link>
                <Link href="/disclosure">Disclosure</Link>
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
              </nav>
            </div>
          ) : (
            <>
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
              <p className="max-w-2xl text-center">
                BuckParts is not a store. We may earn a commission from some retailer links. Retailers handle checkout,
                shipping and returns.
              </p>
              <p className="max-w-2xl text-center">
                Check your part number first. A BuckParts Verified Link appears only when we can match the retailer
                product page to the filter number—not every filter has one.
              </p>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
