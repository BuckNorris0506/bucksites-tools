type SiteUrlEnv = {
  NODE_ENV?: string;
  NEXT_PUBLIC_SITE_URL?: string;
};

const LOCALHOST_FALLBACK = "http://localhost:3000";
const REQUIRED_SITE_URL_ERROR = "NEXT_PUBLIC_SITE_URL must be set to production URL";

function isMissingOrLocalhost(url: string | undefined): boolean {
  if (typeof url !== "string" || url.trim().length === 0) return true;
  return url.toLowerCase().includes("localhost");
}

export function getRequiredSiteUrl(env: SiteUrlEnv = process.env): string {
  const nodeEnv = env.NODE_ENV;
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim();
  const isDevelopment = nodeEnv === "development";

  if (!isDevelopment && isMissingOrLocalhost(raw)) {
    throw new Error(REQUIRED_SITE_URL_ERROR);
  }

  return (raw && raw.length > 0 ? raw : LOCALHOST_FALLBACK).replace(/\/$/, "");
}

