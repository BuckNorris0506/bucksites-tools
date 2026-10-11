import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  R16_AMAZON_INACTIVE_TAG_V1,
  stripInactiveAmazonAssociatesTagFromUrl,
  urlHasInactiveAmazonTag,
} from "./buckparts-r16-amazon-stored-tag-normalization-v1";

describe("buckparts-r16-amazon-stored-tag-normalization-v1", () => {
  test("stripInactiveAmazonAssociatesTagFromUrl removes only buckparts20-20 tag", () => {
    const before = `https://www.amazon.com/dp/B00NXPKBQ2?tag=${R16_AMAZON_INACTIVE_TAG_V1}`;
    const after = stripInactiveAmazonAssociatesTagFromUrl(before);
    assert.equal(after, "https://www.amazon.com/dp/B00NXPKBQ2");
    assert.equal(urlHasInactiveAmazonTag(after), false);
  });

  test("stripInactiveAmazonAssociatesTagFromUrl preserves other query params", () => {
    const before = "https://www.amazon.com/dp/B000AST3AK?tag=other&psc=1";
    assert.equal(stripInactiveAmazonAssociatesTagFromUrl(before), before);
  });
});
