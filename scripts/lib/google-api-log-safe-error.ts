const MAX_MESSAGE_LENGTH = 200;

const SECRET_SUBSTRING_PATTERNS: RegExp[] = [
  /access_token[=:\s]+["']?[\w\-._~+/]+/gi,
  /refresh_token[=:\s]+["']?[\w\-._~+/]+/gi,
  /client_secret[=:\s]+["']?[\w\-._~+/]+/gi,
  /private_key[=:\s]+["']?[\s\S]*?(?=(-----END PRIVATE KEY-----|$))/gi,
  /authorization:\s*bearer\s+[\w\-._~+/]+/gi,
  /bearer\s+[\w\-._~+/]{20,}/gi,
];

export type GoogleApiLogSafeDiagnostic = {
  endpoint_label: string;
  http_status: number;
  google_status?: string;
  google_code?: number;
  google_reasons: string[];
  google_message?: string;
};

export class GoogleApiLogSafeError extends Error {
  readonly logSafeFacts: string[];

  constructor(logSafeFacts: string[]) {
    super(logSafeFacts.join("; "));
    this.name = "GoogleApiLogSafeError";
    this.logSafeFacts = logSafeFacts;
  }
}

export function sanitizeLogSafeText(text: string): string {
  let out = text;
  for (const pattern of SECRET_SUBSTRING_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  out = out.replace(/\s+/g, " ").trim();
  if (out.length > MAX_MESSAGE_LENGTH) {
    return `${out.slice(0, MAX_MESSAGE_LENGTH)}…`;
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseGoogleErrorPayload(parsed: unknown): {
  google_status?: string;
  google_code?: number;
  google_reasons: string[];
  google_message?: string;
} {
  const google_reasons: string[] = [];
  let google_status: string | undefined;
  let google_code: number | undefined;
  let google_message: string | undefined;

  if (!isRecord(parsed)) {
    return { google_reasons };
  }

  const nestedError = isRecord(parsed.error) ? parsed.error : parsed;
  if (typeof nestedError.status === "string" && nestedError.status.trim()) {
    google_status = nestedError.status.trim();
  }
  if (typeof nestedError.code === "number" && Number.isFinite(nestedError.code)) {
    google_code = nestedError.code;
  }
  if (typeof nestedError.message === "string" && nestedError.message.trim()) {
    google_message = sanitizeLogSafeText(nestedError.message.trim());
  }

  if (Array.isArray(nestedError.errors)) {
    for (const entry of nestedError.errors) {
      if (!isRecord(entry)) continue;
      if (typeof entry.reason === "string" && entry.reason.trim()) {
        google_reasons.push(entry.reason.trim());
      }
    }
  }

  if (typeof parsed.error === "string" && parsed.error.trim()) {
    google_reasons.push(parsed.error.trim());
  }
  if (typeof parsed.error_description === "string" && parsed.error_description.trim()) {
    google_message = sanitizeLogSafeText(parsed.error_description.trim());
  }

  return { google_status, google_code, google_reasons, google_message };
}

export function formatGoogleApiLogSafeFacts(diag: GoogleApiLogSafeDiagnostic): string[] {
  const facts = [`endpoint=${diag.endpoint_label}`, `http_status=${diag.http_status}`];
  if (diag.google_status) facts.push(`google_status=${diag.google_status}`);
  if (diag.google_code !== undefined) facts.push(`google_code=${diag.google_code}`);
  for (const reason of diag.google_reasons) {
    facts.push(`google_reason=${reason}`);
  }
  if (diag.google_message) facts.push(`google_message=${diag.google_message}`);
  return facts;
}

export async function readGoogleApiLogSafeDiagnostic(
  response: Response,
  endpointLabel: string,
): Promise<GoogleApiLogSafeDiagnostic> {
  let bodyText = "";
  try {
    bodyText = await response.text();
  } catch {
    bodyText = "";
  }

  let parsed: unknown = null;
  if (bodyText.trim()) {
    try {
      parsed = JSON.parse(bodyText) as unknown;
    } catch {
      parsed = null;
    }
  }

  const extracted = parseGoogleErrorPayload(parsed);
  return {
    endpoint_label: endpointLabel,
    http_status: response.status,
    google_status: extracted.google_status,
    google_code: extracted.google_code,
    google_reasons: extracted.google_reasons,
    google_message: extracted.google_message,
  };
}

export async function readGoogleApiLogSafeFacts(response: Response, endpointLabel: string): Promise<string[]> {
  const diagnostic = await readGoogleApiLogSafeDiagnostic(response, endpointLabel);
  return formatGoogleApiLogSafeFacts(diagnostic);
}

export async function throwGoogleApiLogSafeError(response: Response, endpointLabel: string): Promise<never> {
  const facts = await readGoogleApiLogSafeFacts(response, endpointLabel);
  throw new GoogleApiLogSafeError(facts);
}

export function collectLogSafeFactsFromUnknown(error: unknown): string[] {
  if (error instanceof GoogleApiLogSafeError) {
    return [...error.logSafeFacts];
  }
  if (error instanceof Error && error.message.trim()) {
    return [sanitizeLogSafeText(error.message.trim())];
  }
  return [];
}
