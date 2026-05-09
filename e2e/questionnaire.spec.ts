import { test, expect } from '@playwright/test';

test.describe('AI Questionnaire route', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('unauthenticated visit redirects toward Clerk sign-in', async ({ page }) => {
    await page.goto('/questionnaire', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/sign-in/);
  });
});
