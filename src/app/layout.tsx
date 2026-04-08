import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteShell } from "@/components/SiteShell";

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

const siteName = "BuckSites Tools";
const siteDesc =
  "Find the right refrigerator water filter by model number or part number. Compatible filters, replacement intervals, and buy links.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: `${siteName} — Water filter finder`,
    template: `%s · ${siteName}`,
  },
  description: siteDesc,
  openGraph: {
    siteName,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
