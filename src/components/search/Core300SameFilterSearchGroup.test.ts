import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  Core300IdentityFamilyCard,
  Core300OriginalFilterAnswerCard,
} from "./Core300SameFilterSearchGroup";
import { SAME_FILTER_DISTINCT_MODEL_COPY_V1 } from "@/lib/search/same-filter-distinct-model-grouping-v1";

test("filter answer leads with the original cartridge, not a Verified Link", () => {
  const html = renderToStaticMarkup(
    createElement(Core300OriginalFilterAnswerCard, {
      filter: {
        kind: "filter",
        slug: "levoit-rf-rar029",
        oem_part_number: "LEVOIT-CORE-300-P-RF",
        name: "Core 300 Series Original Filter (Core 300-P-RF)",
      },
      href: "/air-purifier/filter/levoit-rf-rar029",
      oemFromModels: { oem_part_number: "LEVOIT-CORE-300-P-RF", slug: "levoit-rf-rar029" },
    }),
  );
  assert.match(html, /LEVOIT-CORE-300-P-RF/);
  assert.match(html, /Typical original replacement/);
  assert.match(html, /does not make the machines the same/);
  assert.doesNotMatch(html, /Verified Link/);
  assert.match(html, /href="\/air-purifier\/filter\/levoit-rf-rar029"/);
});

test("family card keeps Core 300S distinct and lists color aliases as links", () => {
  const html = renderToStaticMarkup(
    createElement(Core300IdentityFamilyCard, {
      family: {
        familyKey: "core-300s",
        familyLabel: "Core 300S",
        canonical: {
          kind: "model",
          slug: "levoit-core-300s",
          model_number: "Core 300S",
          brand_name: "Levoit",
        },
        aliases: [
          {
            kind: "model",
            slug: "levoit-core-300s-black",
            model_number: "Core 300S (Black)",
            brand_name: "Levoit",
          },
        ],
        members: [],
      },
      modelHref: (slug: string) => `/air-purifier/model/${slug}`,
    }),
  );
  assert.match(html, />Core 300S</);
  assert.match(html, /different machines/);
  assert.match(html, /href="\/air-purifier\/model\/levoit-core-300s"/);
  assert.match(html, /href="\/air-purifier\/model\/levoit-core-300s-black"/);
  assert.match(html, /Core 300S \(Black\)/);
  assert.doesNotMatch(html, /Verified Link/);
  assert.equal(html.includes(SAME_FILTER_DISTINCT_MODEL_COPY_V1.alsoListedAsLabel), true);
});
