/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV === "development";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
if (!isDevelopment && (!siteUrl || siteUrl.toLowerCase().includes("localhost"))) {
  throw new Error("NEXT_PUBLIC_SITE_URL must be set to production URL");
}

const nextConfig = {};

export default nextConfig;
