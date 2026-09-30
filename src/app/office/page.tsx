import type { Metadata } from "next";

import { JOfficeView } from "@/app/office/JOfficeView";
import { loadFounderOperatingPicture } from "@/lib/j-office/load-projection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "J Office",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function OfficePage() {
  const picture = loadFounderOperatingPicture();
  return <JOfficeView picture={picture} />;
}
