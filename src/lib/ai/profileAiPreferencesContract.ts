import { defaultAIPreferences, type UserAIPreferences } from '@/types/ai';

/**
 * Single merge contract for AI UI prefs across:
 * - defaults (`defaultAIPreferences`)
 * - Clerk `publicMetadata.aiPreferences` (server-synced / product flags)
 * - `memospark_profile` localStorage (session UI toggles; not authoritative for study data)
 *
 * Postgres `user_ai_patterns` + questionnaire flows drive scheduling/suggestions; this merge is for profile UI only.
 */
export function mergeLayeredAiPreferences(
  clerkPartial: Partial<UserAIPreferences> | undefined,
  localPartial: Partial<UserAIPreferences> | undefined,
): UserAIPreferences {
  return {
    ...defaultAIPreferences,
    ...(clerkPartial ?? {}),
    ...(localPartial ?? {}),
  };
}
