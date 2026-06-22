import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Deliberately separate from vite.config.ts: TanStack Start's plugin does
// SSR/route-tree codegen that has no business running under the test
// runner — Vitest just needs React + jsdom + the same `@` path alias.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    // Playwright E2E specs live under e2e/ and run via `bun run e2e`, not Vitest.
    // Without this, Vitest's default *.spec.ts glob picks them up and fails
    // because they call Playwright's test() outside a Playwright test run.
    exclude: ["**/node_modules/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["src/components/ui/**", "src/routes/**", "src/routeTree.gen.ts", "src/server.ts", "src/start.ts"],
    },
  },
});
