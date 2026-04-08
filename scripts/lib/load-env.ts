import path from "node:path";
import { config } from "dotenv";

/**
 * Load `.env.local` first, then `.env` (non-destructive: first wins for duplicates).
 */
export function loadEnv(cwd = process.cwd()): void {
  config({ path: path.join(cwd, ".env.local") });
  config({ path: path.join(cwd, ".env") });
}
