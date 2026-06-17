import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";

import {
  appendApGoAttributionToGoHref,
  apGoAttributionClickEventKeys,
  buildAirPurifierFilterGoAttribution,
  buildAirPurifierModelGoAttribution,
  buildApGoAttributionQueryString,
  parseApGoAttributionFromSearchParams,
} from "@/lib/retailers/ap-go-attribution-v1";

describe("parseApGoAttributionFromSearchParams", () => {
  it("accepts allowlisted model attribution", () => {
    const parsed = parseApGoAttributionFromSearchParams(
      new URLSearchParams("page_type=air_purifier_model&page_slug=levoit-core-300"),
    );
    assert.deepEqual(parsed, {
      page_type: "air_purifier_model",
      page_slug: "levoit-core-300",
    });
  });

  it("accepts allowlisted filter attribution", () => {
    const parsed = parseApGoAttributionFromSearchParams(
      new URLSearchParams("page_type=air_purifier_filter&page_slug=levoit-rf-rar029"),
    );
    assert.deepEqual(parsed, {
      page_type: "air_purifier_filter",
      page_slug: "levoit-rf-rar029",
    });
  });

  it("rejects unknown page_type", () => {
    assert.equal(
      parseApGoAttributionFromSearchParams(
        new URLSearchParams("page_type=refrigerator_filter&page_slug=mwf"),
      ),
      null,
    );
  });

  it("rejects URL-like page_slug", () => {
    assert.equal(
      parseApGoAttributionFromSearchParams(
        new URLSearchParams(
          "page_type=air_purifier_model&page_slug=https%3A%2F%2Fevil.example%2Fpath",
        ),
      ),
      null,
    );
  });

  it("rejects partial params", () => {
    assert.equal(
      parseApGoAttributionFromSearchParams(new URLSearchParams("page_slug=levoit-core-300")),
      null,
    );
  });
});

describe("appendApGoAttributionToGoHref", () => {
  it("appends query string for model-page buy href", () => {
    const href = appendApGoAttributionToGoHref(
      "/air-purifier/go/550e8400-e29b-41d4-a716-446655440000",
      buildAirPurifierModelGoAttribution("levoit-core-300"),
    );
    assert.equal(
      href,
      "/air-purifier/go/550e8400-e29b-41d4-a716-446655440000?page_type=air_purifier_model&page_slug=levoit-core-300",
    );
  });

  it("appends query string for filter-page buy href", () => {
    const href = appendApGoAttributionToGoHref(
      "/air-purifier/go/550e8400-e29b-41d4-a716-446655440000",
      buildAirPurifierFilterGoAttribution("levoit-rf-rar029"),
    );
    assert.equal(
      href,
      "/air-purifier/go/550e8400-e29b-41d4-a716-446655440000?page_type=air_purifier_filter&page_slug=levoit-rf-rar029",
    );
  });

  it("leaves href unchanged when attribution is omitted", () => {
    const base = "/air-purifier/go/550e8400-e29b-41d4-a716-446655440000";
    assert.equal(appendApGoAttributionToGoHref(base, null), base);
    assert.equal(appendApGoAttributionToGoHref(base), base);
  });
});

describe("ap route wedge keys", () => {
  it("maps validated request search params to click_events keys", () => {
    const req = new NextRequest(
      "https://buckparts.com/air-purifier/go/550e8400-e29b-41d4-a716-446655440000?page_type=air_purifier_model&page_slug=levoit-core-300",
    );
    const url = new URL(req.url);
    const attribution = parseApGoAttributionFromSearchParams(url.searchParams);
    assert.deepEqual(apGoAttributionClickEventKeys(attribution), {
      page_type: "air_purifier_model",
      page_slug: "levoit-core-300",
    });
  });

  it("buildApGoAttributionQueryString round-trips through parse", () => {
    const attribution = buildAirPurifierFilterGoAttribution("holmes-hapf30");
    assert.ok(attribution);
    const qs = buildApGoAttributionQueryString(attribution);
    assert.deepEqual(parseApGoAttributionFromSearchParams(new URLSearchParams(qs)), attribution);
  });
});
