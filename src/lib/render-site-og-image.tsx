import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import {
  SITE_OG_CARD_BUYER_PATH_LINE,
  SITE_OG_CARD_HOOK_RIGHT,
  SITE_OG_CARD_HOOK_WRONG,
  SITE_OG_CARD_SUPPORT_LINE,
  SITE_SOCIAL_OG_IMAGE_HEIGHT,
  SITE_SOCIAL_OG_IMAGE_WIDTH,
} from "@/lib/site-social-metadata";

/** Option C social card tokens (inline — OG renderer cannot read CSS variables). */
export const SITE_OG_CARD_COLORS_V1 = {
  bg: "#f7f8fa",
  text: "#0f172a",
  muted: "#64748b",
  trust: "#172554",
  action: "#d24a22",
  border: "#e6e8ec",
} as const;

export const siteOgImageSize = {
  width: SITE_SOCIAL_OG_IMAGE_WIDTH,
  height: SITE_SOCIAL_OG_IMAGE_HEIGHT,
} as const;

export const siteOgImageContentType = "image/png";

export async function renderSiteOgImage(): Promise<ImageResponse> {
  const logoPath = join(process.cwd(), "public/buckparts-logo-black-transparent.png");
  const logoBuffer = await readFile(logoPath);
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  const c = SITE_OG_CARD_COLORS_V1;

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
          backgroundColor: c.bg,
          color: c.text,
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- OG ImageResponse requires img */}
            <img src={logoSrc} height={40} width={184} alt="" />
            <div
              style={{
                width: 72,
                height: 4,
                borderRadius: 2,
                backgroundColor: c.action,
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "baseline",
                gap: 12,
                fontSize: 56,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
              }}
            >
              <span style={{ color: c.muted }}>{SITE_OG_CARD_HOOK_WRONG}</span>
              <span style={{ color: c.trust }}>
                {SITE_OG_CARD_HOOK_RIGHT}
                <span style={{ color: c.action }}>.</span>
              </span>
            </div>
            <div style={{ fontSize: 32, lineHeight: 1.3, color: c.muted, fontWeight: 500 }}>
              {SITE_OG_CARD_SUPPORT_LINE}
            </div>
            <div style={{ fontSize: 28, lineHeight: 1.35, color: c.text, fontWeight: 600 }}>
              {SITE_OG_CARD_BUYER_PATH_LINE}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${c.border}`,
            paddingTop: 24,
            fontSize: 22,
            color: c.muted,
            fontWeight: 600,
          }}
        >
          <span>buckparts.com</span>
          <span style={{ fontSize: 18, fontWeight: 500 }}>Replacement fit check</span>
        </div>
      </div>
    ),
    siteOgImageSize,
  );
}
