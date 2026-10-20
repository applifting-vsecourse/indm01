import { defineConfig, devices } from "@playwright/test"

// E2E tests run against the app you already have running with `pnpm dev`
// (frontend on 3050, API on 4050, seeded demo users).
export default defineConfig({
  testDir: "./e2e",
  // One test at a time: several tests sign in as the same seeded users, and the
  // dev server compiles pages on first load, which is slow on some machines.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: "http://localhost:3050",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
