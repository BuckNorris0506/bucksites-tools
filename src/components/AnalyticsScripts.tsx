import Script from "next/script";

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

/**
 * Optional GA4 (page views, landing pages, traffic sources in the GA UI).
 * Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` (e.g. G-XXXXXXXXXX) in production.
 */
export function AnalyticsScripts() {
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="buckparts-ga4" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { send_page_view: true });
        `.trim()}
      </Script>
    </>
  );
}
