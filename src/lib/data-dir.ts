import os from "node:os";
import path from "node:path";

// Serverless hosts like Vercel only allow writes under the OS temp dir; data there is per-instance and not durable.
export const dataDir = process.env.DATA_DIR ?? (process.env.VERCEL ? path.join(os.tmpdir(), "claude-diy-data") : path.join(process.cwd(), "data"));
