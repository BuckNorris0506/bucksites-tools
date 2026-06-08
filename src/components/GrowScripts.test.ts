import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GROW_FAVES_DEFAULT_SITE_ID_V1,
  resolveGrowFavesSiteId,
} from "./GrowScripts";

const SOURCE = readFileSync("src/components/GrowScripts.tsx", "utf8");
const LAYOUT = readFileSync("src/app/layout.tsx", "utf8");

test("GrowScripts preserves Mediavine initializer contract", () => {
  assert.ok(SOURCE.includes('strategy="afterInteractive"'));
  assert.ok(SOURCE.includes("data-grow-initializer"));
  assert.ok(SOURCE.includes("faves.grow.me/main.js"));
  assert.ok(SOURCE.includes("data-grow-faves-site-id"));
  assert.ok(SOURCE.includes("window.growMe"));
});

test("layout wires GrowScripts next to AnalyticsScripts", () => {
  assert.ok(LAYOUT.includes('import { AnalyticsScripts } from "@/components/AnalyticsScripts"'));
  assert.ok(LAYOUT.includes('import { GrowScripts } from "@/components/GrowScripts"'));
  const analyticsIdx = LAYOUT.indexOf("<AnalyticsScripts />");
  const growIdx = LAYOUT.indexOf("<GrowScripts />");
  assert.ok(analyticsIdx >= 0);
  assert.ok(growIdx > analyticsIdx);
});

test("resolveGrowFavesSiteId prefers env override", () => {
  const original = process.env.NEXT_PUBLIC_GROW_FAVES_SITE_ID;
  const originalNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NEXT_PUBLIC_GROW_FAVES_SITE_ID = "env-site-id";
    process.env.NODE_ENV = "development";
    assert.equal(resolveGrowFavesSiteId(), "env-site-id");
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_GROW_FAVES_SITE_ID;
    else process.env.NEXT_PUBLIC_GROW_FAVES_SITE_ID = original;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("resolveGrowFavesSiteId falls back in production when env unset", () => {
  const original = process.env.NEXT_PUBLIC_GROW_FAVES_SITE_ID;
  const originalNodeEnv = process.env.NODE_ENV;
  try {
    delete process.env.NEXT_PUBLIC_GROW_FAVES_SITE_ID;
    process.env.NODE_ENV = "production";
    assert.equal(resolveGrowFavesSiteId(), GROW_FAVES_DEFAULT_SITE_ID_V1);
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_GROW_FAVES_SITE_ID;
    else process.env.NEXT_PUBLIC_GROW_FAVES_SITE_ID = original;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("resolveGrowFavesSiteId is null in development when env unset", () => {
  const original = process.env.NEXT_PUBLIC_GROW_FAVES_SITE_ID;
  const originalNodeEnv = process.env.NODE_ENV;
  try {
    delete process.env.NEXT_PUBLIC_GROW_FAVES_SITE_ID;
    process.env.NODE_ENV = "development";
    assert.equal(resolveGrowFavesSiteId(), null);
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_GROW_FAVES_SITE_ID;
    else process.env.NEXT_PUBLIC_GROW_FAVES_SITE_ID = original;
    process.env.NODE_ENV = originalNodeEnv;
  }
});
