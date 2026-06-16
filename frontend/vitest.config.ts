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
  },
});
