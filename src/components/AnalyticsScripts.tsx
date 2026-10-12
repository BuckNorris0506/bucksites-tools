import React from "react";

/**
 * GA4 (direct gtag) page-view bootstrap.
 *
 * Netlify deploy previews share the production measurement id, so the id alone
 * cannot decide whether to measure. Initialize only on the hostname that serves
 * production HTML: buckparts.com. www.buckparts.com is a 301 to that apex and
 * is not a serving host. Every other host — deploy previews, *.netlify.app,
 * localhost, branch hosts — returns before the loader or gtag('config').
 */

export const GA4_PRODUCTION_HOSTNAME = "buckparts.com";
const GA4_LOADER_ORIGIN = "https://www.googletagmanager.com/gtag/js";

export function isGa4ProductionHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  return host === GA4_PRODUCTION_HOSTNAME;
}

export function resolveGaMeasurementId(env: NodeJS.ProcessEnv = process.env): string | null {
  const id = env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id ? id : null;
}

/** Same gtag config as before; the host check runs before the loader and config. */
export function buildGa4InitializerScript(measurementId: string): string {
  const idLiteral = JSON.stringify(measurementId);
  const hostLiteral = JSON.stringify(GA4_PRODUCTION_HOSTNAME);
  return `
(function () {
  var host = String((window.location && window.location.hostname) || "").trim().toLowerCase().replace(/\\.$/, "");
  if (host !== ${hostLiteral}) return;
  var loader = document.createElement("script");
  loader.async = true;
  loader.src = ${JSON.stringify(GA4_LOADER_ORIGIN)} + "?id=" + encodeURIComponent(${idLiteral});
  var anchor = document.getElementsByTagName("script")[0];
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(loader, anchor);
  else (document.head || document.documentElement).appendChild(loader);
  window.dataLayer = window.dataLayer || [];
  function gtag(){window.dataLayer.push(arguments);}
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', ${idLiteral}, { send_page_view: true });
})();
  `.trim();
}

export function AnalyticsScripts() {
  const gaId = resolveGaMeasurementId();
  if (!gaId) return null;

  return (
    <script
      id="buckparts-ga4"
      dangerouslySetInnerHTML={{ __html: buildGa4InitializerScript(gaId) }}
    />
  );
}
