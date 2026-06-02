import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import {
  SITE_SOCIAL_OG_IMAGE_HEIGHT,
  SITE_SOCIAL_OG_IMAGE_WIDTH,
} from "@/lib/site-social-metadata";

export const siteOgImageSize = {
  width: SITE_SOCIAL_OG_IMAGE_WIDTH,
  height: SITE_SOCIAL_OG_IMAGE_HEIGHT,
} as const;

export const siteOgImageContentType = "image/png";

export async function renderSiteOgImage(): Promise<ImageResponse> {
  const logoPath = join(process.cwd(), "public/buckparts-logo-black-transparent.png");
  const logoBuffer = await readFile(logoPath);
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "56px 64px",
          backgroundColor: "#f6f4f0",
          color: "#0f172a",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- OG ImageResponse requires img */}
          <img src={logoSrc} height={44} width={200} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 58,
              fontWeight: 700,
              lineHeight: 1.12,
              color: "#172554",
              letterSpacing: "-0.02em",
            }}
          >
            Wrong filter?
          </div>
          <div style={{ fontSize: 38, fontWeight: 600, lineHeight: 1.2, color: "#0f172a" }}>
            BuckParts checks before you buy.
          </div>
          <div style={{ fontSize: 30, lineHeight: 1.35, color: "#64748b" }}>
            AI can suggest. BuckParts verifies.
          </div>
        </div>
        <div style={{ fontSize: 24, color: "#64748b", fontWeight: 500 }}>buckparts.com</div>
      </div>
    ),
    siteOgImageSize,
  );
}
