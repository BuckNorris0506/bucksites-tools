import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { SiteShell } from "@/components/SiteShell";
import {
  SITE_DISPLAY_NAME,
} from "@/lib/site-brand";
import { buildDeployCommitRefForMetadata } from "@/lib/deploy/buckparts-deploy-identity-v1";
import { buildSiteSocialMetadata } from "@/lib/site-social-metadata";
import { getRequiredSiteUrl } from "@/lib/site-url/get-required-site-url";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const siteName = SITE_DISPLAY_NAME;
const impactVerificationValue = "bd3fcd9a-5fb7-4016-b37d-afad3a592b71";

const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
const deployCommitRef = buildDeployCommitRefForMetadata();

const siteSocialMetadata = buildSiteSocialMetadata({ siteName });

export const metadata: Metadata = {
  metadataBase: new URL(getRequiredSiteUrl()),
  ...siteSocialMetadata,
  ...(googleVerification
    ? { verification: { google: googleVerification } }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Impact requires the verification token in the meta `value` attribute. */}
        {/* @ts-expect-error Impact verification uses non-standard meta attribute `value`. */}
        <meta name="impact-site-verification" value={impactVerificationValue} />
        {deployCommitRef ? (
          <meta name="buckparts-deploy-commit" content={deployCommitRef} />
        ) : null}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <AnalyticsScripts />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
