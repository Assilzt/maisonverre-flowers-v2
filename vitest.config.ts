import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "frontend/src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
