export type SocialReportTargetType = 'student' | 'group' | 'message' | 'resource';

interface SubmitSocialReportArgs {
  targetType: SocialReportTargetType;
  targetId: string;
  reason: string;
  context?: Record<string, unknown>;
}

export async function submitSocialReport({
  targetType,
  targetId,
  reason,
  context,
}: SubmitSocialReportArgs): Promise<void> {
  const response = await fetch('/api/social/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetType,
      reportedId: targetId,
      reason,
      context,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to submit report');
  }
}
