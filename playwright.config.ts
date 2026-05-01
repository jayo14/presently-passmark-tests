import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import { configure } from "passmark";

// Load env
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Configure Passmark (GLOBAL)
configure({
  ai: {
    gateway: "openrouter",
  },
});

export default defineConfig({
  testDir: "./tests",

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: "html",

  use: {
    headless: true,
    trace: "on-first-retry",
    baseURL: "https://getpresently.com.ng",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
