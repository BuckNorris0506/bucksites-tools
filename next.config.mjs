import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV === "development";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
if (!isDevelopment && (!siteUrl || siteUrl.toLowerCase().includes("localhost"))) {
  throw new Error("NEXT_PUBLIC_SITE_URL must be set to production URL");
}

/** Repo CSV/JSON read at runtime by ownerdashboard Command Center (serverless cwd). */
const COMMAND_CENTER_DATA_TRACE_INCLUDES = [
  "./data/filters.csv",
  "./data/retailer_links.csv",
  "./data/compatibility_mappings.csv",
  "./data/filter_aliases.csv",
  "./data/fridge_models.csv",
  "./data/affiliate/affiliate-application-tracker.json",
];

const nextConfig = {
  experimental: {
    instrumentationHook: true,
    outputFileTracingIncludes: {
      "/ownerdashboard/[secret]": COMMAND_CENTER_DATA_TRACE_INCLUDES,
    },
  },
};

export default withSentryConfig(nextConfig, { silent: !process.env.CI });
