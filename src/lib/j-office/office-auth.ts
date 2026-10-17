/**
 * HTTP Basic Auth for /office.
 * Reuses OWNER_DASHBOARD_SECRET when J_OFFICE_BASIC_PASSWORD is unset.
 * Fail closed if no password is configured. Not a secret-URL scheme.
 */

export const DEFAULT_OFFICE_USER = "jared";
export const OFFICE_REALM = "J Office";

export type OfficeAuthEnv = {
  J_OFFICE_BASIC_USER?: string;
  J_OFFICE_BASIC_PASSWORD?: string;
  OWNER_DASHBOARD_SECRET?: string;
  [key: string]: string | undefined;
};

export function resolveOfficeUser(env: OfficeAuthEnv = process.env): string {
  const user = env.J_OFFICE_BASIC_USER?.trim();
  return user || DEFAULT_OFFICE_USER;
}

export function resolveOfficePassword(env: OfficeAuthEnv = process.env): string | null {
  const dedicated = env.J_OFFICE_BASIC_PASSWORD?.trim();
  if (dedicated) return dedicated;
  const reused = env.OWNER_DASHBOARD_SECRET?.trim();
  if (reused) return reused;
  return null;
}

export function decodeBasicAuthorization(
  header: string | null | undefined,
): { user: string; password: string } | null {
  if (!header) return null;
  const match = /^Basic\s+(\S+)/i.exec(header.trim());
  if (!match) return null;
  try {
    const decoded = atob(match[1] ?? "");
    const idx = decoded.indexOf(":");
    if (idx < 0) return null;
    return {
      user: decoded.slice(0, idx),
      password: decoded.slice(idx + 1),
    };
  } catch {
    return null;
  }
}

export async function secretsEqual(left: string, right: string): Promise<boolean> {
  const enc = new TextEncoder();
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const [ha, hb] = await Promise.all([
      subtle.digest("SHA-256", enc.encode(left)),
      subtle.digest("SHA-256", enc.encode(right)),
    ]);
    const a = new Uint8Array(ha);
    const b = new Uint8Array(hb);
    let result = 0;
    for (let i = 0; i < a.length; i += 1) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  }
  if (left.length !== right.length) return false;
  let result = 0;
  for (let i = 0; i < left.length; i += 1) {
    result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return result === 0;
}

export type OfficeAuthResult =
  | { ok: true }
  | { ok: false; status: 401; reason: "missing_password" | "missing_header" | "mismatch" };

export async function authorizeOfficeRequest(
  authorizationHeader: string | null | undefined,
  env: OfficeAuthEnv = process.env,
): Promise<OfficeAuthResult> {
  const password = resolveOfficePassword(env);
  if (!password) {
    return { ok: false, status: 401, reason: "missing_password" };
  }
  const parsed = decodeBasicAuthorization(authorizationHeader);
  if (!parsed) {
    return { ok: false, status: 401, reason: "missing_header" };
  }
  const userOk = await secretsEqual(parsed.user, resolveOfficeUser(env));
  const passOk = await secretsEqual(parsed.password, password);
  if (!userOk || !passOk) {
    return { ok: false, status: 401, reason: "mismatch" };
  }
  return { ok: true };
}

export function unauthorizedOfficeResponse(): Response {
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${OFFICE_REALM}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
