import type { Metadata } from "next";

import "./office.css";

export const metadata: Metadata = {
  title: "J Office",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function OfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
