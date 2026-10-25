import { spawn } from "node:child_process";
const apiEntry = process.argv.includes("--fixture")
  ? "tests/preview-server.ts"
  : "backend/dev-server.ts";
const children = [
  spawn(process.execPath, ["--import", "tsx", apiEntry], { stdio: "inherit" }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
    stdio: "inherit",
  }),
];
const stop = () => {
  for (const child of children) child.kill();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const child of children) child.on("exit", stop);
