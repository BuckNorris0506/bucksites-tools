export type MonitoringClient = {
  captureException: (error: unknown, context?: { tags?: Record<string, string>; extra?: Record<string, unknown> }) => void;
  captureMessage: (message: string, context?: { level?: "info" | "warning" | "error"; tags?: Record<string, string>; extra?: Record<string, unknown> }) => void;
  flush?: (timeout?: number) => Promise<boolean>;
};

export type MonitoringClientSource = "test" | "global" | "dynamic_import" | "none";

export type MonitoringCaptureResult = {
  monitoring_configured: boolean;
  capture_attempted: boolean;
  client_source: MonitoringClientSource;
};

declare global {
  // eslint-disable-next-line no-var
  var __buckpartsMonitoringClient: MonitoringClient | undefined;
}

const SECRETISH_KEY_RE = /(secret|token|key|password|authorization|auth|cookie|session)/i;
const URL_KEY_RE = /(url|href|target|referrer|referer)/i;

let monitoringClientForTests: MonitoringClient | null = null;
let monitoringClientLoaderForTests: (() => Promise<MonitoringClient | null>) | null = null;

export function isMonitoringConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean((env.SENTRY_DSN ?? env.NEXT_PUBLIC_SENTRY_DSN ?? "").trim());
}

function safeString(value: string, key?: string): string {
  if (key && SECRETISH_KEY_RE.test(key)) return "[REDACTED]";
  if (key && URL_KEY_RE.test(key)) {
    try {
      const u = new URL(value);
      u.search = "";
      u.hash = "";
      return u.toString();
    } catch {
      return value.replace(/[?#].*$/, "");
    }
  }
  if (SECRETISH_KEY_RE.test(value)) return "[REDACTED]";
  return value.length > 240 ? `${value.slice(0, 240)}...` : value;
}

export function toSafeMonitoringMetadata(input: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SECRETISH_KEY_RE.test(key)) {
      out[key] = "[REDACTED]";
    } else if (typeof value === "string") {
      out[key] = safeString(value, key);
    } else if (typeof value === "number" || typeof value === "boolean" || value == null) {
      out[key] = value;
    } else if (value instanceof Error) {
      out[key] = { name: value.name, message: safeString(value.message) };
    } else if (Array.isArray(value)) {
      out[key] = value.slice(0, 10).map((item) =>
        typeof item === "string" ? safeString(item, key) : typeof item === "number" || typeof item === "boolean" ? item : "[REDACTED_OBJECT]",
      );
    } else {
      out[key] = "[REDACTED_OBJECT]";
    }
  }
  return out;
}

export function captureMonitoringException(
  error: unknown,
  context: { area: string; metadata?: Record<string, unknown>; env?: NodeJS.ProcessEnv },
): void {
  void captureMonitoringExceptionAsync(error, context);
}

async function loadDynamicMonitoringClient(): Promise<MonitoringClient | null> {
  if (monitoringClientLoaderForTests) return monitoringClientLoaderForTests();
  return null;
}

function resolveStaticMonitoringClient(): { client: MonitoringClient; source: MonitoringClientSource } | null {
  if (monitoringClientForTests) return { client: monitoringClientForTests, source: "test" };
  if (globalThis.__buckpartsMonitoringClient) {
    return { client: globalThis.__buckpartsMonitoringClient, source: "global" };
  }
  return null;
}

export async function captureMonitoringExceptionAsync(
  error: unknown,
  context: { area: string; metadata?: Record<string, unknown>; env?: NodeJS.ProcessEnv },
): Promise<MonitoringCaptureResult> {
  const configured = isMonitoringConfigured(context.env);
  if (!configured) {
    return { monitoring_configured: false, capture_attempted: true, client_source: "none" };
  }
  const sentryContext = {
    tags: { area: context.area },
    extra: toSafeMonitoringMetadata(context.metadata),
  };

  const existing = resolveStaticMonitoringClient();
  const dynamicClient = existing ? null : await loadDynamicMonitoringClient();
  const client = existing?.client ?? dynamicClient;
  const source = existing?.source ?? (dynamicClient ? "dynamic_import" : "none");

  try {
    client?.captureException(error, sentryContext);
    await client?.flush?.(2000);
  } catch {
    // Monitoring must never change product behavior.
  }

  return { monitoring_configured: true, capture_attempted: true, client_source: source };
}

export function captureMonitoringMessage(
  message: string,
  context: { area: string; level?: "info" | "warning" | "error"; metadata?: Record<string, unknown>; env?: NodeJS.ProcessEnv },
): void {
  void captureMonitoringMessageAsync(message, context);
}

export async function captureMonitoringMessageAsync(
  message: string,
  context: { area: string; level?: "info" | "warning" | "error"; metadata?: Record<string, unknown>; env?: NodeJS.ProcessEnv },
): Promise<MonitoringCaptureResult> {
  const configured = isMonitoringConfigured(context.env);
  if (!configured) {
    return { monitoring_configured: false, capture_attempted: true, client_source: "none" };
  }
  const sentryContext = {
    level: context.level ?? "warning",
    tags: { area: context.area },
    extra: toSafeMonitoringMetadata(context.metadata),
  };

  const existing = resolveStaticMonitoringClient();
  const dynamicClient = existing ? null : await loadDynamicMonitoringClient();
  const client = existing?.client ?? dynamicClient;
  const source = existing?.source ?? (dynamicClient ? "dynamic_import" : "none");

  try {
    client?.captureMessage(message, sentryContext);
    await client?.flush?.(2000);
  } catch {
    // Monitoring must never change product behavior.
  }

  return { monitoring_configured: true, capture_attempted: true, client_source: source };
}

export function setMonitoringClientForTests(client: MonitoringClient): () => void {
  const previous = monitoringClientForTests;
  monitoringClientForTests = client;
  return () => {
    monitoringClientForTests = previous;
  };
}

export function setMonitoringClientLoaderForTests(loader: () => Promise<MonitoringClient | null>): () => void {
  const previous = monitoringClientLoaderForTests;
  monitoringClientLoaderForTests = loader;
  return () => {
    monitoringClientLoaderForTests = previous;
  };
}
