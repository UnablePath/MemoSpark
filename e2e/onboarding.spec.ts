import { test, expect, type Page } from '@playwright/test';

/**
 * MemoSpark onboarding — unified wizard at `/onboarding`.
 * Legacy `/clerk-onboarding` has no route; middleware sends incomplete users to `/onboarding`.
 *
 * **Why tests may skip:** Layout redirects users with
 * `sessionClaims.metadata.onboardingComplete === true` away from `/onboarding`.
 * Wizard-focused tests call `test.skip()` when the session is signed out or onboarding
 * is already complete — run with a user who still needs onboarding to exercise those paths.
 *
 * Set `E2E_ONBOARDING_FULL=1` only when you intend to run the end-to-end submit flow
 * (hits `completeOnboarding` + navigates to `/questionnaire`).
 */

/** Legacy per-field keys (pre–v2 draft); cleared for migration tests. */
const ONBOARDING_LEGACY_STORAGE_KEYS = [
  'onboardingName',
  'onboardingEmail',
  'onboardingYearOfStudy',
  'onboardingBirthDate',
  'onboardingInterests',
  'onboardingLearningStyle',
  'onboardingSubjects',
  'onboardingAiDifficulty',
  'onboardingAiExplanationStyle',
  'onboardingAiInteractionFrequency',
  'onboardingStep',
] as const;

const ONBOARDING_DRAFT_V2_KEY = 'memospark_onboarding_draft_v2' as const;

async function clearOnboardingLocalStorage(page: Page) {
  await page.evaluate(
    ({ keys, v2Key }: { keys: string[]; v2Key: string }) => {
      try {
        localStorage.removeItem(v2Key);
      } catch {
        /* ignore */
      }
      keys.forEach((k) => localStorage.removeItem(k));
    },
    {
      keys: [...ONBOARDING_LEGACY_STORAGE_KEYS],
      v2Key: ONBOARDING_DRAFT_V2_KEY,
    },
  );
}

/** Wait until we land on sign-in, home, or the wizard — avoids racing client redirects. */
async function waitForOnboardingEntry(page: Page, timeout = 90_000) {
  await page.waitForURL(
    (u) => {
      const p = u.pathname;
      return (
        p.startsWith('/sign-in') ||
        p === '/' ||
        p === '' ||
        p === '/onboarding'
      );
    },
    { timeout }
  );
}

function destinationFromUrl(url: string): 'sign-in' | 'home' | 'wizard' {
  const u = new URL(url);
  if (u.pathname.startsWith('/sign-in')) return 'sign-in';
  if (u.pathname === '/' || u.pathname === '') return 'home';
  if (u.pathname === '/onboarding') return 'wizard';
  return 'sign-in';
}

test.describe('Unauthenticated: protected onboarding routes', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('/onboarding sends anonymous users to sign-in (middleware)', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' });
    await waitForOnboardingEntry(page);
    expect(destinationFromUrl(page.url())).toBe('sign-in');
    await expect(page).toHaveURL(/sign-in/);
    // Deep-link intent: Clerk usually preserves a return URL for after sign-in
    const returnUrl = new URL(page.url()).searchParams.get('redirect_url');
    expect(
      returnUrl === null ||
        returnUrl.includes('onboarding') ||
        decodeURIComponent(returnUrl).includes('onboarding')
    ).toBeTruthy();
  });

  test('legacy /clerk-onboarding URL sends anonymous users to sign-in', async ({ page }) => {
    const response = await page.goto('/clerk-onboarding', { waitUntil: 'domcontentloaded' });
    expect(response?.ok() ?? false).toBeTruthy();
    await waitForOnboardingEntry(page);
    expect(destinationFromUrl(page.url())).toBe('sign-in');
  });

  test('sign-in page renders MemoSpark branding and an identifier field', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/sign-in/);
    await expect(page.getByText(/MemoSpark/i).first()).toBeVisible({ timeout: 20_000 });
    const identifier = page.locator(
      'input[name="identifier"], input[type="email"], input[autocomplete="username"]'
    ).first();
    await expect(identifier).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('Onboarding routes (any session)', () => {
  test('/onboarding eventually settles on sign-in, wizard, or home', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' });
    await waitForOnboardingEntry(page, 120_000);
    const dest = destinationFromUrl(page.url());
    expect(['sign-in', 'wizard', 'home']).toContain(dest);
    if (dest === 'sign-in') {
      await expect(page).toHaveURL(/sign-in/);
      return;
    }
    if (dest === 'home') {
      await expect(
        page.getByRole('heading', { level: 1, name: /coursework/i })
      ).toBeVisible({ timeout: 20_000 });
      return;
    }
    await expect(page.getByRole('heading', { name: /welcome to memospark/i })).toBeVisible({
      timeout: 25_000,
    });
  });

});

