import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      // Render runs a standard Node server, not an edge/Workers runtime.
      target: "node-server",
      // src/server.ts wraps the default entry to (a) render a friendly error
      // page on catastrophic SSR failures and (b) open a real Node http
      // listener on process.env.PORT — required since Render runs `node
      // dist/server/server.js` directly.
      server: { entry: "server" },
    }),
    viteReact(),
  ],
});
