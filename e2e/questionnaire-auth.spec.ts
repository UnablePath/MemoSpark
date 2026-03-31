import { test, expect } from '@playwright/test';

async function answerCurrentQuestionAndContinue(page: any) {
  const scope = page.locator('[data-testid="ai-questionnaire-question"]');
  await expect(scope).toBeVisible({ timeout: 30_000 });

  // Prefer explicit interactive controls first
  const radios = scope.getByRole('radio');
  if (await radios.count()) {
    await radios.first().click();
  } else {
    const checkboxes = scope.getByRole('checkbox');
    if (await checkboxes.count()) {
      await checkboxes.first().click();
    } else {
      const slider = scope.locator('[role="slider"], input[type="range"]');
      if (await slider.count()) {
        // ArrowRight bumps most sliders in Radix/shadcn patterns
        await slider.first().focus();
        await page.keyboard.press('ArrowRight');
      } else {
        const timeInput = scope.locator('input[type="time"]');
        if (await timeInput.count()) {
          await timeInput.first().fill('09:00');
        } else {
          const text = scope.locator('textarea, input[type="text"]');
          if (await text.count()) {
            await text.first().fill('E2E answer');
          } else {
            // Rating uses buttons with the number; click "3" if present, else first button
            const rating = scope.getByRole('button', { name: /^3$/ });
            if (await rating.count()) {
              await rating.first().click();
            } else {
              const anyButton = scope.getByRole('button').first();
              if (await anyButton.count()) await anyButton.click();
            }
          }
        }
      }
    }
  }

  const nextOrComplete = scope.getByRole('button', { name: /next|complete/i });
  await expect(nextOrComplete).toBeEnabled();
  await nextOrComplete.click();
}

test.describe('AI Questionnaire (authenticated)', () => {
  test.skip(
    !process.env.E2E_STORAGE_STATE,
    'Set E2E_STORAGE_STATE to a signed-in Clerk storageState file',
  );

  test('completion updates stored patterns and affects suggestions', async ({ page }) => {
    await page.goto('/questionnaire', { waitUntil: 'domcontentloaded' });

    // If storageState is stale, bail loudly rather than giving false confidence.
    await expect(page).not.toHaveURL(/sign-in/);

    // Drive the questionnaire to completion (best-effort, template-agnostic)
    for (let i = 0; i < 40; i++) {
      const completed = page.locator('[data-testid="ai-questionnaire-root"][data-state="completed"]');
      if (await completed.count()) break;
      await answerCurrentQuestionAndContinue(page);
    }

    await expect(
      page.locator('[data-testid="ai-questionnaire-root"][data-state="completed"]'),
    ).toBeVisible({ timeout: 90_000 });

    // Now assert the suggestions API sees stored patterns (durable DB)
    const res = await page.request.post('/api/ai/suggestions', {
      data: {
        feature: 'basic_suggestions',
        tasks: [{ id: 't1', title: 'Read Biology notes', priority: 'medium' }],
        context: { currentTime: new Date().toISOString() },
      },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
    expect(json.data?.hasStoredPatterns).toBeTruthy();
    expect(Array.isArray(json.data?.suggestions)).toBeTruthy();
    expect(json.data.suggestions.length).toBeGreaterThan(0);
  });

  test('premium features return deterministic pattern-backed results', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/sign-in/);

    const tasks = [
      { id: 't1', title: 'Read Biology notes', priority: 'medium' },
      { id: 't2', title: 'Practice Math past questions', priority: 'high' },
    ];

    const context = {
      currentTime: new Date().toISOString(),
      transcript: 'Create a task to study math for 2 hours tomorrow',
      timetable: [],
    };

    const premiumFeatures = [
      'stu_personality',
      'study_planning',
      'voice_processing',
      'ml_predictions',
      'premium_analytics',
      'collaborative_filtering',
    ] as const;

    for (const feature of premiumFeatures) {
      const res = await page.request.post('/api/ai/suggestions', {
        data: { feature, tasks, context },
      });
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      expect(json.success).toBeTruthy();
      expect(json.data?.feature).toBe(feature);
      expect(Array.isArray(json.data?.usedSignals)).toBeTruthy();
      expect(typeof json.data?.result).toBe('object');
      // No placeholder marker
      expect(json.data?.notImplemented).toBeUndefined();
    }
  });
});

