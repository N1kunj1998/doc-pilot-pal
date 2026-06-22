import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  retries: 1,
  reporter: [["list"], ["html", { outputFolder: "../playwright-report", open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://docpilot-frontend-9e6p.onrender.com",
    screenshot: "only-on-failure",
  },
});
