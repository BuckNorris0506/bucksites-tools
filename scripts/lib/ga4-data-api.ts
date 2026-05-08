import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

export const GA4_READONLY_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

type EnvSource = Record<string, string | undefined>;

export type Ga4ClientResult =
  | {
      ok: true;
      property_id: string;
      getAccessToken: () => Promise<string>;
      auth_mode: "oauth_refresh_token" | "env_json" | "key_file";
    }
  | {
      ok: false;
      status: "UNKNOWN_CONFIG";
      reason: string;
      log_safe_details: string[];
    };

type OAuthRefreshTokenConfig = {
  client_id: string;
  client_secret: string;
  refresh_token: string;
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri: string;
};

function parseServiceAccountJson(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function hasServiceAccountShape(candidate: Record<string, unknown>): boolean {
  return (
    typeof candidate.client_email === "string" &&
    typeof candidate.private_key === "string" &&
    typeof candidate.token_uri === "string"
  );
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signJwt(serviceAccount: ServiceAccount): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: GA4_READONLY_SCOPE,
    aud: OAUTH_TOKEN_URL,
    iat: nowSec,
    exp: nowSec + 3600,
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(serviceAccount.private_key, "base64");
  const encodedSignature = signature.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${signingInput}.${encodedSignature}`;
}

async function fetchAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const assertion = signJwt(serviceAccount);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const response = await fetch(serviceAccount.token_uri || OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error("Failed to fetch OAuth access token.");
  const parsed = (await response.json()) as { access_token?: string };
  if (typeof parsed.access_token !== "string" || parsed.access_token.length === 0) {
    throw new Error("OAuth access token missing from response.");
  }
  return parsed.access_token;
}

async function fetchAccessTokenFromRefreshToken(args: {
  oauth: OAuthRefreshTokenConfig;
  fetchImpl: typeof fetch;
}): Promise<string> {
  const body = new URLSearchParams({
    client_id: args.oauth.client_id,
    client_secret: args.oauth.client_secret,
    refresh_token: args.oauth.refresh_token,
    grant_type: "refresh_token",
    scope: GA4_READONLY_SCOPE,
  });
  const response = await args.fetchImpl(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error("Failed to fetch OAuth access token.");
  const parsed = (await response.json()) as { access_token?: string };
  if (typeof parsed.access_token !== "string" || parsed.access_token.length === 0) {
    throw new Error("OAuth access token missing from response.");
  }
  return parsed.access_token;
}

export function createGa4ClientFromEnv(args?: {
  env?: EnvSource;
  readKeyFile?: (absPath: string) => string;
  fetchImpl?: typeof fetch;
}): Ga4ClientResult {
  const env = args?.env ?? process.env;
  const readKeyFile = args?.readKeyFile ?? ((absPath: string) => readFileSync(absPath, "utf8"));
  const fetchImpl = args?.fetchImpl ?? fetch;
  const propertyId = env.GA4_PROPERTY_ID?.trim() ?? "";
  if (!propertyId) {
    return {
      ok: false,
      status: "UNKNOWN_CONFIG",
      reason: "GA4_PROPERTY_ID is not set.",
      log_safe_details: ["Set GA4_PROPERTY_ID to a numeric GA4 property id."],
    };
  }

  const oauthClientId = env.GA4_OAUTH_CLIENT_ID?.trim() ?? "";
  const oauthClientSecret = env.GA4_OAUTH_CLIENT_SECRET?.trim() ?? "";
  const oauthRefreshToken = env.GA4_OAUTH_REFRESH_TOKEN?.trim() ?? "";
  const oauthPresence = {
    GA4_OAUTH_CLIENT_ID: oauthClientId.length > 0,
    GA4_OAUTH_CLIENT_SECRET: oauthClientSecret.length > 0,
    GA4_OAUTH_REFRESH_TOKEN: oauthRefreshToken.length > 0,
  };
  const oauthPresentCount = Object.values(oauthPresence).filter(Boolean).length;
  if (oauthPresentCount === 3) {
    return {
      ok: true,
      property_id: propertyId,
      getAccessToken: () =>
        fetchAccessTokenFromRefreshToken({
          oauth: {
            client_id: oauthClientId,
            client_secret: oauthClientSecret,
            refresh_token: oauthRefreshToken,
          },
          fetchImpl,
        }),
      auth_mode: "oauth_refresh_token",
    };
  }
  if (oauthPresentCount > 0) {
    const missing = Object.entries(oauthPresence)
      .filter(([, present]) => !present)
      .map(([name]) => name);
    return {
      ok: false,
      status: "UNKNOWN_CONFIG",
      reason: "GA4 OAuth refresh-token configuration is partial.",
      log_safe_details: [`Missing required GA4 OAuth env vars: ${missing.join(", ")}`],
    };
  }

  const rawJson = env.GA4_SERVICE_ACCOUNT_JSON?.trim() ?? "";
  const keyPath = env.GA4_SERVICE_ACCOUNT_KEY_PATH?.trim() ?? "";
  if (!rawJson && !keyPath) {
    return {
      ok: false,
      status: "UNKNOWN_CONFIG",
      reason: "No GA4 credentials were configured.",
      log_safe_details: [
        "Set GA4_OAUTH_CLIENT_ID/GA4_OAUTH_CLIENT_SECRET/GA4_OAUTH_REFRESH_TOKEN.",
        "Or set GA4_SERVICE_ACCOUNT_JSON/GA4_SERVICE_ACCOUNT_KEY_PATH.",
      ],
    };
  }

  if (rawJson) {
    const parsed = parseServiceAccountJson(rawJson);
    if (!parsed || !hasServiceAccountShape(parsed)) {
      return {
        ok: false,
        status: "UNKNOWN_CONFIG",
        reason: "GA4_SERVICE_ACCOUNT_JSON is malformed or incomplete.",
        log_safe_details: ["Service account JSON must include client_email, private_key, token_uri."],
      };
    }
    const serviceAccount = parsed as unknown as ServiceAccount;
    return {
      ok: true,
      property_id: propertyId,
      getAccessToken: () => fetchAccessToken(serviceAccount),
      auth_mode: "env_json",
    };
  }

  try {
    const fileText = readKeyFile(keyPath);
    const parsed = parseServiceAccountJson(fileText);
    if (!parsed || !hasServiceAccountShape(parsed)) {
      return {
        ok: false,
        status: "UNKNOWN_CONFIG",
        reason: "GA4 service-account key file is malformed or incomplete.",
        log_safe_details: ["Key file JSON must include client_email, private_key, token_uri."],
      };
    }
    const serviceAccount = parsed as unknown as ServiceAccount;
    return {
      ok: true,
      property_id: propertyId,
      getAccessToken: () => fetchAccessToken(serviceAccount),
      auth_mode: "key_file",
    };
  } catch {
    return {
      ok: false,
      status: "UNKNOWN_CONFIG",
      reason: "Could not read GA4 service-account key file.",
      log_safe_details: ["Check GA4_SERVICE_ACCOUNT_KEY_PATH and file permissions."],
    };
  }
}
