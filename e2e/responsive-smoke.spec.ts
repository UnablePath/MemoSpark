import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { width: 375, height: 812, name: 'mobile' },
  { width: 768, height: 900, name: 'tablet' },
  { width: 1280, height: 900, name: 'desktop' },
] as const;

const P0_PATHS = [
  '/',
  '/sign-in',
  '/sign-up',
  '/login',
  '/onboarding',
  '/questionnaire',
  '/dashboard',
  '/connections',
  '/groups',
  '/profile',
  '/settings',
  '/settings/subscription',
] as const;

async function assertNoHorizontalScroll() {
  const root = document.documentElement;
  const body = document.body;
  const maxScrollWidth = Math.max(root.scrollWidth, body?.scrollWidth ?? 0);
  const clientWidth = root.clientWidth;

  // Allow a tiny tolerance for fractional pixels.
  if (maxScrollWidth > clientWidth + 2) {
    return {
      ok: false,
      maxScrollWidth,
      clientWidth,
      url: window.location.href,
    };
  }

  return { ok: true, maxScrollWidth, clientWidth, url: window.location.href };
}

test.describe('Responsive smoke (P0 routes)', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(viewport.name, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      for (const path of P0_PATHS) {
        test(`no horizontal scroll: ${path}`, async ({ page }) => {
          await page.goto(path, { waitUntil: 'domcontentloaded' });

          // Let client redirects and lazy content settle a bit.
          await page.waitForTimeout(1000);

          const result = await page.evaluate(assertNoHorizontalScroll);
          expect(
            result.ok,
            `Horizontal scroll detected (scrollWidth=${result.maxScrollWidth}, clientWidth=${result.clientWidth}) at ${result.url}`,
          ).toBe(true);
        });
      }
    });
  }
});

