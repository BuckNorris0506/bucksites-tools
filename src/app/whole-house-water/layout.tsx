import type { Metadata } from "next";
import { NON_LIVE_WEDGE_ROBOTS } from "@/lib/catalog/non-live-wedge-robots";

export const metadata: Metadata = NON_LIVE_WEDGE_ROBOTS;

export default function WholeHouseWaterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
