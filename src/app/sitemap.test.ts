import assert from "node:assert/strict";
import test from "node:test";

import { buildHomepageOnlySitemapFallback } from "@/app/sitemap";

test("sitemap fallback logs error and returns homepage-only entry", () => {
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://buckparts.com";

  const logged: unknown[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };

  try {
    const fallback = buildHomepageOnlySitemapFallback(
      new Error("simulated failure"),
      () => new Date("2026-04-28T00:00:00.000Z"),
    );

    assert.equal(fallback.length, 1);
    assert.equal(fallback[0]?.url, "https://buckparts.com");
    assert.equal(logged.length > 0, true);
    assert.equal(
      String((logged[0] as unknown[])[0]).includes("homepage-only fallback"),
      true,
    );
  } finally {
    console.error = originalConsoleError;
    if (previousSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    }
  }
});

