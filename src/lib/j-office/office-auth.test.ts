import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  authorizeOfficeRequest,
  decodeBasicAuthorization,
  resolveOfficePassword,
  resolveOfficeUser,
} from "@/lib/j-office/office-auth";

function basic(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

test("office auth fails closed when no password is configured", async () => {
  const result = await authorizeOfficeRequest(basic("jared", "x"), {
    J_OFFICE_BASIC_USER: "jared",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "missing_password");
});

test("office auth rejects missing and wrong credentials", async () => {
  const env = { OWNER_DASHBOARD_SECRET: "correct-secret-value" };
  const missing = await authorizeOfficeRequest(null, env);
  assert.equal(missing.ok, false);
  const wrong = await authorizeOfficeRequest(basic("jared", "nope"), env);
  assert.equal(wrong.ok, false);
  const wrongUser = await authorizeOfficeRequest(basic("public", "correct-secret-value"), env);
  assert.equal(wrongUser.ok, false);
});

test("office auth accepts reused owner dashboard secret", async () => {
  const env = { OWNER_DASHBOARD_SECRET: "correct-secret-value" };
  const ok = await authorizeOfficeRequest(basic("jared", "correct-secret-value"), env);
  assert.equal(ok.ok, true);
  assert.equal(resolveOfficeUser(env), "jared");
  assert.equal(resolveOfficePassword(env), "correct-secret-value");
});

test("office auth prefers dedicated office password", async () => {
  const env = {
    OWNER_DASHBOARD_SECRET: "owner-secret",
    J_OFFICE_BASIC_PASSWORD: "office-secret",
    J_OFFICE_BASIC_USER: "founder",
  };
  const reused = await authorizeOfficeRequest(basic("founder", "owner-secret"), env);
  assert.equal(reused.ok, false);
  const dedicated = await authorizeOfficeRequest(basic("founder", "office-secret"), env);
  assert.equal(dedicated.ok, true);
});

test("basic header decoder does not throw on junk", () => {
  assert.equal(decodeBasicAuthorization("Bearer abc"), null);
  assert.equal(decodeBasicAuthorization("Basic not-base64***"), null);
  const parsed = decodeBasicAuthorization(basic("jared", "pw:with:colons"));
  assert.deepEqual(parsed, { user: "jared", password: "pw:with:colons" });
});

test("office auth module does not log secrets", () => {
  const src = readFileSync(join(process.cwd(), "src/lib/j-office/office-auth.ts"), "utf8");
  assert.equal(src.includes("console.log"), false);
  assert.equal(src.includes("console.info"), false);
});
