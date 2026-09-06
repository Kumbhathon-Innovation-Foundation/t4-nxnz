import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 120_000,
    include: ["tests/**/*.test.ts"],
    // API tests boot their own Next server on port 3111
    fileParallelism: false,
    pool: "forks",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
