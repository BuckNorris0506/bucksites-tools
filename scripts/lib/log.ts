export function log(step: string, message: string, extra?: unknown): void {
  const ts = new Date().toISOString();
  if (extra !== undefined) {
    console.log(`[${ts}] [${step}] ${message}`, extra);
  } else {
    console.log(`[${ts}] [${step}] ${message}`);
  }
}

export function warn(step: string, message: string): void {
  console.warn(`[${new Date().toISOString()}] [${step}] ${message}`);
}
