import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";

import { appendApGoAttributionToGoHref } from "@/lib/retailers/ap-go-attribution-v1";
import {
  buildFridgeModelGoAttribution,
  fridgeGoModelAttributionClickEventKeys,
  parseFridgeGoModelAttributionFromSearchParams,
} from "@/lib/retailers/fridge-go-attribution-v1";

describe("parseFridgeGoModelAttributionFromSearchParams", () => {
  it("accepts fridge_model + model slug", () => {
    const parsed = parseFridgeGoModelAttributionFromSearchParams(
      new URLSearchParams("page_type=fridge_model&page_slug=ge-gfe28gmkes"),
    );
    assert.deepEqual(parsed, {
      page_type: "fridge_model",
      page_slug: "ge-gfe28gmkes",
    });
  });

  it("rejects refrigerator_filter query params (no invented model join)", () => {
    assert.equal(
      parseFridgeGoModelAttributionFromSearchParams(
        new URLSearchParams("page_type=refrigerator_filter&page_slug=mwf"),
      ),
      null,
    );
  });

  it("rejects air_purifier_model query params", () => {
    assert.equal(
      parseFridgeGoModelAttributionFromSearchParams(
        new URLSearchParams("page_type=air_purifier_model&page_slug=levoit-core-300"),
      ),
      null,
    );
  });

  it("rejects URL-like page_slug", () => {
    assert.equal(
      parseFridgeGoModelAttributionFromSearchParams(
        new URLSearchParams(
          "page_type=fridge_model&page_slug=https%3A%2F%2Fevil.example%2Fpath",
        ),
      ),
      null,
    );
  });
});

describe("buildFridgeModelGoAttribution", () => {
  it("emits fridge_model page_type with the Decision-Capture model slug", () => {
    assert.deepEqual(buildFridgeModelGoAttribution("ge-gfe28gmkes"), {
      page_type: "fridge_model",
      page_slug: "ge-gfe28gmkes",
    });
  });

  it("rejects empty or invalid slugs instead of inventing attribution", () => {
    assert.equal(buildFridgeModelGoAttribution(""), null);
    assert.equal(buildFridgeModelGoAttribution("MWF/foo"), null);
  });
});

describe("fridge model /go href + click_events keys", () => {
  it("appends query string for model-page buy href", () => {
    const href = appendApGoAttributionToGoHref(
      "/go/550e8400-e29b-41d4-a716-446655440000",
      buildFridgeModelGoAttribution("ge-gfe28gmkes"),
    );
    assert.equal(
      href,
      "/go/550e8400-e29b-41d4-a716-446655440000?page_type=fridge_model&page_slug=ge-gfe28gmkes",
    );
  });

  it("maps validated request search params to click_events keys", () => {
    const req = new NextRequest(
      "https://buckparts.com/go/550e8400-e29b-41d4-a716-446655440000?page_type=fridge_model&page_slug=ge-gfe28gmkes",
    );
    const attribution = parseFridgeGoModelAttributionFromSearchParams(
      new URL(req.url).searchParams,
    );
    assert.deepEqual(fridgeGoModelAttributionClickEventKeys(attribution), {
      page_type: "fridge_model",
      page_slug: "ge-gfe28gmkes",
    });
  });
});
