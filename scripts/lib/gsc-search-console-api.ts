import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

export const READONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

type EnvSource = Record<string, string | undefined>;

export type GscClientResult =
  | {
      ok: true;
      property: string;
      getAccessToken: () => Promise<string>;
      auth_mode: "env_json" | "key_file";
    }
  | {
      ok: false;
      status: "UNKNOWN_CONFIG";
      reason: string;
      log_safe_details: string[];
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

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri: string;
};

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
    scope: READONLY_SCOPE,
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
  if (!response.ok) {
    throw new Error("Failed to fetch OAuth access token.");
  }
  const parsed = (await response.json()) as { access_token?: string };
  if (typeof parsed.access_token !== "string" || parsed.access_token.length === 0) {
    throw new Error("OAuth access token missing from response.");
  }
  return parsed.access_token;
}

export function createSearchConsoleClientFromEnv(args?: {
  env?: EnvSource;
  readKeyFile?: (absPath: string) => string;
}): GscClientResult {
  const env = args?.env ?? process.env;
  const readKeyFile = args?.readKeyFile ?? ((absPath: string) => readFileSync(absPath, "utf8"));
  const property = env.GSC_PROPERTY_SITE_URL?.trim() ?? "";
  if (!property) {
    return {
      ok: false,
      status: "UNKNOWN_CONFIG",
      reason: "GSC_PROPERTY_SITE_URL is not set.",
      log_safe_details: ["Set GSC_PROPERTY_SITE_URL to a Search Console property URL."],
    };
  }

  const rawJson = env.GSC_SERVICE_ACCOUNT_JSON?.trim() ?? "";
  const keyPath = env.GSC_SERVICE_ACCOUNT_KEY_PATH?.trim() ?? "";
  if (!rawJson && !keyPath) {
    return {
      ok: false,
      status: "UNKNOWN_CONFIG",
      reason: "No service account credentials were configured.",
      log_safe_details: [
        "Set GSC_SERVICE_ACCOUNT_JSON or GSC_SERVICE_ACCOUNT_KEY_PATH.",
        `Configured property: ${property}`,
      ],
    };
  }

  if (rawJson) {
    const parsed = parseServiceAccountJson(rawJson);
    if (!parsed || !hasServiceAccountShape(parsed)) {
      return {
        ok: false,
        status: "UNKNOWN_CONFIG",
        reason: "GSC_SERVICE_ACCOUNT_JSON is malformed or incomplete.",
        log_safe_details: ["Service account JSON must include client_email, private_key, token_uri."],
      };
    }
    const serviceAccount = parsed as unknown as ServiceAccount;
    return {
      ok: true,
      property,
      getAccessToken: () => fetchAccessToken(serviceAccount),
      auth_mode: "env_json",
    };
  }

  let keyFileServiceAccount: ServiceAccount | null = null;
  try {
    const fileText = readKeyFile(keyPath);
    const parsed = parseServiceAccountJson(fileText);
    if (!parsed || !hasServiceAccountShape(parsed)) {
      return {
        ok: false,
        status: "UNKNOWN_CONFIG",
        reason: "GSC service-account key file is malformed or incomplete.",
        log_safe_details: ["Key file JSON must include client_email, private_key, token_uri."],
      };
    }
    keyFileServiceAccount = parsed as unknown as ServiceAccount;
  } catch {
    return {
      ok: false,
      status: "UNKNOWN_CONFIG",
      reason: "Could not read GSC service-account key file.",
      log_safe_details: ["Check GSC_SERVICE_ACCOUNT_KEY_PATH and file permissions."],
    };
  }

  return {
    ok: true,
    property,
    getAccessToken: () => fetchAccessToken(keyFileServiceAccount as ServiceAccount),
    auth_mode: "key_file",
  };
}
