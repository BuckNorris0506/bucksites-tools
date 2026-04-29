import assert from "node:assert/strict";
import test from "node:test";

import robots from "@/app/robots";

test("robots output includes all go-route disallow prefixes", () => {
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://buckparts.com";
  try {
    const output = robots();
    const rules = Array.isArray(output.rules) ? output.rules[0] : output.rules;
    const disallow = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];

    assert.ok(disallow.includes("/go/"));
    assert.ok(disallow.includes("/air-purifier/go/"));
    assert.ok(disallow.includes("/whole-house-water/go/"));
    assert.ok(disallow.includes("/vacuum/go/"));
    assert.ok(disallow.includes("/humidifier/go/"));
    assert.ok(disallow.includes("/appliance-air/go/"));
  } finally {
    if (previousSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    }
  }
});

