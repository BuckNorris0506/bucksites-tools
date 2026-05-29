import type { Metadata } from "next";
import { NON_LIVE_WEDGE_ROBOTS } from "@/lib/catalog/non-live-wedge-robots";
import { isVerticalLive } from "@/lib/catalog/vertical-launch-state";

export const metadata: Metadata = isVerticalLive("air-purifier")
  ? {}
  : NON_LIVE_WEDGE_ROBOTS;

export default function AirPurifierLayout({ children }: { children: React.ReactNode }) {
  return children;
}
