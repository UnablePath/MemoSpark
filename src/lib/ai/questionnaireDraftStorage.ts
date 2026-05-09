/**
 * Session draft for AI questionnaire: complements durable `user_questionnaire_responses`.
 * Contract: after a successful `updateResponse`, DB is authoritative, merge with server winning.
 */

export interface QuestionnaireDraftFile {
  v: 1;
  templateId: string;
  answers: Record<string, unknown>;
  updatedAt: string;
}

export function parseQuestionnaireDraft(raw: string | null): QuestionnaireDraftFile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed as QuestionnaireDraftFile).v === 1 &&
      typeof (parsed as QuestionnaireDraftFile).templateId === 'string' &&
      typeof (parsed as QuestionnaireDraftFile).answers === 'object'
    ) {
      return parsed as QuestionnaireDraftFile;
    }
    // Legacy: plain answers map, caller may wrap with current templateId
    if (parsed && typeof parsed === 'object' && !('v' in (parsed as object))) {
      return null;
    }
  } catch {
    return null;
  }
  return null;
}

/** Server row wins on key conflicts; draft fills gaps (offline / failed save). */
export function mergeDraftWithServerResponses(
  serverResponses: Record<string, unknown>,
  draft: QuestionnaireDraftFile | null,
  templateId: string,
): Record<string, unknown> {
  if (!draft || draft.templateId !== templateId) {
    return { ...serverResponses };
  }
  return { ...draft.answers, ...serverResponses };
}

export function buildDraftFile(
  templateId: string,
  answers: Record<string, unknown>,
): QuestionnaireDraftFile {
  return {
    v: 1,
    templateId,
    answers,
    updatedAt: new Date().toISOString(),
  };
}

/** Migrate legacy flat JSON answers to v1 draft shape when possible. */
export function legacyAnswersToDraft(
  templateId: string,
  raw: string | null,
): QuestionnaireDraftFile | null {
  if (!raw) return null;
  const modern = parseQuestionnaireDraft(raw);
  if (modern) return modern;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return buildDraftFile(templateId, parsed as Record<string, unknown>);
    }
  } catch {
    return null;
  }
  return null;
}