test.describe('Clerk onboarding wizard (signed-in + incomplete onboarding only)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ keys, v2Key }: { keys: string[]; v2Key: string }) => {
        try {
          localStorage.removeItem(v2Key);
        } catch {
          /* ignore */
        }
        keys.forEach((k) => localStorage.removeItem(k));
      },
      {
        keys: [...ONBOARDING_LEGACY_STORAGE_KEYS],
        v2Key: ONBOARDING_DRAFT_V2_KEY,
      },
    );
  });

  test('step 1: empty fields show validation; valid data advances to step 2', async ({
    page,
  }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' });
    await waitForOnboardingEntry(page);
    const dest = destinationFromUrl(page.url());
    test.skip(dest === 'sign-in', 'Needs a signed-in browser session');
    test.skip(dest === 'home', 'Onboarding already complete for this user');

    await clearOnboardingLocalStorage(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('status', { name: /step 1 of 5/i })).toBeVisible({
      timeout: 25_000,
    });

    await page.getByLabel(/full name/i).fill('');
    await page.getByLabel(/email address/i).fill('');
    await page.getByRole('button', { name: /go to next step/i }).click();
    await expect(
      page.locator('[role="alert"]').filter({ hasText: /please fill in your name and email/i })
    ).toBeVisible();

    await page.getByLabel(/full name/i).fill('E2E Wizard User');
    await page.getByLabel(/email address/i).fill('e2e.wizard@example.test');
    await page.getByRole('button', { name: /go to next step/i }).click();
    await expect(page.getByRole('status', { name: /step 2 of 5/i })).toBeVisible();
    await expect(page.getByLabel(/year of study/i)).toBeVisible();
    await expect(page.getByLabel(/pick your date of birth|date of birth/i)).toBeVisible();
  });

  test('step 2: missing DOB blocks Next; valid DOB reaches step 3', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' });
    await waitForOnboardingEntry(page);
    const dest = destinationFromUrl(page.url());
    test.skip(dest === 'sign-in', 'Needs a signed-in browser session');
    test.skip(dest === 'home', 'Onboarding already complete for this user');

    await clearOnboardingLocalStorage(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('status', { name: /step 1 of 5/i })).toBeVisible({
      timeout: 25_000,
    });
    await page.getByLabel(/full name/i).fill('E2E DOB Test');
    await page.getByLabel(/email address/i).fill('e2e.dob@example.test');
    await page.getByRole('button', { name: /go to next step/i }).click();
    await expect(page.getByRole('status', { name: /step 2 of 5/i })).toBeVisible();

    await page.getByLabel(/pick your date of birth|date of birth/i).fill('');
    await page.getByRole('button', { name: /go to next step/i }).click();
    await expect(
      page.locator('[role="alert"]').filter({ hasText: /please select your date of birth/i })
    ).toBeVisible();

    await page.getByLabel(/pick your date of birth|date of birth/i).fill('2005-06-15');
    await page.getByRole('button', { name: /go to next step/i }).click();
    await expect(page.getByRole('status', { name: /step 3 of 5/i })).toBeVisible();
    await expect(page.getByText(/how do you learn best/i)).toBeVisible();
  });

  test('navigation: Back from step 2 preserves step 1 profile fields', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' });
    await waitForOnboardingEntry(page);
    const dest = destinationFromUrl(page.url());
    test.skip(dest === 'sign-in', 'Needs a signed-in browser session');
    test.skip(dest === 'home', 'Onboarding already complete for this user');

    await clearOnboardingLocalStorage(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByLabel(/full name/i).fill('Back Nav Test');
    await page.getByLabel(/email address/i).fill('e2e.backnav@example.test');
    await page.getByRole('button', { name: /go to next step/i }).click();
    await expect(page.getByRole('status', { name: /step 2 of 5/i })).toBeVisible();

    await page.getByRole('button', { name: /go to previous step/i }).click();
    await expect(page.getByRole('status', { name: /step 1 of 5/i })).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toHaveValue('Back Nav Test');
    await expect(page.getByLabel(/email address/i)).toHaveValue('e2e.backnav@example.test');
  });

  test('step 3 (optional): Skip advances to subjects step', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' });
    await waitForOnboardingEntry(page);
    const dest = destinationFromUrl(page.url());
    test.skip(dest === 'sign-in', 'Needs a signed-in browser session');
    test.skip(dest === 'home', 'Onboarding already complete for this user');

    await clearOnboardingLocalStorage(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByLabel(/full name/i).fill('Skip Learning');
    await page.getByLabel(/email address/i).fill('e2e.skip3@example.test');
    await page.getByRole('button', { name: /go to next step/i }).click();
    await page.getByLabel(/pick your date of birth|date of birth/i).fill('2005-06-15');
    await page.getByRole('button', { name: /go to next step/i }).click();
    await expect(page.getByRole('status', { name: /step 3 of 5/i })).toBeVisible();

    await page.getByRole('button', { name: /skip this step/i }).click();
    await expect(page.getByRole('status', { name: /step 4 of 5/i })).toBeVisible();
    await expect(page.getByText(/what subjects are you studying/i)).toBeVisible();
  });

  test('step 4: Next without a subject shows validation', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' });
    await waitForOnboardingEntry(page);
    const dest = destinationFromUrl(page.url());
    test.skip(dest === 'sign-in', 'Needs a signed-in browser session');
    test.skip(dest === 'home', 'Onboarding already complete for this user');

    await clearOnboardingLocalStorage(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByLabel(/full name/i).fill('Subject Gate');
    await page.getByLabel(/email address/i).fill('e2e.subjects@example.test');
    await page.getByRole('button', { name: /go to next step/i }).click();
    await page.getByLabel(/pick your date of birth|date of birth/i).fill('2005-06-15');
    await page.getByRole('button', { name: /go to next step/i }).click();
    await page.getByRole('button', { name: /skip this step/i }).click();
    await expect(page.getByRole('status', { name: /step 4 of 5/i })).toBeVisible();

    await page.getByRole('button', { name: /go to next step/i }).click();
    await expect(
      page.locator('[role="alert"]').filter({ hasText: /please select at least one subject/i })
    ).toBeVisible();

    await page.getByRole('button', { name: /mathematics/i }).click();
    await page.getByRole('button', { name: /go to next step/i }).click();
    await expect(page.getByRole('status', { name: /step 5 of 5/i })).toBeVisible();
    await expect(page.getByText(/ai assistant preferences/i)).toBeVisible();
  });
});

