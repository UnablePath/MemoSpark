'use client';

export function trackQuestionnaireEvent(payload: {
  templateId?: string;
  eventType: string;
  payload?: Record<string, unknown>;
}): void {
  if (typeof window === 'undefined') return;
  void fetch('/api/ai/questionnaire-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
