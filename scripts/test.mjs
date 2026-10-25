import { spawnSync } from "node:child_process";
const env = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: "",
  VERCEL: "",
  TELEGRAM_BOT_TOKEN: "",
  TELEGRAM_CHAT_ID: "",
  ECOTRACK_API_TOKEN: "",
};
for (const args of [
  ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.config.ts"],
  [
    "--import",
    "tsx",
    "--test",
    "tests/ecotrack.regression.mjs",
    "tests/server-render.regression.mjs",
  ],
]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status || 1);
}
