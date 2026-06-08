import Script from "next/script";

/** BuckParts production Grow Faves site id (Mediavine dashboard). */
export const GROW_FAVES_DEFAULT_SITE_ID_V1 =
  "U2l0ZToyZDhhODA4NS1hYzY4LTQ2ZWEtODcwZi1kOTJmYTM2ZGMyMjI=" as const;

/**
 * Optional Grow by Mediavine (Faves) bookmark monetization.
 * Set `NEXT_PUBLIC_GROW_FAVES_SITE_ID` in production, or rely on the
 * committed default site id when `NODE_ENV=production`.
 */
export function resolveGrowFavesSiteId(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_GROW_FAVES_SITE_ID?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    return GROW_FAVES_DEFAULT_SITE_ID_V1;
  }
  return null;
}

function buildGrowInitializerSnippet(siteId: string): string {
  return `!(function(){window.growMe||((window.growMe=function(e){window.growMe._.push(e);}),(window.growMe._=[]));var e=document.createElement("script");(e.type="text/javascript"),(e.src="https://faves.grow.me/main.js"),(e.defer=!0),e.setAttribute("data-grow-faves-site-id","${siteId}");var t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t);})();`;
}

export function GrowScripts() {
  const siteId = resolveGrowFavesSiteId();
  if (!siteId) return null;

  return (
    <Script
      id="grow-me-initializer"
      strategy="afterInteractive"
      data-grow-initializer=""
      dangerouslySetInnerHTML={{ __html: buildGrowInitializerSnippet(siteId) }}
    />
  );
}
