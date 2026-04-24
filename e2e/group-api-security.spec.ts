import { test, expect } from '@playwright/test';

test.describe('group api security contracts', () => {
  test('unauthenticated invite listing is rejected', async ({ request }) => {
    const res = await request.get('/api/study-groups/00000000-0000-0000-0000-000000000000/invite');
    expect(res.status()).toBe(401);
  });

  test('unauthenticated join is rejected', async ({ request }) => {
    const res = await request.post('/api/study-groups/00000000-0000-0000-0000-000000000000/join');
    expect(res.status()).toBe(401);
  });

  test('unauthenticated resource create is rejected', async ({ request }) => {
    const res = await request.post('/api/study-groups/00000000-0000-0000-0000-000000000000/resources', {
      data: { title: 'x', resource_type: 'link', url: 'https://example.com' },
    });
    expect(res.status()).toBe(401);
  });

  test('unauthenticated session create is rejected', async ({ request }) => {
    const res = await request.post('/api/study-groups/00000000-0000-0000-0000-000000000000/sessions', {
      data: {
        title: 'Focus block',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    expect(res.status()).toBe(401);
  });

  test('unauthenticated notification send is rejected', async ({ request }) => {
    const res = await request.post('/api/notifications/send', {
      data: {
        userId: 'user_x',
        notification: { headings: { en: 'Hi' }, contents: { en: 'Test' } },
      },
    });
    expect(res.status()).toBe(401);
  });
});
