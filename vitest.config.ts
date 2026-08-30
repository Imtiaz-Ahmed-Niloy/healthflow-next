import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest was already a dependency with one placeholder test and no config, so
 * `@/…` imports could not resolve and nothing real could be tested. The alias
 * below mirrors the one in tsconfig.json.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
