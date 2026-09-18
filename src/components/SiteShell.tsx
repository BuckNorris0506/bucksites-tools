import { SiteChrome } from "@/components/SiteHeader";

export async function SiteShell({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
