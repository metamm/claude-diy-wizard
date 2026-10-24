import { execSync } from "node:child_process";
import { existsSync, renameSync, writeFileSync } from "node:fs";

const api = "src/app/api";
const parked = ".api-parked";

renameSync(api, parked);
try {
  execSync("npx next build", {
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_STATIC_EXPORT: "1", PAGES_BASE_PATH: process.env.PAGES_BASE_PATH ?? "/claude-diy-wizard" },
  });
  writeFileSync("out/.nojekyll", "");
} finally {
  if (existsSync(parked)) renameSync(parked, api);
}
