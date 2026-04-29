import assert from "node:assert/strict";
import test from "node:test";

import { getRequiredSiteUrl } from "@/lib/site-url/get-required-site-url";

test("production missing NEXT_PUBLIC_SITE_URL throws", () => {
  assert.throws(
    () => getRequiredSiteUrl({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: undefined }),
    /NEXT_PUBLIC_SITE_URL must be set to production URL/,
  );
});

test("production localhost NEXT_PUBLIC_SITE_URL throws", () => {
  assert.throws(
    () =>
      getRequiredSiteUrl({
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      }),
    /NEXT_PUBLIC_SITE_URL must be set to production URL/,
  );
});

test("development missing NEXT_PUBLIC_SITE_URL falls back to localhost", () => {
  assert.equal(
    getRequiredSiteUrl({ NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: undefined }),
    "http://localhost:3000",
  );
});

