import assert from "node:assert/strict";
import test from "node:test";

import { metadata } from "@/app/page";

test("homepage metadata includes self-referencing canonical", () => {
  const alternates = metadata.alternates;
  assert.ok(alternates && typeof alternates === "object");
  assert.equal(alternates.canonical, "/");
});
