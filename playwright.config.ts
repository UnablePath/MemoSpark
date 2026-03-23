import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests — run against local dev or preview.
 *
 * Setup:
 *   npm i -D @playwright/test
 *   npx playwright install
 *
 * Full onboarding flow needs a Clerk user with onboarding NOT complete
 * (or use Clerk test helpers — see e2e/onboarding.spec.ts).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  /** Next dev + first compile often needs > 30s */
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    /** Path from `pnpm exec playwright codegen --save-storage=...` or Clerk test session */
    ...(process.env.E2E_STORAGE_STATE
      ? { storageState: process.env.E2E_STORAGE_STATE }
      : {}),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.PLAYWRIGHT_NO_SERVER
    ? undefined
    : {
        command: 'pnpm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
