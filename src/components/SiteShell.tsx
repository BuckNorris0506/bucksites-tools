import Link from "next/link";
import { SiteHeader, SiteMain } from "@/components/SiteHeader";
import { HOME_FOOTER_NOT_A_STORE } from "@/lib/homepage/homepage-copy";

const shellMax = "max-w-7xl";
const shellPad = "px-5 sm:px-6 lg:px-8";

const footerLinkClass =
  "font-medium text-bp-trust underline-offset-2 transition-colors hover:underline";

export async function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bp-bg text-bp-text">
      <SiteHeader />
      <SiteMain>{children}</SiteMain>
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