test.describe('Full wizard submit (requires incomplete onboarding + backend)', () => {
  test.skip(
    !process.env.E2E_ONBOARDING_FULL,
    'Set E2E_ONBOARDING_FULL=1 and use a Clerk test user with onboarding incomplete'
  );

  test('completes 5 steps and reaches questionnaire', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/onboarding/);

    await page.getByLabel(/full name/i).fill('E2E Test User');
    await page.getByLabel(/email address/i).fill('e2e-onboarding@example.test');
    await page.getByRole('button', { name: /go to next step/i }).click();

    await expect(page.getByText(/step 2 of 5/i)).toBeVisible();
    await page.getByLabel(/pick your date of birth|date of birth/i).fill('2005-06-15');
    await page.getByRole('button', { name: /go to next step/i }).click();

    await expect(page.getByText(/step 3 of 5/i)).toBeVisible();
    await page.getByRole('button', { name: /go to next step/i }).click();

    await expect(page.getByText(/step 4 of 5/i)).toBeVisible();
    await page.getByRole('button', { name: /mathematics/i }).click();
    await page.getByRole('button', { name: /go to next step/i }).click();

    await expect(page.getByText(/step 5 of 5/i)).toBeVisible();
    await page.getByRole('button', { name: /complete setup/i }).click();

    await page.waitForURL(/questionnaire/, { timeout: 60_000 });
  });
});
